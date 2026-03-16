/**
 * RegStatus.gs — Regulatory Status tracker helpers
 *
 * Provides:
 *  - seedRegStatus()          One-time scan of Alerts Log for registration-related items
 *  - reseedRegSheet()         Clears and reseeds the Regulatory Status tab with current data
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

/** Column headers for the Regulatory Status tab */
var REG_HEADERS = [
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
 * Master seed data for the Regulatory Status tab.
 * Sources: CFTC Industry Filings — Trading Organizations + Clearing Organizations pages
 * Last verified: 2026-03-16
 */
function getRegSeedData_() {
  return [
    // ══════════════════════════════════════
    // CFTC DESIGNATED — DCMs
    // ══════════════════════════════════════
    ['Chicago Mercantile Exchange, Inc.', 'DCM', 'CFTC Designated', '', '2000-12-21', '2000-12-21', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/34528', 'CME Group; event contracts MM program (up to 7 unnamed prop firms)'],
    ['Board of Trade of the City of Chicago, Inc.', 'DCM', 'CFTC Designated', '', '2000-12-21', '2000-12-21', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/34525', 'CME Group (CBOT)'],
    ['New York Mercantile Exchange, Inc.', 'DCM', 'CFTC Designated', '', '2000-12-21', '2000-12-21', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/74', 'CME Group (NYMEX)'],
    ['Commodity Exchange, Inc.', 'DCM', 'CFTC Designated', '', '2000-12-21', '2000-12-21', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/34529', 'CME Group (COMEX)'],
    ['MIAX Futures Exchange, LLC', 'DCM', 'CFTC Designated', '', '2000-12-21', '2000-12-21', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/57', 'Formerly Minneapolis Grain Exchange'],
    ['Cboe Futures Exchange, LLC', 'DCM', 'CFTC Designated', '', '2003-08-07', '2003-08-07', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/34527', ''],
    ['North American Derivatives Exchange, Inc. (Crypto.com)', 'DCM', 'CFTC Designated', '', '2004-02-18', '2004-02-18', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/34536', 'Formerly HedgeStreet, Inc., then Nadex; acquired by Crypto.com'],
    ['ICE Futures U.S., Inc.', 'DCM', 'CFTC Designated', '', '2004-06-10', '2004-06-10', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/69', 'ICE-owned; formerly NYBOT'],
    ['FMX Futures Exchange, L.P.', 'DCM', 'CFTC Designated', '', '2010-04-20', '2010-04-20', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations', 'Formerly Cantor Futures Exchange, L.P.'],
    ['Cboe Digital Exchange', 'DCM', 'CFTC Designated', '', '2011-10-28', '2011-10-28', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations', 'Formerly Eris Exchange; crypto derivatives'],
    ['Nodal Exchange, LLC', 'DCM', 'CFTC Designated', '', '2013-09-27', '2013-09-27', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations', 'Power and environmental derivatives'],
    ['Rothera Exchange and Clearing LLC', 'DCM', 'CFTC Designated', '', '2019-06-24', '2026-01-20', 'DCM designation granted; name changed to Rothera 01/20/2026', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/40473', 'Formerly LedgerX LLC, FTX US Derivatives, MIAX Derivatives Exchange; Robinhood/SIG JV'],
    ['Small Exchange, Inc. (Kraken)', 'DCM', 'CFTC Designated', '', '2020-03-10', '2020-03-10', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/40643', 'Acquired by Kraken; Liquidity Incentive Program (LIP)'],
    ['Bitnomial Exchange, LLC', 'DCM', 'CFTC Designated', '', '2020-04-17', '2020-04-17', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/35346', 'Crypto derivatives; no event contracts listed'],
    ['Kalshi (KalshiEx LLC)', 'DCM', 'CFTC Designated', '', '2020-11-03', '2025-01-17', 'Commission granted petition to permit intermediated futures trading', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/42993', 'Originally designated 11/03/2020'],
    ['Coinbase Derivatives, LLC', 'DCM', 'CFTC Designated', '', '2020-11-23', '2023-12-21', 'DCM designation granted; name changed from LMX Labs 12/21/2023', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/43304', 'Formerly LMX Labs, LLC (FairX); crypto derivatives only, no event contracts listed; Perp Style Futures MM Program'],
    ['IMX Health, LLC', 'DCM', 'CFTC Designated', '', '2024-01-18', '2024-01-18', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/48926', 'Health/wellness event contracts'],
    ['ForecastEx LLC', 'DCM', 'CFTC Designated', '', '2024-06-24', '2024-06-24', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/48213', 'Interactive Brokers subsidiary'],
    ['Quanta Exchange, Inc.', 'DCM', 'CFTC Designated', '', '2025-05-30', '2025-05-30', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/50639', 'Formerly The Environmental Exchange, Inc. (name changed 3/19/2025)'],
    ['Railbird Exchange, LLC', 'DCM', 'CFTC Designated', '', '2025-06-13', '2025-06-13', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/50090', 'Acquired by DraftKings (Gus III LLC)'],
    ['QCX LLC (Polymarket US)', 'DCM', 'CFTC Designated', '', '2025-07-09', '2025-07-09', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/49571', 'Operating under assumed name Polymarket US'],
    ['Electron Exchange DCM, LLC', 'DCM', 'CFTC Designated', '', '2025-08-29', '2025-08-29', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/51073', 'Also has DCO (Electron Exchange DCO, LLC, registered 08/25/2025)'],
    ['Aristotle Exchange DCM, Inc.', 'DCM', 'CFTC Designated', '', '2025-09-05', '2025-09-05', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/46990', 'Acquired by Underdog (3/9/2026)'],
    ['Gemini Titan, LLC', 'DCM', 'CFTC Designated', '', '2025-12-10', '2025-12-10', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/44472', 'DCO pending via Gemini Olympus, LLC'],
    ['Xchange Alpha, LLC', 'DCM', 'CFTC Designated', '', '2026-01-30', '2026-01-30', 'DCM designation granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/56939', ''],

    // ══════════════════════════════════════
    // CFTC REGISTERED — DCOs
    // ══════════════════════════════════════
    ['Chicago Mercantile Exchange, Inc.', 'DCO', 'CFTC Registered', '', '2000-12-21', '2000-12-21', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations', 'CME Group'],
    ['ICE Clear US, Inc.', 'DCO', 'CFTC Registered', '', '2000-12-21', '2000-12-21', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations', 'ICE-owned; clears for ICE Futures U.S.'],
    ['MIAX Futures Exchange, LLC', 'DCO', 'CFTC Registered', '', '2000-12-21', '2000-12-21', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations', 'Formerly Minneapolis Grain Exchange'],
    ['NADEX d/b/a Crypto.com Derivatives North America', 'DCO', 'CFTC Registered', '', '2004-02-18', '2004-02-18', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/38', 'Formerly HedgeStreet, Inc.; clears margined futures and fully collateralized futures/options/swaps'],
    ['CX Clearinghouse, L.P.', 'DCO', 'CFTC Registered', '', '2010-04-20', '2010-04-20', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/16767', 'Formerly Cantor Clearinghouse, L.P.'],
    ['Nodal Clear, LLC', 'DCO', 'CFTC Registered', '', '2015-09-24', '2015-09-24', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations', 'Clearing arm for Nodal Exchange, LLC'],
    ['Rothera Exchange and Clearing LLC', 'DCO', 'CFTC Registered', '', '2017-07-24', '2017-07-24', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/30998', 'Formerly LedgerX LLC, FTX US Derivatives, MIAX Derivatives Exchange; Robinhood/SIG JV'],
    ['Cboe Clear US, LLC', 'DCO', 'CFTC Registered', '', '2019-07-01', '2019-07-01', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations', 'Clearing arm for Cboe Digital Exchange'],
    ['Bitnomial Clearinghouse, LLC', 'DCO', 'CFTC Registered', '', '2023-12-15', '2023-12-15', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations', 'Clearing arm for Bitnomial Exchange, LLC'],
    ['ForecastEx LLC', 'DCO', 'CFTC Registered', '', '2024-06-24', '2024-06-24', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/50835', 'Interactive Brokers subsidiary; clears fully collateralized swaps'],
    ['Kalshi Klear LLC', 'DCO', 'CFTC Registered', '', '2024-08-28', '2024-08-28', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/53075', 'Clears fully collateralized swaps'],
    ['QC Clearing LLC (Polymarket Clearing)', 'DCO', 'CFTC Registered', '', '2024-12-16', '2024-12-16', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/50836', 'Clearing arm for QCX LLC (Polymarket US)'],
    ['Electron Exchange DCO, LLC', 'DCO', 'CFTC Registered', '', '2025-08-25', '2025-08-25', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/55359', 'Clearing arm for Electron Exchange DCM, LLC'],
    ['Aristotle Exchange DCO, Inc.', 'DCO', 'CFTC Registered', '', '2025-09-05', '2025-09-05', 'DCO registration granted', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations', 'Clearing arm for Aristotle Exchange DCM; acquired by Underdog (3/9/2026)'],

    // ══════════════════════════════════════
    // CFTC PENDING — DCM Applications
    // ══════════════════════════════════════
    ['GFI Futures Exchange LLC', 'DCM', 'CFTC Pending', '2013-03-19', '', '2026-03-16', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations', 'Application pending since 2013'],
    ['Aqua-Index Exchange, LLC', 'DCM', 'CFTC Pending', '2015-08-10', '', '2026-03-16', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations', 'Application pending since 2015'],
    ['American Gas Exchange, LLC', 'DCM', 'CFTC Pending', '2016-09-20', '', '2026-03-16', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations', 'Application pending since 2016'],
    ['OneChronos Markets DCM LLC', 'DCM', 'CFTC Pending', '2025-07-31', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/57746', ''],
    ['RSBIX, LLC (Matchbook)', 'DCM', 'CFTC Pending', '2025-09-16', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58152', ''],
    ['ProphetX LLC', 'DCM', 'CFTC Pending', '2025-11-07', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58754', 'Also filed DCO (2025-11-18)'],
    ['tZERO DCM, LLC', 'DCM', 'CFTC Pending', '2025-11-21', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58712', 'Also filed DCO (2025-09-18)'],
    ['XV Exchange, LLC (STX)', 'DCM', 'CFTC Pending', '2025-12-09', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/58807', 'Also filed DCO via XV Clearing (2026-02-27)'],
    ['Optex Markets LLC', 'DCM', 'CFTC Pending', '2026-01-13', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59349', ''],
    ['Ludlow Exchange, LLC (Novig)', 'DCM', 'CFTC Pending', '2026-01-21', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59390', ''],
    ['Water Street Labs, LLC', 'DCM', 'CFTC Pending', '2026-01-22', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59469', ''],
    ['Juice Exchange, LLC', 'DCM', 'CFTC Pending', '2026-01-27', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59480', ''],
    ['Sporttrade DCM LLC', 'DCM', 'CFTC Pending', '2026-01-27', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59605', 'Also filed DCO (2026-01-27)'],
    ['PMEX Markets', 'DCM', 'CFTC Pending', '2026-02-09', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59665', 'Also filed DCO via PMEX Clearing (2026-02-09)'],
    ['PredictCraft Mkt Inc. (DimeTrades)', 'DCM', 'CFTC Pending', '2026-02-11', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59756', ''],
    ['Smarkets Board of Trade Exchange LLC', 'DCM', 'CFTC Pending', '2026-03-03', '', '2026-03-10', 'DCM application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/59862', 'Also filed DCO via Smarkets Board of Trade Clearing (2026-02-11)'],

    // ══════════════════════════════════════
    // CFTC PENDING — DCO Applications
    // ══════════════════════════════════════
    ['tZERO DCO, LLC', 'DCO', 'CFTC Pending', '2025-09-18', '', '2026-03-10', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59186', 'Also filed DCM (2025-11-21)'],
    ['ProphetX LLC', 'DCO', 'CFTC Pending', '2025-11-18', '', '2026-03-10', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59187', 'Also filed DCM (2025-11-07)'],
    ['ICE Direct Clear, Inc.', 'DCO', 'CFTC Pending', '2025-12-02', '', '2026-03-10', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59188', 'ICE subsidiary — dedicated PM clearing'],
    ['Gemini Olympus, LLC', 'DCO', 'CFTC Pending', '2025-12-17', '', '2026-03-10', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59189', 'Clearing arm for Gemini Titan (DCM designated 2025-12-10)'],
    ['Sporttrade DCO LLC', 'DCO', 'CFTC Pending', '2026-01-27', '', '2026-03-10', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59607', 'Also filed DCM (2026-01-27)'],
    ['Quanta Clear, Inc.', 'DCO', 'CFTC Pending', '2026-01-30', '', '2026-03-10', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59642', 'Quanta Exchange DCM designated 2025-05-30'],
    ['PMEX Clearing, Inc.', 'DCO', 'CFTC Pending', '2026-02-09', '', '2026-03-10', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations/59720', 'Also filed DCM via PMEX Markets (2026-02-09)'],
    ['Smarkets Board of Trade Clearing LLC', 'DCO', 'CFTC Pending', '2026-02-11', '', '2026-03-10', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations', 'Also filed DCM via Smarkets Board of Trade Exchange (2026-03-03)'],
    ['XV Clearing, LLC (STX)', 'DCO', 'CFTC Pending', '2026-02-27', '', '2026-03-10', 'DCO application filed', 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations', 'Also filed DCM via XV Exchange (2025-12-09)'],

    // ══════════════════════════════════════
    // NFA REGISTERED — FCMs (Futures Commission Merchants)
    // ══════════════════════════════════════
    ['Coinbase Financial Markets, Inc.', 'FCM', 'NFA Registered', '', '2023-08-14', '2026-03-10', 'FCM registration granted', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=hDSLhKvcHgE%3D', 'Offers Kalshi event contracts'],
    ['Robinhood Derivatives, LLC', 'FCM', 'NFA Registered', '', '2024-01-01', '2026-03-10', 'FCM registration granted', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=FKlW2H4UPq0%3D', 'NFA ID 0424278; Kalshi and ForecastEx clearing member; JV with SIG owns Rothera Exchange DCM/DCO'],
    ['Webull Financial LLC', 'FCM', 'NFA Registered', '', '', '2026-03-10', 'FCM registration granted', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=s1SZsbNB0%2Bo%3D', 'Offers Kalshi event contracts'],
    ['Interactive Brokers LLC', 'FCM', 'NFA Registered', '', '', '2026-03-10', 'FCM registration granted', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=QHPcC3ptg/I%3D', 'ForecastEx parent company; CME Group clearing member'],
    ['Performance Predictions II, LLC (PrizePicks)', 'FCM', 'NFA Registered', '', '2025-09-23', '2026-03-10', 'First sports entertainment operator to receive FCM registration', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=cq4lPPPq0Ew%3D', 'Offers Kalshi event contracts'],
    ['Sleeper Markets LLC', 'FCM', 'NFA Registered', '', '2026-01-15', '2026-03-10', 'NFA approved FCM and swap firm registration', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=tlPlEWtBnsQ%3D', 'Offers Kalshi event contracts; previously sued CFTC over delayed approval'],
    ['FanDuel Prediction Markets LLC', 'FCM', 'NFA Registered', '', '2025-12-22', '2026-03-10', 'FCM registration granted', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=pw8YVHX3mNs%3D', 'Offers CME Group event contracts'],
    ['UDM LLC (Underdog)', 'FCM', 'NFA Registered', '', '2026-01-09', '2026-03-10', 'NFA approved FCM and swap firm registration', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=5BM2rMKqO5w%3D', 'Acquired Aristotle Exchange DCM/DCO (3/9/2026)'],

    // ══════════════════════════════════════
    // NFA REGISTERED — IBs (Introducing Brokers)
    // ══════════════════════════════════════
    ['Gus III LLC (DraftKings Predictions)', 'IB', 'NFA Registered', '', '2025-12-04', '2026-03-10', 'IB registration granted; launched DraftKings Predictions in 38 states', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=5AIFEr/FlzA%3D', 'Introduces customers to CME Group event contracts; acquired Railbird Exchange DCM'],
    ['Paragon Global Markets LLC (Fanatics Markets)', 'IB', 'NFA Registered', '', '2025-07-01', '2026-03-10', 'Fanatics acquired Paragon for NFA IB status; rebranded as Fanatics Markets IB', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=jHY1Hb7WkB4%3D', 'Introduces customers to Crypto.com/CDNA event contracts'],

    // ══════════════════════════════════════
    // NFA PENDING — FCM/IB Applications
    // ══════════════════════════════════════
    ['Gus III LLC (DraftKings Predictions)', 'FCM', 'NFA Pending', '2026-02-27', '', '2026-03-11', 'FCM application pending; upgrading from IB', 'https://www.nfa.futures.org/BasicNet/basic-profile.aspx?nfaid=5AIFEr/FlzA%3D', 'Already registered as IB (12/04/2025); acquired Railbird Exchange DCM'],
    ['Splash (BetterPool)', 'IB', 'NFA Pending', '2025-08-20', '', '2026-03-13', 'IB application pending', 'https://www.nfa.futures.org/BasicNet/basic-search-landing.aspx', 'Stealth VC-funded sports betting tech company']
  ];
}

/**
 * Reseed the Regulatory Status tab — clears existing data and writes
 * the latest seed data. Preserves the tab and headers.
 *
 * Run from Apps Script editor: Run > reseedRegSheet
 */
function reseedRegSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_REG_STATUS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_REG_STATUS);
  }

  // Clear everything
  sheet.clear();

  // Write headers
  sheet.getRange(1, 1, 1, REG_HEADERS.length).setValues([REG_HEADERS]);
  sheet.getRange(1, 1, 1, REG_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  // Write seed data
  var seedData = getRegSeedData_();
  sheet.getRange(2, 1, seedData.length, REG_HEADERS.length).setValues(seedData);

  // Set column widths
  sheet.setColumnWidth(1, 280);  // Entity
  sheet.setColumnWidth(2, 140);  // Registration Type
  sheet.setColumnWidth(3, 120);  // Status
  sheet.setColumnWidth(4, 120);  // Application Date
  sheet.setColumnWidth(5, 120);  // Effective Date
  sheet.setColumnWidth(6, 120);  // Last Updated
  sheet.setColumnWidth(7, 300);  // Last Update Summary
  sheet.setColumnWidth(8, 250);  // Source URL
  sheet.setColumnWidth(9, 400);  // Notes

  // Data validation for Status column
  var statusValues = ['CFTC Designated', 'CFTC Registered', 'CFTC Pending', 'NFA Registered', 'NFA Pending', 'Denied', 'Withdrawn', 'Suspended'];
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(statusValues, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 3, 200, 1).setDataValidation(statusRule);

  // Data validation for Registration Type column
  var regTypes = ['DCM', 'DCO', 'FCM', 'IB'];
  var typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(regTypes, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 2, 200, 1).setDataValidation(typeRule);

  console.log('Reseeded "' + SHEET_REG_STATUS + '" with ' + seedData.length + ' rows (' +
    seedData.filter(function(r) { return r[2] === 'CFTC Designated'; }).length + ' CFTC designated, ' +
    seedData.filter(function(r) { return r[2] === 'CFTC Registered'; }).length + ' CFTC registered, ' +
    seedData.filter(function(r) { return r[2] === 'NFA Registered'; }).length + ' NFA registered, ' +
    seedData.filter(function(r) { return r[2] === 'CFTC Pending'; }).length + ' CFTC pending, ' +
    seedData.filter(function(r) { return r[2] === 'NFA Pending'; }).length + ' NFA pending).');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Reseeded with ' + seedData.length + ' rows.',
    'Regulatory Status Updated', 5
  );
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
}
