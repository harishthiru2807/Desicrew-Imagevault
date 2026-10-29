/**
 * AuthContext.jsx
 * Manages Firebase Authentication state, persistent sessions, OTP flow, and user profiles.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  auth,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  isFirebaseConfigured,
} from '../services/firebase.js';
import {
  getUserProfile,
  updateUserProfileDoc,
  uploadUserAvatar,
} from '../services/cloudStorage.js';
import { requestEmailOtp, verifyEmailOtp } from '../services/otpService.js';

const AuthContext = createContext(null);
const LOCAL_SESSION_KEY = 'imagevault_device_session';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const configured = isFirebaseConfigured();

  // Listen to Firebase persistent authentication state or restored device session
  useEffect(() => {
    let unsubscribe = () => {};

    async function initSession() {
      // 1. Check Firebase Auth
      if (configured && auth) {
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          try {
            if (user) {
              setCurrentUser(user);
              let profile = await getUserProfile(user.uid);
              if (!profile) {
                profile = {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName || user.email?.split('@')[0] || 'User',
                  photoURL: user.photoURL || null,
                  emailVerified: user.emailVerified,
                  createdAt: new Date().toISOString(),
                  lastLoginAt: new Date().toISOString(),
                };
              }
              setUserProfile(profile);
              setAuthLoading(false);
              return;
            }
          } catch (err) {
            console.warn('Firebase session check error:', err);
          }

          // 2. Fallback to device session if using dev OTP
          checkLocalDeviceSession();
        });
      } else {
        checkLocalDeviceSession();
      }
    }

    function checkLocalDeviceSession() {
      try {
        const savedSession = localStorage.getItem(LOCAL_SESSION_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.uid && parsed.email) {
            const devUser = {
              uid: parsed.uid,
              email: parsed.email,
              displayName: parsed.displayName || parsed.email.split('@')[0],
              photoURL: parsed.photoURL || null,
              emailVerified: true,
            };
            setCurrentUser(devUser);
            setUserProfile(devUser);
          }
        }
      } catch (e) {
        console.warn('Error reading device session:', e);
      } finally {
        setAuthLoading(false);
      }
    }

    initSession();
    return () => unsubscribe();
  }, [configured]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const sendOtp = useCallback(async (email) => {
    setAuthError(null);
    return await requestEmailOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email, otp) => {
    setAuthError(null);
    const result = await verifyEmailOtp(email, otp);

    if (result.customToken && auth) {
      // Signed in via Cloud Function custom token
      const userCredential = await signInWithCustomToken(auth, result.customToken);
      setCurrentUser(userCredential.user);
      const profile = await getUserProfile(userCredential.user.uid);
      setUserProfile(profile);
      return userCredential.user;
    } else if (result.uid) {
      // Signed in via verified Dev OTP session
      const devUser = {
        uid: result.uid,
        email: result.email,
        displayName: result.email.split('@')[0],
        photoURL: null,
        emailVerified: true,
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(devUser));
      setCurrentUser(devUser);
      setUserProfile(devUser);
      return devUser;
    }

    return null;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!currentUser) return;
    try {
      await updateUserProfileDoc(currentUser.uid, updates);
    } catch (e) {
      console.warn('Could not update Firestore profile doc:', e);
    }
    setUserProfile((prev) => ({ ...prev, ...updates }));

    // Also update local device session if exists
    try {
      const saved = localStorage.getItem(LOCAL_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ ...parsed, ...updates }));
      }
    } catch {}
  }, [currentUser]);

  const updateAvatar = useCallback(async (blob) => {
    if (!currentUser) return;
    try {
      const downloadURL = await uploadUserAvatar(currentUser.uid, blob);
      setUserProfile((prev) => ({ ...prev, photoURL: downloadURL }));
      return downloadURL;
    } catch (err) {
      console.warn('Could not upload to Firebase storage, using local preview:', err);
      const localUrl = URL.createObjectURL(blob);
      setUserProfile((prev) => ({ ...prev, photoURL: localUrl }));
      return localUrl;
    }
  }, [currentUser]);

  const logout = useCallback(async () => {
    try {
      if (auth) {
        await signOut(auth).catch(() => {});
      }
      localStorage.removeItem(LOCAL_SESSION_KEY);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
      throw err;
    }
  }, []);

  const value = {
    currentUser,
    userProfile,
    authLoading,
    authError,
    isConfigured: configured,
    sendOtp,
    verifyOtp,
    updateProfile,
    updateAvatar,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
