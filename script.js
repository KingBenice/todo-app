// Storage Keys
const STORAGE_KEYS = {
  tasks: 'taskflow_tasks',
  notes: 'taskflow_notes',
  reminders: 'taskflow_reminders',
  theme: 'taskflow_theme',
};

// State
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks)) || [];
let notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes)) || [];
let reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.reminders)) || [];
let currentFilter = 'all';
let currentView = 'tasks';

// DOM Elements
const taskForm = document.getElementById('taskForm');
const taskModal = document.getElementById('taskModal');
const newTaskBtn = document.getElementById('newTaskBtn');
const tasksList = document.getElementById('tasksList');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');
const navItems = document.querySelectorAll('.nav-item');
const themeToggle = document.getElementById('themeToggle');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.querySelector('.sidebar');
const newNoteBtn = document.getElementById('newNoteBtn');
const notesList = document.getElementById('notesList');
const notesEmpty = document.getElementById('notesEmpty');
const searchInput = document.getElementById('searchInput');
const toast = document.getElementById('toast');
const remindersList = document.getElementById('remindersList');
const remindersEmpty = document.getElementById('remindersEmpty');
const reminderBadge = document.getElementById('reminderBadge');
const clearRemindersBtn = document.getElementById('clearRemindersBtn');

// Initialize
function init() {
  loadTheme();
  setupEventListeners();
  renderTasks();
  renderNotes();
  renderReminders();
  checkReminders();
  setInterval(checkReminders, 60000); // Check every minute
}

function setupEventListeners() {
  // Navigation
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      currentView = item.dataset.view;
      switchView(currentView);
      sidebar.classList.remove('open');
    });
  });

  // Tasks
  newTaskBtn.addEventListener('click', () => openModal('taskModal'));
  taskForm.addEventListener('submit', handleAddTask);
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  searchInput.addEventListener('input', renderTasks);

  // Theme
  themeToggle.addEventListener('click', toggleTheme);

  // Sidebar
  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

  // Notes
  newNoteBtn.addEventListener('click', handleNewNote);

  // Modals
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      closeModal(e.target.closest('[data-close]').dataset.close);
    });
  });

  // Reminders
  clearRemindersBtn.addEventListener('click', () => {
    reminders = [];
    saveReminders();
    renderReminders();
    showToast('All reminders cleared', 'success');
  });
}

// View Management
function switchView(view) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById(`${view}View`).classList.add('active');
  navItems.forEach((item) => item.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  if (view === 'notes') renderNotes();
  if (view === 'reminders') renderReminders();
}

// Task Management
function handleAddTask(e) {
  e.preventDefault();

  const task = {
    id: Date.now(),
    title: document.getElementById('taskTitle').value,
    category: document.getElementById('taskCategory').value,
    priority: document.getElementById('taskPriority').value,
    dueDate: document.getElementById('taskDueDate').value,
    dueTime: document.getElementById('taskDueTime').value,
    description: document.getElementById('taskDescription').value,
    reminder: document.getElementById('taskReminder').checked,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(task);
  saveTasks();
  renderTasks();
  closeModal('taskModal');
  taskForm.reset();
  showToast('Task created successfully!', 'success');

  if (task.reminder) {
    addReminder(task);
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

function renderTasks() {
  const searchTerm = searchInput.value.toLowerCase();

  let filtered = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm);
    const matchesFilter =
      currentFilter === 'all' ||
      currentFilter === 'active' && !task.completed ||
      currentFilter === 'completed' && task.completed ||
      currentFilter === task.category;
    return matchesSearch && matchesFilter;
  });

  tasksList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  filtered.forEach((task) => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const isOverdue = task.dueDate && dueDate < today && !task.completed;

    const taskCard = document.createElement('div');
    taskCard.className = `task-card ${task.completed ? 'completed' : ''}`;
    taskCard.innerHTML = `
      <input
        type="checkbox"
        class="task-checkbox"
        ${task.completed ? 'checked' : ''}
        onchange="toggleTask(${task.id})"
      />
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<p style="font-size: 0.9rem; color: var(--text-muted);">${escapeHtml(task.description)}</p>` : ''}
        <div class="task-meta">
          <span class="task-badge priority-${task.priority}">
            <i class="fas fa-flag"></i> ${task.priority}
          </span>
          <span class="task-badge category-badge">
            <span class="category-dot ${task.category}"></span>
            ${task.category}
          </span>
          ${task.dueDate
            ? `<span class="task-badge due-date ${isOverdue ? 'overdue' : ''}">
                <i class="fas fa-calendar"></i>
                ${formatDate(task.dueDate)} ${task.dueTime ? `@ ${task.dueTime}` : ''}
              </span>`
            : ''
          }
          ${task.reminder ? '<span class="task-badge"><i class="fas fa-bell"></i> Reminder Set</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-btn" onclick="deleteTask(${task.id})" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    tasksList.appendChild(taskCard);
  });
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }
}

function deleteTask(id) {
  if (confirm('Delete this task?')) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    renderTasks();
    showToast('Task deleted', 'success');
  }
}

// Note Management
function handleNewNote() {
  const title = prompt('Note title:');
  if (!title) return;

  const content = prompt('Note content:');
  if (!content) return;

  const note = {
    id: Date.now(),
    title,
    content,
    createdAt: new Date().toISOString(),
  };

  notes.unshift(note);
  saveNotes();
  renderNotes();
  showToast('Note created!', 'success');
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
}

function renderNotes() {
  notesList.innerHTML = '';
  notesEmpty.classList.toggle('hidden', notes.length > 0);

  notes.forEach((note) => {
    const noteCard = document.createElement('div');
    noteCard.className = 'note-card';
    noteCard.innerHTML = `
      <div class="note-title">${escapeHtml(note.title)}</div>
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-footer">
        <span>${formatDate(note.createdAt)}</span>
        <div class="note-actions">
          <button class="note-btn" onclick="editNote(${note.id})" title="Edit">
            <i class="fas fa-pen"></i>
          </button>
          <button class="note-btn delete" onclick="deleteNote(${note.id})" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    notesList.appendChild(noteCard);
  });
}

function editNote(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  const newTitle = prompt('Edit title:', note.title);
  if (!newTitle) return;

  const newContent = prompt('Edit content:', note.content);
  if (!newContent) return;

  note.title = newTitle;
  note.content = newContent;
  saveNotes();
  renderNotes();
  showToast('Note updated!', 'success');
}

function deleteNote(id) {
  if (confirm('Delete this note?')) {
    notes = notes.filter((n) => n.id !== id);
    saveNotes();
    renderNotes();
    showToast('Note deleted', 'success');
  }
}

// Reminder Management
function addReminder(task) {
  const reminder = {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    taskId: task.id,
    read: false,
  };

  reminders.push(reminder);
  saveReminders();
  updateReminderBadge();
}

function saveReminders() {
  localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders));
}

function renderReminders() {
  remindersList.innerHTML = '';
  remindersEmpty.classList.toggle('hidden', reminders.length > 0);

  reminders.forEach((reminder) => {
    const reminderCard = document.createElement('div');
    reminderCard.className = 'reminder-card';
    reminderCard.innerHTML = `
      <div class="reminder-content">
        <div class="reminder-title">${escapeHtml(reminder.title)}</div>
        <div class="reminder-time">
          ${formatDate(reminder.dueDate)} ${reminder.dueTime ? `@ ${reminder.dueTime}` : ''}
        </div>
      </div>
      <button class="reminder-btn" onclick="markReminderRead(${reminder.id})">
        Mark Read
      </button>
    `;
    remindersList.appendChild(reminderCard);
  });
}

function markReminderRead(id) {
  reminders = reminders.filter((r) => r.id !== id);
  saveReminders();
  renderReminders();
  updateReminderBadge();
  showToast('Reminder marked as read', 'success');
}

function checkReminders() {
  const now = new Date();
  reminders.forEach((reminder) => {
    if (reminder.dueDate && reminder.dueTime) {
      const reminderTime = new Date(`${reminder.dueDate}T${reminder.dueTime}`);
      if (reminderTime <= now && !reminder.notified) {
        showToast(`Reminder: ${reminder.title}`, 'success');
        reminder.notified = true;
      }
    }
  });
}

function updateReminderBadge() {
  reminderBadge.textContent = reminders.length;
  reminderBadge.style.display = reminders.length > 0 ? 'inline-block' : 'none';
}

// Modal Management
function openModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// Theme Management
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
  updateThemeIcon();
}

function loadTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  }
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.body.classList.contains('dark-mode');
  themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Toast Notification
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Utility Functions
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Start App
init();
