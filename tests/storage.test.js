import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorageAdapter, LocalStorageAdapter } from '../src/storage/storage.js';

describe('Storage Adapters', () => {
  describe('MemoryStorageAdapter', () => {
    it('initializes with empty array or supplied data', () => {
      const adapter1 = new MemoryStorageAdapter();
      assert.deepStrictEqual(adapter1.loadTasks(), []);

      const adapter2 = new MemoryStorageAdapter([{ id: '1', title: 'Preloaded' }]);
      assert.strictEqual(adapter2.loadTasks().length, 1);
    });

    it('prevents external mutation of internal data', () => {
      const adapter = new MemoryStorageAdapter([{ id: '1', title: 'Original' }]);
      const loaded = adapter.loadTasks();
      loaded[0].title = 'Mutated Externally';

      assert.strictEqual(adapter.loadTasks()[0].title, 'Original');
    });

    it('saves and clears tasks properly', () => {
      const adapter = new MemoryStorageAdapter();
      adapter.saveTasks([{ id: '2', title: 'Saved' }]);
      assert.strictEqual(adapter.loadTasks().length, 1);

      adapter.clear();
      assert.strictEqual(adapter.loadTasks().length, 0);
    });

    it('rejects saving non-array data', () => {
      const adapter = new MemoryStorageAdapter();
      assert.throws(() => adapter.saveTasks('not-an-array'), /Tasks to save must be an array/);
      assert.throws(() => adapter.saveTasks(null), /Tasks to save must be an array/);
    });
  });

  describe('LocalStorageAdapter', () => {
    it('handles environments where localStorage is not defined', () => {
      // In Node.js environment without browser mocks
      const adapter = new LocalStorageAdapter('test_key');
      assert.deepStrictEqual(adapter.loadTasks(), []);
      assert.strictEqual(adapter.saveTasks([]), false);
      assert.doesNotThrow(() => adapter.clear());
    });

    it('interacts with global localStorage when available', () => {
      const storageMock = new Map();
      globalThis.localStorage = {
        getItem: (key) => storageMock.get(key) || null,
        setItem: (key, val) => storageMock.set(key, String(val)),
        removeItem: (key) => storageMock.delete(key),
      };

      try {
        const adapter = new LocalStorageAdapter('my_tasks');
        assert.deepStrictEqual(adapter.loadTasks(), []);

        const sample = [{ id: '1', title: 'Browser Task' }];
        const saved = adapter.saveTasks(sample);
        assert.strictEqual(saved, true);

        const loaded = adapter.loadTasks();
        assert.deepStrictEqual(loaded, sample);

        adapter.clear();
        assert.deepStrictEqual(adapter.loadTasks(), []);
      } finally {
        delete globalThis.localStorage;
      }
    });

    it('safely recovers from corrupted localStorage JSON without throwing', () => {
      globalThis.localStorage = {
        getItem: () => '{{{invalid-json...',
        setItem: () => {},
        removeItem: () => {},
      };

      try {
        const adapter = new LocalStorageAdapter('corrupt_key');
        const tasks = adapter.loadTasks();
        assert.deepStrictEqual(tasks, [], 'Should recover with empty array on parse error');
      } finally {
        delete globalThis.localStorage;
      }
    });
  });
});
