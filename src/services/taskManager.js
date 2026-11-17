/**
 * TaskManager Service
 * Orchestrates task CRUD operations, querying, sorting, metrics, and persistence.
 */

import { createTaskObject, validateTaskData, PRIORITIES, CATEGORIES } from '../models/task.js';
import { MemoryStorageAdapter } from '../storage/storage.js';

export class TaskManager {
  /**
   * @param {Object} storageAdapter - An adapter with loadTasks() and saveTasks()
   */
  constructor(storageAdapter = new MemoryStorageAdapter()) {
    this.storage = storageAdapter;
    this.tasks = [];
    this.reload();
  }

  /**
   * Reload tasks from storage.
   */
  reload() {
    this.tasks = this.storage.loadTasks() || [];
  }

  /**
   * Internal helper to persist current tasks.
   */
  _persist() {
    this.storage.saveTasks(this.tasks);
  }

  /**
   * Create and add a new task.
   *
   * @param {Object} taskData
   * @returns {Object} The created task
   */
  addTask(taskData) {
    const task = createTaskObject(taskData);
    this.tasks.push(task);
    this._persist();
    return { ...task };
  }

  /**
   * Retrieve a task by ID.
   *
   * @param {string} id
   * @returns {Object|null}
   */
  getTask(id) {
    if (!id || typeof id !== 'string') return null;
    const task = this.tasks.find((t) => t.id === id);
    return task ? { ...task } : null;
  }

  /**
   * Update an existing task.
   *
   * @param {string} id
   * @param {Object} updates
   * @returns {Object} Updated task
   */
  updateTask(id, updates) {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task with id '${id}' not found`);
    }

    validateTaskData(updates, true);

    const existing = this.tasks[index];
    const now = new Date().toISOString();

    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // prevent ID change
      createdAt: existing.createdAt, // prevent creation date change
      updatedAt: now,
    };

    if (updates.title !== undefined) {
      updated.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
      updated.description = (updates.description || '').trim();
    }
    if (updates.dueDate !== undefined) {
      updated.dueDate = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;
    }
    if (updates.completed !== undefined) {
      updated.completed = Boolean(updates.completed);
      updated.completedAt = updated.completed ? (existing.completedAt || now) : null;
    }

    this.tasks[index] = updated;
    this._persist();
    return { ...updated };
  }

  /**
   * Toggle the completion state of a task.
   *
   * @param {string} id
   * @returns {Object} Updated task
   */
  toggleTask(id) {
    const task = this.getTask(id);
    if (!task) {
      throw new Error(`Task with id '${id}' not found`);
    }
    return this.updateTask(id, { completed: !task.completed });
  }

  /**
   * Delete a task by ID.
   *
   * @param {string} id
   * @returns {boolean} True if deleted, false if not found
   */
  deleteTask(id) {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    if (this.tasks.length !== initialLength) {
      this._persist();
      return true;
    }
    return false;
  }

  /**
   * List tasks with optional filtering and sorting.
   *
   * @param {Object} [options]
   * @param {'all'|'active'|'completed'} [options.status='all']
   * @param {string} [options.category='all']
   * @param {string} [options.priority='all']
   * @param {string} [options.search='']
   * @param {'createdAt'|'dueDate'|'priority'|'title'} [options.sortBy='createdAt']
   * @param {'asc'|'desc'} [options.sortOrder='desc']
   * @returns {Array<Object>} Filtered and sorted tasks
   */
  listTasks({
    status = 'all',
    category = 'all',
    priority = 'all',
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    let result = [...this.tasks];

    // Status filter
    if (status === 'active') {
      result = result.filter((t) => !t.completed);
    } else if (status === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // Category filter
    if (category !== 'all' && CATEGORIES.includes(category)) {
      result = result.filter((t) => t.category === category);
    }

    // Priority filter
    if (priority !== 'all' && PRIORITIES.includes(priority)) {
      result = result.filter((t) => t.priority === priority);
    }

    // Search query filter
    const query = (search || '').trim().toLowerCase();
    if (query.length > 0) {
      result = result.filter((t) =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
      );
    }

    // Sorting
    const priorityWeight = { high: 3, medium: 2, low: 1 };

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'priority') {
        comparison = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'dueDate') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        comparison = dateA - dateB;
      } else {
        // Default: createdAt
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        comparison = dateA - dateB;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result.map((t) => ({ ...t }));
  }

  /**
   * Get aggregate metrics and statistics.
   *
   * @returns {Object}
   */
  getStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;

    const byPriority = { low: 0, medium: 0, high: 0 };
    const byCategory = { work: 0, personal: 0, study: 0, general: 0 };

    const now = Date.now();
    let overdueCount = 0;

    for (const task of this.tasks) {
      if (byPriority[task.priority] !== undefined) {
        byPriority[task.priority]++;
      }
      if (byCategory[task.category] !== undefined) {
        byCategory[task.category]++;
      }
      if (!task.completed && task.dueDate) {
        const dueTime = new Date(task.dueDate).getTime();
        if (dueTime < now) {
          overdueCount++;
        }
      }
    }

    return {
      total,
      completed,
      active,
      completionRate,
      byPriority,
      byCategory,
      overdueCount,
    };
  }

  /**
   * Remove all completed tasks.
   *
   * @returns {number} Number of removed tasks
   */
  clearCompleted() {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter((t) => !t.completed);
    const removedCount = initialLength - this.tasks.length;
    if (removedCount > 0) {
      this._persist();
    }
    return removedCount;
  }

  /**
   * Bulk complete tasks by ID list.
   *
   * @param {string[]} ids
   * @returns {number} Count of completed tasks
   */
  bulkComplete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const idSet = new Set(ids);
    let count = 0;
    const now = new Date().toISOString();

    for (const task of this.tasks) {
      if (idSet.has(task.id) && !task.completed) {
        task.completed = true;
        task.completedAt = now;
        task.updatedAt = now;
        count++;
      }
    }

    if (count > 0) {
      this._persist();
    }
    return count;
  }

  /**
   * Bulk delete tasks by ID list.
   *
   * @param {string[]} ids
   * @returns {number} Count of deleted tasks
   */
  bulkDelete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter((t) => !idSet.has(t.id));
    const deletedCount = initialLength - this.tasks.length;

    if (deletedCount > 0) {
      this._persist();
    }
    return deletedCount;
  }
}
