/**
 * RegStatus.gs — Regulatory Status tracker helpers
 *
 * Provides:
 *  - seedRegStatus()          One-time scan of Alerts Log for registration-related items
 *  - isRegistrationAlert_(s)  Returns true if text matches registration keywords
 *  - Registration flag constant appended to Slack messages by Main.gs
 */

/** Sheet name for the new Regulatory Status tab */
var SHEET_REG_STATUS = 'Regulatory Status';

/** Sheet name for the Alerts Log (existing) */
var SHEET_ALERTS_LOG = 'Alerts Log';

/** Keywords that signal a registration / designation update */
var REG_KEYWORDS = [
  'DCM', 'DCO', 'FCM', 'IB ',          // registration types (IB with trailing space to avoid false positives)
  'NFA',
  'registration', 'designation',
  'application', 'approval',
  'designated contract market',
  'derivatives clearing organization',
  'futures commission merchant',
  'introducing broker',
  'conditionally approved', 'conditional approval',
  'self-certification', 'contract certification'
];

/** Slack flag appended to registration-related alerts */
var REG_FLAG = '\n\n:clipboard: Possible registration update \u2014 review for Regulatory Status tracker';

/**
 * Check whether a piece of text contains registration-related keywords.
 * Case-insensitive matching.
 *
 * @param {string} text  The text to check (summary, title, etc.)
 * @return {boolean}
 */
function isRegistrationAlert_(text) {
  if (!text) return false;
  var lower = text.toLowerCase();
  for (var i = 0; i < REG_KEYWORDS.length; i++) {
    if (lower.indexOf(REG_KEYWORDS[i].toLowerCase()) !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * One-time function: scan the Alerts Log tab for registration-related alerts
 * and output a summary to the console (and optionally a temp sheet) for
 * manual review before populating the Regulatory Status tab.
 *
 * Run this from the Apps Script editor: Run > seedRegStatus
 */
function seedRegStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var alertSheet = ss.getSheetByName(SHEET_ALERTS_LOG);

  if (!alertSheet || alertSheet.getLastRow() < 2) {
    console.log('No Alerts Log data found.');
    return;
  }

  var headers = alertSheet.getRange(1, 1, 1, alertSheet.getLastColumn()).getValues()[0];
  var data = alertSheet.getRange(2, 1, alertSheet.getLastRow() - 1, headers.length).getValues();

  // Build column index map
  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    colMap[headers[h]] = h;
  }

  // Fields we want to check for keywords
  var textFields = ['Summary', 'Title', 'Type', 'Companies'];
  // Make sure at least Summary exists
  var fieldsToCheck = [];
  for (var f = 0; f < textFields.length; f++) {
    if (colMap[textFields[f]] !== undefined) {
      fieldsToCheck.push(colMap[textFields[f]]);
    }
  }

  if (fieldsToCheck.length === 0) {
    console.log('Could not find Summary/Title columns in Alerts Log. Headers: ' + headers.join(', '));
    return;
  }

  var matches = [];

  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var combinedText = '';
    for (var c = 0; c < fieldsToCheck.length; c++) {
      combinedText += ' ' + String(row[fieldsToCheck[c]] || '');
    }

    if (isRegistrationAlert_(combinedText)) {
      matches.push({
        rowNum: r + 2,  // 1-based, skip header
        summary: String(row[colMap['Summary']] || row[colMap['Title']] || '').substring(0, 200),
        companies: String(row[colMap['Companies']] || ''),
        type: String(row[colMap['Type']] || ''),
        sourceUrl: String(row[colMap['Source URL']] || row[colMap['URL']] || ''),
        date: String(row[colMap['Date'] || colMap['Pub Date']] || '')
      });
    }
  }

  console.log('=== Registration-Related Alerts ===');
  console.log('Found ' + matches.length + ' matches out of ' + data.length + ' total alerts.\n');

  for (var m = 0; m < matches.length; m++) {
    var match = matches[m];
    console.log(
      'Row ' + match.rowNum + ' | ' +
      match.companies + ' | ' +
      match.type + ' | ' +
      match.summary
    );
  }

  // Write matches to a temp sheet for easier review
  var tempName = 'Reg Status Seed (temp)';
  var tempSheet = ss.getSheetByName(tempName);
  if (tempSheet) {
    tempSheet.clear();
  } else {
    tempSheet = ss.insertSheet(tempName);
  }

  var outHeaders = ['Alert Row', 'Companies', 'Type', 'Summary', 'Source URL', 'Date'];
  tempSheet.getRange(1, 1, 1, outHeaders.length).setValues([outHeaders]);
  tempSheet.getRange(1, 1, 1, outHeaders.length).setFontWeight('bold');

  if (matches.length > 0) {
    var outRows = [];
    for (var o = 0; o < matches.length; o++) {
      outRows.push([
        matches[o].rowNum,
        matches[o].companies,
        matches[o].type,
        matches[o].summary,
        matches[o].sourceUrl,
        matches[o].date
      ]);
    }
    tempSheet.getRange(2, 1, outRows.length, outHeaders.length).setValues(outRows);
  }

  // Auto-resize columns
  for (var col = 1; col <= outHeaders.length; col++) {
    tempSheet.autoResizeColumn(col);
  }

  console.log('\nResults written to "' + tempName + '" tab.');
  console.log('Review these and manually add confirmed registrations to the "' + SHEET_REG_STATUS + '" tab.');

  // Ensure the Regulatory Status tab exists with proper headers
  ensureRegStatusTab_(ss);
}

/**
 * Create the Regulatory Status tab if it doesn't already exist,
 * with the correct column headers.
 */
function ensureRegStatusTab_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_REG_STATUS);

  if (sheet) {
    console.log('"' + SHEET_REG_STATUS + '" tab already exists.');
    return sheet;
  }

  sheet = ss.insertSheet(SHEET_REG_STATUS);

  var headers = [
    'Entity',
    'Registration Type',
    'Status',
    'Application Date',
    'Effective Date',
    'Last Updated',
    'Last Update Summary',
    'Source URL',
    'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  // Set column widths for readability
  sheet.setColumnWidth(1, 180);  // Entity
  sheet.setColumnWidth(2, 140);  // Registration Type
  sheet.setColumnWidth(3, 160);  // Status
  sheet.setColumnWidth(4, 120);  // Application Date
  sheet.setColumnWidth(5, 120);  // Effective Date
  sheet.setColumnWidth(6, 120);  // Last Updated
  sheet.setColumnWidth(7, 300);  // Last Update Summary
  sheet.setColumnWidth(8, 250);  // Source URL
  sheet.setColumnWidth(9, 300);  // Notes

  // Seed with pre-approval / terminal registrations only
  // (Approved entities live in the Partnership Tracker)
  // Sources: CFTC Industry Filings — Trading Organizations + Clearing Organizations pages
  var seedData = [
    // ── Pending DCM Applications (13) ──
    ['OneChronos Markets DCM LLC', 'DCM', 'Applied', '2025-07-31', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/57746', ''],
    ['RSBIX, LLC (Matchbook)', 'DCM', 'Applied', '2025-09-16', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58152', ''],
    ['ProphetX LLC', 'DCM', 'Applied', '2025-11-07', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58754', 'Also filed DCO (2025-11-18)'],
    ['tZERO DCM, LLC', 'DCM', 'Applied', '2025-11-21', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58712', 'Also filed DCO (2025-09-18)'],
    ['XV Exchange, LLC (STX)', 'DCM', 'Applied', '2025-12-09', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58807', ''],
    ['Optex Markets LLC', 'DCM', 'Applied', '2026-01-13', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59349', ''],
    ['Ludlow Exchange, LLC (Novig)', 'DCM', 'Applied', '2026-01-21', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59390', ''],
    ['Water Street Labs, LLC', 'DCM', 'Applied', '2026-01-22', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59469', ''],
    ['Juice Exchange, LLC', 'DCM', 'Applied', '2026-01-27', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59480', ''],
    ['Sporttrade DCM LLC', 'DCM', 'Applied', '2026-01-27', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59605', 'Also filed DCO (2026-01-27)'],
    ['PMEX Markets', 'DCM', 'Applied', '2026-02-09', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59665', 'Also filed DCO via PMEX Clearing (2026-02-09)'],
    ['PredictCraft Mkt Inc. (DimeTrades)', 'DCM', 'Applied', '2026-02-11', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59756', ''],
    ['Smarkets Board of Trade Exchange LLC', 'DCM', 'Applied', '2026-03-03', '', '2026-03-06', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59862', 'Sports prediction market entrant'],
    // ── Pending DCO Applications (7) ──
    ['tZERO DCO, LLC', 'DCO', 'Applied', '2025-09-18', '', '2026-03-06', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59186', 'Also filed DCM (2025-11-21)'],
    ['ProphetX LLC', 'DCO', 'Applied', '2025-11-18', '', '2026-03-06', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59187', 'Also filed DCM (2025-11-07)'],
    ['ICE Direct Clear, Inc.', 'DCO', 'Applied', '2025-12-02', '', '2026-03-06', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59188', 'ICE subsidiary — dedicated PM clearing'],
    ['Gemini Olympus, LLC', 'DCO', 'Applied', '2025-12-17', '', '2026-03-06', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59189', 'Clearing arm for Gemini Titan (DCM approved 2025-12-10)'],
    ['Sporttrade DCO LLC', 'DCO', 'Applied', '2026-01-27', '', '2026-03-06', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59607', 'Also filed DCM (2026-01-27)'],
    ['Quanta Clear, Inc.', 'DCO', 'Applied', '2026-01-30', '', '2026-03-06', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59642', 'Quanta Exchange DCM approved 2025-05-30'],
    ['PMEX Clearing, Inc.', 'DCO', 'Applied', '2026-02-09', '', '2026-03-06', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59720', 'Also filed DCM via PMEX Markets (2026-02-09)']
  ];

  sheet.getRange(2, 1, seedData.length, headers.length).setValues(seedData);

  // Add data validation for Status column
  // Pre-approval and terminal statuses only (Approved → Partnership Tracker)
  var statusValues = ['Applied', 'Under Review', 'Conditionally Approved', 'Denied', 'Withdrawn', 'Suspended'];
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(statusValues, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 3, 100, 1).setDataValidation(statusRule);

  // Add data validation for Registration Type column
  var regTypes = ['DCM', 'DCO', 'FCM', 'IB', 'NFA Member', 'N/A'];
  var typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(regTypes, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 2, 100, 1).setDataValidation(typeRule);

  console.log('Created "' + SHEET_REG_STATUS + '" tab with ' + seedData.length + ' seed rows.');
  return sheet;
}

/**
 * Backfill Source URLs for existing Regulatory Status rows.
 * Matches by Entity name and Registration Type, writes the CFTC filing URL
 * into the Source URL column (column 8). Safe to run multiple times.
 *
 * Run from Apps Script editor: Run > backfillSourceUrls
 */
function backfillSourceUrls() {
  var urlMap = {
    'OneChronos Markets DCM LLC|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/57746',
    'RSBIX, LLC (Matchbook)|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58152',
    'ProphetX LLC|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58754',
    'tZERO DCM, LLC|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58712',
    'XV Exchange, LLC (STX)|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58807',
    'Optex Markets LLC|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59349',
    'Ludlow Exchange, LLC (Novig)|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59390',
    'Water Street Labs, LLC|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59469',
    'Juice Exchange, LLC|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59480',
    'Sporttrade DCM LLC|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59605',
    'PMEX Markets|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59665',
    'PredictCraft Mkt Inc. (DimeTrades)|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59756',
    'Smarkets Board of Trade Exchange LLC|DCM': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59862',
    'tZERO DCO, LLC|DCO': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59186',
    'ProphetX LLC|DCO': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59187',
    'ICE Direct Clear, Inc.|DCO': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59188',
    'Gemini Olympus, LLC|DCO': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59189',
    'Sporttrade DCO LLC|DCO': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59607',
    'Quanta Clear, Inc.|DCO': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59642',
    'PMEX Clearing, Inc.|DCO': 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59720'
  };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_REG_STATUS);

  if (!sheet || sheet.getLastRow() < 2) {
    console.log('No Regulatory Status data to backfill.');
    return;
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  var updated = 0;

  for (var i = 0; i < data.length; i++) {
    var entity = String(data[i][0]).trim();       // Column A: Entity
    var regType = String(data[i][1]).trim();       // Column B: Registration Type
    var existingUrl = String(data[i][7]).trim();   // Column H: Source URL

    if (existingUrl) continue; // Skip rows that already have a URL

    var key = entity + '|' + regType;
    if (urlMap[key]) {
      sheet.getRange(i + 2, 8).setValue(urlMap[key]);
      updated++;
    }
  }

  console.log('Backfilled ' + updated + ' Source URLs.');
  SpreadsheetApp.getActiveSpreadsheet().toast('Updated ' + updated + ' Source URLs.', 'Backfill Complete', 5);
}
