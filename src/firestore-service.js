// Firestore Data Service for Ultraphonics
// Replaces GitHub API for data operations

import { db } from './firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  addDoc
} from 'firebase/firestore';

// Collection names
const COLLECTIONS = {
  SHOWS: 'shows',
  SONGS: 'songs',
  CLIENTS: 'clients',
  SETLISTS: 'setlists',
  QUOTES: 'quotes'
};

// ============= SHOWS =============

/**
 * Get all shows
 * @returns {Promise<Array>}
 */
export async function getShows() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.SHOWS));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get a single show by ID
 * @param {string} showId
 * @returns {Promise<Object|null>}
 */
export async function getShow(showId) {
  const docRef = doc(db, COLLECTIONS.SHOWS, showId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Get shows with real-time updates
 * @param {Function} callback - Called with array of shows on each update
 * @returns {Function} Unsubscribe function
 */
export function subscribeToShows(callback) {
  return onSnapshot(collection(db, COLLECTIONS.SHOWS), (snapshot) => {
    const shows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(shows);
  });
}

/**
 * Get published shows only (for public site)
 * @returns {Promise<Array>}
 */
export async function getPublishedShows() {
  const q = query(
    collection(db, COLLECTIONS.SHOWS),
    where('published', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to published shows with real-time updates
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToPublishedShows(callback) {
  const q = query(
    collection(db, COLLECTIONS.SHOWS),
    where('published', '==', true)
  );
  return onSnapshot(q, (snapshot) => {
    const shows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(shows);
  });
}

/**
 * Save a show (create or update)
 * @param {Object} show
 * @returns {Promise<void>}
 */
export async function saveShow(show) {
  const docRef = doc(db, COLLECTIONS.SHOWS, show.id);
  await setDoc(docRef, {
    ...show,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Delete a show
 * @param {string} showId
 * @returns {Promise<void>}
 */
export async function deleteShow(showId) {
  const docRef = doc(db, COLLECTIONS.SHOWS, showId);
  await deleteDoc(docRef);
}

/**
 * Save multiple shows in a batch
 * @param {Array} shows
 * @returns {Promise<void>}
 */
export async function saveShowsBatch(shows) {
  const batch = writeBatch(db);
  for (const show of shows) {
    const docRef = doc(db, COLLECTIONS.SHOWS, show.id);
    batch.set(docRef, {
      ...show,
      updatedAt: new Date().toISOString()
    });
  }
  await batch.commit();
}

// ============= SONGS =============

/**
 * Get all songs
 * @returns {Promise<Array>}
 */
export async function getSongs() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.SONGS));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to songs with real-time updates
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToSongs(callback) {
  return onSnapshot(collection(db, COLLECTIONS.SONGS), (snapshot) => {
    const songs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(songs);
  });
}

/**
 * Save a song
 * @param {Object} song
 * @returns {Promise<void>}
 */
export async function saveSong(song) {
  const songId = song.id || song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const docRef = doc(db, COLLECTIONS.SONGS, songId);
  await setDoc(docRef, {
    ...song,
    id: songId
  });
}

// ============= CLIENTS =============

/**
 * Get all clients
 * @returns {Promise<Array>}
 */
export async function getClients() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CLIENTS));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to clients with real-time updates
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToClients(callback) {
  return onSnapshot(collection(db, COLLECTIONS.CLIENTS), (snapshot) => {
    const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(clients);
  });
}

/**
 * Save a client (create or update with merge)
 * @param {Object} client
 * @returns {Promise<void>}
 */
export async function saveClient(client) {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.CLIENTS, client.id);
  // Strip undefined values — Firestore rejects them
  const cleaned = Object.fromEntries(
    Object.entries({ ...client, updatedAt: now, createdAt: client.createdAt || now })
      .filter(([, v]) => v !== undefined)
  );
  await setDoc(docRef, cleaned);
}

/**
 * Get a single client by ID
 * @param {string} clientId
 * @returns {Promise<Object|null>}
 */
export async function getClientDetails(clientId) {
  const docRef = doc(db, COLLECTIONS.CLIENTS, clientId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Get all shows for a specific client
 * @param {string} clientId
 * @returns {Promise<Array>}
 */
export async function getClientShows(clientId) {
  const q = query(
    collection(db, COLLECTIONS.SHOWS),
    where('clientId', '==', clientId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Add an activity log to a client's sub-collection and update lastInteraction
 * @param {string} clientId
 * @param {Object} logData - { type, content, author, authorId, relatedShowId? }
 * @returns {Promise<string>} The new log document ID
 */
export async function addActivityLog(clientId, logData) {
  const now = new Date().toISOString();
  const logId = logData.id || crypto.randomUUID();
  const logRef = doc(db, COLLECTIONS.CLIENTS, clientId, 'activityLogs', logId);
  await setDoc(logRef, {
    id: logId,
    ...logData,
    timestamp: now
  });

  // Update parent client's lastInteraction
  const clientRef = doc(db, COLLECTIONS.CLIENTS, clientId);
  await updateDoc(clientRef, { lastInteraction: now, updatedAt: now });

  return logId;
}

/**
 * Get activity logs for a client with real-time updates
 * @param {string} clientId
 * @param {Function} callback - Called with array of logs on each update
 * @returns {Function} Unsubscribe function
 */
export function subscribeToActivityLogs(clientId, callback) {
  const logsRef = collection(db, COLLECTIONS.CLIENTS, clientId, 'activityLogs');
  const q = query(logsRef, orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(logs);
  });
}

/**
 * Delete a client (warns if shows are attached)
 * @param {string} clientId
 * @returns {Promise<{deleted: boolean, reason?: string}>}
 */
export async function deleteClient(clientId) {
  // Check for attached shows
  const shows = await getClientShows(clientId);
  if (shows.length > 0) {
    return {
      deleted: false,
      reason: `Cannot delete: ${shows.length} show(s) are linked to this client. Remove or reassign them first.`
    };
  }
  const docRef = doc(db, COLLECTIONS.CLIENTS, clientId);
  await deleteDoc(docRef);
  return { deleted: true };
}

// ============= SETLISTS =============

/**
 * Get all setlists
 * @returns {Promise<Array>}
 */
export async function getSetlists() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.SETLISTS));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get a single setlist by name
 * @param {string} setlistName
 * @returns {Promise<Object|null>}
 */
export async function getSetlist(setlistName) {
  const docRef = doc(db, COLLECTIONS.SETLISTS, setlistName);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Subscribe to setlists with real-time updates
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToSetlists(callback) {
  return onSnapshot(collection(db, COLLECTIONS.SETLISTS), (snapshot) => {
    const setlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(setlists);
  });
}

/**
 * Save a setlist
 * @param {string} name - Setlist name (used as document ID)
 * @param {Array} songs - Array of song objects
 * @returns {Promise<void>}
 */
export async function saveSetlist(name, songs) {
  const docRef = doc(db, COLLECTIONS.SETLISTS, name);
  await setDoc(docRef, {
    name,
    songs,
    songCount: songs.filter(s => !s.lastKnownName?.startsWith('Set ')).length,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Delete a setlist
 * @param {string} setlistName
 * @returns {Promise<void>}
 */
export async function deleteSetlist(setlistName) {
  const docRef = doc(db, COLLECTIONS.SETLISTS, setlistName);
  await deleteDoc(docRef);
}

// ============= QUOTES =============

/**
 * Get all quotes
 * @returns {Promise<Array>}
 */
export async function getQuotes() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.QUOTES));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get a single quote by ID
 * @param {string} quoteId
 * @returns {Promise<Object|null>}
 */
export async function getQuote(quoteId) {
  const docRef = doc(db, COLLECTIONS.QUOTES, quoteId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Save a quote
 * @param {Object} quote
 * @returns {Promise<void>}
 */
export async function saveQuote(quote) {
  const docRef = doc(db, COLLECTIONS.QUOTES, quote.id);
  await setDoc(docRef, {
    ...quote,
    updatedAt: new Date().toISOString()
  });
}

export { db, COLLECTIONS };
