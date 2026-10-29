import { openDB } from 'idb';

const DB_NAME = 'ImageVaultDB';
const DB_VERSION = 1;

let db = null;

async function getDB() {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Records store
      if (!database.objectStoreNames.contains('records')) {
        const recordsStore = database.createObjectStore('records', { keyPath: 'id' });
        recordsStore.createIndex('category', 'category');
        recordsStore.createIndex('createdAt', 'createdAt');
        recordsStore.createIndex('title', 'title');
      }
      // Categories store
      if (!database.objectStoreNames.contains('categories')) {
        database.createObjectStore('categories', { keyPath: 'id' });
      }
      // Images store (for blobs)
      if (!database.objectStoreNames.contains('images')) {
        database.createObjectStore('images', { keyPath: 'id' });
      }
      // Settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });
  return db;
}

// ─── Records ────────────────────────────────────────────────────────────────

export async function saveRecord(record) {
  const database = await getDB();
  await database.put('records', record);
}

export async function getRecord(id) {
  const database = await getDB();
  return database.get('records', id);
}

export async function getAllRecords() {
  const database = await getDB();
  return database.getAll('records');
}

export async function deleteRecord(id) {
  const database = await getDB();
  await database.delete('records', id);
}

// ─── Images ─────────────────────────────────────────────────────────────────

export async function saveImage(id, blob) {
  const database = await getDB();
  await database.put('images', { id, blob, savedAt: Date.now() });
}

export async function getImage(id) {
  const database = await getDB();
  const result = await database.get('images', id);
  return result ? result.blob : null;
}

export async function deleteImage(id) {
  const database = await getDB();
  await database.delete('images', id);
}

// ─── Categories ─────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { id: 'personal', name: 'Personal', isDefault: true, color: '#8b5cf6' },
  { id: 'documents', name: 'Documents', isDefault: true, color: '#0ea5e9' },
  { id: 'education', name: 'Education', isDefault: true, color: '#10b981' },
  { id: 'work', name: 'Work', isDefault: true, color: '#f59e0b' },
  { id: 'travel', name: 'Travel', isDefault: true, color: '#ef4444' },
  { id: 'other', name: 'Other', isDefault: true, color: '#6b7280' },
];

export async function getCategories() {
  const database = await getDB();
  const stored = await database.getAll('categories');
  if (stored.length === 0) {
    // Seed defaults
    for (const cat of DEFAULT_CATEGORIES) {
      await database.put('categories', cat);
    }
    return DEFAULT_CATEGORIES;
  }
  return stored;
}

export async function saveCategory(category) {
  const database = await getDB();
  await database.put('categories', category);
}

export async function deleteCategory(id) {
  const database = await getDB();
  await database.delete('categories', id);
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getSetting(key, defaultValue = null) {
  const database = await getDB();
  const result = await database.get('settings', key);
  return result ? result.value : defaultValue;
}

export async function setSetting(key, value) {
  const database = await getDB();
  await database.put('settings', { key, value });
}

// ─── Storage Stats ──────────────────────────────────────────────────────────

export async function getStorageStats() {
  const database = await getDB();
  const records = await database.getAll('records');
  const images = await database.getAll('images');
  let imageBytes = 0;
  for (const img of images) {
    if (img.blob) imageBytes += img.blob.size || 0;
  }
  return {
    recordCount: records.length,
    imageCount: images.length,
    imageSizeBytes: imageBytes,
  };
}

// ─── Export / Import ────────────────────────────────────────────────────────

export async function exportAllData() {
  const database = await getDB();
  const records = await database.getAll('records');
  const categories = await database.getAll('categories');
  return { records, categories, exportedAt: new Date().toISOString(), version: 1 };
}

export async function importData(data) {
  const database = await getDB();
  if (data.records) {
    for (const rec of data.records) {
      await database.put('records', rec);
    }
  }
  if (data.categories) {
    for (const cat of data.categories) {
      await database.put('categories', cat);
    }
  }
}
