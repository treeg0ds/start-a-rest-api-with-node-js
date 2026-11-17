import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTaskObject, validateTaskData, PRIORITIES, CATEGORIES } from '../src/models/task.js';

describe('Task Model & Validation', () => {
  describe('validateTaskData', () => {
    it('throws when payload is not an object', () => {
      assert.throws(() => validateTaskData(null), /Task data must be an object/);
      assert.throws(() => validateTaskData('string'), /Task data must be an object/);
    });

    it('requires title on creation', () => {
      assert.throws(() => validateTaskData({}), /Task title must be a string/);
      assert.throws(() => validateTaskData({ title: '' }), /Task title cannot be empty/);
      assert.throws(() => validateTaskData({ title: '   ' }), /Task title cannot be empty/);
    });

    it('rejects title longer than 120 chars', () => {
      const longTitle = 'a'.repeat(121);
      assert.throws(() => validateTaskData({ title: longTitle }), /Task title cannot exceed 120 characters/);
    });

    it('rejects invalid priority', () => {
      assert.throws(
        () => validateTaskData({ title: 'Valid', priority: 'critical' }),
        /Invalid priority 'critical'/
      );
    });

    it('rejects invalid category', () => {
      assert.throws(
        () => validateTaskData({ title: 'Valid', category: 'random' }),
        /Invalid category 'random'/
      );
    });

    it('rejects invalid dueDate', () => {
      assert.throws(
        () => validateTaskData({ title: 'Valid', dueDate: 'not-a-date' }),
        /Invalid due date format/
      );
    });

    it('allows partial updates when isUpdate=true', () => {
      assert.doesNotThrow(() => validateTaskData({ priority: 'high' }, true));
      assert.doesNotThrow(() => validateTaskData({ description: 'New description' }, true));
    });
  });

  describe('createTaskObject', () => {
    it('creates a task with expected defaults', () => {
      const task = createTaskObject({ title: 'Write unit tests' });

      assert.ok(task.id, 'Task must have an ID');
      assert.strictEqual(task.title, 'Write unit tests');
      assert.strictEqual(task.description, '');
      assert.strictEqual(task.priority, 'medium');
      assert.strictEqual(task.category, 'general');
      assert.strictEqual(task.completed, false);
      assert.strictEqual(task.completedAt, null);
      assert.ok(task.createdAt, 'Task must have createdAt timestamp');
      assert.ok(task.updatedAt, 'Task must have updatedAt timestamp');
    });

    it('trims whitespace from title and description', () => {
      const task = createTaskObject({
        title: '   Trimmed Title   ',
        description: '   Some details   ',
      });

      assert.strictEqual(task.title, 'Trimmed Title');
      assert.strictEqual(task.description, 'Some details');
    });

    it('handles explicit priority, category, and dueDate', () => {
      const dueDate = '2026-12-31T12:00:00.000Z';
      const task = createTaskObject({
        title: 'Launch Project',
        priority: 'high',
        category: 'work',
        dueDate,
      });

      assert.strictEqual(task.priority, 'high');
      assert.strictEqual(task.category, 'work');
      assert.strictEqual(task.dueDate, dueDate);
    });

    it('exposes valid priority and category lists', () => {
      assert.deepStrictEqual([...PRIORITIES], ['low', 'medium', 'high']);
      assert.deepStrictEqual([...CATEGORIES], ['work', 'personal', 'study', 'general']);
    });
  });
});
