/* ==========================================================
   STUDYFLOW 4.0 — ULTIMATE STUDENT EDITION
   Complete JavaScript
   ========================================================== */

const STORAGE_KEY = "studyflow4";

const defaultData = {
    name: "Student",
    avatar: "🎓",
    pet: "🐱",
    petName: "Mochi",
    xp: 0,
    coins: 50,
    level: 1,
    streak: 0,
    lastStudy: "",
    theme: "light",
    tasks: [],
    exams: [],
    cards: [],
    notes: [],
    habits: [],
    habitLogs: {},
    timetable: [],
    goals: [],
    sessions: [],
    achievements: [],
    owned: ["default"],
    equipped: "default",
    sound: false,
    focusMinutes: 25,
    focusSubject: "",
    focusRunning: false,
    profile: ""
};

let data = loadData();
let currentPage = "dashboard";
let taskFilter = "all";
let focusSeconds = 0;
let focusInterval = null;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return saved ? { ...defaultData, ...saved } : { ...defaultData };
    } catch {
        return { ...defaultData };
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[character]));
}

function todayKey() {
    return new Date().toISOString().split("T")[0];
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(date) {
    if (!date) return "No deadline";
    return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    setTimeout(() => el.classList.remove("show"), 2500);
}

function openModal(title, content) {
    const backdrop = document.getElementById("modalBackdrop");
    const modal = document.getElementById("modal");

    if (!backdrop || !modal) return;

    modal.innerHTML = `
        <div class="modal-header">
            <h2>${escapeHTML(title)}</h2>
            <button onclick="closeModal()" class="close-btn">✕</button>
        </div>
        <div class="modal-body">${content}</div>
    `;

    backdrop.classList.add("active");
}

function closeModal() {
    document.getElementById("modalBackdrop")?.classList.remove("active");
}

function field(label, id, placeholder = "", type = "text") {
    return `
        <label>${escapeHTML(label)}</label>
        <input id="${id}" type="${type}" placeholder="${escapeHTML(placeholder)}">
    `;
}

function selectField(label, id, options) {
    return `
        <label>${escapeHTML(label)}</label>
        <select id="${id}">
            ${options.map(o => `<option value="${escapeHTML(o)}">${escapeHTML(o)}</option>`).join("")}
        </select>
    `;
}

function btn(label, action, cls = "btn-primary") {
    return `<button class="${cls}" onclick="${action}">${label}</button>`;
}

function addXP(amount) {
    data.xp += amount;
    data.coins += Math.max(1, Math.floor(amount / 2));

    let newLevel = Math.floor(data.xp / 100) + 1;

    if (newLevel > data.level) {
        data.level = newLevel;
        toast(`🎉 Level up! You are now level ${data.level}!`);
    }

    saveData();
}

function getLevelProgress() {
    return data.xp % 100;
}

function updateStreak() {
    const today = todayKey();

    if (data.lastStudy === today) return;

    if (data.lastStudy) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const yesterdayKey = yesterday.toISOString().split("T")[0];

        if (data.lastStudy === yesterdayKey) {
            data.streak++;
        } else {
            data.streak = 1;
        }
    } else {
        data.streak = 1;
    }

    data.lastStudy = today;
    saveData();
}

/* ==========================================================
   NAVIGATION
   ========================================================== */

const pages = {
    dashboard: "Dashboard",
    tasks: "My Tasks",
    planner: "Smart Planner",
    timetable: "Timetable",
    calendar: "Calendar",
    exams: "Exams",
    focus: "Focus Room",
    flashcards: "Flashcards",
    quiz: "Quiz Mode",
    notes: "Notebooks",
    habits: "Habit Tracker",
    pet: "Study Pet",
    shop: "Reward Shop",
    sounds: "Focus Sounds",
    analytics: "Analytics",
    achievements: "Achievements",
    profile: "My Profile"
};

function bindPage() {
    document.querySelectorAll("[data-page]").forEach(el => {
        el.addEventListener("click", function () {
            navigate(this.dataset.page);
        });
    });
}

function navigate(page) {
    if (!pages[page]) return;

    currentPage = page;

    document.querySelectorAll("[data-page]").forEach(el => {
        el.classList.toggle("active", el.dataset.page === page);
    });

    const title = document.getElementById("pageTitle");
    if (title) title.textContent = pages[page];

    const content = document.getElementById("pageContent");
    if (content) content.innerHTML = renderPage(page);

    saveData();
}

function renderPage(page) {
    switch (page) {
        case "dashboard": return renderDashboard();
        case "tasks": return renderTasks();
        case "planner": return renderPlanner();
        case "timetable": return renderTimetable();
        case "calendar": return renderCalendar();
        case "exams": return renderExams();
        case "focus": return renderFocus();
        case "flashcards": return renderFlashcards();
        case "quiz": return renderQuiz();
        case "notes": return renderNotes();
        case "habits": return renderHabits();
        case "pet": return renderPet();
        case "shop": return renderShop();
        case "sounds": return renderSounds();
        case "analytics": return renderAnalytics();
        case "achievements": return renderAchievements();
        case "profile": return renderProfile();
        default: return renderDashboard();
    }
}

/* ==========================================================
   DASHBOARD
   ========================================================== */

const quotes = [
    "Small steps every day lead to big results.",
    "Your future is created by what you do today.",
    "You do not have to be perfect. Just keep progressing.",
    "Believe in your ability to learn.",
    "One page at a time. One task at a time.",
    "Consistency beats motivation.",
    "Your effort today is an investment in tomorrow.",
    "You are capable of learning amazing things.",
    "Progress, not perfection.",
    "The secret to getting ahead is getting started.",
    "Study smart, rest well, and keep going.",
    "Every expert was once a beginner.",
    "A little progress is still progress.",
    "Your goals are worth the effort."
];

function renderDashboard() {
    const today = todayKey();

    const completed = data.tasks.filter(t => t.completed).length;
    const total = data.tasks.length;
    const pending = data.tasks.filter(t => !t.completed);
    const todayTasks = pending.filter(t => !t.deadline || t.deadline <= today);
    const upcoming = data.exams.filter(e => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));

    const quote = quotes[new Date().getDate() % quotes.length];

    return `
        <div class="dashboard-welcome">
            <div>
                <h1>Welcome back, ${escapeHTML(data.name)}! ✨</h1>
                <p>Let's make today a productive day.</p>
            </div>
            <div class="welcome-avatar">${escapeHTML(data.avatar)}</div>
        </div>

        <div class="quote-card">
            <span>💡 DAILY MOTIVATION</span>
            <h3>"${escapeHTML(quote)}"</h3>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <span>📚 Tasks</span>
                <h2>${completed}/${total}</h2>
                <p>Completed</p>
            </div>
            <div class="stat-card">
                <span>🔥 Streak</span>
                <h2>${data.streak}</h2>
                <p>Study days</p>
            </div>
            <div class="stat-card">
                <span>⭐ XP</span>
                <h2>${data.xp}</h2>
                <p>Level ${data.level}</p>
            </div>
            <div class="stat-card">
                <span>🪙 Coins</span>
                <h2>${data.coins}</h2>
                <p>Reward coins</p>
            </div>
        </div>

        <div class="card">
            <h3>🌟 Level Progress</h3>
            <p>Level ${data.level}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${getLevelProgress()}%"></div>
            </div>
            <p>${getLevelProgress()} / 100 XP to your next level</p>
        </div>

        <div class="grid-two">
            <div class="card">
                <h3>📌 Today's Priorities</h3>
                ${todayTasks.length ? todayTasks.slice(0, 5).map(t => `
                    <div class="task-row">
                        <span>${escapeHTML(t.title)}</span>
                        <span>${escapeHTML(t.priority)}</span>
                    </div>
                `).join("") : "<p>You're all caught up! 🎉</p>"}
                <button onclick="navigate('tasks')" class="btn-secondary">View Tasks</button>
            </div>

            <div class="card">
                <h3>📝 Upcoming Exams</h3>
                ${upcoming.slice(0, 3).map(e => `
                    <div class="task-row">
                        <div>
                            <strong>${escapeHTML(e.title)}</strong>
                            <p>${formatDate(e.date)}</p>
                        </div>
                    </div>
                `).join("") || "<p>No upcoming exams.</p>"}
                <button onclick="navigate('exams')" class="btn-secondary">View Exams</button>
            </div>
        </div>

        <div class="card">
            <h3>🐾 Your Study Companion</h3>
            <div class="pet-display">
                <span class="pet-emoji">${escapeHTML(data.pet)}</span>
                <div>
                    <h3>${escapeHTML(data.petName)}</h3>
                    <p>Level ${data.level} · ${data.xp} XP</p>
                </div>
            </div>
            <button onclick="navigate('pet')" class="btn-secondary">Visit Pet</button>
        </div>

        <div class="card">
            <h3>⚡ Quick Actions</h3>
            <div class="quick-actions">
                <button onclick="openAddTask()">➕ Add Task</button>
                <button onclick="navigate('focus')">⏱ Focus</button>
                <button onclick="navigate('flashcards')">🗂 Flashcards</button>
                <button onclick="navigate('notes')">📓 Notebook</button>
            </div>
        </div>
    `;
}

/* ==========================================================
   TASKS
   ========================================================== */

function renderTasks() {
    let filtered = data.tasks;

    if (taskFilter === "pending") filtered = filtered.filter(t => !t.completed);
    if (taskFilter === "completed") filtered = filtered.filter(t => t.completed);

    return `
        <div class="page-actions">
            <button onclick="openAddTask()" class="btn-primary">＋ New Task</button>
        </div>

        <div class="filter-buttons">
            <button onclick="setTaskFilter('all')">All</button>
            <button onclick="setTaskFilter('pending')">Pending</button>
            <button onclick="setTaskFilter('completed')">Completed</button>
        </div>

        <div class="card">
            <h3>📋 Your Tasks (${filtered.length})</h3>

            ${filtered.length ? filtered.map(t => `
                <div class="task-item ${t.completed ? "completed" : ""}">
                    <div class="task-main">
                        <input type="checkbox"
                            ${t.completed ? "checked" : ""}
                            onchange="toggleTask('${t.id}')">

                        <div class="task-info">
                            <strong>${escapeHTML(t.title)}</strong>
                            <p>${escapeHTML(t.subject || "General")}</p>
                            <p>${formatDate(t.deadline)}</p>
                            <span class="priority-${escapeHTML(t.priority)}">
                                ${escapeHTML(t.priority)}
                            </span>
                            ${t.notes ? `<p>${escapeHTML(t.notes)}</p>` : ""}
                        </div>
                    </div>

                    <div class="task-actions">
                        <button onclick="editTask('${t.id}')">✏️</button>
                        <button onclick="deleteTask('${t.id}')">🗑</button>
                    </div>
                </div>
            `).join("") : "<p>No tasks here yet.</p>"}
        </div>
    `;
}

function setTaskFilter(filter) {
    taskFilter = filter;
    navigate("tasks");
}

function openAddTask() {
    openModal("Add a Task", `
        ${field("Task title", "taskTitle", "e.g. Complete mathematics homework")}
        ${field("Subject", "taskSubject", "e.g. Mathematics")}
        ${field("Deadline", "taskDeadline", "", "date")}
        ${selectField("Priority", "taskPriority", ["Low", "Medium", "High"])}
        <label>Notes</label>
        <textarea id="taskNotes" placeholder="Additional details..."></textarea>
        <button class="btn-primary" onclick="saveTask()">Save Task</button>
    `);
}

function saveTask() {
    const title = document.getElementById("taskTitle")?.value.trim();

    if (!title) {
        toast("Please enter a task title.");
        return;
    }

    data.tasks.push({
        id: uid(),
        title,
        subject: document.getElementById("taskSubject").value,
        deadline: document.getElementById("taskDeadline").value,
        priority: document.getElementById("taskPriority").value,
        notes: document.getElementById("taskNotes").value,
        completed: false,
        created: todayKey()
    });

    saveData();
    closeModal();
    navigate("tasks");
    toast("Task added! 📚");
}

function toggleTask(id) {
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
        addXP(20);
        updateStreak();
        toast("Task completed! +20 XP 🎉");
    }

    saveData();
    navigate(currentPage);
}

function deleteTask(id) {
    if (!confirm("Delete this task?")) return;

    data.tasks = data.tasks.filter(t => t.id !== id);
    saveData();
    navigate(currentPage);
    toast("Task deleted.");
}

function editTask(id) {
    const t = data.tasks.find(t => t.id === id);
    if (!t) return;

    openModal("Edit Task", `
        ${field("Task title", "editTaskTitle", "")}
        ${field("Subject", "editTaskSubject", "")}
        ${field("Deadline", "editTaskDeadline", "", "date")}
        ${selectField("Priority", "editTaskPriority", ["Low", "Medium", "High"])}
        <label>Notes</label>
        <textarea id="editTaskNotes"></textarea>
        <button class="btn-primary" onclick="updateTask('${id}')">Save Changes</button>
    `);

    document.getElementById("editTaskTitle").value = t.title;
    document.getElementById("editTaskSubject").value = t.subject || "";
    document.getElementById("editTaskDeadline").value = t.deadline || "";
    document.getElementById("editTaskPriority").value = t.priority || "Medium";
    document.getElementById("editTaskNotes").value = t.notes || "";
}

function updateTask(id) {
    const t = data.tasks.find(t => t.id === id);
    if (!t) return;

    t.title = document.getElementById("editTaskTitle").value.trim();
    t.subject = document.getElementById("editTaskSubject").value;
    t.deadline = document.getElementById("editTaskDeadline").value;
    t.priority = document.getElementById("editTaskPriority").value;
    t.notes = document.getElementById("editTaskNotes").value;

    saveData();
    closeModal();
    navigate(currentPage);
    toast("Task updated.");
}

/* ==========================================================
   SMART PLANNER
   ========================================================== */

function renderPlanner() {
    const pending = data.tasks.filter(t => !t.completed)
        .sort((a, b) => {
            const priorities = { High: 0, Medium: 1, Low: 2 };
            return priorities[a.priority] - priorities[b.priority];
        });

    return `
        <div class="card">
            <h2>🧠 Smart Study Planner</h2>
            <p>Let StudyFlow organize your unfinished tasks into a study plan.</p>
            <button class="btn-primary" onclick="generatePlan()">Generate My Plan ✨</button>
        </div>

        <div id="smartPlan">
            ${pending.length ? pending.map(t => `
                <div class="task-row">
                    <div>
                        <strong>${escapeHTML(t.title)}</strong>
                        <p>${escapeHTML(t.subject || "General")} · ${escapeHTML(t.priority)}</p>
                    </div>
                </div>
            `).join("") : "<p>No unfinished tasks to plan.</p>"}
        </div>
    `;
}

function generatePlan() {
    const pending = data.tasks.filter(t => !t.completed)
        .sort((a, b) => {
            const p = { High: 0, Medium: 1, Low: 2 };
            return p[a.priority] - p[b.priority];
        });

    const container = document.getElementById("smartPlan");
    if (!container) return;

    if (!pending.length) {
        container.innerHTML = "<p>You're all caught up! 🎉</p>";
        return;
    }

    container.innerHTML = `
        <div class="card">
            <h3>📅 Your Suggested Study Plan</h3>
            <p>Try working through these in order. Take a short break between sessions.</p>
            ${pending.map((t, i) => `
                <div class="plan-item">
                    <span>Session ${i + 1}</span>
                    <strong>${escapeHTML(t.title)}</strong>
                    <p>${escapeHTML(t.subject || "General")} · ${escapeHTML(t.priority)} priority</p>
                    <button onclick="toggleTask('${t.id}')">Mark Complete</button>
                </div>
            `).join("")}
        </div>
    `;

    toast("Your plan is ready! 🗓️");
}

/* ==========================================================
   TIMETABLE
   ========================================================== */

function renderTimetable() {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    return `
        <div class="page-actions">
            <button class="btn-primary" onclick="openAddTimetable()">＋ Add Class</button>
        </div>

        ${days.map(day => `
            <div class="card">
                <h3>📅 ${day}</h3>
                ${data.timetable.filter(t => t.day === day)
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(t => `
                        <div class="task-row">
                            <div>
                                <strong>${escapeHTML(t.subject)}</strong>
                                <p>${escapeHTML(t.time)} · ${escapeHTML(t.location || "")}</p>
                            </div>
                            <button onclick="deleteTimetable('${t.id}')">🗑</button>
                        </div>
                    `).join("") || "<p>No classes scheduled.</p>"}
            </div>
        `).join("")}
    `;
}

function openAddTimetable() {
    openModal("Add to Timetable", `
        ${field("Subject", "ttSubject", "e.g. Biology")}
        ${selectField("Day", "ttDay", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])}
        ${field("Time", "ttTime", "", "time")}
        ${field("Location", "ttLocation", "Classroom (optional)")}
        <button class="btn-primary" onclick="saveTimetable()">Save Class</button>
    `);
}

function saveTimetable() {
    const subject = document.getElementById("ttSubject").value.trim();
    if (!subject) return toast("Enter a subject.");

    data.timetable.push({
        id: uid(),
        subject,
        day: document.getElementById("ttDay").value,
        time: document.getElementById("ttTime").value,
        location: document.getElementById("ttLocation").value
    });

    saveData();
    closeModal();
    navigate("timetable");
    toast("Class added!");
}

function deleteTimetable(id) {
    data.timetable = data.timetable.filter(t => t.id !== id);
    saveData();
    navigate("timetable");
}

/* ==========================================================
   CALENDAR
   ========================================================== */

function renderCalendar() {
    const all = [
        ...data.tasks.filter(t => t.deadline).map(t => ({
            title: t.title,
            date: t.deadline,
            type: "Task"
        })),
        ...data.exams.map(e => ({
            title: e.title,
            date: e.date,
            type: "Exam"
        }))
    ].sort((a, b) => a.date.localeCompare(b.date));

    return `
        <div class="card">
            <h2>🗓️ Your Schedule</h2>
            ${all.length ? all.map(item => `
                <div class="task-row">
                    <div>
                        <strong>${escapeHTML(item.title)}</strong>
                        <p>${formatDate(item.date)}</p>
                    </div>
                    <span>${escapeHTML(item.type)}</span>
                </div>
            `).join("") : "<p>No dated activities yet.</p>"}
        </div>
    `;
}

/* ==========================================================
   EXAMS
   ========================================================== */

function renderExams() {
    return `
        <div class="page-actions">
            <button class="btn-primary" onclick="openAddExam()">＋ Add Exam</button>
        </div>

        <div class="card">
            <h3>🎯 Exam Countdown</h3>
            ${data.exams.map(e => {
                const diff = Math.ceil((new Date(e.date + "T00:00:00") - new Date()) / 86400000);
                return `
                    <div class="exam-item">
                        <div>
                            <strong>${escapeHTML(e.title)}</strong>
                            <p>${formatDate(e.date)}</p>
                            ${e.notes ? `<p>${escapeHTML(e.notes)}</p>` : ""}
                        </div>
                        <div class="exam-countdown">
                            ${diff < 0 ? "Passed" : diff === 0 ? "TODAY!" : `${diff} days`}
                        </div>
                        <button onclick="deleteExam('${e.id}')">🗑</button>
                    </div>
                `;
            }).join("") || "<p>No exams added yet.</p>"}
        </div>
    `;
}

function openAddExam() {
    openModal("Add Exam", `
        ${field("Exam name", "examTitle", "e.g. Chemistry test")}
        ${field("Date", "examDate", "", "date")}
        <label>Notes</label>
        <textarea id="examNotes"></textarea>
        <button class="btn-primary" onclick="saveExam()">Save Exam</button>
    `);
}

function saveExam() {
    const title = document.getElementById("examTitle").value.trim();
    const date = document.getElementById("examDate").value;

    if (!title || !date) return toast("Enter an exam name and date.");

    data.exams.push({
        id: uid(),
        title,
        date,
        notes: document.getElementById("examNotes").value
    });

    saveData();
    closeModal();
    navigate("exams");
    toast("Exam added! 🎯");
}

function deleteExam(id) {
    if (!confirm("Delete this exam?")) return;

    data.exams = data.exams.filter(e => e.id !== id);
    saveData();
    navigate("exams");
}

/* ==========================================================
   FOCUS ROOM
   ========================================================== */

function renderFocus() {
    return `
        <div class="focus-room">
            <div class="card focus-card">
                <h2>⏱️ Focus Room</h2>
                <p>Focus on one thing at a time.</p>

                ${field("What are you studying?", "focusSubjectInput", "e.g. Physics")}

                <div class="timer-display" id="timerDisplay">
                    ${String(data.focusMinutes).padStart(2, "0")}:00
                </div>

                <div class="timer-settings">
                    <button onclick="setFocusTime(15)">15 min</button>
                    <button onclick="setFocusTime(25)">25 min</button>
                    <button onclick="setFocusTime(45)">45 min</button>
                    <button onclick="setFocusTime(60)">60 min</button>
                </div>

                <div class="timer-buttons">
                    <button class="btn-primary" onclick="startFocus()">▶ Start</button>
                    <button class="btn-secondary" onclick="pauseFocus()">⏸ Pause</button>
                    <button class="btn-secondary" onclick="resetFocus()">↺ Reset</button>
                </div>

                <p id="focusStatus">Ready when you are!</p>
            </div>
        </div>
    `;
}

function setFocusTime(minutes) {
    if (focusInterval) return toast("Pause the timer first.");

    data.focusMinutes = minutes;
    focusSeconds = minutes * 60;
    saveData();
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const el = document.getElementById("timerDisplay");
    if (!el) return;

    const mins = Math.floor(focusSeconds / 60);
    const secs = focusSeconds % 60;

    el.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function startFocus() {
    if (focusInterval) return;

    const input = document.getElementById("focusSubjectInput");

    if (input) data.focusSubject = input.value;

    if (focusSeconds <= 0) {
        focusSeconds = data.focusMinutes * 60;
    }

    document.getElementById("focusStatus").textContent = "You're in focus mode! ✨";

    focusInterval = setInterval(() => {
        focusSeconds--;
        updateTimerDisplay();

        if (focusSeconds <= 0) {
            clearInterval(focusInterval);
            focusInterval = null;
            completeFocus();
        }
    }, 1000);
}

function pauseFocus() {
    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }

    const status = document.getElementById("focusStatus");
    if (status) status.textContent = "Paused.";
}

function resetFocus() {
    pauseFocus();
    focusSeconds = data.focusMinutes * 60;
    updateTimerDisplay();

    const status = document.getElementById("focusStatus");
    if (status) status.textContent = "Ready when you are!";
}

function completeFocus() {
    data.sessions.push({
        date: todayKey(),
        minutes: data.focusMinutes,
        subject: data.focusSubject
    });

    addXP(30);
    updateStreak();
    saveData();

    const status = document.getElementById("focusStatus");
    if (status) status.textContent = "Session complete! 🎉";

    toast("Focus session complete! +30 XP 🎉");

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("StudyFlow", {
            body: "Your focus session is complete! Great work."
        });
    }

    focusSeconds = data.focusMinutes * 60;
    updateTimerDisplay();
}

function requestNotifications() {
    if (!("Notification" in window)) {
        toast("Notifications aren't supported.");
        return;
    }

    Notification.requestPermission().then(permission => {
        toast(permission === "granted" ? "Notifications enabled!" : "Permission not granted.");
    });
}

/* ==========================================================
   FLASHCARDS
   ========================================================== */

function renderFlashcards() {
    return `
        <div class="page-actions">
            <button class="btn-primary" onclick="openAddCard()">＋ Add Flashcard</button>
        </div>

        <div class="card">
            <h3>🗂️ Your Flashcards (${data.cards.length})</h3>

            ${data.cards.map(c => `
                <div class="flashcard-item">
                    <div>
                        <strong>${escapeHTML(c.question)}</strong>
                        <p>${escapeHTML(c.answer)}</p>
                        <span>${escapeHTML(c.subject || "General")}</span>
                    </div>
                    <button onclick="deleteCard('${c.id}')">🗑</button>
                </div>
            `).join("") || "<p>Create flashcards to help you revise.</p>"}

            <button onclick="navigate('quiz')" class="btn-primary">Start Quiz ✨</button>
        </div>
    `;
}

function openAddCard() {
    openModal("Create Flashcard", `
        ${field("Subject", "cardSubject", "e.g. Biology")}
        <label>Question</label>
        <textarea id="cardQuestion" placeholder="Enter your question"></textarea>
        <label>Answer</label>
        <textarea id="cardAnswer" placeholder="Enter the answer"></textarea>
        <button class="btn-primary" onclick="saveCard()">Save Card</button>
    `);
}

function saveCard() {
    const question = document.getElementById("cardQuestion").value.trim();
    const answer = document.getElementById("cardAnswer").value.trim();

    if (!question || !answer) return toast("Fill in both question and answer.");

    data.cards.push({
        id: uid(),
        subject: document.getElementById("cardSubject").value,
        question,
        answer
    });

    saveData();
    closeModal();
    navigate("flashcards");
    toast("Flashcard created!");
}

function deleteCard(id) {
    data.cards = data.cards.filter(c => c.id !== id);
    saveData();
    navigate("flashcards");
}

/* ==========================================================
   QUIZ MODE
   ========================================================== */

function renderQuiz() {
    return `
        <div class="card">
            <h2>🧠 Flashcard Quiz</h2>
            <p>Test yourself using your flashcards.</p>
            <p>Available cards: ${data.cards.length}</p>
            <button class="btn-primary" onclick="startQuiz()">Start Quiz</button>
        </div>
        <div id="quizArea"></div>
    `;
}

function startQuiz() {
    if (!data.cards.length) {
        toast("Create some flashcards first!");
        return;
    }

    quizQuestions = [...data.cards].sort(() => Math.random() - 0.5);
    quizIndex = 0;
    quizScore = 0;

    showQuizQuestion();
}

function showQuizQuestion() {
    const area = document.getElementById("quizArea");
    if (!area) return;

    if (quizIndex >= quizQuestions.length) {
        area.innerHTML = `
            <div class="card">
                <h2>🎉 Quiz Completed!</h2>
                <p>Your score: ${quizScore} / ${quizQuestions.length}</p>
                <button onclick="startQuiz()" class="btn-primary">Play Again</button>
                <button onclick="navigate('flashcards')" class="btn-secondary">Flashcards</button>
            </div>
        `;

        addXP(quizScore * 10);
        saveData();
        return;
    }

    const card = quizQuestions[quizIndex];

    area.innerHTML = `
        <div class="card quiz-card">
            <p>Question ${quizIndex + 1} of ${quizQuestions.length}</p>
            <h3>${escapeHTML(card.question)}</h3>

            <button onclick="revealQuizAnswer()" class="btn-primary">Reveal Answer</button>

            <div id="quizAnswer" style="display:none">
                <p><strong>${escapeHTML(card.answer)}</strong></p>
                <button onclick="quizMark(true)" class="btn-primary">I got it ✓</button>
                <button onclick="quizMark(false)" class="btn-secondary">I need practice</button>
            </div>
        </div>
    `;
}

function revealQuizAnswer() {
    const el = document.getElementById("quizAnswer");
    if (el) el.style.display = "block";
}

function quizMark(correct) {
    if (correct) quizScore++;
    quizIndex++;
    showQuizQuestion();
}

/* ==========================================================
   NOTEBOOKS
   ========================================================== */

function renderNotes() {
    return `
        <div class="page-actions">
            <button class="btn-primary" onclick="openAddNote()">＋ New Note</button>
        </div>

        <div class="notes-grid">
            ${data.notes.map(n => `
                <div class="card note-card">
                    <h3>${escapeHTML(n.title)}</h3>
                    <p>${escapeHTML(n.subject || "General")}</p>
                    <div class="note-content">${escapeHTML(n.content)}</div>
                    <div class="note-actions">
                        <button onclick="editNote('${n.id}')">✏️ Edit</button>
                        <button onclick="deleteNote('${n.id}')">🗑 Delete</button>
                    </div>
                </div>
            `).join("") || "<p>No notes yet. Create your first notebook entry!</p>"}
        </div>
    `;
}

function openAddNote() {
    openModal("Create Notebook Entry", `
        ${field("Note title", "noteTitle", "e.g. Photosynthesis")}
        ${field("Subject", "noteSubject", "e.g. Biology")}
        <label>Your notes</label>
        <textarea id="noteContent" rows="8" placeholder="Write your notes here..."></textarea>
        <button class="btn-primary" onclick="saveNote()">Save Note</button>
    `);
}

function saveNote() {
    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").value.trim();

    if (!title || !content) return toast("Enter a title and notes.");

    data.notes.push({
        id: uid(),
        title,
        subject: document.getElementById("noteSubject").value,
        content
    });

    saveData();
    closeModal();
    navigate("notes");
    toast("Notebook entry saved! 📓");
}

function editNote(id) {
    const n = data.notes.find(n => n.id === id);
    if (!n) return;

    openModal("Edit Note", `
        ${field("Note title", "editNoteTitle")}
        ${field("Subject", "editNoteSubject")}
        <label>Content</label>
        <textarea id="editNoteContent" rows="8"></textarea>
        <button class="btn-primary" onclick="updateNote('${id}')">Save Changes</button>
    `);

    document.getElementById("editNoteTitle").value = n.title;
    document.getElementById("editNoteSubject").value = n.subject || "";
    document.getElementById("editNoteContent").value = n.content;
}

function updateNote(id) {
    const n = data.notes.find(n => n.id === id);
    if (!n) return;

    n.title = document.getElementById("editNoteTitle").value;
    n.subject = document.getElementById("editNoteSubject").value;
    n.content = document.getElementById("editNoteContent").value;

    saveData();
    closeModal();
    navigate("notes");
}

function deleteNote(id) {
    if (!confirm("Delete this note?")) return;

    data.notes = data.notes.filter(n => n.id !== id);
    saveData();
    navigate("notes");
}

/* ==========================================================
   HABIT TRACKER
   ========================================================== */

function renderHabits() {
    const today = todayKey();
    const logs = data.habitLogs[today] || [];

    return `
        <div class="page-actions">
            <button class="btn-primary" onclick="openAddHabit()">＋ Add Habit</button>
        </div>

        <div class="card">
            <h2>🌱 Daily Habits</h2>
            <p>Build small habits that help you become a better student.</p>

            ${data.habits.map(h => {
                const done = logs.includes(h.id);

                return `
                    <div class="habit-row">
                        <div>
                            <strong>${escapeHTML(h.name)}</strong>
                            <p>${done ? "Completed today ✓" : "Not completed yet"}</p>
                        </div>

                        <button class="${done ? "btn-secondary" : "btn-primary"}"
                            onclick="toggleHabit('${h.id}')">
                            ${done ? "✓ Done" : "Complete"}
                        </button>

                        <button onclick="deleteHabit('${h.id}')">🗑</button>
                    </div>
                `;
            }).join("") || "<p>Add your first habit!</p>"}
        </div>
    `;
}

function openAddHabit() {
    openModal("Add Habit", `
        ${field("Habit name", "habitName", "e.g. Read for 20 minutes")}
        <button class="btn-primary" onclick="saveHabit()">Create Habit</button>
    `);
}

function saveHabit() {
    const name = document.getElementById("habitName").value.trim();
    if (!name) return toast("Enter a habit name.");

    data.habits.push({ id: uid(), name });
    saveData();
    closeModal();
    navigate("habits");
}

function toggleHabit(id) {
    const today = todayKey();

    if (!data.habitLogs[today]) data.habitLogs[today] = [];

    const logs = data.habitLogs[today];
    const done = logs.includes(id);

    if (done) {
        data.habitLogs[today] = logs.filter(x => x !== id);
    } else {
        data.habitLogs[today].push(id);
        addXP(10);
        updateStreak();
        toast("Habit completed! +10 XP 🌱");
    }

    saveData();
    navigate("habits");
}

function deleteHabit(id) {
    if (!confirm("Delete this habit?")) return;

    data.habits = data.habits.filter(h => h.id !== id);
    saveData();
    navigate("habits");
}

/* ==========================================================
   STUDY PET
   ========================================================== */

const petStages = [
    { level: 1, emoji: "🐣", name: "Baby" },
    { level: 3, emoji: "🐥", name: "Growing" },
    { level: 5, emoji: "🐤", name: "Adventurer" },
    { level: 10, emoji: "🐧", name: "Scholar" },
    { level: 15, emoji: "🦉", name: "Wise" },
    { level: 20, emoji: "🐉", name: "Legendary" }
];

function getPetStage() {
    let stage = petStages[0];

    for (const s of petStages) {
        if (data.level >= s.level) stage = s;
    }

    return stage;
}

function renderPet() {
    const stage = getPetStage();

    return `
        <div class="card pet-card">
            <h2>🐾 Your Study Pet</h2>

            <div class="pet-big">
                ${escapeHTML(stage.emoji)}
            </div>

            <h2>${escapeHTML(data.petName)}</h2>
            <p>${escapeHTML(stage.name)} Stage</p>
            <p>Level ${data.level}</p>
            <p>${data.xp} XP</p>

            <div class="progress-bar">
                <div class="progress-fill" style="width:${getLevelProgress()}%"></div>
            </div>

            <p>Your pet grows as you study!</p>

            <button class="btn-primary" onclick="renamePet()">Rename Pet</button>
            <button class="btn-secondary" onclick="navigate('focus')">Study with Your Pet</button>
        </div>
    `;
}

function renamePet() {
    openModal("Rename Your Pet", `
        ${field("Pet name", "newPetName", data.petName)}
        <button class="btn-primary" onclick="savePetName()">Save Name</button>
    `);
}

function savePetName() {
    const name = document.getElementById("newPetName").value.trim();
    if (!name) return toast("Enter a name.");

    data.petName = name;
    saveData();
    closeModal();
    navigate("pet");
    toast("Your pet has a new name! 🐾");
}

/* ==========================================================
   REWARD SHOP
   ========================================================== */

const shopItems = [
    { id: "default", name: "Classic Theme", price: 0, icon: "🌸", theme: "light" },
    { id: "dark", name: "Midnight Theme", price: 50, icon: "🌙", theme: "dark" },
    { id: "pink", name: "Pink Dream", price: 75, icon: "🌷", theme: "pink" },
    { id: "blue", name: "Ocean Theme", price: 75, icon: "🌊", theme: "blue" },
    { id: "green", name: "Forest Theme", price: 75, icon: "🌿", theme: "green" },
    { id: "purple", name: "Lavender Theme", price: 100, icon: "💜", theme: "purple" }
];

function renderShop() {
    return `
        <div class="card">
            <h2>🛍️ Reward Shop</h2>
            <p>Spend your study coins on themes!</p>
            <h3>🪙 ${data.coins} coins</h3>
        </div>

        <div class="shop-grid">
            ${shopItems.map(item => `
                <div class="card shop-item">
                    <div class="shop-icon">${item.icon}</div>
                    <h3>${escapeHTML(item.name)}</h3>
                    <p>${item.price} coins</p>

                    ${data.owned.includes(item.id) ?
                        `<button onclick="equipTheme('${item.id}')">
                            ${data.equipped === item.id ? "✓ Equipped" : "Equip"}
                        </button>` :
                        `<button class="btn-primary" onclick="buyTheme('${item.id}')">
                            Buy
                        </button>`
                    }
                </div>
            `).join("")}
        </div>
    `;
}

function buyTheme(id) {
    const item = shopItems.find(i => i.id === id);
    if (!item) return;

    if (data.owned.includes(id)) return equipTheme(id);

    if (data.coins < item.price) {
        toast("Not enough coins! Keep studying. 🪙");
        return;
    }

    data.coins -= item.price;
    data.owned.push(id);

    equipTheme(id);
}

function equipTheme(id) {
    const item = shopItems.find(i => i.id === id);
    if (!item || !data.owned.includes(id)) return;

    data.equipped = id;
    data.theme = item.theme;

    saveData();
    applyTheme();
    navigate("shop");
    toast("Theme equipped! ✨");
}

/* ==========================================================
   FOCUS SOUNDS
   ========================================================== */

function renderSounds() {
    const sounds = [
        { name: "Rain", icon: "🌧️", url: "rain sounds" },
        { name: "Forest", icon: "🌲", url: "forest ambience" },
        { name: "Ocean", icon: "🌊", url: "ocean waves sounds" },
        { name: "Café", icon: "☕", url: "coffee shop ambience" },
        { name: "White Noise", icon: "🎧", url: "white noise" },
        { name: "Piano", icon: "🎹", url: "peaceful piano study music" }
    ];

    return `
        <div class="card">
            <h2>🎧 Focus Sounds</h2>
            <p>Choose a sound to explore for your study session.</p>
            <p>These links open YouTube search results in a new tab.</p>
        </div>

        <div class="sound-grid">
            ${sounds.map(s => `
                <div class="card sound-card">
                    <span>${s.icon}</span>
                    <h3>${escapeHTML(s.name)}</h3>
                    <button onclick="openSound('${encodeURIComponent(s.url)}')">
                        Listen
                    </button>
                </div>
            `).join("")}
        </div>
    `;
}

function openSound(query) {
    window.open("https://www.youtube.com/results?search_query=" + query, "_blank");
}

/* ==========================================================
   ANALYTICS
   ========================================================== */

function renderAnalytics() {
    const completed = data.tasks.filter(t => t.completed).length;
    const pending = data.tasks.filter(t => !t.completed).length;

    const totalMinutes = data.sessions.reduce((sum, s) => sum + s.minutes, 0);

    const subjectSessions = {};

    data.sessions.forEach(s => {
        const subject = s.subject || "General";
        subjectSessions[subject] = (subjectSessions[subject] || 0) + s.minutes;
    });

    return `
        <div class="stats-grid">
            <div class="stat-card">
                <span>📚 Completed</span>
                <h2>${completed}</h2>
            </div>
            <div class="stat-card">
                <span>📌 Pending</span>
                <h2>${pending}</h2>
            </div>
            <div class="stat-card">
                <span>⏱ Focus Time</span>
                <h2>${totalMinutes}</h2>
                <p>Minutes</p>
            </div>
            <div class="stat-card">
                <span>🔥 Streak</span>
                <h2>${data.streak}</h2>
                <p>Days</p>
            </div>
        </div>

        <div class="card">
            <h2>📊 Task Completion</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${data.tasks.length ? completed / data.tasks.length * 100 : 0}%"></div>
            </div>
            <p>${data.tasks.length ? Math.round(completed / data.tasks.length * 100) : 0}% completed</p>
        </div>

        <div class="card">
            <h2>📖 Subject Focus</h2>
            ${Object.entries(subjectSessions).map(([subject, minutes]) => `
                <div class="task-row">
                    <strong>${escapeHTML(subject)}</strong>
                    <span>${minutes} min</span>
                </div>
            `).join("") || "<p>Complete focus sessions to see subject statistics.</p>"}
        </div>

        <div class="card">
            <h2>📅 Weekly Report</h2>
            ${renderWeeklyReport()}
        </div>

        <div class="card">
            <h2>📈 Study Sessions</h2>
            ${data.sessions.slice(-10).reverse().map(s => `
                <div class="task-row">
                    <div>
                        <strong>${escapeHTML(s.subject || "General")}</strong>
                        <p>${formatDate(s.date)}</p>
                    </div>
                    <span>${s.minutes} minutes</span>
                </div>
            `).join("") || "<p>No sessions yet.</p>"}
        </div>
    `;
}

function renderWeeklyReport() {
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0]);
    }

    return days.map(day => {
        const minutes = data.sessions.filter(s => s.date === day)
            .reduce((sum, s) => sum + s.minutes, 0);

        const label = new Date(day + "T00:00:00")
            .toLocaleDateString(undefined, { weekday: "short" });

        return `
            <div class="weekly-row">
                <span>${label}</span>
                <div class="weekly-bar">
                    <div class="progress-fill" style="width:${Math.min(minutes, 180) / 180 * 100}%"></div>
                </div>
                <span>${minutes} min</span>
            </div>
        `;
    }).join("");
}

/* ==========================================================
   ACHIEVEMENTS
   ========================================================== */

const achievementsList = [
    { id: "firstTask", name: "Getting Started", icon: "🌱", description: "Complete your first task", condition: () => data.tasks.some(t => t.completed) },
    { id: "fiveTasks", name: "Task Master", icon: "📚", description: "Complete 5 tasks", condition: () => data.tasks.filter(t => t.completed).length >= 5 },
    { id: "tenTasks", name: "Super Student", icon: "🏆", description: "Complete 10 tasks", condition: () => data.tasks.filter(t => t.completed).length >= 10 },
    { id: "focus", name: "Focused", icon: "⏱️", description: "Complete a focus session", condition: () => data.sessions.length >= 1 },
    { id: "fiveSessions", name: "Deep Work", icon: "🧠", description: "Complete 5 focus sessions", condition: () => data.sessions.length >= 5 },
    { id: "cards", name: "Memory Builder", icon: "🗂️", description: "Create 5 flashcards", condition: () => data.cards.length >= 5 },
    { id: "notes", name: "Note Taker", icon: "📓", description: "Create 5 notes", condition: () => data.notes.length >= 5 },
    { id: "habits", name: "Habit Hero", icon: "🌿", description: "Create 3 habits", condition: () => data.habits.length >= 3 },
    { id: "level5", name: "Rising Star", icon: "⭐", description: "Reach level 5", condition: () => data.level >= 5 },
    { id: "streak7", name: "Consistency", icon: "🔥", description: "Reach a 7-day streak", condition: () => data.streak >= 7 }
];

function renderAchievements() {
    return `
        <div class="card">
            <h2>🏆 Achievements</h2>
            <p>Unlock badges by reaching study milestones.</p>
        </div>

        <div class="achievement-grid">
            ${achievementsList.map(a => {
                const unlocked = a.condition();

                return `
                    <div class="card achievement-card ${unlocked ? "unlocked" : "locked"}">
                        <div class="achievement-icon">${a.icon}</div>
                        <h3>${escapeHTML(a.name)}</h3>
                        <p>${escapeHTML(a.description)}</p>
                        <span>${unlocked ? "Unlocked ✓" : "Locked 🔒"}</span>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

/* ==========================================================
   PROFILE
   ========================================================== */

function renderProfile() {
    return `
        <div class="card profile-card">
            <div class="profile-avatar">${escapeHTML(data.avatar)}</div>
            <h2>${escapeHTML(data.name)}</h2>
            <p>Level ${data.level} · ${data.xp} XP</p>
            <p>🔥 ${data.streak} day streak</p>
            <p>🪙 ${data.coins} coins</p>

            <button class="btn-primary" onclick="editProfile()">Edit Profile</button>
        </div>

        <div class="card">
            <h3>⚙️ Settings</h3>

            <button onclick="toggleTheme()">🌗 Toggle Light/Dark Mode</button>
            <button onclick="requestNotifications()">🔔 Enable Notifications</button>
            <button onclick="exportData()">📥 Export Backup</button>
            <button onclick="importData()">📤 Import Backup</button>
            <button onclick="resetData()" class="btn-danger">🗑 Reset StudyFlow</button>
        </div>
    `;
}

function editProfile() {
    openModal("Edit Profile", `
        ${field("Your name", "profileName", data.name)}
        ${field("Avatar emoji", "profileAvatar", data.avatar)}
        <button class="btn-primary" onclick="saveProfile()">Save Profile</button>
    `);
}

function saveProfile() {
    data.name = document.getElementById("profileName").value.trim() || "Student";
    data.avatar = document.getElementById("profileAvatar").value.trim() || "🎓";

    saveData();
    closeModal();
    navigate("profile");
    toast("Profile updated!");
}

function toggleTheme() {
    data.theme = data.theme === "dark" ? "light" : "dark";
    data.equipped = data.theme;
    saveData();
    applyTheme();
    navigate("profile");
}

function applyTheme() {
    document.documentElement.setAttribute("data-theme", data.theme);
}

/* ==========================================================
   BACKUP & RESTORE
   ========================================================== */

function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "StudyFlow-Backup.json";
    a.click();

    URL.revokeObjectURL(url);
    toast("Backup downloaded!");
}

function importData() {
    openModal("Import Backup", `
        <p>Select your StudyFlow backup JSON file.</p>
        <input type="file" id="backupFile" accept=".json,application/json">
        <button class="btn-primary" onclick="restoreData()">Import</button>
    `);
}

function restoreData() {
    const file = document.getElementById("backupFile").files[0];

    if (!file) return toast("Select a file first.");

    const reader = new FileReader();

    reader.onload = function () {
        try {
            const imported = JSON.parse(reader.result);

            data = { ...defaultData, ...imported };

            saveData();
            applyTheme();
            closeModal();
            navigate("dashboard");
            toast("Backup restored!");
        } catch {
            toast("Invalid backup file.");
        }
    };

    reader.readAsText(file);
}

function resetData() {
    if (!confirm("This will permanently delete your StudyFlow data from this browser. Are you sure?")) return;

    if (!confirm("Final confirmation: reset StudyFlow?")) return;

    localStorage.removeItem(STORAGE_KEY);
    data = { ...defaultData };
    saveData();
    applyTheme();
    navigate("dashboard");
    toast("StudyFlow has been reset.");
}

/* ==========================================================
   GLOBAL INITIALIZATION
   ========================================================== */

function initializeStudyFlow() {
    data = loadData();
    applyTheme();

    bindPage();

    const content = document.getElementById("pageContent");

    if (content) content.innerHTML = renderDashboard();

    const title = document.getElementById("pageTitle");

    if (title) title.textContent = pages.dashboard;

    const quickAdd = document.getElementById("quickAdd");

    if (quickAdd) {
        quickAdd.addEventListener("click", openAddTask);
    }

    const backdrop = document.getElementById("modalBackdrop");

    if (backdrop) {
        backdrop.addEventListener("click", function (e) {
            if (e.target === backdrop) closeModal();
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeModal();
    });

    const menuToggle = document.getElementById("menuToggle");

    if (menuToggle) {
        menuToggle.addEventListener("click", function () {
            document.querySelector(".sidebar")?.classList.toggle("open");
        });
    }

    saveData();
}

document.addEventListener("DOMContentLoaded", initializeStudyFlow);