/**
 * firebase.js
 * Initializes Firebase App, Auth with browserLocalPersistence, Firestore, Storage, and Analytics.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCWDCD9VtLsE7dnJDNVD_7D-5lchwJ0vs8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'imagevault-desicrew.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'imagevault-desicrew',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'imagevault-desicrew.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '153027718839',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:153027718839:web:63657c0aba30dbecc62732',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-J2DDLJ5NC4',
};

export function isFirebaseConfigured() {
  const { apiKey, projectId } = firebaseConfig;
  return Boolean(
    apiKey &&
    projectId &&
    apiKey !== 'your_api_key_here' &&
    projectId !== 'your_project_id' &&
    apiKey.trim().length > 0 &&
    projectId.trim().length > 0
  );
}

let app = null;
let auth = null;
let db = null;
let storage = null;
let analytics = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Enforce persistent device sessions
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Firebase persistence warning:', err);
    });

    db = getFirestore(app);
    storage = getStorage(app);

    // Optional analytics (only in supported browser environments)
    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported) analytics = getAnalytics(app);
      }).catch(() => {});
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export {
  app,
  auth,
  db,
  storage,
  analytics,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  firebaseUpdateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
};
