/**
 * Task Model
 * Represents a single task entity with validation and normalization.
 */

export const PRIORITIES = Object.freeze(['low', 'medium', 'high']);
export const CATEGORIES = Object.freeze(['work', 'personal', 'study', 'general']);

/**
 * Validates task creation or update payload.
 * Throws an Error with descriptive message if validation fails.
 *
 * @param {Object} data 
 * @param {boolean} [isUpdate=false] 
 * @returns {void}
 */
export function validateTaskData(data, isUpdate = false) {
  if (!data || typeof data !== 'object') {
    throw new TypeError('Task data must be an object');
  }

  // Validate title
  if (!isUpdate || data.title !== undefined) {
    if (typeof data.title !== 'string') {
      throw new TypeError('Task title must be a string');
    }
    const trimmedTitle = data.title.trim();
    if (trimmedTitle.length === 0) {
      throw new Error('Task title cannot be empty');
    }
    if (trimmedTitle.length > 120) {
      throw new Error('Task title cannot exceed 120 characters');
    }
  }

  // Validate description if provided
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      throw new TypeError('Task description must be a string');
    }
    if (data.description.length > 500) {
      throw new Error('Task description cannot exceed 500 characters');
    }
  }

  // Validate priority if provided
  if (data.priority !== undefined) {
    if (!PRIORITIES.includes(data.priority)) {
      throw new Error(`Invalid priority '${data.priority}'. Must be one of: ${PRIORITIES.join(', ')}`);
    }
  }

  // Validate category if provided
  if (data.category !== undefined) {
    if (!CATEGORIES.includes(data.category)) {
      throw new Error(`Invalid category '${data.category}'. Must be one of: ${CATEGORIES.join(', ')}`);
    }
  }

  // Validate dueDate if provided
  if (data.dueDate !== undefined && data.dueDate !== null && data.dueDate !== '') {
    const parsedDate = new Date(data.dueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid due date format: '${data.dueDate}'`);
    }
  }
}

/**
 * Creates a normalized task instance with default values and timestamps.
 *
 * @param {Object} data
 * @returns {Object} Normalized task object
 */
export function createTaskObject(data) {
  validateTaskData(data, false);

  const now = new Date().toISOString();
  const id = data.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  return {
    id,
    title: data.title.trim(),
    description: (data.description || '').trim(),
    priority: data.priority || 'medium',
    category: data.category || 'general',
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    completed: Boolean(data.completed),
    createdAt: data.createdAt || now,
    updatedAt: now,
    completedAt: data.completed ? (data.completedAt || now) : null,
  };
}
