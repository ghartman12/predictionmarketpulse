#!/usr/bin/env node
/**
 * CFTC Filing Checker
 *
 * Fetches CFTC Trading Organizations and Clearing Organizations pages,
 * parses all designated/registered and pending entities, and compares
 * against a known baseline.
 *
 * Usage: node scripts/check-cftc.js
 * Exit code: 0 = no changes, 1 = changes detected
 */

const TRADING_ORGS_URL = 'https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations';
const CLEARING_ORGS_URL = 'https://www.cftc.gov/IndustryOversight/IndustryFilings/ClearingOrganizations';

// Legacy exchanges on a separate part of the CFTC page — will never change, skip matching
// CME, CBOT, NYMEX, COMEX, MIAX, Cboe Futures, NADEX/Crypto.com, ICE Futures U.S.

// Baseline: known DCMs (designated) — only entities on the main table
const KNOWN_DCMS_DESIGNATED = [
  'FMX Futures Exchange',
  'Cboe Digital Exchange',
  'Nodal Exchange',
  'Rothera Exchange and Clearing',
  'Small Exchange',
  'Bitnomial Exchange',
  'Kalshi',
  'Coinbase Derivatives',
  'IMX Health',
  'ForecastEx',
  'Quanta Exchange',
  'Railbird Exchange',
  'QCX',
  'Electron Exchange DCM',
  'Aristotle Exchange DCM',
  'Gemini Titan',
  'Xchange Alpha',
];

// Baseline: known DCMs (pending)
const KNOWN_DCMS_PENDING = [
  'GFI Futures Exchange',
  'Aqua-Index Exchange',
  'American Gas Exchange',
  'OneChronos Markets DCM',
  'RSBIX',
  'ProphetX',
  'tZERO DCM',
  'XV Exchange',
  'Optex Markets',
  'Ludlow Exchange',
  'Water Street Labs',
  'Juice Exchange',
  'Sporttrade DCM',
  'PMEX Markets',
  'PredictCraft',
  'Smarkets Board of Trade Exchange',
];

// Baseline: known DCOs (registered)
const KNOWN_DCOS_REGISTERED = [
  'Chicago Mercantile Exchange',
  'ICE Clear US',
  'MIAX Futures Exchange',
  'NADEX',
  'CX Clearinghouse',
  'Nodal Clear',
  'Rothera Exchange and Clearing',
  'Cboe Clear US',
  'Bitnomial Clearinghouse',
  'ForecastEx',
  'Kalshi Klear',
  'QC Clearing',
  'QC Clearing',
  'Electron Exchange DCO',
  'Aristotle Exchange DCO',
  'Options Clearing Corporation',
  'LCH Ltd',
  'LCH SA',
  'ICE Clear Credit',
  'ICE Clear Europe',
  'ICE NGX Canada',
  'Eurex Clearing',
];

// Baseline: known DCOs (pending)
const KNOWN_DCOS_PENDING = [
  'tZERO DCO',
  'ProphetX',
  'ICE Direct Clear',
  'Gemini Olympus',
  'Sporttrade DCO',
  'Quanta Clear',
  'PMEX Clearing',
  'Smarkets Board of Trade Clearing',
  'XV Clearing',
];

function normalize(name) {
  return name
    .replace(/,?\s*(LLC|Inc\.?|L\.?P\.?|Ltd\.?|AG|Pty Limited|Corporation)$/gi, '')
    .replace(/\s+d\/b\/a\s+.*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isKnown(name, knownList) {
  const norm = normalize(name);
  return knownList.some(k => {
    const normK = normalize(k);
    return norm.includes(normK) || normK.includes(norm);
  });
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

// Statuses to ignore — historical/inactive entities
const IGNORE_STATUSES = ['dormant', 'vacated', 'withdrawn', 'exempt'];

/**
 * Parse CFTC table rows: <td>Name</td><td>Status</td><td>Date</td><td>Notes</td><td>Link</td>
 */
function parseRows(html) {
  const entities = [];
  const rowPattern = /<tr[^>]*>\s*<td>([^<]+)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>/gi;
  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const name = match[1].trim();
    const status = match[2].trim();
    const date = match[3].trim();
    // Skip header rows, empty rows, and inactive statuses
    if (name && !name.match(/^(Name|Organization|Entity)$/i)) {
      if (!IGNORE_STATUSES.some(s => status.toLowerCase().includes(s))) {
        entities.push({ name, status, date });
      }
    }
  }
  return entities;
}

async function fetchAndParse(url) {
  const html = await fetchPage(url);
  return parseRows(html);
}

async function main() {
  console.log('='.repeat(70));
  console.log('CFTC Filing Check —', new Date().toISOString().split('T')[0]);
  console.log('='.repeat(70));

  const changes = [];

  function checkSection(label, entities, knownApproved, knownPending, approvedLabel, pendingLabel) {
    console.log(`\n## ${label}\n`);

    if (entities.length === 0) {
      console.log('  ⚠️  Could not parse any entities — page structure may have changed');
      return;
    }

    const approved = entities.filter(e => !e.status.toLowerCase().includes('pending'));
    const pending = entities.filter(e => e.status.toLowerCase().includes('pending'));
    console.log(`  Found ${approved.length} ${approvedLabel}, ${pending.length} ${pendingLabel}\n`);

    const allKnown = [...knownApproved, ...knownPending];
    const allNames = entities.map(e => e.name);

    // New entities
    const newEntities = allNames.filter(name => !isKnown(name, allKnown));
    newEntities.forEach(name => {
      const entry = entities.find(e => e.name === name);
      console.log(`  🆕 NEW: ${name} — ${entry.status} (${entry.date})`);
      changes.push(`New ${label}: ${name} — ${entry.status} (${entry.date})`);
    });

    // Missing approved (only flag if not most are missing — parser issue)
    const missingApproved = knownApproved.filter(k => !allNames.some(n => isKnown(n, [k])));
    if (missingApproved.length > 0 && missingApproved.length < knownApproved.length * 0.5) {
      missingApproved.forEach(name => {
        console.log(`  ⚠️  MISSING (${approvedLabel}): ${name}`);
        changes.push(`Missing ${approvedLabel}: ${name}`);
      });
    }

    // Missing pending (a missing pending could mean it was approved!)
    const missingPending = knownPending.filter(k => !allNames.some(n => isKnown(n, [k])));
    if (missingPending.length > 0 && missingPending.length < knownPending.length * 0.5) {
      missingPending.forEach(name => {
        console.log(`  ⚠️  MISSING (${pendingLabel}): ${name} — may have been approved or withdrawn`);
        changes.push(`Missing ${pendingLabel}: ${name}`);
      });
    }

    if (newEntities.length === 0 && missingApproved.length === 0 && missingPending.length === 0) {
      console.log(`  ✅ All known entities accounted for. No changes.`);
    }

    if (missingApproved.length >= knownApproved.length * 0.8) {
      console.log(`  ⚠️  Most ${approvedLabel} missing — page structure may have changed`);
    }
  }

  // 1. Check Trading Organizations (DCMs)
  try {
    const dcmEntities = await fetchAndParse(TRADING_ORGS_URL);
    checkSection('TRADING ORGANIZATIONS (DCMs)', dcmEntities, KNOWN_DCMS_DESIGNATED, KNOWN_DCMS_PENDING, 'designated', 'pending');
  } catch (err) {
    console.log(`\n## TRADING ORGANIZATIONS (DCMs)\n`);
    console.log(`  ❌ Error: ${err.message}`);
  }

  // 2. Check Clearing Organizations (DCOs)
  try {
    const dcoEntities = await fetchAndParse(CLEARING_ORGS_URL);
    checkSection('CLEARING ORGANIZATIONS (DCOs)', dcoEntities, KNOWN_DCOS_REGISTERED, KNOWN_DCOS_PENDING, 'registered', 'pending');
  } catch (err) {
    console.log(`\n## CLEARING ORGANIZATIONS (DCOs)\n`);
    console.log(`  ❌ Error: ${err.message}`);
  }

  // 3. Summary
  console.log('\n' + '='.repeat(70));
  if (changes.length > 0) {
    console.log('⚠️  CHANGES DETECTED:\n');
    changes.forEach(c => console.log(`  • ${c}`));
    console.log('='.repeat(70));
    process.exit(1);
  } else {
    console.log('✅ No changes detected. All CFTC entities match baseline.');
    console.log('='.repeat(70));
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
