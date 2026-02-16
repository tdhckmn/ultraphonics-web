// Firebase Bundle for Ultraphonics Admin
// This file initializes Firebase and exposes functions globally for inline scripts

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';

// ============= ALLOWED EMAILS =============
// Only these email addresses can sign in to admin pages
const ALLOWED_EMAILS = [
  'thomasdhickman@gmail.com',
  'an.fiolek@gmail.com',
  'keletate@gmail.com',
  'lesterburton17@gmail.com',
  'davidbigham1@gmail.com',
  'shelleycatalan@gmail.com',
  'ultraphonicsmusic@gmail.com'
];

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqMRpeWfpj3Sv2SSd3nT5GkwK7NC3Ir7s",
  authDomain: "ultraphonics-web.firebaseapp.com",
  projectId: "ultraphonics-web",
  storageBucket: "ultraphonics-web.firebasestorage.app",
  messagingSenderId: "729950319293",
  appId: "1:729950319293:web:b75843574cc5bcec813dd4",
  measurementId: "G-FEL0XX8F65"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Set persistence
setPersistence(auth, browserLocalPersistence).catch(console.error);

// ============= AUTH =============

let currentUser = null;
let authStateListeners = [];
let authStateResolved = false; // Track if initial auth state has been determined

onAuthStateChanged(auth, async (user) => {
  // If user is signed in but not in allowlist, sign them out
  if (user && !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
    await signOut(auth);
    currentUser = null;
    authStateResolved = true;
    authStateListeners.forEach(listener => listener(null));
    return;
  }

  currentUser = user;
  authStateResolved = true;
  authStateListeners.forEach(listener => listener(user));
});

const googleProvider = new GoogleAuthProvider();

const FirebaseAuth = {
  async loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user's email is in the allowlist
    if (!ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
      // Sign out unauthorized user
      await signOut(auth);
      throw new Error('Access denied. Your account is not authorized to access this admin area.');
    }

    return user;
  },

  // Check if an email is allowed
  isEmailAllowed(email) {
    return ALLOWED_EMAILS.includes(email.toLowerCase());
  },

  async logout() {
    await signOut(auth);
  },

  getCurrentUser() {
    return currentUser;
  },

  isAuthenticated() {
    return currentUser !== null;
  },

  onAuthChange(listener) {
    authStateListeners.push(listener);
    // Only call listener immediately if auth state is already resolved
    // Otherwise, wait for onAuthStateChanged to fire first
    if (authStateResolved) {
      listener(currentUser);
    }
    return () => {
      authStateListeners = authStateListeners.filter(l => l !== listener);
    };
  },

  isAuthResolved() {
    return authStateResolved;
  },

  waitForAuth() {
    return new Promise((resolve) => {
      if (authStateResolved) {
        resolve(currentUser);
        return;
      }
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }
};

// ============= FIRESTORE SERVICE =============

const FirestoreService = {
  // Shows
  async getShows() {
    const snapshot = await getDocs(collection(db, 'shows'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getShow(showId) {
    const docRef = doc(db, 'shows', showId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  },

  subscribeToShows(callback) {
    return onSnapshot(collection(db, 'shows'), (snapshot) => {
      const shows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(shows);
    });
  },

  async getPublishedShows() {
    const q = query(collection(db, 'shows'), where('published', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  subscribeToPublishedShows(callback) {
    const q = query(collection(db, 'shows'), where('published', '==', true));
    return onSnapshot(q, (snapshot) => {
      const shows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(shows);
    });
  },

  async saveShow(show) {
    const docRef = doc(db, 'shows', show.id);
    await setDoc(docRef, { ...show, updatedAt: new Date().toISOString() });
  },

  async deleteShow(showId) {
    const docRef = doc(db, 'shows', showId);
    await deleteDoc(docRef);
  },

  async saveShowsBatch(shows) {
    const batch = writeBatch(db);
    for (const show of shows) {
      const docRef = doc(db, 'shows', show.id);
      batch.set(docRef, { ...show, updatedAt: new Date().toISOString() });
    }
    await batch.commit();
  },

  // Songs
  async getSongs() {
    const snapshot = await getDocs(collection(db, 'songs'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  subscribeToSongs(callback) {
    return onSnapshot(collection(db, 'songs'), (snapshot) => {
      const songs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(songs);
    });
  },

  async saveSong(song) {
    const songId = song.id || song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const docRef = doc(db, 'songs', songId);
    await setDoc(docRef, { ...song, id: songId, updatedAt: new Date().toISOString() });
  },

  async getSong(songId) {
    const docRef = doc(db, 'songs', songId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  },

  async updateSong(songId, data) {
    const docRef = doc(db, 'songs', songId);
    await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
  },

  async deleteSong(songId) {
    const docRef = doc(db, 'songs', songId);
    await deleteDoc(docRef);
  },

  async syncSongsBatch(creates, updates, archives) {
    const now = new Date().toISOString();
    const ops = [];
    for (const song of creates) {
      ops.push({ id: song.id, data: { ...song, active: true, lastUpdated: now }, merge: false });
    }
    for (const update of updates) {
      ops.push({ id: update.id, data: { ...update.data, active: true, lastUpdated: now }, merge: true });
    }
    for (const id of archives) {
      ops.push({ id, data: { active: false, lastUpdated: now }, merge: true });
    }
    const BATCH_SIZE = 500;
    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const chunk = ops.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        const docRef = doc(db, 'songs', op.id);
        if (op.merge) {
          batch.set(docRef, op.data, { merge: true });
        } else {
          batch.set(docRef, op.data);
        }
      }
      await batch.commit();
    }
    return ops.length;
  },

  // Clients
  async getClients() {
    const snapshot = await getDocs(collection(db, 'clients'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  subscribeToClients(callback) {
    return onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(clients);
    });
  },

  async saveClient(client) {
    const now = new Date().toISOString();
    const docRef = doc(db, 'clients', client.id);
    const cleaned = Object.fromEntries(
      Object.entries({ ...client, updatedAt: now, createdAt: client.createdAt || now })
        .filter(([, v]) => v !== undefined)
    );
    await setDoc(docRef, cleaned);
  },

  async getClientDetails(clientId) {
    const docRef = doc(db, 'clients', clientId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  },

  async getClientShows(clientId) {
    const q = query(collection(db, 'shows'), where('clientId', '==', clientId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addActivityLog(clientId, logData) {
    const now = new Date().toISOString();
    const logId = logData.id || crypto.randomUUID();
    const logRef = doc(db, 'clients', clientId, 'activityLogs', logId);
    await setDoc(logRef, { id: logId, ...logData, timestamp: now });
    const clientRef = doc(db, 'clients', clientId);
    await updateDoc(clientRef, { lastInteraction: now, updatedAt: now });
    return logId;
  },

  subscribeToActivityLogs(clientId, callback) {
    const logsRef = collection(db, 'clients', clientId, 'activityLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(logs);
    });
  },

  async deleteClient(clientId) {
    const shows = await this.getClientShows(clientId);
    if (shows.length > 0) {
      return { deleted: false, reason: `Cannot delete: ${shows.length} show(s) are linked to this client. Remove or reassign them first.` };
    }
    const docRef = doc(db, 'clients', clientId);
    await deleteDoc(docRef);
    return { deleted: true };
  },

  // Setlists
  async getSetlists() {
    const snapshot = await getDocs(collection(db, 'setlists'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getSetlist(setlistName) {
    const docRef = doc(db, 'setlists', setlistName);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  },

  subscribeToSetlists(callback) {
    return onSnapshot(collection(db, 'setlists'), (snapshot) => {
      const setlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(setlists);
    });
  },

  async saveSetlist(id, name, songs, options = {}) {
    const docRef = doc(db, 'setlists', id);
    const data = {
      name,
      songs,
      songCount: songs.filter(s => {
        const songName = typeof s === 'string' ? '' : (s.lastKnownName || '');
        return !songName.startsWith('Set ');
      }).length,
      updatedAt: new Date().toISOString()
    };

    // Add setlist-specific overrides (vocals, segues)
    if (options.vocalAssignments) {
      data.vocalAssignments = options.vocalAssignments;
    }
    if (options.segues) {
      data.segues = options.segues;
    }

    await setDoc(docRef, data);
    return id;
  },

  async deleteSetlist(setlistName) {
    const docRef = doc(db, 'setlists', setlistName);
    await deleteDoc(docRef);
  },

  // Quotes
  async getQuotes() {
    const snapshot = await getDocs(collection(db, 'quotes'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getQuote(quoteId) {
    const docRef = doc(db, 'quotes', quoteId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  },

  async saveQuote(quote) {
    const docRef = doc(db, 'quotes', quote.id);
    await setDoc(docRef, { ...quote, updatedAt: new Date().toISOString() });
  }
};

// Expose globally
window.FirebaseAuth = FirebaseAuth;
window.FirestoreService = FirestoreService;
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;

// Export for ES modules
export { app, db, auth, FirebaseAuth, FirestoreService };
