// Firebase Bundle for Ultraphonics Admin
// This file initializes Firebase and exposes functions globally for inline scripts

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
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
  measurementId: "G-PRBQEMNV4H"
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
    await setDoc(docRef, { ...song, id: songId });
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
    const docRef = doc(db, 'clients', client.id);
    await setDoc(docRef, { ...client, updatedAt: new Date().toISOString() });
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

  async saveSetlist(name, songs) {
    const docRef = doc(db, 'setlists', name);
    await setDoc(docRef, {
      name,
      songs,
      songCount: songs.filter(s => !s.lastKnownName?.startsWith('Set ')).length,
      updatedAt: new Date().toISOString()
    });
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
