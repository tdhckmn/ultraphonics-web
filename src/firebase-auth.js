// Firebase Authentication Module for Ultraphonics Admin
// Replaces GitHub token-based authentication

import { auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

// Auth state
let currentUser = null;
let authStateListeners = [];

// Initialize auth persistence
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authStateListeners.forEach(listener => listener(user));
});

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function logout() {
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
  return new Promise((resolve) => {
    if (currentUser !== undefined) {
      resolve(currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export { auth };
