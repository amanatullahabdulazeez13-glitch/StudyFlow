const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'studyflow_v1';

let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {
  tasks: [],
  studyMinutes: 0
};

let filter = 'all';
let timerSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;
let timerPreset = 25;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(date) {
  if (!date) return 'No due date';
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

function dateLabel() {
  $('today').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function render() {
  const done = state.tasks.filter(t => t.done).length;
  const total = state.tasks.length;
  const remaining = total - done;
  const rate = total ? Math.round(done / total * 100) : 0;

  $('completedCount').textContent = done;
  $('remainingCount').textContent = remaining;
  $('studyMinutes').textContent = state.studyMinutes;
  $('completionRate').textContent = rate;
  $('ringPercent').textContent = rate + '%';

  $('progressRing').style.background =
    `conic-gradient(#7361e9 ${rate * 3.6}deg,#efedf6 0deg)`;

  $('progressMessage').textContent = total
    ? (rate === 100
        ? 'Amazing work!'
        : rate >= 50
          ? 'You’re making great progress!'
          : 'Keep building momentum!')
    : 'Let’s get started!';

  $('progressDetail').textContent = total
    ? `${done} of ${total} tasks completed`
    : 'Your tasks will show here.';

  const list = $('taskList');
  list.innerHTML = '';

  const visible = state.tasks
    .filter(t =>
      filter === 'all' ||
      (filter === 'active' && !t.done) ||
      (filter === 'done' && t.done)
    )
    .sort((a, b) =>
      (a.date || '9999').localeCompare(b.date || '9999')
    );

  $('emptyState').classList.toggle('hidden', visible.length > 0);

  visible.forEach(t => {
    const row = document.createElement('div');

    row.className = 'task-item' + (t.done ? ' completed' : '');

    row.innerHTML = `
      <button class="check-task ${t.done ? 'checked' : ''}" aria-label="Toggle task">
        ${t.done ? '✓' : ''}
      </button>

      <div class="task-main">
        <span class="task-title"></span>
        <div class="task-meta"></div>
      </div>

      <span class="task-tag"></span>

      <button class="delete-task" aria-label="Delete task">×</button>
    `;

    row.querySelector('.task-title').textContent = t.title;

    row.querySelector('.task-meta').textContent =
      `${t.subject || 'General'} · ${t.date ? formatDate(t.date) : 'No due date'}`;

    row.querySelector('.task-tag').textContent = t.type;
    row.querySelector('.task-tag').classList.add(t.type);

    row.querySelector('.check-task').addEventListener('click', () => {
      t.done = !t.done;
      save();
      render();
    });

    row.querySelector('.delete-task').addEventListener('click', () => {
      state.tasks = state.tasks.filter(x => x.id !== t.id);
      save();
      render();
    });

    list.appendChild(row);
  });
}

function setFilter(value) {
  filter = value;

  document.querySelectorAll('.filter').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === value)
  );

  render();
}

document.querySelectorAll('.filter').forEach(b =>
  b.addEventListener('click', () => setFilter(b.dataset.filter))
);

$('addTaskBtn').addEventListener('click', () => {
  $('taskDialog').showModal();
  $('taskTitle').focus();
});

$('closeDialog').addEventListener('click', () =>
  $('taskDialog').close()
);

$('cancelDialog').addEventListener('click', () =>
  $('taskDialog').close()
);

$('taskForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const title = $('taskTitle').value.trim();

  if (!title) return;

  state.tasks.unshift({
    id: Date.now(),
    title,
    subject: $('taskSubject').value.trim(),
    type: $('taskType').value,
    date: $('taskDate').value,
    done: false
  });

  save();
  render();

  $('taskForm').reset();
  $('taskDialog').close();
});

function updateTimer() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;

  $('timerDisplay').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  $('timerStart').textContent = 'Start focus';
}

$('timerStart').addEventListener('click', () => {
  if (timerRunning) {
    stopTimer();
    $('timerCaption').textContent = 'Paused — take your time.';
    return;
  }

  timerRunning = true;
  $('timerStart').textContent = 'Pause';
  $('timerCaption').textContent = 'You’re in focus mode.';

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimer();

    if (timerSeconds <= 0) {
      stopTimer();

      state.studyMinutes += timerPreset;
      save();
      render();

      timerSeconds = timerPreset * 60;
      updateTimer();

      $('timerCaption').textContent = 'Session complete! Great work.';

      alert('Focus session complete! Nice work.');
    }
  }, 1000);
});

$('timerReset').addEventListener('click', () => {
  stopTimer();
  timerSeconds = timerPreset * 60;
  updateTimer();
  $('timerCaption').textContent = 'A little focus goes a long way.';
});

document.querySelectorAll('.preset').forEach(b =>
  b.addEventListener('click', () => {
    stopTimer();

    timerPreset = Number(b.dataset.minutes);
    timerSeconds = timerPreset * 60;

    updateTimer();
    $('timerCaption').textContent = 'A little focus goes a long way.';

    document.querySelectorAll('.preset').forEach(x =>
      x.classList.toggle('selected', x === b)
    );
  })
);

dateLabel();
render();
updateTimer();