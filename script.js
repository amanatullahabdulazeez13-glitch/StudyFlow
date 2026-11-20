// ==========================================
// STUDYFLOW - MAIN APPLICATION
// ==========================================

const STORAGE_KEY = "studyflow_v2";

const defaultState = {
  tasks: [],
  name: "Student",
  petName: "Mochi",
  xp: 0,
  level: 1,
  minutes: 0,
  completedTasks: 0,
  focusDates: []
};

let state = loadState();
let currentFilter = "all";

// ---------- STORAGE ----------

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultState, ...JSON.parse(saved) };

    // Migrate original StudyFlow data if available
    const old = localStorage.getItem("studyflow_v1");
    if (old) {
      const previous = JSON.parse(old);
      return {
        ...defaultState,
        tasks: previous.tasks || [],
        minutes: previous.minutes || previous.totalMinutes || 0,
        completedTasks: previous.completedTasks || 0
      };
    }
  } catch (error) {
    console.log("Could not load saved data.");
  }

  return { ...defaultState };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- ELEMENTS ----------

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskSubject = document.getElementById("task-subject");
const taskDate = document.getElementById("task-date");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

const profileDialog = document.getElementById("profile-dialog");
const petDialog = document.getElementById("pet-dialog");

let timerInterval = null;
let timerSeconds = 25 * 60;
let selectedTimerMinutes = 25;
let timerRunning = false;

// ---------- TASKS ----------

function renderTasks() {
  taskList.innerHTML = "";

  let filtered = state.tasks.filter(task => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  if (filtered.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div style="font-size:35px;margin-bottom:10px;">${currentFilter === "completed" ? "🌷" : "📚"}</div>
        <p>${currentFilter === "completed" ? "No completed tasks yet." : "No tasks here. Add one to get started!"}</p>
      </div>
    `;
  }

  filtered.forEach(task => {
    const item = document.createElement("div");
    item.className = "task-item" + (task.completed ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark task complete");

    checkbox.addEventListener("change", () => toggleTask(task.id));

    const info = document.createElement("div");
    info.className = "task-info";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    let metaText = task.subject || "General";
    if (task.date) metaText += " · Due " + formatDate(task.date);
    meta.textContent = metaText;

    info.append(title, meta);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-task";
    deleteBtn.textContent = "×";
    deleteBtn.title = "Delete task";
    deleteBtn.setAttribute("aria-label", "Delete task");

    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    item.append(checkbox, info, deleteBtn);
    taskList.appendChild(item);
  });

  updateTaskStats();
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = taskInput.value.trim();
  if (!title) return;

  const task = {
    id: Date.now() + Math.random(),
    title,
    subject: taskSubject.value,
    date: taskDate.value,
    completed: false,
    created: new Date().toISOString()
  };

  state.tasks.push(task);
  taskInput.value = "";
  taskDate.value = "";

  saveState();
  renderTasks();
  updatePlanner();
});

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;

  if (task.completed) {
    state.completedTasks++;
    addXP(10);
  }

  saveState();
  renderTasks();
  updatePlanner();
  updateDashboard();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderTasks();
  updatePlanner();
}

function updateTaskStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;

  taskCount.textContent = `${total} task${total === 1 ? "" : "s"}`;

  const percent = total ? Math.round((completed / total) * 100) : 0;
  progressBar.style.width = percent + "%";
  progressText.textContent = percent + "%";

  document.getElementById("completed-stat").textContent = completed;
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    button.classList.add("active");

    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

// ---------- SMART PLANNER ----------

function updatePlanner() {
  const result = document.getElementById("planner-result");
  const pending = state.tasks.filter(t => !t.completed);

  if (pending.length === 0) {
    result.innerHTML = "<p>You're all caught up! Add a task whenever you're ready. ✨</p>";
    return;
  }

  result.innerHTML = `<p>You have <strong>${pending.length}</strong> pending task${pending.length === 1 ? "" : "s"}.</p>`;
}

document.getElementById("plan-btn").addEventListener("click", createPlan);

function createPlan() {
  const result = document.getElementById("planner-result");
  const pending = state.tasks.filter(t => !t.completed);

  pending.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  if (pending.length === 0) {
    result.innerHTML = `<div class="empty-state">🎉 You're all caught up! Add a task to make a new plan.</div>`;
    return;
  }

  let html = `<h3>Your suggested order</h3><ol>`;

  pending.forEach(task => {
    const dateLabel = task.date
      ? ` <span class="plan-date">(${formatDate(task.date)})</span>`
      : ` <span class="plan-date">(No deadline)</span>`;

    html += `<li><strong>${escapeHTML(task.title)}</strong> — ${escapeHTML(task.subject || "General")}${dateLabel}</li>`;
  });

  html += `</ol>`;
  html += `<p>Start with the task at the top. Take breaks and work at your own pace. ✨</p>`;

  result.innerHTML = html;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

// ---------- PROFILE ----------

function updateProfile() {
  const name = state.name || "Student";
  document.getElementById("profile-name").textContent = name;
  document.getElementById("greeting").textContent = `Welcome back, ${name}!`;
  document.getElementById("edit-profile").textContent = name.charAt(0).toUpperCase();
}

document.getElementById("edit-profile").addEventListener("click", () => {
  document.getElementById("name-input").value = state.name === "Student" ? "" : state.name;
  profileDialog.showModal();
});

document.getElementById("cancel-profile").addEventListener("click", () => {
  profileDialog.close();
});

document.getElementById("save-profile").addEventListener("click", () => {
  const newName = document.getElementById("name-input").value.trim();
  if (newName) state.name = newName;

  saveState();
  updateProfile();
  profileDialog.close();
});

// ---------- STUDY PET ----------

function addXP(amount) {
  state.xp += amount;

  while (state.xp >= 60) {
    state.xp -= 60;
    state.level++;
  }

  saveState();
  updatePet();
}

function updatePet() {
  document.getElementById("pet-name").textContent = state.petName;
  document.getElementById("pet-level").textContent = state.level;
  document.getElementById("level-stat").textContent = state.level;
  document.getElementById("pet-xp").textContent = state.xp;
  document.getElementById("xp-stat").textContent = `${state.xp} XP`;
  document.getElementById("xp-bar").style.width = (state.xp / 60 * 100) + "%";

  const messages = [
    "I'm ready to study with you!",
    "You're doing great! Let's keep going!",
    "Yay! I love learning with you!",
    "We're making progress together!",
    "Every little step counts!"
  ];

  document.getElementById("pet-message").textContent =
    messages[Math.floor(Math.random() * messages.length)];

  const pets = ["🐰", "🐱", "🐼", "🦊", "🐻", "🐸", "🐹", "🐧"];
  document.getElementById("pet-emoji").textContent = pets[(state.level - 1) % pets.length];
}

document.getElementById("rename-pet").addEventListener("click", () => {
  document.getElementById("pet-name-input").value = state.petName;
  petDialog.showModal();
});

document.getElementById("cancel-pet").addEventListener("click", () => {
  petDialog.close();
});

document.getElementById("save-pet").addEventListener("click", () => {
  const newName = document.getElementById("pet-name-input").value.trim();
  if (newName) state.petName = newName;

  saveState();
  updatePet();
  petDialog.close();
});

// ---------- STREAK ----------

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateStreak() {
  const dates = [...new Set(state.focusDates)].sort().reverse();

  if (!dates.length) return 0;

  const today = localDateKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 0;
  let checkDate = new Date(dates[0] + "T00:00:00");

  for (const date of dates) {
    if (date !== localDateKey(checkDate)) break;

    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

// ---------- FOCUS TIMER ----------

function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;

  document.getElementById("timer-display").textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  document.getElementById("timer-start").textContent = "▶ Start";
}

function startTimer() {
  if (timerRunning) {
    stopTimer();
    return;
  }

  timerRunning = true;
  document.getElementById("timer-start").textContent = "Ⅱ Pause";

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();

    if (timerSeconds <= 0) {
      stopTimer();

      if (selectedTimerMinutes === 25) {
        completeFocusSession();
      }

      alert("Timer finished! Great job! 🎉");
      timerSeconds = selectedTimerMinutes * 60;
      updateTimerDisplay();
    }
  }, 1000);
}

function completeFocusSession() {
  state.minutes += 25;

  const today = localDateKey();
  if (!state.focusDates.includes(today)) {
    state.focusDates.push(today);
  }

  addXP(20);
  saveState();
  updateDashboard();
}

document.getElementById("timer-start").addEventListener("click", startTimer);

document.getElementById("timer-reset").addEventListener("click", () => {
  stopTimer();
  timerSeconds = selectedTimerMinutes * 60;
  updateTimerDisplay();
});

document.querySelectorAll(".timer-mode").forEach(button => {
  button.addEventListener("click", () => {
    stopTimer();

    document.querySelectorAll(".timer-mode").forEach(b => b.classList.remove("active"));
    button.classList.add("active");

    selectedTimerMinutes = Number(button.dataset.minutes);
    timerSeconds = selectedTimerMinutes * 60;

    document.getElementById("timer-label").textContent =
      selectedTimerMinutes === 25 ? "Focus session" :
      selectedTimerMinutes === 15 ? "Short session" : "Break";

    updateTimerDisplay();
  });
});

// ---------- DASHBOARD ----------

function updateDashboard() {
  document.getElementById("minutes-stat").textContent = state.minutes;
  document.getElementById("streak-stat").textContent = calculateStreak();
  document.getElementById("completed-stat").textContent =
    state.tasks.filter(t => t.completed).length;
}

// ---------- INITIALIZATION ----------

function initialize() {
  updateProfile();
  updatePet();
  updateDashboard();
  renderTasks();
  updatePlanner();
  updateTimerDisplay();
}

initialize();