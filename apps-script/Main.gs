/**
 * Main.gs — Entry points, trigger handlers, orchestration
 */

/**
 * Add custom menu when spreadsheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Discovery Pipeline')
    .addItem('Run RSS Pipeline', 'runRSSPipeline')
    .addItem('Run Regulatory Pipeline', 'runRegulatoryPipeline')
    .addItem('Prune Old Seen Items', 'pruneSeenItems')
    .addSeparator()
    .addItem('Full Setup', 'runFullSetup')
    .addItem('Setup Sheet Tabs', 'setupSheetTabs')
    .addItem('Seed Config Sources', 'seedConfigSources')
    .addItem('Validate Setup', 'validateSetup')
    .addItem('Install Triggers', 'installTriggers')
    .addToUi();
}

/**
 * RSS Pipeline — runs every 2 hours via trigger.
 * Checks business hours, fetches all active RSS/GNews sources,
 * deduplicates, filters with Claude, posts alerts to Slack.
 */
function runRSSPipeline() {
  var startTime = new Date();
  console.log('RSS Pipeline started at ' + startTime.toISOString());

  // Business hours check (skip on manual runs from menu)
  var isTriggered = !isManualExecution_();
  if (isTriggered && !isBusinessHours_()) {
    console.log('Outside business hours, skipping RSS pipeline.');
    return;
  }

  // Load seen hashes for dedup
  var seenHashes = loadSeenHashes_();

  // Get all active RSS and GNews sources
  var rssSources = getActiveSources_('rss').filter(function(s) {
    return s['Check Frequency'] === '2h';
  });
  var gnewsSources = getActiveSources_('gnews');
  var allSources = rssSources.concat(gnewsSources);

  console.log('Processing ' + allSources.length + ' RSS/GNews sources');

  var allNewItems = [];

  for (var i = 0; i < allSources.length; i++) {
    // Check time limit
    if (elapsed_(startTime) > MAX_RUNTIME_MS) {
      console.warn('Approaching time limit, stopping source processing.');
      break;
    }

    var source = allSources[i];
    var sourceId = source['Source ID'];

    try {
      var items = fetchRSSItems_(source);
      var newItems = filterNewItems_(items, seenHashes);

      updateSourceStatus_(source, items.length, '');
      console.log(sourceId + ': ' + items.length + ' items, ' + newItems.length + ' new');

      for (var j = 0; j < newItems.length; j++) {
        allNewItems.push(newItems[j]);
      }
    } catch (e) {
      var errMsg = logError_('RSS/' + sourceId, e);
      updateSourceStatus_(source, 0, errMsg);
    }
  }

  console.log('Total new items to filter: ' + allNewItems.length);

  if (allNewItems.length === 0) {
    console.log('No new items found. Pipeline complete.');
    return;
  }

  // Filter with Claude in batches
  var results;
  try {
    results = filterWithClaude(allNewItems);
  } catch (e) {
    console.error('Claude filtering failed: ' + e.message);
    // Record all items as error
    for (var k = 0; k < allNewItems.length; k++) {
      recordSeenItem_(
        allNewItems[k]._hash, allNewItems[k].url, allNewItems[k].title,
        allNewItems[k].sourceId, allNewItems[k].pubDate,
        'error', '', ''
      );
    }
    return;
  }

  // Process results: record seen items and post alerts
  var alertCount = 0;
  var seenRows = [];

  for (var r = 0; r < results.length; r++) {
    if (elapsed_(startTime) > MAX_RUNTIME_MS) {
      console.warn('Approaching time limit during alert posting.');
      break;
    }

    var result = results[r];
    var item = result.item;
    var cr = result.claudeResult;
    var disposition = result.disposition;
    var confidence = cr ? (cr.confidence || '') : '';

    // Record in Seen Items
    seenRows.push([
      item._hash,
      item.url || '',
      item.title || '',
      item.sourceId || '',
      item.pubDate || '',
      new Date(),
      disposition,
      result.rawResponse || '',
      confidence
    ]);

    // Post to Slack if relevant
    if (cr && cr.is_relevant) {
      var alert = {
        type: cr.category || cr.type || 'partnership',
        confidence: cr.confidence || 'medium',
        companies: cr.companies || [],
        partnership_type: cr.partnership_type || '',
        summary: cr.summary || '',
        sourceUrl: item.url || '',
        title: item.title || '',
        sourceFeed: item.sourceId || '',
        pubDate: item.pubDate ? formatPubDate_(item.pubDate) : '',
        source_type: cr.source_type || '',
        dedup_key: cr.dedup_key || ''
      };

      // Check for registration keywords and append flag if found
      var alertText = (cr.summary || '') + ' ' + (item.title || '');
      if (isRegistrationAlert_(alertText)) {
        alert.summary = (alert.summary || '') + REG_FLAG;
      }

      var channel = cr.slack_channel || CHANNEL_PARTNERSHIP;
      if (alertCount > 0) Utilities.sleep(1500); // 1.5s delay between Slack posts
      postToSlack(alert, channel);
      logAlert_(alert, channel);
      alertCount++;
    }
  }

  // Batch write seen items
  if (seenRows.length > 0) {
    appendRows_(SHEET_SEEN, seenRows);
  }

  console.log('RSS Pipeline complete. ' + alertCount + ' alerts posted, ' + seenRows.length + ' items recorded.');
}

/**
 * Regulatory Pipeline — runs daily at 7 AM ET.
 * Fetches regulatory RSS feeds and HTML pages, diffs snapshots,
 * filters with Claude, posts to #regulatory-alerts.
 */
function runRegulatoryPipeline() {
  var startTime = new Date();
  console.log('Regulatory Pipeline started at ' + startTime.toISOString());

  var seenHashes = loadSeenHashes_();

  // ── Part 1: Regulatory RSS feeds ──
  var rssSources = getActiveSources_('rss').filter(function(s) {
    return s['Check Frequency'] === 'daily';
  });

  console.log('Processing ' + rssSources.length + ' regulatory RSS sources');

  var allNewItems = [];

  for (var i = 0; i < rssSources.length; i++) {
    if (elapsed_(startTime) > MAX_RUNTIME_MS) {
      console.warn('Approaching time limit on regulatory RSS.');
      break;
    }

    var source = rssSources[i];
    var sourceId = source['Source ID'];

    try {
      var items = fetchRSSItems_(source);
      // Tag as regulatory
      for (var t = 0; t < items.length; t++) {
        items[t].isRegulatory = true;
      }
      var newItems = filterNewItems_(items, seenHashes);
      updateSourceStatus_(source, items.length, '');
      console.log(sourceId + ': ' + items.length + ' items, ' + newItems.length + ' new');

      for (var j = 0; j < newItems.length; j++) {
        allNewItems.push(newItems[j]);
      }
    } catch (e) {
      var errMsg = logError_('Regulatory-RSS/' + sourceId, e);
      updateSourceStatus_(source, 0, errMsg);
    }
  }

  // Filter regulatory RSS items with Claude
  if (allNewItems.length > 0) {
    try {
      var results = filterWithClaude(allNewItems);
      var seenRows = [];

      for (var r = 0; r < results.length; r++) {
        var result = results[r];
        var item = result.item;
        var cr = result.claudeResult;
        var confidence = cr ? (cr.confidence || '') : '';

        seenRows.push([
          item._hash, item.url || '', item.title || '', item.sourceId || '',
          item.pubDate || '', new Date(), result.disposition,
          result.rawResponse || '', confidence
        ]);

        if (cr && cr.is_relevant) {
          var alert = {
            type: cr.category || cr.type || 'regulatory',
            confidence: cr.confidence || 'medium',
            companies: cr.companies || [],
            partnership_type: cr.partnership_type || '',
            summary: cr.summary || '',
            sourceUrl: item.url || '',
            title: item.title || '',
            sourceFeed: item.sourceId || '',
            pubDate: item.pubDate ? formatPubDate_(item.pubDate) : '',
            source_type: cr.source_type || '',
            dedup_key: cr.dedup_key || ''
          };

          // Check for registration keywords and append flag if found
          var regAlertText = (cr.summary || '') + ' ' + (item.title || '');
          if (isRegistrationAlert_(regAlertText)) {
            alert.summary = (alert.summary || '') + REG_FLAG;
          }

          var regChannel = cr.slack_channel || CHANNEL_REGULATORY;
          Utilities.sleep(1500); // 1.5s delay between Slack posts
          postToSlack(alert, regChannel);
          logAlert_(alert, regChannel);
        }
      }

      if (seenRows.length > 0) {
        appendRows_(SHEET_SEEN, seenRows);
      }
    } catch (e) {
      console.error('Claude filtering failed for regulatory RSS: ' + e.message);
    }
  }

  // ── Part 2: Regulatory page monitoring (HTML diffing) ──
  var pageSources = getActiveSources_('regulatory-page');
  console.log('Processing ' + pageSources.length + ' regulatory page sources');

  for (var p = 0; p < pageSources.length; p++) {
    if (elapsed_(startTime) > MAX_RUNTIME_MS) {
      console.warn('Approaching time limit on regulatory pages.');
      break;
    }

    var pageSource = pageSources[p];
    var pageSourceId = pageSource['Source ID'];

    try {
      var diff = checkRegulatoryPage_(pageSource);

      if (!diff) {
        updateSourceStatus_(pageSource, 0, '');
        continue;
      }

      if (!diff.changed) {
        updateSourceStatus_(pageSource, 0, '');
        console.log(pageSourceId + ': No changes detected.');
        continue;
      }

      console.log(pageSourceId + ': Changes detected, analyzing with Claude...');

      var diffResult = summarizeDiff_(
        pageSourceId, diff.url, diff.oldContent, diff.newContent
      );

      // Save snapshot
      saveSnapshot_(
        pageSourceId, diff.url, diff.contentHash,
        diff.newContent, diffResult.summary || ''
      );

      updateSourceStatus_(pageSource, 1, '');

      // Post alert if relevant
      if (diffResult.is_relevant) {
        var regAlert = {
          type: 'regulatory',
          confidence: diffResult.confidence || 'medium',
          companies: diffResult.companies || [],
          summary: diffResult.summary || 'Regulatory page changed.',
          sourceUrl: diff.url
        };

        // Check for registration keywords and append flag if found
        if (isRegistrationAlert_(diffResult.summary || '')) {
          regAlert.summary = (regAlert.summary || '') + REG_FLAG;
        }

        postToSlack(regAlert, CHANNEL_REGULATORY);
        logAlert_(regAlert, CHANNEL_REGULATORY);
      }
    } catch (e) {
      var pageErr = logError_('Regulatory-Page/' + pageSourceId, e);
      updateSourceStatus_(pageSource, 0, pageErr);
    }
  }

  console.log('Regulatory Pipeline complete.');
}

/**
 * Prune Seen Items older than SEEN_RETENTION_DAYS.
 * Runs monthly via trigger or manually from menu.
 */
function pruneSeenItems() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SEEN);
  if (!sheet || sheet.getLastRow() < 2) {
    console.log('No seen items to prune.');
    return;
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var firstSeenCol = headers.indexOf('First Seen');
  if (firstSeenCol === -1) {
    console.error('First Seen column not found.');
    return;
  }

  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SEEN_RETENTION_DAYS);

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  var rowsToDelete = [];

  for (var i = 0; i < data.length; i++) {
    var firstSeen = data[i][firstSeenCol];
    if (!firstSeen) continue;
    var d = firstSeen instanceof Date ? firstSeen : new Date(firstSeen);
    if (isNaN(d.getTime())) continue;
    if (d < cutoff) {
      rowsToDelete.push(i + 2); // 1-based, skip header
    }
  }

  if (rowsToDelete.length === 0) {
    console.log('No seen items older than ' + SEEN_RETENTION_DAYS + ' days.');
    return;
  }

  // Delete from bottom to top so row indices stay valid
  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  console.log('Pruned ' + rowsToDelete.length + ' seen items older than ' + SEEN_RETENTION_DAYS + ' days.');
  SpreadsheetApp.getActiveSpreadsheet().toast('Pruned ' + rowsToDelete.length + ' old seen items.', 'Cleanup', 5);
}

/**
 * Check if the current execution is manual (from menu) vs. triggered.
 * Trigger-based executions have an event parameter; manual ones don't.
 */
function isManualExecution_() {
  try {
    SpreadsheetApp.getUi();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Format a pub date for display in Slack.
 */
function formatPubDate_(date) {
  if (!date) return '';
  if (date instanceof Date) {
    return Utilities.formatDate(date, 'America/New_York', 'MMM d, yyyy');
  }
  // Try parsing string dates
  try {
    var d = new Date(date);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, 'America/New_York', 'MMM d, yyyy');
    }
  } catch (e) {}
  return String(date);
}
