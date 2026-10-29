import React, { createContext, useContext, useEffect, useReducer, useCallback, useState } from 'react';
import * as localDb from '../services/database.js';
import * as cloudDb from '../services/cloudStorage.js';
import { generateId } from '../utils/utils.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

const initialState = {
  records: [],
  categories: [],
  settings: { theme: 'light' },
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_RECORDS':
      return { ...state, records: action.payload };
    case 'ADD_RECORD':
      return { ...state, records: [action.payload, ...state.records] };
    case 'UPDATE_RECORD':
      return {
        ...state,
        records: state.records.map((r) =>
          r.id === action.payload.id || r.recordId === action.payload.recordId ? action.payload : r,
        ),
      };
    case 'DELETE_RECORD':
      return {
        ...state,
        records: state.records.filter((r) => r.id !== action.payload && r.recordId !== action.payload),
      };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { currentUser } = useAuth();
  const [hasLocalData, setHasLocalData] = useState(false);

  // Check if unmigrated local data exists in IndexedDB
  useEffect(() => {
    cloudDb.checkHasLocalData().then(setHasLocalData).catch(() => {});
  }, []);

  // Load records: Always load local IndexedDB first, then augment with Cloud in background
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        // 1. Immediately load local records and categories so the UI renders in 5ms!
        let categories = await localDb.getCategories();
        let records = await localDb.getAllRecords();
        records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (isMounted) {
          dispatch({ type: 'SET_RECORDS', payload: records });
          dispatch({ type: 'SET_CATEGORIES', payload: categories });
          const theme = await localDb.getSetting('theme', 'light');
          dispatch({ type: 'SET_SETTINGS', payload: { theme } });
          dispatch({ type: 'SET_LOADING', payload: false });
        }

        // 2. In background: if user is logged in, attempt to fetch from Cloud Firestore
        if (currentUser) {
          try {
            const cloudRecords = await cloudDb.getCloudRecords(currentUser.uid);
            if (cloudRecords && cloudRecords.length > 0 && isMounted) {
              dispatch({ type: 'SET_RECORDS', payload: cloudRecords });
            }
          } catch (cloudErr) {
            console.warn('Could not fetch from Cloud Firestore (using local storage):', cloudErr);
          }
        }
      } catch (err) {
        console.error('Data load error:', err);
        if (isMounted) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const createRecord = useCallback(
    async (formData, imageBlob) => {
      const id = generateId();
      let imageId = null;

      if (imageBlob) {
        imageId = `img-${id}`;
        await localDb.saveImage(imageId, imageBlob);
      }

      const record = {
        id,
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        category: formData.category || 'other',
        tags: formData.tags || [],
        date: formData.date || new Date().toISOString().split('T')[0],
        imageId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Always save locally first for instant feedback and 100% offline safety
      await localDb.saveRecord(record);
      dispatch({ type: 'ADD_RECORD', payload: record });

      // 2. If user is logged in, also sync to Firebase Cloud in background
      if (currentUser) {
        cloudDb
          .saveCloudRecord(currentUser.uid, record, imageBlob)
          .then((cloudSaved) => {
            if (cloudSaved?.imageURL) {
              dispatch({ type: 'UPDATE_RECORD', payload: { ...record, ...cloudSaved } });
            }
          })
          .catch((e) => console.warn('Background cloud sync warning:', e));
      }

      return record;
    },
    [currentUser],
  );

  const updateRecord = useCallback(
    async (id, formData, imageBlob, removeImage = false) => {
      const localExisting = (await localDb.getRecord(id)) || state.records.find((r) => r.id === id);
      let imageId = localExisting?.imageId;

      if (removeImage && imageId) {
        await localDb.deleteImage(imageId).catch(() => {});
        imageId = null;
      } else if (imageBlob) {
        if (imageId) await localDb.deleteImage(imageId).catch(() => {});
        imageId = `img-${id}-${Date.now()}`;
        await localDb.saveImage(imageId, imageBlob);
      }

      const updated = {
        ...localExisting,
        id,
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        category: formData.category || localExisting?.category || 'other',
        tags: formData.tags || [],
        date: formData.date || localExisting?.date || new Date().toISOString().split('T')[0],
        imageId,
        updatedAt: new Date().toISOString(),
      };

      // Always save locally first
      await localDb.saveRecord(updated);
      dispatch({ type: 'UPDATE_RECORD', payload: updated });

      // Sync to Firebase Cloud if logged in
      if (currentUser) {
        cloudDb
          .saveCloudRecord(currentUser.uid, updated, imageBlob)
          .catch((e) => console.warn('Cloud update sync warning:', e));
      }

      return updated;
    },
    [currentUser, state.records],
  );

  const removeRecord = useCallback(
    async (id) => {
      const target = state.records.find((r) => r.id === id || r.recordId === id);

      // Delete locally
      if (target?.imageId) {
        await localDb.deleteImage(target.imageId).catch(() => {});
      }
      await localDb.deleteRecord(id).catch(() => {});
      dispatch({ type: 'DELETE_RECORD', payload: id });

      // Delete from Cloud if logged in
      if (currentUser) {
        cloudDb
          .deleteCloudRecord(currentUser.uid, id, target?.imageURLs || [])
          .catch((e) => console.warn('Cloud delete sync warning:', e));
      }
    },
    [currentUser, state.records],
  );

  const addCategory = useCallback(async (name, color) => {
    const id = `cat-${generateId()}`;
    const category = { id, name: name.trim(), color: color || '#0ea5e9', isDefault: false };
    await localDb.saveCategory(category);
    dispatch({ type: 'ADD_CATEGORY', payload: category });
    return category;
  }, []);

  const removeCategory = useCallback(async (id) => {
    await localDb.deleteCategory(id);
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  }, []);

  const toggleTheme = useCallback(async () => {
    const newTheme = state.settings.theme === 'light' ? 'dark' : 'light';
    await localDb.setSetting('theme', newTheme);
    dispatch({ type: 'SET_SETTINGS', payload: { theme: newTheme } });
  }, [state.settings.theme]);

  const getImageUrl = useCallback(async (imageRefOrId) => {
    if (!imageRefOrId) return null;
    if (typeof imageRefOrId === 'string' && (imageRefOrId.startsWith('http://') || imageRefOrId.startsWith('https://'))) {
      return imageRefOrId;
    }
    const blob = await localDb.getImage(imageRefOrId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, []);

  const migrateLocalToCloud = useCallback(async (onProgress) => {
    if (!currentUser) throw new Error('Must be logged in to migrate data');
    const result = await cloudDb.migrateLocalDataToCloud(currentUser.uid, onProgress);
    const freshRecords = await cloudDb.getCloudRecords(currentUser.uid);
    dispatch({ type: 'SET_RECORDS', payload: freshRecords });
    setHasLocalData(false);
    return result;
  }, [currentUser]);

  const exportData = useCallback(async () => {
    return localDb.exportAllData();
  }, []);

  const importData = useCallback(async (data) => {
    await localDb.importData(data);
    const records = await localDb.getAllRecords();
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    dispatch({ type: 'SET_RECORDS', payload: records });
    const categories = await localDb.getCategories();
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
  }, []);

  const value = {
    ...state,
    hasLocalData,
    createRecord,
    updateRecord,
    removeRecord,
    addCategory,
    removeCategory,
    toggleTheme,
    getImageUrl,
    migrateLocalToCloud,
    exportData,
    importData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
