/**
 * Acquisitions.gs — Seed and manage the Acquisitions sheet
 *
 * Provides:
 *  - seedAcquisitions()     Creates/reseeds the "Acquisitions" tab
 *
 * Tracks completed and pending acquisitions in the prediction markets ecosystem.
 *
 * Target spreadsheet: Partnerships sheet (1UiZ-MlqAgQ5MexL9BgwAzXWfTZHCYUj6-1F1sm7ZJBw)
 */

var SHEET_ACQUISITIONS = 'Acquisitions';

var ACQ_HEADERS = [
  'Acquirer',
  'Target',
  'Status',
  'Date',
  'Details',
  'Announcement Link',
  'Published'
];

/**
 * Seed data for the Acquisitions tab.
 * Sources: Regulatory Status notes, partnership data, public announcements
 *
 * Last verified: 2026-03-12
 */
function getAcquisitionsSeedData_() {
  return [
    ['Susquehanna Int\'l Group', 'Rothera', 'Completed', '', 'Acquired Rothera (formerly MIAX Derivatives Exchange) for DCM and DCO infrastructure with Robinhood', '', 'Yes'],
    ['Underdog Fantasy', 'Aristotle Exchange', 'Completed', '2026-03-09', 'Acquired Aristotle Exchange DCM, Inc. and Aristotle Exchange DCO, Inc.', '', 'Yes'],
    ['Coinbase', 'The Clearing Company', 'Completed', '', 'Acquired The Clearing Company LLC (DCO)', '', 'Yes'],
    ['Kraken', 'Small Exchange', 'Completed', '', 'Acquired Small Exchange, Inc. (DCM)', '', 'Yes'],
    ['DraftKings', 'Railbird Exchange', 'Completed', '', 'Acquired Railbird Exchange LLC (DCM)', '', 'Yes'],
    ['Fanatics', 'Paragon Global Markets', 'Completed', '2025-07-01', 'Acquired Paragon Global Markets LLC for NFA IB registration; rebranded as Fanatics Markets', '', 'Yes'],
  ];
}

/**
 * Create or reseed the Acquisitions tab.
 * Clears existing data and writes the latest seed data.
 *
 * Run from Apps Script editor: Run > seedAcquisitions
 */
function seedAcquisitions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ACQUISITIONS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ACQUISITIONS);
  }

  // Clear everything
  sheet.clear();

  // Write headers
  sheet.getRange(1, 1, 1, ACQ_HEADERS.length).setValues([ACQ_HEADERS]);
  sheet.getRange(1, 1, 1, ACQ_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  // Write seed data
  var seedData = getAcquisitionsSeedData_();
  sheet.getRange(2, 1, seedData.length, ACQ_HEADERS.length).setValues(seedData);

  // Set column widths
  sheet.setColumnWidth(1, 250);  // Acquirer
  sheet.setColumnWidth(2, 220);  // Target
  sheet.setColumnWidth(3, 100);  // Status
  sheet.setColumnWidth(4, 110);  // Date
  sheet.setColumnWidth(5, 400);  // Details
  sheet.setColumnWidth(6, 250);  // Announcement Link
  sheet.setColumnWidth(7, 90);   // Published

  // Data validation: Status
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Completed', 'Pending', 'Rumored'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 3, 100, 1).setDataValidation(statusRule);

  // Data validation: Published
  var pubRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Yes', 'No'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 7, 100, 1).setDataValidation(pubRule);

  console.log('Seeded "' + SHEET_ACQUISITIONS + '" with ' + seedData.length + ' acquisitions.');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Seeded with ' + seedData.length + ' acquisitions.',
    'Acquisitions Created', 5
  );
}
