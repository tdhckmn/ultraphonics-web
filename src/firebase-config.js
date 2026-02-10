// Firebase configuration for Ultraphonics
// Initialized for use across all modules

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

export { app, db, auth, firebaseConfig };
