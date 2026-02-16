// Firebase Authentication Module for Ultraphonics Admin
// Replaces GitHub token-based authentication

import { auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const isPreview = window.location.hostname.endsWith('.cloudworkstations.dev') || window.location.hostname.includes('localhost');

// Auth state
let currentUser = null;
let authStateListeners = [];

if (isPreview) {
    console.log("DEV/PREVIEW MODE: Bypassing authentication.");
    currentUser = {
        uid: 'dev-user',
        email: 'dev@ultraphonics.com',
        displayName: 'Dev User',
    };
} else {
    // Initialize auth persistence
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    // Listen for auth state changes from Firebase
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      authStateListeners.forEach(listener => listener(user));
    });
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
export async function login(email, password) {
  if (isPreview) return Promise.resolve(currentUser);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Sign in with Google
 * @returns {Promise<User>}
 */
export async function loginWithGoogle() {
    if (isPreview) return Promise.resolve(currentUser);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Google sign-in error:", error);
        throw error;
    }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function logout() {
  if (isPreview) {
    console.log("DEV/PREVIEW MODE: Logout is disabled.");
    return Promise.resolve();
  }
  await signOut(auth);
}

/**
 * Get the current authenticated user
 * @returns {User|null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return currentUser !== null;
}

/**
 * Subscribe to auth state changes
 * @param {Function} listener - Callback function receiving (user)
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(listener) {
  authStateListeners.push(listener);
  // Immediately call with current state
  listener(currentUser);
  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(l => l !== listener);
  };
}

/**
 * Wait for auth to be initialized
 * @returns {Promise<User|null>}
 */
export function waitForAuth() {
  if (isPreview) return Promise.resolve(currentUser);
  
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // This will fire once, immediately if auth is initialized,
      // or after it initializes.
      unsubscribe();
      resolve(user);
    });
  });
}

export { auth };
