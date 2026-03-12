/**
 * NetworkEntities.gs — Seed and manage the Network Entities sheet
 *
 * Provides:
 *  - seedNetworkEntities()     Creates/reseeds the "Network Entities" tab
 *
 * This tab drives the network map's brand hub + regulatory satellite architecture.
 * Each row represents one regulatory entity. The Brand column links it to a
 * prediction market brand (hub node). Blank Brand = standalone entity.
 *
 * Target spreadsheet: Partnerships sheet (1UiZ-MlqAgQ5MexL9BgwAzXWfTZHCYUj6-1F1sm7ZJBw)
 */

var SHEET_NETWORK_ENTITIES = 'Network Entities';

var NE_HEADERS = [
  'Brand',
  'Entity Name',
  'Legal Name',
  'Type',
  'Routes To',
  'Published'
];

/**
 * Seed data for the Network Entities tab.
 * Sources: BRAND_REG_MAP, DUAL_ROLE_BRANDS, STANDALONE_LEGAL_NAMES from index.html,
 *          plus known standalone entities from the partnerships CSV.
 *
 * Columns: Brand | Entity Name | Legal Name | Type | Routes To | Published
 *
 * Last verified: 2026-03-12
 */
function getNetworkEntitiesSeedData_() {
  return [
    // ══════════════════════════════════════
    // BRANDED ENTITIES — Prediction market brands + their regulatory satellites
    // ══════════════════════════════════════

    // Kalshi
    ['Kalshi', 'KalshiEx', 'KalshiEx LLC', 'DCM', '', 'Yes'],
    ['Kalshi', 'Kalshi Klear', 'Kalshi Klear LLC', 'DCO', '', 'Yes'],

    // Polymarket
    ['Polymarket', 'Polymarket US (QCX)', 'QCX LLC (Polymarket US)', 'DCM', '', 'Yes'],
    ['Polymarket', 'Polymarket Clearing', 'QC Clearing LLC', 'DCO', '', 'Yes'],

    // Crypto.com
    ['Crypto.com', 'CDNA', 'NADEX d/b/a Crypto.com Derivatives North America', 'DCM', '', 'Yes'],
    ['Crypto.com', 'CDNA', 'NADEX d/b/a Crypto.com Derivatives North America', 'DCO', '', 'Yes'],

    // DraftKings
    ['DraftKings', 'Gus III', 'Gus III LLC (DraftKings Predictions)', 'IB', '', 'Yes'],
    ['DraftKings', 'Railbird Exchange', 'Railbird Exchange LLC', 'DCM', '', 'Yes'],

    // FanDuel
    ['FanDuel', 'FanDuel Prediction Markets', 'FanDuel Prediction Markets LLC', 'FCM', 'CME, Plus500', 'Yes'],

    // PrizePicks
    ['PrizePicks', 'PrizePicks Predictions', 'Performance Predictions II, LLC (PrizePicks)', 'FCM', 'Kalshi', 'Yes'],

    // Coinbase
    ['Coinbase', 'Coinbase Financial Markets', 'Coinbase Financial Markets, Inc.', 'FCM', 'Kalshi', 'Yes'],

    // Robinhood
    ['Robinhood', 'Robinhood Derivatives', 'Robinhood Derivatives, LLC', 'FCM', 'Kalshi', 'Yes'],

    // Sleeper
    ['Sleeper', 'Sleeper Markets', 'Sleeper Markets LLC', 'FCM', 'Kalshi', 'Yes'],

    // Fanatics
    ['Fanatics', 'Fanatics', 'Paragon Global Markets LLC (Fanatics Markets)', 'IB', 'Crypto.com', 'Yes'],

    // Gemini
    ['Gemini', 'Gemini Titan', 'Gemini Titan, LLC', 'DCM', '', 'Yes'],
    ['Gemini', 'Gemini Olympus', 'Gemini Olympus, LLC', 'DCO', '', 'Yes'],

    // Sporttrade
    ['Sporttrade', 'Sporttrade DCM', 'Sporttrade DCM LLC', 'DCM', '', 'Yes'],
    ['Sporttrade', 'Sporttrade DCO', 'Sporttrade DCO LLC', 'DCO', '', 'Yes'],

    // Underdog Fantasy
    ['Underdog Fantasy', 'UDM', 'UDM LLC (Underdog)', 'FCM', 'Aristotle Exchange DCM', 'Yes'],
    ['Underdog Fantasy', 'Aristotle Exchange DCM', 'Aristotle Exchange DCM, Inc.', 'DCM', '', 'Yes'],
    ['Underdog Fantasy', 'Aristotle Exchange DCO', 'Aristotle Exchange DCO, Inc.', 'DCO', '', 'Yes'],

    // ForecastEx
    ['ForecastEx', 'ForecastEx', 'ForecastEx LLC', 'DCM', '', 'Yes'],

    // CME
    ['CME', 'CME', 'Chicago Mercantile Exchange Inc.', 'DCM', '', 'Yes'],

    // ══════════════════════════════════════
    // DUAL-ROLE BRANDS — Brand IS the regulatory entity (no separate satellite)
    // ══════════════════════════════════════
    ['Interactive Brokers', 'Interactive Brokers', 'Interactive Brokers LLC', 'FCM', 'ForecastEx', 'Yes'],
    ['WeBull', 'WeBull', 'Webull Financial LLC', 'FCM', 'Kalshi', 'Yes'],

    // ══════════════════════════════════════
    // STANDALONE ENTITIES — No consumer brand, pure infrastructure
    // ══════════════════════════════════════
    ['Robinhood', 'Rothera', 'Rothera Exchange and Clearing LLC', 'DCM', '', 'Yes'],
    ['Robinhood', 'Rothera', 'Rothera Exchange and Clearing LLC', 'DCO', '', 'Yes'],
    ['', 'Wedbush Securities', 'Wedbush Securities Inc.', 'FCM', 'CME', 'Yes'],
    ['', 'Plus500', 'Plus500 Ltd', 'DCO', '', 'Yes'],
    ['Coinbase', 'The Clearing Company', 'The Clearing Company LLC', 'DCO', '', 'Yes'],
  ];
}

/**
 * Create or reseed the Network Entities tab.
 * Clears existing data and writes the latest seed data.
 *
 * Run from Apps Script editor: Run > seedNetworkEntities
 */
function seedNetworkEntities() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NETWORK_ENTITIES);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NETWORK_ENTITIES);
  }

  // Clear everything
  sheet.clear();

  // Write headers
  sheet.getRange(1, 1, 1, NE_HEADERS.length).setValues([NE_HEADERS]);
  sheet.getRange(1, 1, 1, NE_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  // Write seed data
  var seedData = getNetworkEntitiesSeedData_();
  sheet.getRange(2, 1, seedData.length, NE_HEADERS.length).setValues(seedData);

  // Set column widths
  sheet.setColumnWidth(1, 180);  // Brand
  sheet.setColumnWidth(2, 220);  // Entity Name
  sheet.setColumnWidth(3, 320);  // Legal Name
  sheet.setColumnWidth(4, 80);   // Type
  sheet.setColumnWidth(5, 180);  // Routes To
  sheet.setColumnWidth(6, 90);   // Published

  // Data validation: Type
  var typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['DCM', 'DCO', 'FCM', 'IB'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 4, 200, 1).setDataValidation(typeRule);

  // Data validation: Published
  var pubRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Yes', 'No'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, 200, 1).setDataValidation(pubRule);

  var brandCount = seedData.filter(function(r) { return r[0] !== ''; }).length;
  var standaloneCount = seedData.filter(function(r) { return r[0] === ''; }).length;

  console.log('Seeded "' + SHEET_NETWORK_ENTITIES + '" with ' + seedData.length + ' rows (' +
    brandCount + ' branded, ' + standaloneCount + ' standalone).');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Seeded with ' + seedData.length + ' entity rows.',
    'Network Entities Created', 5
  );
}
