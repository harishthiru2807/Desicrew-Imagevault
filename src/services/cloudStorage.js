/**
 * cloudStorage.js
 * Firestore & Firebase Storage operations for user records, categories, and image files.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './firebase.js';
import * as localDb from './browserStorage.js';

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(uid) {
  if (!db) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await Promise.race([
      getDoc(userRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1500)),
    ]);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('getUserProfile fetch failed or timed out:', err);
    return null;
  }
}

export async function updateUserProfileDoc(uid, updates) {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('updateUserProfileDoc warning:', err);
  }
}

export async function uploadUserAvatar(uid, blob) {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  const avatarRef = ref(storage, `users/${uid}/avatar/profile_${Date.now()}.jpg`);
  const snapshot = await uploadBytes(avatarRef, blob, { contentType: 'image/jpeg' });
  const downloadURL = await getDownloadURL(snapshot.ref);
  await updateUserProfileDoc(uid, { photoURL: downloadURL });
  return downloadURL;
}

// ─── Cloud Records ────────────────────────────────────────────────────────────

export async function getCloudRecords(uid) {
  if (!db) return [];
  try {
    const recordsRef = collection(db, 'users', uid, 'records');
    const q = query(recordsRef, orderBy('createdAt', 'desc'));
    const snapshot = await Promise.race([
      getDocs(q),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000)),
    ]);
    return snapshot.docs.map((d) => ({
      id: d.id,
      recordId: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt,
      updatedAt: d.data().updatedAt?.toDate ? d.data().updatedAt.toDate().toISOString() : d.data().updatedAt,
    }));
  } catch (err) {
    console.warn('getCloudRecords fetch failed or timed out:', err);
    return [];
  }
}

export async function saveCloudRecord(uid, record, imageBlob = null) {
  if (!db) throw new Error('Firestore is not initialized');
  const recordId = record.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let imageURLs = record.imageURLs || [];
  let primaryURL = record.imageURL || null;

  if (imageBlob) {
    if (!storage) throw new Error('Firebase Storage is not initialized');
    const filename = `img_${Date.now()}.jpg`;
    const imageRef = ref(storage, `users/${uid}/records/${recordId}/${filename}`);
    const snapshot = await uploadBytes(imageRef, imageBlob, { contentType: 'image/jpeg' });
    primaryURL = await getDownloadURL(snapshot.ref);
    imageURLs = [primaryURL, ...imageURLs.filter((u) => u !== primaryURL)];
  }

  const recordDocRef = doc(db, 'users', uid, 'records', recordId);
  const dataToSave = {
    recordId,
    title: record.title || '',
    description: record.description || '',
    category: record.category || 'other',
    tags: Array.isArray(record.tags) ? record.tags : [],
    date: record.date || new Date().toISOString().split('T')[0],
    imageURLs,
    imageURL: primaryURL,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(recordDocRef, dataToSave, { merge: true });
  return { id: recordId, ...dataToSave };
}

export async function deleteCloudRecord(uid, recordId, imageURLs = []) {
  if (!db) return;
  const recordDocRef = doc(db, 'users', uid, 'records', recordId);
  await deleteDoc(recordDocRef);

  // Clean up associated images in Firebase Storage
  if (storage && Array.isArray(imageURLs)) {
    for (const url of imageURLs) {
      try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
      } catch (err) {
        // Ignore file not found or already deleted
        console.warn('Could not delete storage image:', url, err);
      }
    }
  }
}

// ─── Local Data Migration Strategy ───────────────────────────────────────────

export async function checkHasLocalData() {
  try {
    const records = await localDb.getAllRecords();
    return records && records.length > 0;
  } catch {
    return false;
  }
}

export async function migrateLocalDataToCloud(uid, onProgress) {
  const localRecords = await localDb.getAllRecords();
  if (!localRecords || localRecords.length === 0) return { migrated: 0 };

  let count = 0;
  for (const rec of localRecords) {
    let blob = null;
    if (rec.imageId) {
      try {
        blob = await localDb.getImage(rec.imageId);
      } catch (e) {
        console.warn('Failed reading local image blob:', e);
      }
    }

    await saveCloudRecord(uid, rec, blob);
    count++;
    if (onProgress) {
      onProgress(count, localRecords.length);
    }
  }

  return { migrated: count };
}
