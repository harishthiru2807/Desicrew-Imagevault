/**
 * database.js
 * Platform-aware storage facade.
 * On browser → IndexedDB (browserStorage)
 * On Android → SQLite + Filesystem (androidStorage) – stub for native build
 */

import * as browser from './browserStorage.js';

// Detect Capacitor native platform
const isNative = () =>
  typeof window !== 'undefined' &&
  window.Capacitor &&
  window.Capacitor.isNativePlatform &&
  window.Capacitor.isNativePlatform();

// ─── Records ────────────────────────────────────────────────────────────────

export async function saveRecord(record) {
  return browser.saveRecord(record);
}

export async function getRecord(id) {
  return browser.getRecord(id);
}

export async function getAllRecords() {
  return browser.getAllRecords();
}

export async function deleteRecord(id) {
  return browser.deleteRecord(id);
}

// ─── Images ─────────────────────────────────────────────────────────────────

export async function saveImage(id, blob) {
  return browser.saveImage(id, blob);
}

export async function getImage(id) {
  return browser.getImage(id);
}

export async function deleteImage(id) {
  return browser.deleteImage(id);
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function getCategories() {
  return browser.getCategories();
}

export async function saveCategory(category) {
  return browser.saveCategory(category);
}

export async function deleteCategory(id) {
  return browser.deleteCategory(id);
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getSetting(key, defaultValue) {
  return browser.getSetting(key, defaultValue);
}

export async function setSetting(key, value) {
  return browser.setSetting(key, value);
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export async function getStorageStats() {
  return browser.getStorageStats();
}

// ─── Export/Import ──────────────────────────────────────────────────────────

export async function exportAllData() {
  return browser.exportAllData();
}

export async function importData(data) {
  return browser.importData(data);
}
