# TaskPulse ⚡

A modern, lightweight productivity and task management web application built with clean architecture, zero external dependencies, and 100% test coverage using Node.js's native test runner.

---

## 1. What Problem It Solves & Where It Fits

TaskPulse is a structured task and productivity tracker designed to organize personal and team workflows.

```
+--------------------------------------------------------------------------+
|                              TaskPulse Architecture                      |
+--------------------------------------------------------------------------+
|  [Presentation Layer]       index.html + css/styles.css + js/app.js      |
|                                       │                                  |
|                                       ▼                                  |
|  [Service / Domain Layer]    src/services/taskManager.js                 |
|                                       │                                  |
|                        ┌──────────────┴──────────────┐                   |
|                        ▼                             ▼                   |
|               [Entities / Models]           [Storage Adapters]           |
|                src/models/task.js           src/storage/storage.js       |
|                                             ├─ LocalStorageAdapter (Web) |
|                                             └─ MemoryStorageAdapter (Test)|
+--------------------------------------------------------------------------+
```

### Where It Fits in the Bigger Picture
- **Client-Side SPA**: Operates directly in any modern browser without requiring a backend runtime server.
- **Pluggable Storage**: Uses the Adapter pattern to switch between browser `localStorage` and `MemoryStorageAdapter` for testing or headless Node.js environments.
- **Production-Ready Starter Template**: Serves as a reference implementation for vanilla JavaScript clean architecture, separation of concerns, and automated testing.

---

## 2. Step-by-Step Main Flow

1. **Initialization (`js/app.js`)**:
   - Creates a `LocalStorageAdapter` instance configured with the `'taskpulse_tasks'` key.
   - Instantiates `TaskManager` with this storage adapter.
   - If empty, seeds initial demonstration tasks so new users immediately see a populated dashboard.
2. **User Input / Task Creation**:
   - User inputs title, optional notes, priority, category, and due date.
   - Form submission calls `manager.addTask(taskData)`.
   - `createTaskObject` validates fields, assigns a unique ID, sets ISO timestamps (`createdAt`, `updatedAt`), and normalizes values.
3. **Persistence & Reaction**:
   - `TaskManager` persists changes through the storage adapter (`localStorage.setItem`).
   - The UI automatically re-renders the task list, calculates updated completion metrics (percentages, counts, overdue status), and animates the progress bar.
4. **Filtering & Search**:
   - Users can toggle status pills (`all`, `active`, `completed`), filter by priority or category, sort (by date, priority, title), or type in the real-time search bar.

---

## 3. Non-Obvious Decisions, Gotchas & Dependencies

- **Zero External Dependencies**:
  - Built using standard ES modules and Node.js 22's native `node:test` and `node:assert/strict`.
  - Runs in any browser and passes tests without running `npm install` or downloading megabytes of `node_modules`.
- **Deep-Copy Immutability in Storage**:
  - `MemoryStorageAdapter` deep-clones tasks upon `loadTasks()` and `saveTasks()`. This ensures test assertions or caller mutations never accidentally modify internal stored arrays by reference.
- **Immutable Fields on Update**:
  - `updateTask` explicitly preserves `id` and `createdAt` even if a caller attempts to overwrite them in the payload.
- **Graceful Corrupted Data Recovery**:
  - If a user's browser `localStorage` contains corrupted or unparseable JSON, `LocalStorageAdapter` catches the parse exception, logs a warning, and returns an empty array instead of crashing the UI.
- **Overdue Task Logic**:
  - Tasks past their due date are only counted and flagged as overdue if `completed === false`. Completed past tasks are considered successfully accomplished.

---

## 4. Examples: How to Use and Extend

### Running Tests
Execute the 35 automated tests directly:
```bash
npm test
```
Or with Node's native test runner:
```bash
node --test tests/**/*.test.js
```

### Example 1: Using the Service Programmatically
```javascript
import { TaskManager } from './src/services/taskManager.js';
import { MemoryStorageAdapter } from './src/storage/storage.js';

const manager = new TaskManager(new MemoryStorageAdapter());

// Add a high-priority task
const task = manager.addTask({
  title: 'Implement Dark Mode toggle',
  priority: 'high',
  category: 'work',
  dueDate: '2026-12-01T00:00:00.000Z',
});

// Complete and inspect stats
manager.toggleTask(task.id);
console.log(manager.getStats());
// => { total: 1, completed: 1, active: 0, completionRate: 100, ... }
```

### Example 2: Extending with a REST API Storage Adapter
To sync tasks with a remote backend database, create a new adapter that implements the storage interface:

```javascript
export class ApiStorageAdapter {
  constructor(apiBaseUrl) {
    this.baseUrl = apiBaseUrl;
  }

  async loadTasks() {
    const res = await fetch(`${this.baseUrl}/tasks`);
    return res.json();
  }

  async saveTasks(tasks) {
    await fetch(`${this.baseUrl}/tasks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tasks),
    });
    return true;
  }
}
```

---

## Project Structure

```
├── README.md                 # Architecture, guide & documentation
├── package.json              # Project metadata & test script
├── index.html                # Responsive web application interface
├── css/
│   └── styles.css            # Modern dark-mode styling & responsive layout
├── js/
│   └── app.js                # Browser application & UI event controller
├── src/
│   ├── models/
│   │   └── task.js           # Domain entity model & validation rules
│   ├── services/
│   │   └── taskManager.js    # Business logic, querying, metrics, & CRUD
│   └── storage/
│       └── storage.js        # Pluggable storage adapters (Memory & LocalStorage)
└── tests/
    ├── task.test.js          # 11 unit tests for Task model & validation
    ├── taskManager.test.js   # 17 unit tests for TaskManager features & stats
    └── storage.test.js       # 7 unit tests for storage persistence & edge cases
```
