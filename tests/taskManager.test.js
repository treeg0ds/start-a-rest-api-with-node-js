import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TaskManager } from '../src/services/taskManager.js';
import { MemoryStorageAdapter } from '../src/storage/storage.js';

describe('TaskManager Service', () => {
  let manager;
  let storage;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    manager = new TaskManager(storage);
  });

  describe('CRUD operations', () => {
    it('creates a task and persists it', () => {
      const task = manager.addTask({ title: 'Deploy App', priority: 'high', category: 'work' });

      assert.ok(task.id);
      assert.strictEqual(task.title, 'Deploy App');
      assert.strictEqual(task.priority, 'high');
      assert.strictEqual(task.category, 'work');
      assert.strictEqual(manager.tasks.length, 1);

      // Verify persistence in storage adapter
      const stored = storage.loadTasks();
      assert.strictEqual(stored.length, 1);
      assert.strictEqual(stored[0].id, task.id);
    });

    it('retrieves task by ID', () => {
      const task = manager.addTask({ title: 'Read Docs' });
      const found = manager.getTask(task.id);

      assert.deepStrictEqual(found, task);
      assert.strictEqual(manager.getTask('non-existent-id'), null);
      assert.strictEqual(manager.getTask(''), null);
      assert.strictEqual(manager.getTask(null), null);
    });

    it('updates an existing task while preserving ID and createdAt', () => {
      const created = manager.addTask({ title: 'Original Title', priority: 'low' });
      const originalCreatedAt = created.createdAt;

      const updated = manager.updateTask(created.id, {
        title: 'Updated Title',
        priority: 'high',
        id: 'hacker-attempt-id',
        createdAt: '2020-01-01T00:00:00.000Z',
      });

      assert.strictEqual(updated.id, created.id);
      assert.strictEqual(updated.createdAt, originalCreatedAt);
      assert.strictEqual(updated.title, 'Updated Title');
      assert.strictEqual(updated.priority, 'high');
      assert.notStrictEqual(updated.updatedAt, created.updatedAt);
    });

    it('throws when updating nonexistent task', () => {
      assert.throws(
        () => manager.updateTask('missing-id', { title: 'Test' }),
        /Task with id 'missing-id' not found/
      );
    });

    it('toggles task completion and tracks completedAt', () => {
      const task = manager.addTask({ title: 'Toggle test' });
      assert.strictEqual(task.completed, false);
      assert.strictEqual(task.completedAt, null);

      const completed = manager.toggleTask(task.id);
      assert.strictEqual(completed.completed, true);
      assert.ok(completed.completedAt);

      const uncompleted = manager.toggleTask(task.id);
      assert.strictEqual(uncompleted.completed, false);
      assert.strictEqual(uncompleted.completedAt, null);
    });

    it('deletes a task by ID', () => {
      const task = manager.addTask({ title: 'To Delete' });
      assert.strictEqual(manager.tasks.length, 1);

      const deleted = manager.deleteTask(task.id);
      assert.strictEqual(deleted, true);
      assert.strictEqual(manager.tasks.length, 0);
      assert.strictEqual(manager.getTask(task.id), null);

      // Deleting again should return false
      assert.strictEqual(manager.deleteTask(task.id), false);
    });
  });

  describe('Filtering and Searching', () => {
    beforeEach(() => {
      manager.addTask({ title: 'Buy Groceries', category: 'personal', priority: 'low', completed: true });
      manager.addTask({ title: 'Fix Bug in API', description: 'Urgent production hotfix', category: 'work', priority: 'high', completed: false });
      manager.addTask({ title: 'Study TypeScript', description: 'Read chapters 1-3', category: 'study', priority: 'medium', completed: false });
      manager.addTask({ title: 'Team Meeting Prep', category: 'work', priority: 'medium', completed: false });
    });

    it('filters by status: active vs completed', () => {
      const all = manager.listTasks({ status: 'all' });
      assert.strictEqual(all.length, 4);

      const active = manager.listTasks({ status: 'active' });
      assert.strictEqual(active.length, 3);
      assert.ok(active.every((t) => !t.completed));

      const completed = manager.listTasks({ status: 'completed' });
      assert.strictEqual(completed.length, 1);
      assert.strictEqual(completed[0].title, 'Buy Groceries');
    });

    it('filters by category', () => {
      const workTasks = manager.listTasks({ category: 'work' });
      assert.strictEqual(workTasks.length, 2);
      assert.ok(workTasks.every((t) => t.category === 'work'));
    });

    it('filters by priority', () => {
      const highTasks = manager.listTasks({ priority: 'high' });
      assert.strictEqual(highTasks.length, 1);
      assert.strictEqual(highTasks[0].title, 'Fix Bug in API');
    });

    it('searches across title and description (case-insensitive)', () => {
      const searchTitle = manager.listTasks({ search: 'groceries' });
      assert.strictEqual(searchTitle.length, 1);
      assert.strictEqual(searchTitle[0].title, 'Buy Groceries');

      const searchDesc = manager.listTasks({ search: 'hotfix' });
      assert.strictEqual(searchDesc.length, 1);
      assert.strictEqual(searchDesc[0].title, 'Fix Bug in API');

      const searchEmpty = manager.listTasks({ search: 'nonexistent keyword' });
      assert.strictEqual(searchEmpty.length, 0);
    });

    it('sorts by priority desc/asc', () => {
      const sortedDesc = manager.listTasks({ sortBy: 'priority', sortOrder: 'desc' });
      assert.strictEqual(sortedDesc[0].priority, 'high');
      assert.strictEqual(sortedDesc[sortedDesc.length - 1].priority, 'low');

      const sortedAsc = manager.listTasks({ sortBy: 'priority', sortOrder: 'asc' });
      assert.strictEqual(sortedAsc[0].priority, 'low');
      assert.strictEqual(sortedAsc[sortedAsc.length - 1].priority, 'high');
    });

    it('sorts by title alphabetically', () => {
      const sorted = manager.listTasks({ sortBy: 'title', sortOrder: 'asc' });
      assert.strictEqual(sorted[0].title, 'Buy Groceries');
      assert.strictEqual(sorted[sorted.length - 1].title, 'Team Meeting Prep');
    });
  });

  describe('Statistics and Metrics (getStats)', () => {
    it('returns zeroes when task list is empty', () => {
      const stats = manager.getStats();

      assert.deepStrictEqual(stats, {
        total: 0,
        completed: 0,
        active: 0,
        completionRate: 0,
        byPriority: { low: 0, medium: 0, high: 0 },
        byCategory: { work: 0, personal: 0, study: 0, general: 0 },
        overdueCount: 0,
      });
    });

    it('computes accurate counts, percentages, and overdue tasks', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow

      manager.addTask({ title: 'Task 1', priority: 'high', category: 'work', completed: true });
      manager.addTask({ title: 'Task 2', priority: 'medium', category: 'personal', completed: false, dueDate: futureDate });
      manager.addTask({ title: 'Task 3', priority: 'low', category: 'study', completed: false, dueDate: pastDate }); // overdue!
      manager.addTask({ title: 'Task 4', priority: 'high', category: 'work', completed: true, dueDate: pastDate }); // completed, so not overdue!

      const stats = manager.getStats();

      assert.strictEqual(stats.total, 4);
      assert.strictEqual(stats.completed, 2);
      assert.strictEqual(stats.active, 2);
      assert.strictEqual(stats.completionRate, 50); // 2/4 = 50%
      assert.strictEqual(stats.overdueCount, 1);
      assert.deepStrictEqual(stats.byPriority, { low: 1, medium: 1, high: 2 });
      assert.deepStrictEqual(stats.byCategory, { work: 2, personal: 1, study: 1, general: 0 });
    });
  });

  describe('Bulk Operations', () => {
    let id1, id2, id3;

    beforeEach(() => {
      id1 = manager.addTask({ title: 'Task A', completed: false }).id;
      id2 = manager.addTask({ title: 'Task B', completed: false }).id;
      id3 = manager.addTask({ title: 'Task C', completed: true }).id;
    });

    it('bulk completes specified tasks', () => {
      const completedCount = manager.bulkComplete([id1, id2]);

      assert.strictEqual(completedCount, 2);
      assert.strictEqual(manager.getTask(id1).completed, true);
      assert.strictEqual(manager.getTask(id2).completed, true);
      assert.strictEqual(manager.getTask(id3).completed, true);

      // Completing already completed tasks returns 0 changes
      assert.strictEqual(manager.bulkComplete([id1, id2]), 0);
    });

    it('bulk deletes specified tasks', () => {
      const deletedCount = manager.bulkDelete([id1, id3]);

      assert.strictEqual(deletedCount, 2);
      assert.strictEqual(manager.tasks.length, 1);
      assert.strictEqual(manager.tasks[0].id, id2);
    });

    it('clears all completed tasks', () => {
      manager.bulkComplete([id1]); // Now id1 and id3 are completed

      const removed = manager.clearCompleted();
      assert.strictEqual(removed, 2);
      assert.strictEqual(manager.tasks.length, 1);
      assert.strictEqual(manager.tasks[0].id, id2);
      assert.strictEqual(manager.getStats().completed, 0);
    });
  });
});
