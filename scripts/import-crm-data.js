/**
 * CRM Data Import Script
 *
 * Imports venues and communication logs from CSV files into Firestore.
 * Run with: node scripts/import-crm-data.js
 *
 * IMPORTANT: Requires temporarily open Firestore rules on the clients collection.
 * After running, restore authenticated-only rules and redeploy.
 *
 * - Venues CSV → clients collection (with full CRM schema)
 * - Communication Log CSV → clients/{id}/activityLogs sub-collection
 *
 * Uses deterministic IDs based on venue name so it's safe to re-run.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyCqMRpeWfpj3Sv2SSd3nT5GkwK7NC3Ir7s",
  authDomain: "ultraphonics-web.firebaseapp.com",
  projectId: "ultraphonics-web",
  storageBucket: "ultraphonics-web.firebasestorage.app",
  messagingSenderId: "729950319293",
  appId: "1:729950319293:web:b75843574cc5bcec813dd4",
  measurementId: "G-PRBQEMNV4H"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============= CSV PARSER =============

function parseCSV(content) {
  const lines = content.split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else { current += ch; }
  }
  result.push(current);
  return result;
}

// ============= ID GENERATION =============

function generateDeterministicId(name) {
  const normalized = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const hash = createHash('sha256').update(name.trim()).digest('hex').substring(0, 8);
  const slug = normalized.substring(0, 30);
  return `${slug}-${hash}`;
}

function generateLogId(clientName, date, method) {
  const input = `${clientName}|${date}|${method}`.trim();
  return createHash('sha256').update(input).digest('hex').substring(0, 16);
}

// ============= MAPPINGS =============

function mapStatus(csvStatus) {
  if (!csvStatus) return 'Lead';
  const s = csvStatus.trim().toLowerCase();
  if (s === 'booked') return 'Active';
  if (s === 'past client') return 'Past';
  if (s === 'rejected') return 'Do Not Book';
  return 'Lead';
}

function mapType(csvVenueType) {
  if (!csvVenueType) return 'Venue';
  if (csvVenueType.trim().toLowerCase() === 'private club') return 'Private';
  return 'Venue';
}

function parseRate(rateStr) {
  if (!rateStr) return undefined;
  const match = rateStr.match(/\$?([\d,]+)/);
  if (match) return parseInt(match[1].replace(',', ''));
  return undefined;
}

function mapLogType(method) {
  if (!method) return 'Note';
  const m = method.trim().toLowerCase();
  if (m === 'email') return 'Email';
  if (m === 'phone') return 'Call';
  return 'Note';
}

function buildTags(row) {
  const tags = [];
  if (row['Genre']?.trim()) tags.push(row['Genre'].trim());
  if (row['PA'] === 'Yes') tags.push('Has PA');
  if (row['PA'] === 'No') tags.push('No PA');
  if (row['Venue Type']?.trim()) tags.push(row['Venue Type'].trim());
  if (row['Booking Season']?.trim()) tags.push(`Books: ${row['Booking Season'].trim()}`);
  if (row['Preferred Method']?.trim()) tags.push(`Contact via: ${row['Preferred Method'].trim()}`);
  return tags.length > 0 ? tags : undefined;
}

// ============= MAIN IMPORT =============

async function importData() {
  console.log('=== CRM Data Import ===\n');

  const venuesCSV = readFileSync(join(__dirname, '../csv/🔊ULTRASHEET - 🏟️Venues.csv'), 'utf-8');
  const logsCSV = readFileSync(join(__dirname, '../csv/🔊ULTRASHEET - 🪵Communication Log.csv'), 'utf-8');

  const venues = parseCSV(venuesCSV);
  const logs = parseCSV(logsCSV);
  console.log(`Parsed ${venues.length} venues and ${logs.length} communication logs.\n`);

  // Load existing clients
  const existingSnapshot = await getDocs(collection(db, 'clients'));
  const existingClients = {};
  existingSnapshot.docs.forEach(d => {
    const data = d.data();
    existingClients[data.name?.toLowerCase().trim()] = { id: d.id, ...data };
  });
  console.log(`Found ${Object.keys(existingClients).length} existing clients in Firestore.\n`);

  const clientNameToId = {};
  const now = new Date().toISOString();
  let created = 0, updated = 0, skipped = 0;

  // ---- Import Venues ----
  console.log('--- Importing Venues as Clients ---');

  for (const row of venues) {
    const name = row['Venue Name']?.trim();
    if (!name) { skipped++; continue; }

    const existing = existingClients[name.toLowerCase().trim()];
    const clientId = existing?.id || generateDeterministicId(name);
    clientNameToId[name] = clientId;

    const clientData = {
      id: clientId,
      name,
      type: mapType(row['Venue Type']),
      status: mapStatus(row['Status']),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (row['Contact Person']?.trim()) clientData.contactName = row['Contact Person'].trim();
    if (row['Email']?.trim()) clientData.email = row['Email'].trim();
    if (row['Phone']?.trim()) clientData.phone = row['Phone'].trim();
    if (row['Link']?.trim()) clientData.website = row['Link'].trim();
    if (row['Location']?.trim()) clientData.address = row['Location'].trim();
    const rate = parseRate(row['Rate']);
    if (rate) clientData.defaultRate = rate;
    if (row['Notes']?.trim()) clientData.venueDetails = row['Notes'].trim();
    const tags = buildTags(row);
    if (tags) clientData.tags = tags;
    if (existing?.lastInteraction) clientData.lastInteraction = existing.lastInteraction;

    await setDoc(doc(db, 'clients', clientId), clientData);

    if (existing) { updated++; console.log(`  Updated: ${name} (${clientData.status})`); }
    else { created++; console.log(`  Created: ${name} (${clientData.status})`); }
  }

  console.log(`\nClients: ${created} created, ${updated} updated, ${skipped} skipped.\n`);

  // ---- Import Communication Logs ----
  console.log('--- Importing Communication Logs ---');
  let logsCreated = 0, logsSkipped = 0;
  const latestInteraction = {};

  for (const row of logs) {
    const venueName = row['Venue Name']?.trim();
    const dateStr = row['Date']?.trim();
    if (!venueName || !dateStr) { logsSkipped++; continue; }

    let clientId = clientNameToId[venueName];

    // Fuzzy match
    if (!clientId) {
      const match = Object.keys(clientNameToId).find(k =>
        k.toLowerCase().includes(venueName.toLowerCase()) ||
        venueName.toLowerCase().includes(k.toLowerCase())
      );
      if (match) {
        clientId = clientNameToId[match];
        console.log(`  Fuzzy match: "${venueName}" -> "${match}"`);
      }
    }

    if (!clientId) {
      console.log(`  WARN: No match for "${venueName}" - creating new client`);
      clientId = generateDeterministicId(venueName);
      clientNameToId[venueName] = clientId;
      await setDoc(doc(db, 'clients', clientId), {
        id: clientId, name: venueName, type: 'Venue', status: 'Lead',
        createdAt: now, updatedAt: now
      });
      created++;
    }

    const method = row['Method']?.trim() || '';
    const member = row['Member']?.trim() || '';
    const summary = row['Summary']?.trim() || '';
    const logType = mapLogType(method);

    let content = '';
    if (method && method.toLowerCase() !== logType.toLowerCase()) content += `[${method}] `;
    content += summary || `Contacted via ${method || 'unknown method'}`;

    // Parse date (M/D/YYYY)
    const dateParts = dateStr.split('/');
    let timestamp;
    if (dateParts.length === 3) {
      const month = dateParts[0].padStart(2, '0');
      const day = dateParts[1].padStart(2, '0');
      const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
      timestamp = `${year}-${month}-${day}T12:00:00.000Z`;
    } else {
      timestamp = now;
    }

    const logId = generateLogId(venueName, dateStr, method);
    const logData = {
      id: logId, type: logType, content,
      author: member || 'System Import', authorId: 'migration', timestamp
    };

    await setDoc(doc(db, 'clients', clientId, 'activityLogs', logId), logData);

    if (!latestInteraction[clientId] || timestamp > latestInteraction[clientId]) {
      latestInteraction[clientId] = timestamp;
    }

    logsCreated++;
    console.log(`  Log: ${venueName} (${dateStr}) - ${logType} by ${member || 'unknown'}`);
  }

  // Update lastInteraction
  for (const [clientId, ts] of Object.entries(latestInteraction)) {
    await updateDoc(doc(db, 'clients', clientId), { lastInteraction: ts, updatedAt: now });
  }

  console.log(`\nLogs: ${logsCreated} created, ${logsSkipped} skipped.`);
  console.log(`\n=== Import Complete ===`);
  console.log(`Total clients: ${Object.keys(clientNameToId).length}`);
  console.log(`Total activity logs: ${logsCreated}`);
  console.log(`\nREMEMBER: Restore Firestore rules to require auth for clients!`);

  process.exit(0);
}

importData().catch(err => { console.error('Import failed:', err); process.exit(1); });
