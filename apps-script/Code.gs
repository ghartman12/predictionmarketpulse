// PredictionMarketPulse Google Apps Script

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PredictionMarketPulse')
    .addItem('Generate X Post', 'generateXPost')
    .addItem('Generate Thread', 'generateThread')
    .addToUi();
}

var HEADERS = null;

function getHeaders_(sheet) {
  if (!HEADERS) {
    HEADERS = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  return HEADERS;
}

function colIndex_(headers, name) {
  var idx = headers.indexOf(name);
  if (idx === -1) throw new Error('Column not found: ' + name);
  return idx;
}

function rowToObject_(headers, values) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = values[i] || '';
  }
  return obj;
}

function generateXPost() {
  generateDraft_('single');
}

function generateThread() {
  generateDraft_('thread');
}

function generateDraft_(mode) {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveRange().getRow();

  if (row <= 1) {
    ui.alert('Please select a data row (not the header).');
    return;
  }

  var headers = getHeaders_(sheet);
  var values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  var data = rowToObject_(headers, values);

  if (!data['Partnership'] || !String(data['Partnership']).trim()) {
    ui.alert('The selected row has no Partnership value.');
    return;
  }

  var draftCol = colIndex_(headers, 'Draft X Post') + 1;
  var existingDraft = String(data['Draft X Post']).trim();

  if (existingDraft) {
    var overwrite = ui.alert(
      'Overwrite existing draft?',
      'This row already has a draft X post. Do you want to overwrite it?',
      ui.ButtonSet.YES_NO
    );
    if (overwrite !== ui.Button.YES) return;
  }

  var userPrompt = buildUserPrompt_(data, mode);

  ui.alert('Generating... This may take a few seconds.');

  var draft;
  try {
    draft = callClaude_(userPrompt);
  } catch (e) {
    ui.alert('API Error: ' + e.message);
    return;
  }

  sheet.getRange(row, draftCol).setValue(draft);

  var dateAddedCol = colIndex_(headers, 'Date X Post Generated') + 1;
  var existingDate = String(sheet.getRange(row, dateAddedCol).getValue()).trim();
  if (!existingDate) {
    sheet.getRange(row, dateAddedCol).setValue(
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
    );
  }

  SpreadsheetApp.flush();
  ui.alert('Draft generated successfully!');
}

function buildUserPrompt_(data, mode) {
  var lines = [];
  if (mode === 'thread') {
    lines.push('Generate a thread (3-5 tweets separated by ---) for this partnership:');
  } else {
    lines.push('Generate a single X post (under 280 characters) for this partnership:');
  }
  lines.push('Partnership: ' + data['Partnership']);
  lines.push('Type: ' + data['Type of Partnership']);
  if (data['Announcement Link']) lines.push('Announcement Link: ' + data['Announcement Link']);
  if (data['IB']) lines.push('IB: ' + data['IB']);
  if (data['FCM']) lines.push('FCM: ' + data['FCM']);
  if (data['DCM']) lines.push('DCM: ' + data['DCM']);
  if (data['DCO']) lines.push('DCO: ' + data['DCO']);
  if (data['Additional Details']) lines.push('Additional Details: ' + data['Additional Details']);
  return lines.join('\n');
}

function callClaude_(userPrompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set in Script Properties.');
  }

  var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    }),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code !== 200) {
    throw new Error('HTTP ' + code + ': ' + body);
  }

  var json = JSON.parse(body);
  return json.content[0].text;
}
