
/* =================================
   STUDYFLOW 2.1
   COMPLETE APP JAVASCRIPT
================================= */

const $ = id => document.getElementById(id);

const STORAGE_KEY = "studyflow2";

const defaultState = {
  tasks: [],
  sessions: [],
  cards: [],
  xp: 0,
  streak: 0,
  lastStudyDate: "",
  profile: {
    name: "",
    goal: 60
  },
  petName: "Study Buddy",
  accessory: "none",
  dark: false
};

let state;
let currentFilter = "all";
let selectedDate = dateKey(new Date());
let calendarDate = new Date();
let timerSeconds = 25 * 60;
let timerInitial = 25 * 60;
let timerRunning = false;
let timerInterval = null;
let editingTaskId = null;

/* ---------- STORAGE ---------- */

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    state = {
      ...defaultState,
      ...(saved || {}),
      profile:{
        ...defaultState.profile,
        ...(saved?.profile || {})
      },
      tasks:Array.isArray(saved?.tasks) ? saved.tasks : [],
      sessions:Array.isArray(saved?.sessions) ? saved.sessions : [],
      cards:Array.isArray(saved?.cards) ? saved.cards : []
    };
  }catch{
    state = structuredClone(defaultState);
  }
}

function save(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  renderAll();
}

function dateKey(date){
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

function todayKey(){
  return dateKey(new Date());
}

function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[char]));
}

function getDateLabel(date){
  if(!date) return "No deadline";
  const d = new Date(date+"T00:00:00");
  if(Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined,{
    weekday:"short",
    day:"numeric",
    month:"short",
    year:"numeric"
  });
}

/* ---------- TASKS ---------- */

function taskAdd(e){
  e.preventDefault();

  const name = $("taskName").value.trim();
  if(!name) return;

  const task = {
    id:Date.now().toString(),
    name,
    subject:$("taskSubject").value,
    type:$("taskType").value,
    priority:$("taskPriority").value,
    date:$("taskDate").value,
    done:false,
    xpGranted:false,
    createdAt:Date.now()
  };

  if(editingTaskId){
    const oldTask = state.tasks.find(t=>String(t.id)===String(editingTaskId));
    if(oldTask){
      Object.assign(oldTask,{
        name:task.name,
        subject:task.subject,
        type:task.type,
        priority:task.priority,
        date:task.date
      });
    }
    editingTaskId=null;
    $("taskSubmit").textContent="＋ Add task";
  }else{
    state.tasks.unshift(task);
  }

  $("taskForm").reset();
  save();
}

function editTask(id){
  const task = state.tasks.find(t=>String(t.id)===String(id));
  if(!task) return;

  $("taskName").value=task.name;
  $("taskSubject").value=task.subject || "Other";
  $("taskType").value=task.type || "Other";
  $("taskPriority").value=task.priority || "Medium";
  $("taskDate").value=task.date || "";

  editingTaskId=task.id;
  $("taskSubmit").textContent="Save changes";

  $("taskForm").scrollIntoView({
    behavior:"smooth",
    block:"center"
  });
}

function cancelEdit(){
  editingTaskId=null;
  $("taskForm").reset();
  $("taskSubmit").textContent="＋ Add task";
}

function toggleTask(id){
  const task = state.tasks.find(t=>String(t.id)===String(id));
  if(!task) return;

  task.done=!task.done;

  if(task.done && !task.xpGranted){
    task.xpGranted=true;
    state.xp+=5;
    celebrate("🎉");
  }

  save();
}

function deleteTask(id){
  if(!confirm("Delete this task?")) return;

  state.tasks=state.tasks.filter(t=>String(t.id)!==String(id));
  save();
}

function renderTasks(){
  const list=$("taskList");
  list.innerHTML="";

  const searchText=$("taskSearch").value.toLowerCase().trim();

  let tasks=[...state.tasks];

  if(currentFilter==="active"){
    tasks=tasks.filter(t=>!t.done);
  }

  if(currentFilter==="done"){
    tasks=tasks.filter(t=>t.done);
  }

  if(searchText){
    tasks=tasks.filter(t=>
      (t.name||"").toLowerCase().includes(searchText) ||
      (t.subject||"").toLowerCase().includes(searchText) ||
      (t.type||"").toLowerCase().includes(searchText)
    );
  }

  tasks.sort((a,b)=>{
    if(a.done!==b.done) return a.done?1:-1;

    const da=a.date || "9999-99-99";
    const db=b.date || "9999-99-99";

    if(da!==db) return da.localeCompare(db);

    const order={High:0,Medium:1,Low:2};
    return (order[a.priority]??1)-(order[b.priority]??1);
  });

  $("emptyTasks").style.display=tasks.length?"none":"block";

  tasks.forEach(t=>{
    const item=document.createElement("div");
    item.className="task-item"+(t.done?" done":"");

    item.innerHTML=`
      <input class="task-check" type="checkbox"
        ${t.done?"checked":""}
        aria-label="Complete task">

      <div class="task-content">
        <h3>${escapeHTML(t.name)}</h3>
        <p>${escapeHTML(t.subject||"Other")} · ${escapeHTML(t.type||"Task")}</p>
        <p>${escapeHTML(t.date?getDateLabel(t.date):"No deadline")}</p>
        <span class="priority ${escapeHTML(t.priority||"Medium")}">
          ${escapeHTML(t.priority||"Medium")} priority
        </span>
      </div>

      <div class="task-actions">
        <button class="small-btn edit-btn" title="Edit task">✎</button>
        <button class="small-btn delete-btn" title="Delete task">✕</button>
      </div>
    `;

    item.querySelector(".task-check").addEventListener("change",()=>toggleTask(t.id));
    item.querySelector(".edit-btn").addEventListener("click",()=>editTask(t.id));
    item.querySelector(".delete-btn").addEventListener("click",()=>deleteTask(t.id));

    list.appendChild(item);
  });
}

/* ---------- CALENDAR ---------- */

function renderCalendar(){
  const year=calendarDate.getFullYear();
  const month=calendarDate.getMonth();

  $("calendarMonth").textContent=calendarDate.toLocaleDateString(undefined,{
    month:"long",
    year:"numeric"
  });

  const grid=$("calendarGrid");
  grid.innerHTML="";

  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(day=>{
    const cell=document.createElement("div");
    cell.className="calendar-cell weekday";
    cell.textContent=day;
    grid.appendChild(cell);
  });

  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();

  for(let i=0;i<firstDay;i++){
    const blank=document.createElement("div");
    blank.className="calendar-cell";
    grid.appendChild(blank);
  }

  for(let day=1;day<=daysInMonth;day++){
    const date=new Date(year,month,day);
    const key=dateKey(date);

    const cell=document.createElement("div");
    cell.className="calendar-cell";
    cell.textContent=day;

    if(key===todayKey()) cell.classList.add("today");
    if(key===selectedDate) cell.classList.add("selected");

    if(state.tasks.some(t=>t.date===key)){
      cell.classList.add("has-task");
    }

    cell.addEventListener("click",()=>{
      selectedDate=key;
      renderCalendar();
    });

    grid.appendChild(cell);
  }

  renderCalendarTasks();
}

function renderCalendarTasks(){
  const tasks=state.tasks.filter(t=>t.date===selectedDate);

  const box=$("calendarTasks");

  if(!tasks.length){
    box.textContent="No tasks scheduled for "+getDateLabel(selectedDate)+".";
    return;
  }

  box.innerHTML=`
    <strong>${escapeHTML(getDateLabel(selectedDate))}</strong>
    ${tasks.map(t=>`
      <div class="deadline-item">
        ${t.done?"✅":"📌"} ${escapeHTML(t.name)}
        <p>${escapeHTML(t.subject)} · ${escapeHTML(t.type)}</p>
      </div>
    `).join("")}
  `;
}

/* ---------- FOCUS TIMER ---------- */

function chooseTimer(minutes){
  stopTimer();

  timerInitial=minutes*60;
  timerSeconds=timerInitial;

  document.querySelectorAll(".timer-mode").forEach(btn=>{
    btn.classList.toggle(
      "active",
      Number(btn.dataset.minutes)===minutes
    );
  });

  $("timerMode").textContent="Focus session";
  renderTimer();
}

function renderTimer(){
  const minutes=Math.floor(timerSeconds/60);
  const seconds=timerSeconds%60;

  $("timerDisplay").textContent=
    String(minutes).padStart(2,"0")+":"+
    String(seconds).padStart(2,"0");

  $("timerStart").textContent=timerRunning?"⏸ Pause":"▶ Start";
}

function stopTimer(){
  timerRunning=false;
  if(timerInterval){
    clearInterval(timerInterval);
    timerInterval=null;
  }
  renderTimer();
}

function startTimer(){
  if(timerRunning){
    stopTimer();
    return;
  }

  if(timerSeconds<=0){
    timerSeconds=timerInitial;
  }

  timerRunning=true;
  renderTimer();

  timerInterval=setInterval(()=>{
    timerSeconds--;

    renderTimer();

    if(timerSeconds<=0){
      stopTimer();
      timerComplete();
    }
  },1000);
}

function resetTimer(){
  stopTimer();
  timerSeconds=timerInitial;
  $("timerMode").textContent="Focus session";
  renderTimer();
}

function timerComplete(){
  $("timerMode").textContent="Session completed! 🎉";
  celebrate("🎉");

  recordStudy(timerInitial/60,$("focusSubject").value);

  if("Notification" in window && Notification.permission==="granted"){
    try{
      new Notification("StudyFlow",{
        body:"Your focus session is complete. Well done!"
      });
    }catch{}
  }

  alert("Focus session completed! Great job. 🎉");
}

/* ---------- STUDY RECORDS ---------- */

function recordStudy(minutes,subject="Other"){
  const date=todayKey();

  state.sessions.push({
    date,
    minutes,
    subject,
    id:Date.now().toString()
  });

  state.xp+=minutes;

  if(state.lastStudyDate!==date){
    const yesterday=new Date();
    yesterday.setDate(yesterday.getDate()-1);

    if(state.lastStudyDate===dateKey(yesterday)){
      state.streak++;
    }else{
      state.streak=1;
    }

    state.lastStudyDate=date;
  }

  save();
}

function renderDailyGoal(){
  const todayMinutes=state.sessions
    .filter(s=>s.date===todayKey())
    .reduce((sum,s)=>sum+Number(s.minutes||0),0);

  const goal=Math.max(1,Number(state.profile.goal)||60);
  const percentage=Math.min(100,(todayMinutes/goal)*100);

  $("goalProgressBar").style.width=percentage+"%";
  $("goalProgressText").textContent=
    `${todayMinutes} / ${goal} minutes studied today`;

  $("goalBadge").textContent=Math.round(percentage)+"%";

  if(todayMinutes>=goal){
    $("goalProgressText").textContent=
      "🎉 Daily goal achieved! "+todayMinutes+" minutes studied.";
  }
}

/* ---------- PET ---------- */

function petLevel(){
  return Math.floor(Math.max(0,state.xp)/100)+1;
}

function petEmoji(){
  const level=petLevel();

  if(level>=10) return "🐉";
  if(level>=7) return "🦊";
  if(level>=5) return "🐼";
  if(level>=3) return "🐰";
  return "🐱";
}

function renderPet(){
  const level=petLevel();
  const xp=state.xp;
  const currentLevelXP=xp%100;

  $("petEmoji").textContent=
    petEmoji()+" "+(state.accessory==="none"?"":state.accessory);

  $("petNameDisplay").textContent=state.petName||"Study Buddy";
  $("petLevelText").textContent="Level "+level;
  $("petXPText").textContent=currentLevelXP+" / 100 XP to next level";

  $("petProgressBar").style.width=currentLevelXP+"%";

  const accessory=$("petAccessory");

  const accessoryLevels={
    "none":1,
    "🎀":2,
    "👑":5,
    "🕶️":7,
    "✨":10
  };

  accessory.value=state.accessory||"none";

  Array.from(accessory.options).forEach(option=>{
    const required=accessoryLevels[option.value]||1;
    option.disabled=level<required;
  });

  if(level<(accessoryLevels[state.accessory]||1)){
    state.accessory="none";
    accessory.value="none";
  }

  $("accessoryMessage").textContent=
    "Accessories unlock as your pet levels up.";

  const rewards=[
    {level:1,name:"🐱 Starter pet"},
    {level:2,name:"🎀 Ribbon"},
    {level:3,name:"🐰 Bunny pet"},
    {level:5,name:"👑 Crown"},
    {level:7,name:"🕶️ Sunglasses"},
    {level:10,name:"✨ Sparkles & dragon"}
  ];

  $("rewardList").innerHTML=rewards.map(r=>`
    <div class="reward ${level<r.level?"locked":""}">
      ${level>=r.level?"🔓":"🔒"}
      ${escapeHTML(r.name)}
      <br>
      <small>Level ${r.level}</small>
    </div>
  `).join("");
}

/* ---------- ANALYTICS ---------- */

function renderAnalytics(){
  const completed=state.tasks.filter(t=>t.done).length;
  const remaining=state.tasks.filter(t=>!t.done).length;

  const totalMinutes=state.sessions.reduce(
    (sum,s)=>sum+Number(s.minutes||0),0
  );

  $("completedStat").textContent=completed;
  $("streakStat").textContent=state.streak+" days";
  $("minutesStat").textContent=totalMinutes;
  $("xpStat").textContent=state.xp+" XP";

  $("sessionsStat").textContent=state.sessions.length;
  $("hoursStat").textContent=(totalMinutes/60).toFixed(1);
  $("remainingStat").textContent=remaining;

  const subjects={};

  state.sessions.forEach(s=>{
    const subject=s.subject||"Other";
    subjects[subject]=(subjects[subject]||0)+Number(s.minutes||0);
  });

  const max=Math.max(1,...Object.values(subjects));

  $("subjectAnalytics").innerHTML=Object.entries(subjects)
    .sort((a,b)=>b[1]-a[1])
    .map(([subject,minutes])=>`
      <div class="subject-row">
        <p>
          <span>${escapeHTML(subject)}</span>
          <span>${minutes} min</span>
        </p>
        <div class="subject-track">
          <div class="subject-fill" style="width:${(minutes/max)*100}%"></div>
        </div>
      </div>
    `).join("") || "<p>No study sessions recorded yet.</p>";
}

/* ---------- FLASHCARDS ---------- */

function addCard(e){
  e.preventDefault();

  const question=$("cardQuestion").value.trim();
  const answer=$("cardAnswer").value.trim();

  if(!question||!answer) return;

  state.cards.unshift({
    id:Date.now().toString(),
    question,
    answer
  });

  $("cardForm").reset();
  save();
}

function renderCards(){
  $("flashcards").innerHTML=state.cards.map(card=>`
    <div class="flashcard" data-card="${escapeHTML(card.id)}">
      <strong>${escapeHTML(card.question)}</strong>
      <div class="flashcard-answer">
        ${escapeHTML(card.answer)}
      </div>
      <div class="flashcard-actions">
        <button class="soft-btn flip-btn">👀 Show answer</button>
        <button class="small-btn delete-card-btn">✕</button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".flip-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const card=btn.closest(".flashcard");
      card.classList.toggle("show");
      btn.textContent=card.classList.contains("show")
        ?"🙈 Hide answer"
        :"👀 Show answer";
    });
  });

  document.querySelectorAll(".delete-card-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.closest(".flashcard").dataset.card;
      state.cards=state.cards.filter(c=>String(c.id)!==String(id));
      save();
    });
  });
}

/* ---------- DEADLINES ---------- */

function renderDeadlines(){
  const upcoming=state.tasks
    .filter(t=>!t.done && t.date)
    .sort((a,b)=>a.date.localeCompare(b.date));

  $("deadlines").innerHTML=upcoming.map(t=>`
    <div class="deadline-item">
      <strong>${escapeHTML(t.name)}</strong>
      <p>${escapeHTML(t.subject)} · ${escapeHTML(t.type)}</p>
      <p>📅 ${escapeHTML(getDateLabel(t.date))}</p>
    </div>
  `).join("") || "<p>No upcoming deadlines. You're all caught up! 🌸</p>";
}

/* ---------- CELEBRATIONS ---------- */

function celebrate(symbol="✨"){
  const el=document.createElement("div");
  el.className="celebration";
  el.textContent=symbol;
  $("celebrationContainer").appendChild(el);

  setTimeout(()=>el.remove(),900);
}

/* ---------- BACKUP ---------- */

function exportData(){
  const backup=JSON.stringify(state,null,2);
  const blob=new Blob([backup],{type:"application/json"});
  const url=URL.createObjectURL(blob);

  const link=document.createElement("a");
  link.href=url;
  link.download="StudyFlow-Backup-"+todayKey()+".json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(()=>URL.revokeObjectURL(url),1000);

  $("backupMessage").textContent="Your backup download has started!";
}

function importData(){
  $("importDataFile").click();
}

async function restoreData(e){
  const file=e.target.files[0];
  if(!file) return;

  try{
    const imported=JSON.parse(await file.text());

    if(
      !imported ||
      !Array.isArray(imported.tasks) ||
      !Array.isArray(imported.sessions) ||
      !Array.isArray(imported.cards)
    ){
      throw new Error("Invalid backup");
    }

    if(!confirm("Restore this backup? Your current StudyFlow data will be replaced.")){
      e.target.value="";
      return;
    }

    state={
      ...defaultState,
      ...imported,
      profile:{
        ...defaultState.profile,
        ...(imported.profile||{})
      }
    };

    save();

    $("backupMessage").textContent="Backup restored successfully!";
  }catch{
    $("backupMessage").textContent="That backup file could not be restored.";
  }

  e.target.value="";
}

/* ---------- PROFILE & SETTINGS ---------- */

function renderProfile(){
  const name=state.profile.name||"";

  $("profileName").value=name;
  $("welcomeText").textContent=name
    ?"Welcome back, "+name+"! ✨"
    :"Welcome back! ✨";

  $("todayText").textContent=new Date().toLocaleDateString(undefined,{
    weekday:"long",
    day:"numeric",
    month:"long",
    year:"numeric"
  });

  $("dailyGoal").value=state.profile.goal||60;
  $("petName").value=state.petName||"Study Buddy";
}

function toggleTheme(){
  state.dark=!state.dark;
  document.body.classList.toggle("dark",state.dark);
  $("themeBtn").textContent=state.dark?"☀️":"🌙";
  save();
}

async function enableNotifications(){
  if(!("Notification" in window)){
    alert("Notifications are not supported in this browser.");
    return;
  }

  const permission=await Notification.requestPermission();

  if(permission==="granted"){
    alert("Notifications enabled! 🎉");
  }else{
    alert("Notifications were not enabled. You can change this in your browser settings.");
  }
}

/* ---------- RENDER ---------- */

function renderAll(){
  document.body.classList.toggle("dark",state.dark);
  $("themeBtn").textContent=state.dark?"☀️":"🌙";

  renderProfile();
  renderTasks();
  renderCalendar();
  renderDailyGoal();
  renderPet();
  renderAnalytics();
  renderCards();
  renderDeadlines();
  renderTimer();
}

/* ---------- EVENTS ---------- */

$("taskForm").addEventListener("submit",taskAdd);

$("taskName").addEventListener("input",()=>{
  if(editingTaskId && !$("taskName").value.trim()){
    $("taskSubmit").textContent="Save changes";
  }
});

$("taskSearch").addEventListener("input",renderTasks);

$("taskForm").addEventListener("reset",()=>{
  setTimeout(()=>{
    if(!editingTaskId){
      $("taskSubmit").textContent="＋ Add task";
    }
  },0);
});

document.querySelectorAll(".filter-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    currentFilter=btn.dataset.filter;

    document.querySelectorAll(".filter-btn").forEach(b=>{
      b.classList.toggle("active",b===btn);
    });

    renderTasks();
  });
});

$("prevMonth").addEventListener("click",()=>{
  calendarDate.setMonth(calendarDate.getMonth()-1);
  renderCalendar();
});

$("nextMonth").addEventListener("click",()=>{
  calendarDate.setMonth(calendarDate.getMonth()+1);
  renderCalendar();
});

document.querySelectorAll(".timer-mode").forEach(btn=>{
  btn.addEventListener("click",()=>{
    chooseTimer(Number(btn.dataset.minutes));
  });
});

$("timerStart").addEventListener("click",startTimer);
$("timerReset").addEventListener("click",resetTimer);

$("profileName").addEventListener("change",()=>{
  state.profile.name=$("profileName").value.trim();
  save();
});

$("dailyGoal").addEventListener("change",()=>{
  const value=Math.max(1,Math.min(1440,Number($("dailyGoal").value)||60));
  state.profile.goal=value;
  $("dailyGoal").value=value;
  save();
});

$("petName").addEventListener("change",()=>{
  state.petName=$("petName").value.trim()||"Study Buddy";
  save();
});

$("petAccessory").addEventListener("change",e=>{
  const level=petLevel();

  const required={
    "none":1,
    "🎀":2,
    "👑":5,
    "🕶️":7,
    "✨":10
  };

  if(level<(required[e.target.value]||1)){
    e.target.value="none";
    $("accessoryMessage").textContent="Level up to unlock this accessory!";
    return;
  }

  state.accessory=e.target.value;
  save();
});

$("themeBtn").addEventListener("click",toggleTheme);
$("notifyBtn").addEventListener("click",enableNotifications);

$("cardForm").addEventListener("submit",addCard);

$("exportData").addEventListener("click",exportData);
$("importDataBtn").addEventListener("click",importData);
$("importDataFile").addEventListener("change",restoreData);

/* ---------- START APP ---------- */

loadState();
renderAll();

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("service-worker.js")
      .catch(error=>console.log("Offline setup:",error));
  });
}
