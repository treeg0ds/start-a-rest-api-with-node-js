/**
 * Storage Abstraction Layer
 * Supports in-memory storage (for tests and headless environments)
 * and LocalStorage (for client-side browser persistence).
 */

export class MemoryStorageAdapter {
  constructor(initialData = []) {
    this.data = Array.isArray(initialData) ? [...initialData] : [];
  }

  loadTasks() {
    return JSON.parse(JSON.stringify(this.data));
  }

  saveTasks(tasks) {
    if (!Array.isArray(tasks)) {
      throw new TypeError('Tasks to save must be an array');
    }
    this.data = JSON.parse(JSON.stringify(tasks));
    return true;
  }

  clear() {
    this.data = [];
  }
}

export class LocalStorageAdapter {
  constructor(storageKey = 'taskpulse_tasks') {
    this.storageKey = storageKey;
  }

  loadTasks() {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn(`[LocalStorageAdapter] Failed to parse stored tasks, resetting:`, err);
      return [];
    }
  }

  saveTasks(tasks) {
    if (!Array.isArray(tasks)) {
      throw new TypeError('Tasks to save must be an array');
    }
    if (typeof localStorage === 'undefined') {
      return false;
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(tasks));
      return true;
    } catch (err) {
      console.error(`[LocalStorageAdapter] Failed to save tasks to localStorage:`, err);
      return false;
    }
  }

  clear() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}
