import { TaskManager } from '../src/services/taskManager.js';
import { LocalStorageAdapter } from '../src/storage/storage.js';

// Initialize TaskManager with Browser LocalStorage Adapter
const storage = new LocalStorageAdapter('taskpulse_tasks');
const manager = new TaskManager(storage);

// Seed sample tasks if storage is brand new
if (manager.tasks.length === 0) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  manager.addTask({
    title: 'Explore project architecture & clean code structure',
    description: 'Check out src/models/task.js and src/services/taskManager.js for modular design.',
    priority: 'high',
    category: 'work',
    dueDate: tomorrow,
    completed: false,
  });

  manager.addTask({
    title: 'Run automated tests via npm test',
    description: '35 automated tests covering model validation, CRUD, filtering, and storage persistence.',
    priority: 'medium',
    category: 'study',
    completed: true,
  });

  manager.addTask({
    title: 'Customize UI or build new features',
    description: 'Add your own custom tags, export data to JSON, or integrate your own API.',
    priority: 'low',
    category: 'personal',
    completed: false,
  });
}

// Current Filter State
const state = {
  status: 'all',
  category: 'all',
  priority: 'all',
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

// DOM Elements
const taskListEl = document.getElementById('taskList');
const taskForm = document.getElementById('taskForm');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const priorityFilter = document.getElementById('priorityFilter');
const sortBySelect = document.getElementById('sortBySelect');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterPills = document.querySelectorAll('.filter-pill');

// Stat Elements
const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statCompleted = document.getElementById('statCompleted');
const statRate = document.getElementById('statRate');
const progressBarFill = document.getElementById('progressBarFill');
const progressText = document.getElementById('progressText');
const activeCountLabel = document.getElementById('activeCountLabel');

/**
 * Format relative or calendar date
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Render task list & refresh stats
 */
function render() {
  const tasks = manager.listTasks(state);
  const stats = manager.getStats();

  // Update Stats Counters
  statTotal.textContent = stats.total;
  statActive.textContent = stats.active;
  statCompleted.textContent = stats.completed;
  statRate.textContent = `${stats.completionRate}%`;
  progressBarFill.style.width = `${stats.completionRate}%`;
  progressText.textContent = `${stats.completed} of ${stats.total} completed (${stats.completionRate}%)`;
  activeCountLabel.textContent = `${stats.active} active task${stats.active === 1 ? '' : 's'}`;

  // Clear List
  taskListEl.innerHTML = '';

  if (tasks.length === 0) {
    taskListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No tasks found</div>
        <p>Try adjusting your filters or add a new task above.</p>
      </div>
    `;
    return;
  }

  // Render Each Task
  const now = Date.now();
  for (const task of tasks) {
    const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate).getTime() < now;

    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    item.dataset.id = task.id;

    item.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Toggle completed" />
      <div class="task-content">
        <div class="task-header-row">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <div class="task-actions">
            <button class="btn-icon btn-delete" title="Delete task" aria-label="Delete task">✕</button>
          </div>
        </div>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
        <div class="task-meta">
          <span class="pill pill-priority-${task.priority}">${task.priority}</span>
          <span class="pill pill-category">${task.category}</span>
          ${task.dueDate ? `
            <span class="pill pill-due ${isOverdue ? 'pill-overdue' : ''}">
              ${isOverdue ? '⚠️ Overdue: ' : '📅 '} ${formatDate(task.dueDate)}
            </span>
          ` : ''}
        </div>
      </div>
    `;

    taskListEl.appendChild(item);
  }
}

/**
 * Basic HTML escaping helper for safe rendering
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Event Listeners

// 1. Task Form Submission
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const titleInput = document.getElementById('taskTitle');
  const descInput = document.getElementById('taskDesc');
  const priorityInput = document.getElementById('taskPriority');
  const categoryInput = document.getElementById('taskCategory');
  const dueDateInput = document.getElementById('taskDueDate');

  const title = titleInput.value.trim();
  if (!title) return;

  try {
    manager.addTask({
      title,
      description: descInput.value,
      priority: priorityInput.value,
      category: categoryInput.value,
      dueDate: dueDateInput.value || null,
    });

    taskForm.reset();
    render();
  } catch (err) {
    alert(err.message);
  }
});

// 2. Task Item Actions (Delegated)
taskListEl.addEventListener('click', (e) => {
  const item = e.target.closest('.task-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.classList.contains('task-checkbox')) {
    manager.toggleTask(id);
    render();
  } else if (e.target.closest('.btn-delete')) {
    manager.deleteTask(id);
    render();
  }
});

// 3. Status Filter Pills
filterPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    filterPills.forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    state.status = pill.dataset.status;
    render();
  });
});

// 4. Category & Priority Filters
categoryFilter.addEventListener('change', (e) => {
  state.category = e.target.value;
  render();
});

priorityFilter.addEventListener('change', (e) => {
  state.priority = e.target.value;
  render();
});

sortBySelect.addEventListener('change', (e) => {
  state.sortBy = e.target.value;
  render();
});

// 5. Search Bar Input
let debounceTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.search = e.target.value;
    render();
  }, 150);
});

// 6. Clear Completed
clearCompletedBtn.addEventListener('click', () => {
  const stats = manager.getStats();
  if (stats.completed === 0) return;
  if (confirm(`Remove all ${stats.completed} completed task(s)?`)) {
    manager.clearCompleted();
    render();
  }
});

// Initial Render
render();
