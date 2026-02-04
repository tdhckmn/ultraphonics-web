/**
 * Migration Script: Seed Firestore with existing JSON data
 *
 * This script reads the existing JSON files and uploads them to Firestore.
 * Run with: node scripts/migrate-to-firestore.js
 *
 * Collections created:
 * - shows: All show/event data
 * - songs: Song catalog
 * - clients: Venue and client data
 * - setlists: Individual setlists (one document per setlist file)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

const CONTENT_DIR = join(__dirname, '..', 'content');

function readJsonFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function migrateShows() {
  console.log('Migrating shows...');
  const shows = readJsonFile(join(CONTENT_DIR, 'shows.json'));
  const batch = writeBatch(db);

  for (const show of shows) {
    // Use the existing UUID as the document ID
    const docRef = doc(db, 'shows', show.id);
    batch.set(docRef, {
      ...show,
      // Convert date string to a sortable format for queries
      dateSort: new Date(show.date).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  await batch.commit();
  console.log(`  Migrated ${shows.length} shows`);
}

async function migrateSongs() {
  console.log('Migrating songs...');
  const songs = readJsonFile(join(CONTENT_DIR, 'songs.json'));
  const batch = writeBatch(db);

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    // Generate a document ID from the song title (slugified)
    const docId = song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    const docRef = doc(db, 'songs', docId);
    batch.set(docRef, {
      ...song,
      id: docId,
      createdAt: new Date().toISOString()
    });
  }

  await batch.commit();
  console.log(`  Migrated ${songs.length} songs`);
}

async function migrateClients() {
  console.log('Migrating clients...');
  const clients = readJsonFile(join(CONTENT_DIR, 'clients.json'));
  const batch = writeBatch(db);

  for (const client of clients) {
    // Use the existing UUID as the document ID
    const docRef = doc(db, 'clients', client.id);
    batch.set(docRef, {
      ...client,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  await batch.commit();
  console.log(`  Migrated ${clients.length} clients`);
}

async function migrateSetlists() {
  console.log('Migrating setlists...');
  const setlistDir = join(CONTENT_DIR, 'setlists');
  const files = readdirSync(setlistDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const setlistName = basename(file, '.json');
    const songs = readJsonFile(join(setlistDir, file));

    // Store the setlist as a single document with songs as an array
    const docRef = doc(db, 'setlists', setlistName);
    await setDoc(docRef, {
      name: setlistName,
      songs: songs,
      songCount: songs.filter(s => !s.lastKnownName?.startsWith('Set ')).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`  Migrated setlist: ${setlistName} (${songs.length} items)`);
  }

  console.log(`  Migrated ${files.length} setlists total`);
}

async function runMigration() {
  console.log('Starting Firestore migration...\n');

  try {
    await migrateShows();
    await migrateSongs();
    await migrateClients();
    await migrateSetlists();

    console.log('\nMigration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify data in Firebase Console: https://console.firebase.google.com/project/ultraphonics-web/firestore');
    console.log('2. Set up Firestore Security Rules');
    console.log('3. Update admin tools to use Firestore');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
