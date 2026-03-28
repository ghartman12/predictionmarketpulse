#!/usr/bin/env node
/**
 * NFA BASIC Registry Checker
 *
 * Calls the NFA BASIC JSON-RPC API to:
 * 1. Check registration status of all tracked entities
 * 2. Search for new filings from CFTC-pending entities
 * 3. Track principal changes (owners + officers)
 *
 * Usage: node scripts/check-nfa.js
 *        node scripts/check-nfa.js --save-snapshot  (save current principals as baseline)
 */

const fs = require('fs');
const path = require('path');
const SNAPSHOT_PATH = path.join(__dirname, 'nfa-principals-snapshot.json');

const SEARCH_URL = 'https://www.nfa.futures.org/BasicNet/basic-api/DataHandlerSearch.ashx';
const DATA_URL = 'https://www.nfa.futures.org/BasicNet/basic-api/DataHandler.ashx';

// Tracked entities — encrypted NFA IDs from profile URLs
const TRACKED = [
  { name: 'Coinbase Financial Markets, Inc.', nfaid: 'LwP0Tg5Wck0=', type: 'FCM', expectedStatus: 'NFA Registered' },
  { name: 'Robinhood Derivatives, LLC', nfaid: 'FKlW2H4UPq0=', type: 'FCM', expectedStatus: 'NFA Registered' },
  { name: 'Webull Financial LLC', nfaid: 's1SZsbNB0+o=', type: 'FCM', expectedStatus: 'NFA Registered' },
  { name: 'Interactive Brokers LLC', nfaid: 'QHPcC3ptg/I=', type: 'FCM', expectedStatus: 'NFA Registered' },
  { name: 'Performance Predictions II, LLC (PrizePicks)', nfaid: 'cq4lPPPq0Ew=', type: 'FCM', expectedStatus: 'NFA Registered' },
  { name: 'Sleeper Markets LLC', nfaid: 'tlPlEWtBnsQ=', type: 'FCM', expectedStatus: 'NFA Registered' },
  { name: 'FanDuel Prediction Markets LLC', nfaid: 'BsRvT6gsxO8=', type: 'FCM', expectedStatus: 'NFA Registered' },
  { name: 'UDM LLC (Underdog)', nfaid: '5BM2rMKqO5w=', type: 'FCM', expectedStatus: 'NFA Registered' },
  { name: 'Gus III LLC (DraftKings Predictions)', nfaid: '5AIFEr/FlzA=', type: 'IB', expectedStatus: 'NFA Registered' },
  { name: 'Paragon Global Markets LLC (Fanatics Markets)', nfaid: 'jHY1Hb7WkB4=', type: 'IB', expectedStatus: 'NFA Registered' },
  { name: 'Splash (BetterPool)', nfaid: 'zDAXVCAc7wQ=', type: 'IB', expectedStatus: 'NFA Registered' },
  { name: 'Morton St Trading Investments, LLC (Fanatics Markets FCM)', nfaid: 'R1CTB9HmQh4=', type: 'FCM', expectedStatus: 'NFA Registered' },
  { name: 'Predictor LLC (Galactic Markets)', nfaid: 'gfNvP+bD1ik=', type: 'IB', expectedStatus: 'NFA Pending' },
];

// Entities to search for — CFTC pending applicants + watch list
const SEARCH_ENTITIES = [
  'Sporttrade',
  'PMEX',
  'Smarkets',
  'ProphetX',
  'Juice Exchange',
  'Water Street Labs',
  'Ludlow',
  'Novig',
  'Optex',
  'PredictCraft',
  'DimeTrades',
  'XV Exchange',
  'Xchange Alpha',
  'Galactic Markets',
  'Morton St',
  'Fanatics',
  'Predictor',
];

// Ignored NFA IDs — reviewed, not actionable (holding companies, unrelated entities, etc.)
const IGNORED_IDS = new Set([
  '0573105', // Morton St Trading Holdco Inc
  '0571464', // Morton St Trading Intermediate Holdco LLC
  '0571225', // Morton St Trading Opco LLC
  '0573104', // Morton St Trading Topco Inc
  '0573106', // Fanatics Global Holdco LLC
  '0573107', // Fanatics Holdings Inc
  '0574450', // Galactic Markets Inc — not an NFA member, watching
  '0533860', // Gemini Galactic Markets LLC — unrelated to prediction markets
  // '0574423', // Predictor LLC — moved to TRACKED
  '0187681', // Interest Rate Predictor — unrelated
  '0576587', // Ludlow Exchange LLC — registered NFA ID but no registrations yet
]);

// Also check DraftKings FCM upgrade status
const DRAFTKINGS_FCM_CHECK = { name: 'Gus III LLC (DraftKings)', nfaid: '5AIFEr/FlzA=', pendingType: 'FCM' };

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-JSON-RPC': method,
    },
    body: JSON.stringify({ id: 1, method, params }),
  });
  return res.json();
}

async function getVitalSwitches(nfaid) {
  const res = await rpc(DATA_URL, 'getVitalSwitches', [nfaid]);
  if (res.result?.success && res.result.result?.[0]) {
    return res.result.result[0];
  }
  return null;
}

async function getRegistrationCodes(decryptedId) {
  const res = await rpc(DATA_URL, 'getRegistrationCodes', [decryptedId]);
  if (res.result?.success) {
    return res.result.result || [];
  }
  return null;
}

async function getMembershipStatus(decryptedId) {
  const res = await rpc(DATA_URL, 'getMembershipStatus', [decryptedId, true, false]);
  if (res.result?.success) {
    return res.result.result?.[0] || null;
  }
  return null;
}

async function getHistory(decryptedId) {
  const res = await rpc(DATA_URL, 'getHistory', [decryptedId]);
  if (res.result?.success) {
    return res.result.result || [];
  }
  return [];
}

async function getPrincipals(decryptedId) {
  const res = await rpc(DATA_URL, 'getPrincipals', [decryptedId]);
  if (res.result?.success) {
    return res.result.result || [];
  }
  return [];
}

function extractDates(history, catType) {
  const pending = history.find(h => h.CATEGORY_TYPE_CODE === catType && h.DESCRIPTION.includes('PENDING'));
  const registered = history.find(h => h.CATEGORY_TYPE_CODE === catType && (h.DESCRIPTION.includes('REGISTERED') || h.DESCRIPTION.includes('APPROVED')));
  return {
    applicationDate: pending?.EFFECTIVE_DATE || null,
    effectiveDate: registered?.EFFECTIVE_DATE || null,
  };
}

async function searchFirm(searchText) {
  const options = {
    pageIndex: 0,
    pageSize: 50,
    totalPages: 0,
    totalCount: 0,
    sort: [{ active: true, column: 'FIRM_NAME', direction: 'asc' }],
    filters: { memStatus: '', regTypes: '', regActions: '' },
    filterOptions: { memStatus: null, regTypes: null, regActions: null },
  };
  const res = await rpc(SEARCH_URL, 'getFirmSearchResults', [searchText, options]);
  if (res.result?.success) {
    return res.result.result?.result?.rows || [];
  }
  return [];
}

async function checkTrackedEntity(entity) {
  const vitals = await getVitalSwitches(entity.nfaid);
  if (!vitals) {
    return { ...entity, error: 'Could not fetch VitalSwitches' };
  }

  const decId = vitals.NFA_ID_decrypted;
  const [regCodes, membership, history] = await Promise.all([
    getRegistrationCodes(decId),
    getMembershipStatus(decId),
    getHistory(decId),
  ]);

  const regTypes = regCodes
    ? regCodes.filter(r => r.DISPLAY_TEXT).map(r => `${r.CAT_TYPE_CODE} (${r.STATUS_TYPE_CODE})`).join(', ')
    : 'unknown';

  const memberStatus = membership?.BANNER_STATUS_TEXT || 'unknown';
  const isMember = membership?.IS_NFA_MEMBER || false;

  const dates = extractDates(history, entity.type);

  return {
    name: entity.name,
    nfaId: decId,
    expectedType: entity.type,
    expectedStatus: entity.expectedStatus,
    currentRegTypes: regTypes,
    currentMemberStatus: memberStatus,
    isMember,
    allRegCodes: regCodes,
    applicationDate: dates.applicationDate,
    effectiveDate: dates.effectiveDate,
    history,
  };
}

function formatRegCodes(codes) {
  if (!codes || codes.length === 0) return '-';
  return codes
    .map(r => {
      const status = r.STATUS_TYPE_CODE === 'REG' ? 'Registered'
        : r.STATUS_TYPE_CODE === 'APRV' ? 'Approved'
        : r.STATUS_TYPE_CODE === 'PEND' ? 'PENDING'
        : r.STATUS_TYPE_CODE;
      if (!r.DISPLAY_TEXT && r.CAT_TYPE_CODE === 'SF') return `Swap Firm (${status})`;
      if (!r.DISPLAY_TEXT && r.CAT_TYPE_CODE === 'NBD') return null; // skip NDB
      return r.DISPLAY_TEXT ? `${r.DISPLAY_TEXT} (${status})` : null;
    })
    .filter(Boolean)
    .join(', ');
}

async function main() {
  console.log('='.repeat(70));
  console.log('NFA BASIC Registry Check —', new Date().toISOString().split('T')[0]);
  console.log('='.repeat(70));

  // 1. Check tracked entities
  console.log('\n## TRACKED ENTITIES\n');
  const changes = [];

  for (const entity of TRACKED) {
    const result = await checkTrackedEntity(entity);
    if (result.error) {
      console.log(`  ❌ ${result.name}: ${result.error}`);
      continue;
    }

    const regDisplay = formatRegCodes(result.allRegCodes);
    const memberLower = result.currentMemberStatus.toLowerCase();
    const statusMatch = (memberLower.includes('approved') || memberLower.includes('member')) &&
      !memberLower.includes('pending');

    // Check for FCM upgrade (DraftKings)
    const hasFCM = result.allRegCodes?.some(r => r.CAT_TYPE_CODE === 'FCM');
    const hasIB = result.allRegCodes?.some(r => r.CAT_TYPE_CODE === 'IB');
    const hasPendingFCM = result.allRegCodes?.some(r => r.CAT_TYPE_CODE === 'FCM' && r.STATUS_TYPE_CODE === 'PEND');

    let flag = '';
    if (entity.type === 'IB' && hasFCM && !hasPendingFCM) {
      flag = ' ⚠️  FCM UPGRADE COMPLETED';
      changes.push(`${entity.name}: FCM upgrade from IB is now approved/registered`);
    }
    if (entity.expectedStatus === 'NFA Pending' && statusMatch) {
      flag = ' ⚠️  NOW REGISTERED/APPROVED';
      changes.push(`${entity.name}: Status changed from Pending to ${result.currentMemberStatus}`);
    }
    if (entity.expectedStatus === 'NFA Registered' && !statusMatch) {
      flag = ' ⚠️  STATUS CHANGE';
      changes.push(`${entity.name}: Expected registered but got "${result.currentMemberStatus}"`);
    }

    const dateStr = result.applicationDate || result.effectiveDate
      ? ` | Applied: ${result.applicationDate || '—'} | Effective: ${result.effectiveDate || '—'}`
      : '';
    console.log(`  ${flag ? '⚠️ ' : '✅'} ${result.name} (NFA ${result.nfaId})`);
    console.log(`     Reg: ${regDisplay}${dateStr}`);
    console.log(`     Member: ${result.currentMemberStatus}${flag}`);
  }

  // 2. Search for new filers
  console.log('\n## NEW FILER SEARCH\n');
  const knownIds = new Set();

  // Collect known IDs first
  for (const entity of TRACKED) {
    const vitals = await getVitalSwitches(entity.nfaid);
    if (vitals) knownIds.add(vitals.NFA_ID_decrypted);
  }

  for (const searchTerm of SEARCH_ENTITIES) {
    const results = await searchFirm(searchTerm);
    const unknown = results.filter(r => !knownIds.has(r.ENTITY_ID_decrypted) && !IGNORED_IDS.has(r.ENTITY_ID_decrypted));

    if (unknown.length > 0) {
      for (const r of unknown) {
        const regTypes = r.CURRENT_REG_TYPES || '-';
        const memStatus = r.PROCESSED_MEMBERSHIP_STATUS || 'Unknown';
        const isInteresting = regTypes !== '-' || memStatus.includes('Member') || memStatus.includes('Pending');

        if (isInteresting) {
          console.log(`  🆕 "${searchTerm}" → ${r.FIRM_NAME} (NFA ${r.ENTITY_ID_decrypted})`);
          console.log(`     Reg: ${regTypes} | Status: ${memStatus}`);
          changes.push(`New entity found: ${r.FIRM_NAME} (NFA ${r.ENTITY_ID_decrypted}) — ${regTypes}, ${memStatus}`);
        } else {
          console.log(`  ℹ️  "${searchTerm}" → ${r.FIRM_NAME} (NFA ${r.ENTITY_ID_decrypted}) — ${memStatus}, no registrations`);
        }
      }
    } else if (results.length === 0) {
      console.log(`  ·  "${searchTerm}" — no results`);
    } else {
      console.log(`  ·  "${searchTerm}" — ${results.length} result(s), all known`);
    }
  }

  // 3. Check principals
  console.log('\n## PRINCIPAL CHANGES\n');

  let snapshot = {};
  try {
    snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
  } catch {
    console.log('  ℹ️  No snapshot file found. Run with --save-snapshot to create baseline.');
  }

  const currentSnapshot = {};
  const saveMode = process.argv.includes('--save-snapshot');

  for (const entity of TRACKED) {
    const vitals = await getVitalSwitches(entity.nfaid);
    if (!vitals) continue;
    const decId = vitals.NFA_ID_decrypted;
    const principals = await getPrincipals(decId);

    const principalList = principals.map(p => ({
      name: p.NAME,
      title: (p.TITLE_NAME || '').trim(),
      tenPercent: p.TEN_PERCENT_IND,
      nfaId: p.ENTITY_ID_decrypted,
    }));

    currentSnapshot[decId] = {
      entityName: entity.name,
      principals: principalList,
    };

    // Compare against snapshot
    const prev = snapshot[decId];
    if (prev) {
      const prevIds = new Set(prev.principals.map(p => p.nfaId));
      const currIds = new Set(principalList.map(p => p.nfaId));

      const added = principalList.filter(p => !prevIds.has(p.nfaId));
      const removed = prev.principals.filter(p => !currIds.has(p.nfaId));

      // Check for title changes
      const titleChanges = principalList.filter(p => {
        const old = prev.principals.find(o => o.nfaId === p.nfaId);
        return old && old.title !== p.title;
      });

      if (added.length > 0) {
        added.forEach(p => {
          const role = p.tenPercent === 'YES' ? '10%+ Owner' : p.title || 'Principal';
          console.log(`  🆕 ${entity.name}: Added ${p.name} — ${role}`);
          changes.push(`${entity.name}: New principal ${p.name} (${role})`);
        });
      }
      if (removed.length > 0) {
        removed.forEach(p => {
          const role = p.tenPercent === 'YES' ? '10%+ Owner' : p.title || 'Principal';
          console.log(`  ⚠️  ${entity.name}: Removed ${p.name} — ${role}`);
          changes.push(`${entity.name}: Removed principal ${p.name} (${role})`);
        });
      }
      if (titleChanges.length > 0) {
        titleChanges.forEach(p => {
          const old = prev.principals.find(o => o.nfaId === p.nfaId);
          console.log(`  ⚠️  ${entity.name}: ${p.name} title changed: "${old.title}" → "${p.title}"`);
          changes.push(`${entity.name}: ${p.name} title changed to "${p.title}"`);
        });
      }
      if (added.length === 0 && removed.length === 0 && titleChanges.length === 0) {
        console.log(`  ✅ ${entity.name} — ${principalList.length} principals, no changes`);
      }
    } else if (Object.keys(snapshot).length > 0) {
      console.log(`  ℹ️  ${entity.name} — ${principalList.length} principals (new entity, no baseline)`);
    }
  }

  if (saveMode || Object.keys(snapshot).length === 0) {
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(currentSnapshot, null, 2));
    console.log(`\n  💾 Snapshot saved to ${SNAPSHOT_PATH}`);
  }

  // 4. Summary
  console.log('\n' + '='.repeat(70));
  if (changes.length > 0) {
    console.log('⚠️  CHANGES DETECTED:\n');
    changes.forEach(c => console.log(`  • ${c}`));
    console.log('='.repeat(70));
    process.exit(1);
  } else {
    console.log('✅ No changes detected. All entities match expected status.');
    console.log('='.repeat(70));
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
