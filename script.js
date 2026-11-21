/* =========================================================
   STUDYFLOW 3.0
   ========================================================= */

const STORAGE_KEY = "studyflow3";
const OLD_KEY = "studyflow2";

const DEFAULT_SUBJECTS = [
  {id:"s1",name:"Mathematics",color:"#7666e8",mastery:1},
  {id:"s2",name:"English",color:"#3995e8",mastery:1},
  {id:"s3",name:"Biology",color:"#48ad83",mastery:1},
  {id:"s4",name:"Chemistry",color:"#e69a4a",mastery:1},
  {id:"s5",name:"Physics",color:"#e76baf",mastery:1}
];

const BADGES = [
  {id:"firstTask",name:"First Step",emoji:"🌱",desc:"Complete your first task.",test:s=>s.completedTasks>=1},
  {id:"fiveTasks",name:"Getting Things Done",emoji:"✏️",desc:"Complete 5 tasks.",test:s=>s.completedTasks>=5},
  {id:"twentyTasks",name:"Task Champion",emoji:"🏅",desc:"Complete 20 tasks.",test:s=>s.completedTasks>=20},
  {id:"firstSession",name:"Focused",emoji:"⏱️",desc:"Complete a focus session.",test:s=>s.sessions>=1},
  {id:"tenSessions",name:"Focus Master",emoji:"🧠",desc:"Complete 10 focus sessions.",test:s=>s.sessions>=10},
  {id:"oneHour",name:"Time Well Spent",emoji:"⌛",desc:"Study for 60 minutes.",test:s=>s.minutes>=60},
  {id:"fiveHours",name:"Dedicated",emoji:"📚",desc:"Study for 300 minutes.",test:s=>s.minutes>=300},
  {id:"streak3",name:"Consistency",emoji:"🔥",desc:"Reach a 3-day streak.",test:s=>s.streak>=3},
  {id:"streak7",name:"Week Warrior",emoji:"🌟",desc:"Reach a 7-day streak.",test:s=>s.streak>=7},
  {id:"flashcards",name:"Memory Builder",emoji:"🗂️",desc:"Create 10 flashcards.",test:s=>s.cards>=10},
  {id:"exam",name:"Ready to Rise",emoji:"🎓",desc:"Add your first exam.",test:s=>s.exams>=1},
  {id:"level5",name:"Growing Buddy",emoji:"🐾",desc:"Reach pet level 5.",test:s=>s.level>=5}
];

const PETS = [
  {emoji:"🐱",name:"Cat",level:1},
  {emoji:"🐶",name:"Dog",level:1},
  {emoji:"🐰",name:"Rabbit",level:2},
  {emoji:"🐼",name:"Panda",level:3},
  {emoji:"🦊",name:"Fox",level:4},
  {emoji:"🐸",name:"Frog",level:5},
  {emoji:"🐻",name:"Bear",level:6},
  {emoji:"🦄",name:"Unicorn",level:8},
  {emoji:"🐲",name:"Dragon",level:10}
];

const QUOTES = [
  "One focused step at a time.",
  "You don't have to be perfect to make progress.",
  "Your future self will thank you.",
  "Learning is a journey, not a race.",
  "Every minute you learn is an investment.",
  "Consistency beats perfection.",
  "You are capable of learning amazing things.",
  "Start where you are. Use what you have.",
  "Progress is progress, however small.",
  "Take a breath. Then begin."
];

function uid(){
  return Date.now().toString(36)+Math.random().toString(36).slice(2,8);
}

function localDate(date=new Date()){
  const d=new Date(date);
  d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

function blankState(){
  return {
    version:3,
    profile:{name:"Student",initial:"S"},
    tasks:[],
    exams:[],
    cards:[],
    subjects:DEFAULT_SUBJECTS.map(x=>({...x})),
    sessions:[],
    goal:60,
    xp:0,
    pet:"🐱",
    petName:"Study Buddy",
    unlockedPets:["🐱","🐶"],
    badges:[],
    theme:"light",
    accent:"purple",
    streak:0,
    lastStudyDate:"",
    selectedDay:localDate(),
    created:Date.now()
  };
}

function loadState(){
  try{
    const saved=localStorage.getItem(STORAGE_KEY);
    if(saved){
      const s=JSON.parse(saved);
      return {...blankState(),...s};
    }
  }catch(e){}
  try{
    const old=localStorage.getItem(OLD_KEY);
    if(old){
      const s=JSON.parse(old);
      const base=blankState();
      base.tasks=Array.isArray(s.tasks)?s.tasks:[];
      base.sessions=Array.isArray(s.sessions)?s.sessions:[];
      base.cards=Array.isArray(s.cards)?s.cards:[];
      base.subjects=Array.isArray(s.subjects)&&s.subjects.length?s.subjects:base.subjects;
      base.profile=s.profile||base.profile;
      base.goal=s.goal||60;
      base.xp=s.xp||0;
      base.pet=s.pet||"🐱";
      base.petName=s.petName||"Study Buddy";
      base.streak=s.streak||0;
      base.lastStudyDate=s.lastStudyDate||"";
      return base;
    }
  }catch(e){}
  return blankState();
}

let state=loadState();
let timerSeconds=25*60;
let timerRunning=false;
let timerInterval=null;
let selectedFlashcard=0;
let flashcardFlipped=false;
let calendarDate=new Date();
let pendingSubtasks=[];
let deferredInstall=null;
let toastTimer=null;

function save(){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  }catch(e){
    showToast("Your browser storage is full. Export a backup.");
  }
}

function showToast(msg){
  const el=document.getElementById("toast");
  if(!el)return;
  el.textContent=msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("show"),2800);
}

function getSubjectName(id){
  return state.subjects.find(s=>s.id===id)?.name||"General";
}

function getSubjectColor(id){
  return state.subjects.find(s=>s.id===id)?.color||"#7666e8";
}

function getTodayTasks(){
  return state.tasks.filter(t=>t.date===localDate());
}

function getCompletedTasks(){
  return state.tasks.filter(t=>t.done);
}

function totalMinutes(){
  return state.sessions.reduce((a,b)=>a+(b.minutes||0),0);
}

function completedTodayMinutes(){
  return state.sessions.filter(s=>s.date===localDate()).reduce((a,b)=>a+(b.minutes||0),0);
}

function level(){
  return Math.floor(state.xp/100)+1;
}

function xpInLevel(){
  return state.xp%100;
}

function updateStreak(){
  const today=localDate();
  if(state.lastStudyDate===today)return;
  const yesterday=new Date();
  yesterday.setDate(yesterday.getDate()-1);
  const y=localDate(yesterday);
  if(state.lastStudyDate===y){
    state.streak=(state.streak||0)+1;
  }else if(state.lastStudyDate!==today){
    state.streak=1;
  }
  state.lastStudyDate=today;
}

function awardXP(amount){
  state.xp+=amount;
  showToast("✨ +"+amount+" XP earned!");
  checkBadges();
  save();
}

function getBadgeStats(){
  return {
    completedTasks:getCompletedTasks().length,
    sessions:state.sessions.length,
    minutes:totalMinutes(),
    streak:state.streak||0,
    cards:state.cards.length,
    exams:state.exams.length,
    level:level()
  };
}

function checkBadges(){
  const stats=getBadgeStats();
  BADGES.forEach(b=>{
    if(b.test(stats)&&!state.badges.includes(b.id)){
      state.badges.push(b.id);
      showToast("🏆 Achievement unlocked: "+b.name);
    }
  });
}

function escapeHTML(str){
  return String(str??"").replace(/[&<>"']/g,m=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[m]));
}

/* NAVIGATION */

function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const target=document.getElementById("page-"+page);
  if(target)target.classList.add("active");

  document.querySelectorAll(".nav-btn[data-page]").forEach(b=>{
    b.classList.toggle("active",b.dataset.page===page);
  });

  document.getElementById("sidebar").classList.remove("open");

  renderAll();
}

document.querySelectorAll(".nav-btn[data-page]").forEach(btn=>{
  btn.addEventListener("click",()=>showPage(btn.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(btn=>{
  btn.addEventListener("click",()=>showPage(btn.dataset.goto));
});

document.querySelectorAll("[data-close]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.getElementById(btn.dataset.close).classList.remove("open");
  });
});

document.querySelectorAll(".modal-overlay").forEach(overlay=>{
  overlay.addEventListener("click",e=>{
    if(e.target===overlay)overlay.classList.remove("open");
  });
});

document.getElementById("menuToggle").addEventListener("click",()=>{
  document.getElementById("sidebar").classList.toggle("open");
});

/* TASKS */

function openTaskModal(task=null){
  pendingSubtasks=[];
  document.getElementById("taskForm").reset();
  document.getElementById("taskEditId").value=task?.id||"";
  document.getElementById("taskModalTitle").textContent=task?"Edit task":"Add a task";
  document.getElementById("taskTitle").value=task?.title||"";
  document.getElementById("taskSubject").value=task?.subject||state.subjects[0]?.id||"";
  document.getElementById("taskDate").value=task?.date||"";
  document.getElementById("taskPriority").value=task?.priority||"medium";
  document.getElementById("taskMinutes").value=task?.minutes||30;
  document.getElementById("taskNotes").value=task?.notes||"";
  pendingSubtasks=(task?.subtasks||[]).map(s=>({...s}));
  renderSubtaskInputs();
  document.getElementById("taskModal").classList.add("open");
}

document.getElementById("addTaskBtn").addEventListener("click",()=>openTaskModal());

document.getElementById("addSubtaskInput").addEventListener("click",()=>{
  const input=document.getElementById("newSubtaskInput");
  const title=input.value.trim();
  if(!title)return;
  pendingSubtasks.push({id:uid(),title,done:false});
  input.value="";
  renderSubtaskInputs();
});

document.getElementById("newSubtaskInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    document.getElementById("addSubtaskInput").click();
  }
});

function renderSubtaskInputs(){
  const el=document.getElementById("taskSubtaskInputs");
  el.innerHTML=pendingSubtasks.map((s,i)=>`
    <div class="subtask-item">
      <span style="flex:1">${escapeHTML(s.title)}</span>
      <button type="button" class="small-btn" data-remove-sub="${i}">×</button>
    </div>
  `).join("");
  el.querySelectorAll("[data-remove-sub]").forEach(btn=>{
    btn.onclick=()=>{
      pendingSubtasks.splice(Number(btn.dataset.removeSub),1);
      renderSubtaskInputs();
    };
  });
}

document.getElementById("taskForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=document.getElementById("taskEditId").value;
  const existing=state.tasks.find(t=>t.id===id);
  const task={
    id:id||uid(),
    title:document.getElementById("taskTitle").value.trim(),
    subject:document.getElementById("taskSubject").value,
    date:document.getElementById("taskDate").value,
    priority:document.getElementById("taskPriority").value,
    minutes:Number(document.getElementById("taskMinutes").value)||30,
    notes:document.getElementById("taskNotes").value.trim(),
    subtasks:pendingSubtasks,
    done:existing?.done||false,
    created:existing?.created||Date.now(),
    completedAt:existing?.completedAt||null
  };
  if(!task.title)return;
  if(existing){
    state.tasks=state.tasks.map(t=>t.id===id?task:t);
  }else{
    state.tasks.unshift(task);
  }
  save();
  document.getElementById("taskModal").classList.remove("open");
  renderAll();
  showToast(existing?"Task updated!":"Task added!");
});

function toggleTask(id){
  const task=state.tasks.find(t=>t.id===id);
  if(!task)return;
  if(task.done){
    task.done=false;
    task.completedAt=null;
  }else{
    task.done=true;
    task.completedAt=Date.now();
    updateStreak();
    awardXP(10);
  }
  save();
  renderAll();
}

function deleteTask(id){
  if(!confirm("Delete this task?"))return;
  state.tasks=state.tasks.filter(t=>t.id!==id);
  save();
  renderAll();
}

function editTask(id){
  const task=state.tasks.find(t=>t.id===id);
  if(task)openTaskModal(task);
}

function toggleSubtask(taskId,subId){
  const task=state.tasks.find(t=>t.id===taskId);
  if(!task)return;
  const sub=task.subtasks.find(s=>s.id===subId);
  if(!sub)return;
  sub.done=!sub.done;
  save();
  renderAll();
}

function taskHTML(task){
  const overdue=task.date&&!task.done&&task.date<localDate();
  const subtasks=task.subtasks||[];
  return `
  <div class="task-item ${task.done?"done":""}">
    <input class="task-check" type="checkbox" ${task.done?"checked":""} data-task-check="${task.id}">
    <div class="task-content">
      <div class="task-title">${escapeHTML(task.title)}</div>
      <div class="task-meta">
        <span>${escapeHTML(getSubjectName(task.subject))}</span>
        ${task.date?`<span ${overdue?'style="color:#c44d4d"':''}>${overdue?"Overdue · ":""}${escapeHTML(task.date)}</span>`:""}
        <span>${task.minutes||30} min</span>
        <span class="priority-tag ${task.priority||"medium"}">${escapeHTML(task.priority||"medium")}</span>
      </div>
      ${task.notes?`<div class="task-notes">${escapeHTML(task.notes)}</div>`:""}
      ${subtasks.length?`
        <div class="task-subtasks">
          ${subtasks.map(s=>`
            <div class="subtask-item ${s.done?"completed":""}">
              <input type="checkbox" data-subtask="${task.id}|${s.id}" ${s.done?"checked":""}>
              <span>${escapeHTML(s.title)}</span>
            </div>
          `).join("")}
        </div>`:""}
    </div>
    <div class="task-actions">
      <button class="small-btn" data-edit-task="${task.id}">Edit</button>
      <button class="small-btn" data-delete-task="${task.id}">Delete</button>
    </div>
  </div>`;
}

function bindTaskHTML(container){
  container.querySelectorAll("[data-task-check]").forEach(el=>{
    el.onchange=()=>toggleTask(el.dataset.taskCheck);
  });
  container.querySelectorAll("[data-edit-task]").forEach(el=>{
    el.onclick=()=>editTask(el.dataset.editTask);
  });
  container.querySelectorAll("[data-delete-task]").forEach(el=>{
    el.onclick=()=>deleteTask(el.dataset.deleteTask);
  });
  container.querySelectorAll("[data-subtask]").forEach(el=>{
    el.onchange=()=>{
      const [taskId,subId]=el.dataset.subtask.split("|");
      toggleSubtask(taskId,subId);
    };
  });
}

function renderTasks(){
  const search=(document.getElementById("taskSearch")?.value||"").toLowerCase();
  const filter=document.getElementById("taskFilter")?.value||"all";
  const sort=document.getElementById("taskSort")?.value||"date";

  let tasks=state.tasks.filter(t=>t.title.toLowerCase().includes(search)||getSubjectName(t.subject).toLowerCase().includes(search));
  const today=localDate();

  if(filter==="active")tasks=tasks.filter(t=>!t.done);
  if(filter==="completed")tasks=tasks.filter(t=>t.done);
  if(filter==="today")tasks=tasks.filter(t=>t.date===today);
  if(filter==="overdue")tasks=tasks.filter(t=>!t.done&&t.date&&t.date<today);

  if(sort==="date")tasks.sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999"));
  if(sort==="priority"){
    const rank={high:0,medium:1,low:2};
    tasks.sort((a,b)=>rank[a.priority]-rank[b.priority]);
  }
  if(sort==="created")tasks.sort((a,b)=>b.created-a.created);

  const el=document.getElementById("tasksList");
  el.innerHTML=tasks.length?tasks.map(taskHTML).join(""):`<div class="empty-state"><span>📚</span>No tasks here yet. Add a task to begin!</div>`;
  bindTaskHTML(el);
}

["taskSearch","taskFilter","taskSort"].forEach(id=>{
  document.getElementById(id).addEventListener(id==="taskSearch"?"input":"change",renderTasks);
});

/* SMART PLANNER */

document.getElementById("generatePlan").addEventListener("click",generatePlan);

function generatePlan(){
  const available=Math.max(15,Number(document.getElementById("availableTime").value)||120);
  const breakM=Math.max(1,Number(document.getElementById("plannerBreak").value)||10);
  let tasks=state.tasks.filter(t=>!t.done);
  tasks.sort((a,b)=>{
    const rank={high:0,medium:1,low:2};
    const d=(a.date||"9999").localeCompare(b.date||"9999");
    if(d!==0)return d;
    return rank[a.priority]-rank[b.priority];
  });
  const el=document.getElementById("plannerResults");
  let remaining=available;
  let clock=new Date();
  clock.setMinutes(Math.ceil(clock.getMinutes()/5)*5);
  let html="";
  if(!tasks.length){
    el.innerHTML=`<div class="empty-state"><span>🌟</span>You're all caught up! Add tasks to create a study plan.</div>`;
    return;
  }
  tasks.forEach((task,i)=>{
    if(remaining<=0)return;
    const mins=Math.min(task.minutes||30,remaining);
    const start=clock.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    clock.setMinutes(clock.getMinutes()+mins);
    const end=clock.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    html+=`
      <div class="planner-result">
        <div class="planner-time">${start} – ${end}</div>
        <div class="planner-result-content">
          <strong>${escapeHTML(task.title)}</strong>
          <small>${escapeHTML(getSubjectName(task.subject))} · ${mins} min</small>
        </div>
      </div>`;
    remaining-=mins;
    if(remaining>0&&i<tasks.length-1){
      clock.setMinutes(clock.getMinutes()+breakM);
      html+=`
      <div class="planner-result">
        <div class="planner-time">Break</div>
        <div class="planner-result-content">
          <strong>Rest and recharge ☕</strong>
          <small>${breakM} minutes</small>
        </div>
      </div>`;
    }
  });
  el.innerHTML=html||`<div class="empty-state">No tasks could be scheduled.</div>`;
}

/* CALENDAR */

document.getElementById("prevMonth").addEventListener("click",()=>{
  calendarDate.setMonth(calendarDate.getMonth()-1);
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click",()=>{
  calendarDate.setMonth(calendarDate.getMonth()+1);
  renderCalendar();
});

function renderCalendar(){
  const year=calendarDate.getFullYear();
  const month=calendarDate.getMonth();
  document.getElementById("calendarMonth").textContent=calendarDate.toLocaleString(undefined,{month:"long",year:"numeric"});
  const grid=document.getElementById("calendarGrid");
  const names=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  grid.innerHTML=names.map(n=>`<div class="calendar-day-name">${n}</div>`).join("");

  const first=new Date(year,month,1);
  const start=first.getDay();
  const last=new Date(year,month+1,0).getDate();
  const prevLast=new Date(year,month,0).getDate();
  const today=localDate();

  for(let i=0;i<42;i++){
    let dayNum,dayDate,other=false;
    if(i<start){
      dayNum=prevLast-start+i+1;
      dayDate=new Date(year,month-1,dayNum);
      other=true;
    }else if(i>=start+last){
      dayNum=i-(start+last)+1;
      dayDate=new Date(year,month+1,dayNum);
      other=true;
    }else{
      dayNum=i-start+1;
      dayDate=new Date(year,month,dayNum);
    }
    const dateStr=localDate(dayDate);
    const hasTasks=state.tasks.some(t=>t.date===dateStr)||state.exams.some(e=>e.date===dateStr);
    const div=document.createElement("div");
    div.className="calendar-day"+(other?" other":"")+(dateStr===today?" today":"")+(dateStr===state.selectedDay?" selected":"");
    div.innerHTML=`${dayNum}${hasTasks?'<div class="calendar-dot"></div>':''}`;
    div.onclick=()=>{
      state.selectedDay=dateStr;
      save();
      renderCalendar();
    };
    grid.appendChild(div);
  }
  renderCalendarDay();
}

function renderCalendarDay(){
  const date=state.selectedDay||localDate();
  const tasks=state.tasks.filter(t=>t.date===date);
  const exams=state.exams.filter(e=>e.date===date);
  let html=`<h3 style="margin-top:25px">${escapeHTML(date)}</h3>`;
  if(!tasks.length&&!exams.length){
    html+=`<div class="empty-state">Nothing scheduled for this day.</div>`;
  }
  tasks.forEach(t=>{
    html+=`<div class="calendar-day-task">${taskHTML(t)}</div>`;
  });
  exams.forEach(e=>{
    html+=`<div class="calendar-day-task">🎓 ${escapeHTML(e.name)} · ${escapeHTML(getSubjectName(e.subject))}</div>`;
  });
  const el=document.getElementById("calendarDayTasks");
  el.innerHTML=html;
  bindTaskHTML(el);
}

/* EXAMS */

document.getElementById("addExamBtn").addEventListener("click",()=>{
  document.getElementById("examForm").reset();
  document.getElementById("examModal").classList.add("open");
});

document.getElementById("examForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.exams.push({
    id:uid(),
    name:document.getElementById("examName").value.trim(),
    subject:document.getElementById("examSubject").value,
    date:document.getElementById("examDate").value,
    notes:document.getElementById("examNotes").value.trim()
  });
  save();
  document.getElementById("examModal").classList.remove("open");
  checkBadges();
  renderAll();
  showToast("Exam added!");
});

function renderExams(){
  const el=document.getElementById("examList");
  const exams=[...state.exams].sort((a,b)=>a.date.localeCompare(b.date));
  if(!exams.length){
    el.innerHTML=`<div class="empty-state"><span>🎓</span>Add your exams to see countdowns.</div>`;
    return;
  }
  el.innerHTML=exams.map(e=>{
    const diff=Math.ceil((new Date(e.date+"T00:00:00")-new Date(localDate()+"T00:00:00"))/86400000);
    const countdown=diff<0?"Past exam":diff===0?"Today!":diff+" days left";
    return `
      <div class="exam-card">
        <div class="exam-count">${escapeHTML(countdown)}</div>
        <h3>${escapeHTML(e.name)}</h3>
        <div class="exam-meta">${escapeHTML(getSubjectName(e.subject))} · ${escapeHTML(e.date)}</div>
        ${e.notes?`<p>${escapeHTML(e.notes)}</p>`:""}
        <button class="small-btn" data-delete-exam="${e.id}">Delete exam</button>
      </div>`;
  }).join("");
  el.querySelectorAll("[data-delete-exam]").forEach(btn=>{
    btn.onclick=()=>{
      if(!confirm("Delete this exam?"))return;
      state.exams=state.exams.filter(e=>e.id!==btn.dataset.deleteExam);
      save();
      renderAll();
    };
  });
}

/* FOCUS TIMER */

document.querySelectorAll(".timer-mode-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    if(timerRunning)return;
    document.querySelectorAll(".timer-mode-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    timerSeconds=Number(btn.dataset.minutes)*60;
    updateTimerDisplay();
    document.getElementById("focusModeTitle").textContent=btn.dataset.minutes===50?"Deep focus":btn.dataset.minutes===25?"Time to concentrate":"Quick focus";
  });
});

document.getElementById("timerStart").addEventListener("click",()=>{
  if(timerRunning){
    clearInterval(timerInterval);
    timerRunning=false;
    document.getElementById("timerStart").textContent="▶ Resume";
    return;
  }
  if(timerSeconds<=0)return;
  timerRunning=true;
  document.getElementById("timerStart").textContent="Ⅱ Pause";
  timerInterval=setInterval(()=>{
    timerSeconds--;
    updateTimerDisplay();
    if(timerSeconds<=0){
      clearInterval(timerInterval);
      timerRunning=false;
      document.getElementById("timerStart").textContent="▶ Start";
      completeSession();
    }
  },1000);
});

document.getElementById("timerReset").addEventListener("click",()=>{
  clearInterval(timerInterval);
  timerRunning=false;
  const active=document.querySelector(".timer-mode-btn.active");
  timerSeconds=Number(active?.dataset.minutes||25)*60;
  updateTimerDisplay();
  document.getElementById("timerStart").textContent="▶ Start";
});

function updateTimerDisplay(){
  const mins=Math.floor(timerSeconds/60);
  const secs=timerSeconds%60;
  document.getElementById("timerDisplay").textContent=String(mins).padStart(2,"0")+":"+String(secs).padStart(2,"0");
  document.getElementById("timerCaption").textContent=timerRunning?"Stay focused.":"You can do this!";
  document.title=timerRunning?`${mins}:${String(secs).padStart(2,"0")} · StudyFlow`:"StudyFlow";
}

function completeSession(){
  const active=document.querySelector(".timer-mode-btn.active");
  const minutes=Number(active?.dataset.minutes||25);
  const subject=document.getElementById("focusSubject").value;
  state.sessions.push({
    id:uid(),
    date:localDate(),
    minutes,
    subject,
    timestamp:Date.now()
  });
  updateStreak();
  awardXP(Math.max(5,minutes));
  save();
  renderAll();
  showToast("🎉 Focus session complete!");
  if("Notification" in window&&Notification.permission==="granted"){
    try{new Notification("StudyFlow",{body:"Your focus session is complete. Great work!"});}catch(e){}
  }
}

function renderSessions(){
  const el=document.getElementById("focusSessionList");
  const today=state.sessions.filter(s=>s.date===localDate());
  el.innerHTML=today.length?today.map(s=>`
    <div class="planner-result">
      <div class="planner-time">${s.minutes} min</div>
      <div class="planner-result-content">
        <strong>${escapeHTML(getSubjectName(s.subject))}</strong>
        <small>Completed focus session</small>
      </div>
    </div>`).join(""):`<div class="empty-state">Your focus sessions will appear here.</div>`;
}

/* FLASHCARDS */

document.getElementById("addFlashcardBtn").addEventListener("click",()=>{
  document.getElementById("flashcardForm").reset();
  document.getElementById("flashcardModal").classList.add("open");
});

document.getElementById("flashcardForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.cards.push({
    id:uid(),
    subject:document.getElementById("cardSubject").value,
    question:document.getElementById("cardQuestion").value.trim(),
    answer:document.getElementById("cardAnswer").value.trim(),
    reviews:0
  });
  save();
  checkBadges();
  document.getElementById("flashcardModal").classList.remove("open");
  selectedFlashcard=state.cards.length-1;
  renderAll();
  showToast("Flashcard saved!");
});

function getFilteredCards(){
  const subject=document.getElementById("flashcardSubject").value;
  return state.cards.filter(c=>subject==="all"||c.subject===subject);
}

function renderFlashcard(){
  const cards=getFilteredCards();
  selectedFlashcard=Math.max(0,Math.min(selectedFlashcard,cards.length-1));
  flashcardFlipped=false;
  const card=cards[selectedFlashcard];
  const el=document.getElementById("flashcard");
  if(!card){
    el.classList.remove("flipped");
    document.getElementById("flashQuestion").textContent="No flashcards yet.";
    document.getElementById("flashHint").textContent="Add cards to begin.";
    document.getElementById("flashcardCounter").textContent="0 / 0";
    return;
  }
  el.classList.remove("flipped");
  document.getElementById("flashQuestion").textContent=card.question;
  document.getElementById("flashHint").textContent="Click the card to reveal the answer.";
  document.getElementById("flashcardCounter").textContent=`${selectedFlashcard+1} / ${cards.length}`;
}

document.getElementById("flashcard").addEventListener("click",()=>{
  const cards=getFilteredCards();
  const card=cards[selectedFlashcard];
  if(!card)return;
  flashcardFlipped=!flashcardFlipped;
  const el=document.getElementById("flashcard");
  el.classList.toggle("flipped",flashcardFlipped);
  document.getElementById("flashQuestion").textContent=flashcardFlipped?card.answer:card.question;
  document.getElementById("flashHint").textContent=flashcardFlipped?"ANSWER":"Click the card to reveal the answer.";
});

document.getElementById("nextCard").addEventListener("click",()=>{
  const cards=getFilteredCards();
  if(!cards.length)return;
  selectedFlashcard=(selectedFlashcard+1)%cards.length;
  renderFlashcard();
});

document.getElementById("previousCard").addEventListener("click",()=>{
  const cards=getFilteredCards();
  if(!cards.length)return;
  selectedFlashcard=(selectedFlashcard-1+cards.length)%cards.length;
  renderFlashcard();
});

document.getElementById("shuffleCards").addEventListener("click",()=>{
  const cards=getFilteredCards();
  if(!cards.length)return;
  selectedFlashcard=Math.floor(Math.random()*cards.length);
  renderFlashcard();
});

document.getElementById("markRemembered").addEventListener("click",()=>{
  const cards=getFilteredCards();
  const card=cards[selectedFlashcard];
  if(!card)return;
  card.reviews=(card.reviews||0)+1;
  awardXP(2);
  save();
  showToast("Nice! Keep practising.");
});

document.getElementById("markReview").addEventListener("click",()=>{
  const cards=getFilteredCards();
  const card=cards[selectedFlashcard];
  if(!card)return;
  card.reviews=(card.reviews||0)+1;
  save();
  showToast("Saved for more practice.");
});

function renderFlashcardList(){
  const el=document.getElementById("flashcardList");
  el.innerHTML=state.cards.length?state.cards.map(c=>`
    <div class="flashcard-list-item">
      <strong>${escapeHTML(c.question)}</strong>
      <div class="task-meta">${escapeHTML(getSubjectName(c.subject))} · Reviewed ${c.reviews||0} times</div>
      <button class="small-btn" data-delete-card="${c.id}">Delete</button>
    </div>`).join(""):`<div class="empty-state">You haven't added any flashcards.</div>`;
  el.querySelectorAll("[data-delete-card]").forEach(btn=>{
    btn.onclick=()=>{
      if(!confirm("Delete this flashcard?"))return;
      state.cards=state.cards.filter(c=>c.id!==btn.dataset.deleteCard);
      selectedFlashcard=0;
      save();
      renderAll();
    };
  });
}

/* SUBJECTS */

document.getElementById("addSubjectBtn").addEventListener("click",()=>{
  document.getElementById("subjectForm").reset();
  document.getElementById("subjectModal").classList.add("open");
});

document.getElementById("subjectForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=document.getElementById("subjectName").value.trim();
  if(state.subjects.some(s=>s.name.toLowerCase()===name.toLowerCase())){
    showToast("That subject already exists.");
    return;
  }
  state.subjects.push({
    id:uid(),
    name,
    color:document.getElementById("subjectColor").value,
    mastery:1
  });
  save();
  document.getElementById("subjectModal").classList.remove("open");
  renderAll();
  showToast("Subject added!");
});

function changeMastery(id,value){
  const subject=state.subjects.find(s=>s.id===id);
  if(!subject)return;
  subject.mastery=value;
  save();
  renderSubjects();
}

function renderSubjects(){
  const el=document.getElementById("subjectList");
  el.innerHTML=state.subjects.map(s=>{
    const tasks=state.tasks.filter(t=>t.subject===s.id);
    const completed=tasks.filter(t=>t.done).length;
    const sessions=state.sessions.filter(t=>t.subject===s.id);
    const mins=sessions.reduce((a,b)=>a+b.minutes,0);
    return `
    <div class="subject-card">
      <div class="subject-card-header">
        <h3><span class="subject-color-dot" style="background:${s.color}"></span>${escapeHTML(s.name)}</h3>
        <button class="small-btn" data-delete-subject="${s.id}">Delete</button>
      </div>
      <p>${completed}/${tasks.length} tasks completed</p>
      <p>${mins} study minutes</p>
      <h4>Confidence level</h4>
      <div class="mastery-controls">
        ${[1,2,3,4,5].map(n=>`<button class="mastery-btn ${s.mastery===n?"selected":""}" data-mastery="${s.id}|${n}">${n}</button>`).join("")}
      </div>
      <small style="color:var(--muted)">1 = beginning · 5 = confident</small>
    </div>`;
  }).join("");
  el.querySelectorAll("[data-mastery]").forEach(btn=>{
    btn.onclick=()=>{
      const [id,value]=btn.dataset.mastery.split("|");
      changeMastery(id,Number(value));
    };
  });
  el.querySelectorAll("[data-delete-subject]").forEach(btn=>{
    btn.onclick=()=>{
      const id=btn.dataset.deleteSubject;
      if(state.subjects.length<=1){
        showToast("You need at least one subject.");
        return;
      }
      if(!confirm("Delete this subject? Existing tasks will remain."))return;
      state.subjects=state.subjects.filter(s=>s.id!==id);
      save();
      renderAll();
    };
  });
}

/* PET */

function renderPet(){
  const lv=level();
  const xp=xpInLevel();
  const petName=state.petName||"Study Buddy";
  const pet=state.pet||"🐱";
  const petNameEl=document.getElementById("petNameDisplay");
  if(petNameEl)petNameEl.textContent=petName;
  document.getElementById("petDisplay").textContent=pet;
  document.getElementById("petLevelDisplay").textContent="Level "+lv;
  document.getElementById("petXPBar").style.width=xp+"%";
  document.getElementById("petXPText").textContent=xp+" / 100 XP";
  document.getElementById("petMessage").textContent=lv>=10?"Your buddy is an expert learner!":lv>=5?"Your buddy is growing beautifully!":"Let's learn something new today!";
  document.getElementById("petNameInput").value=petName;

  document.getElementById("dashPet").textContent=pet;
  document.getElementById("dashPetName").textContent=petName;
  document.getElementById("dashPetLevel").textContent="Level "+lv;
  document.getElementById("dashXPBar").style.width=xp+"%";
  document.getElementById("dashXPText").textContent=xp+" / 100 XP";
  document.getElementById("sidePet").textContent=pet;
  document.getElementById("sidePetName").textContent=petName;
  document.getElementById("sideLevel").textContent="Level "+lv;

  document.getElementById("petOptions").innerHTML=PETS.map(p=>{
    const unlocked=lv>=p.level||state.unlockedPets.includes(p.emoji);
    return `
      <button class="pet-option ${pet===p.emoji?"selected":""}" ${unlocked?"":"disabled"} data-pet="${p.emoji}" title="${unlocked?p.name:"Unlock at level "+p.level}">
        ${p.emoji}
      </button>`;
  }).join("");
  document.getElementById("petOptions").querySelectorAll("[data-pet]").forEach(btn=>{
    btn.onclick=()=>{
      state.pet=btn.dataset.pet;
      if(!state.unlockedPets.includes(state.pet))state.unlockedPets.push(state.pet);
      save();
      renderAll();
    };
  });

  const rewards=[
    {name:"Rabbit",emoji:"🐰",level:2},
    {name:"Panda",emoji:"🐼",level:3},
    {name:"Fox",emoji:"🦊",level:4},
    {name:"Frog",emoji:"🐸",level:5},
    {name:"Bear",emoji:"🐻",level:6},
    {name:"Unicorn",emoji:"🦄",level:8},
    {name:"Dragon",emoji:"🐲",level:10}
  ];
  document.getElementById("petRewards").innerHTML=rewards.map(r=>`
    <div class="reward-item">
      <span>${r.emoji} ${r.name}</span>
      <span>${lv>=r.level?"Unlocked":"Level "+r.level}</span>
    </div>`).join("");
}

document.getElementById("savePetName").addEventListener("click",()=>{
  const name=document.getElementById("petNameInput").value.trim();
  if(!name)return;
  state.petName=name.slice(0,20);
  save();
  renderAll();
  showToast("Pet name saved!");
});

/* ACHIEVEMENTS */

function renderBadges(){
  const unlocked=state.badges.length;
  document.getElementById("badgeCount").textContent=unlocked;
  document.getElementById("badgeXP").textContent=state.xp;
  document.getElementById("analyticsBadges").textContent=unlocked;
  document.getElementById("badgeList").innerHTML=BADGES.map(b=>{
    const has=state.badges.includes(b.id);
    return `
      <div class="badge-card ${has?"":"locked"}">
        <div class="badge-emoji">${b.emoji}</div>
        <h4>${escapeHTML(b.name)}</h4>
        <p>${escapeHTML(b.desc)}</p>
        <small>${has?"Unlocked":"Locked"}</small>
      </div>`;
  }).join("");
}

/* ANALYTICS */

function renderAnalytics(){
  const tasks=getCompletedTasks().length;
  const mins=totalMinutes();
  document.getElementById("analyticsTasks").textContent=tasks;
  document.getElementById("analyticsMinutes").textContent=mins;
  document.getElementById("analyticsSubjects").textContent=state.subjects.length;
  document.getElementById("analyticsBadges").textContent=state.badges.length;

  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date();
    d.setDate(d.getDate()-i);
    const date=localDate(d);
    const minutes=state.sessions.filter(s=>s.date===date).reduce((a,b)=>a+b.minutes,0);
    days.push({date,label:d.toLocaleDateString(undefined,{weekday:"short"}),minutes});
  }
  const max=Math.max(1,...days.map(d=>d.minutes));
  document.getElementById("weeklyChart").innerHTML=days.map(d=>`
    <div class="chart-bar-item">
      <span>${d.minutes}m</span>
      <div class="chart-bar" style="height:${Math.max(3,d.minutes/max*75)}%"></div>
      <small>${d.label}</small>
    </div>`).join("");

  const subjects=state.subjects.map(s=>({
    name:s.name,
    mins:state.sessions.filter(x=>x.subject===s.id).reduce((a,b)=>a+b.minutes,0)
  })).filter(s=>s.mins>0).sort((a,b)=>b.mins-a.mins);

  document.getElementById("subjectChart").innerHTML=subjects.length?subjects.map(s=>`
    <div class="planner-result">
      <div class="planner-result-content"><strong>${escapeHTML(s.name)}</strong></div>
      <div class="planner-time">${s.mins} min</div>
    </div>`).join(""):`<div class="empty-state">Start studying to see your subject breakdown.</div>`;

  renderWeeklyReport();
}

function renderWeeklyReport(){
  const week=[];
  for(let i=6;i>=0;i--){
    const d=new Date();
    d.setDate(d.getDate()-i);
    const date=localDate(d);
    const mins=state.sessions.filter(s=>s.date===date).reduce((a,b)=>a+b.minutes,0);
    const tasks=state.tasks.filter(t=>t.done&&localDate(new Date(t.completedAt||t.created))===date).length;
    week.push({date,mins,tasks});
  }
  const mins=week.reduce((a,b)=>a+b.mins,0);
  const tasks=week.reduce((a,b)=>a+b.tasks,0);
  const active=week.filter(d=>d.mins>0).length;
  document.getElementById("weeklyReport").innerHTML=`
    <div class="goal-details"><span>Minutes studied</span><strong>${mins} min</strong></div>
    <div class="goal-details"><span>Tasks completed</span><strong>${tasks}</strong></div>
    <div class="goal-details"><span>Study days</span><strong>${active}/7</strong></div>
    <div class="goal-details"><span>Average daily time</span><strong>${Math.round(mins/7)} min</strong></div>
  `;
}

document.getElementById("weeklyReportBtn").addEventListener("click",()=>{
  renderWeeklyReport();
  showToast("Your weekly report is updated.");
});

/* DASHBOARD */

function renderDashboard(){
  const completed=getCompletedTasks().length;
  const minutes=totalMinutes();
  const todayMins=completedTodayMinutes();
  const percent=Math.min(100,Math.round(todayMins/Math.max(1,state.goal)*100));
  document.getElementById("dashCompleted").textContent=completed;
  document.getElementById("dashHours").textContent=Math.floor(minutes/60)+"h "+minutes%60+"m";
  document.getElementById("dashStreak").textContent=(state.streak||0)+" days";
  document.getElementById("dashGoal").textContent=todayMins+" / "+state.goal+" min";
  document.getElementById("goalPercent").textContent=percent+"%";
  document.getElementById("goalCircle").style.background=`conic-gradient(var(--accent) ${percent*3.6}deg, var(--border) 0deg)`;
  document.getElementById("goalTimeText").textContent=todayMins+" min";
  document.getElementById("goalTargetText").textContent=state.goal+" min";

  const today=getTodayTasks().filter(t=>!t.done);
  const el=document.getElementById("dashTasks");
  el.innerHTML=today.length?today.slice(0,5).map(taskHTML).join(""):`<div class="empty-state"><span>✨</span>No unfinished tasks due today.</div>`;
  bindTaskHTML(el);

  const upcoming=state.tasks.filter(t=>!t.done&&t.date).concat(state.tasks.filter(t=>!t.done&&t.date&&t.date>=localDate())).filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const dl=document.getElementById("dashDeadlines");
  dl.innerHTML=upcoming.length?upcoming.map(t=>`
    <div class="planner-result">
      <div class="planner-time">${escapeHTML(t.date)}</div>
      <div class="planner-result-content">
        <strong>${escapeHTML(t.title)}</strong>
        <small>${escapeHTML(getSubjectName(t.subject))}</small>
      </div>
    </div>`).join(""):`<div class="empty-state">No upcoming deadlines.</div>`;
}

/* SETTINGS */

function renderSettingsSubjects(){
  const el=document.getElementById("settingsSubjects");
  el.innerHTML=state.subjects.map(s=>`
    <div class="reward-item">
      <span>${escapeHTML(s.name)}</span>
      <span style="color:var(--muted)">${state.tasks.filter(t=>t.subject===s.id).length} tasks</span>
    </div>`).join("");
}

document.getElementById("saveProfile").addEventListener("click",()=>{
  const name=document.getElementById("profileName").value.trim();
  const initial=document.getElementById("profileInitial").value.trim();
  state.profile.name=name||"Student";
  state.profile.initial=initial||state.profile.name.charAt(0).toUpperCase();
  save();
  renderAll();
  showToast("Profile saved!");
});

document.getElementById("saveGoal").addEventListener("click",()=>{
  state.goal=Math.max(5,Number(document.getElementById("dailyGoalInput").value)||60);
  save();
  renderAll();
  showToast("Daily goal updated!");
});

const ACCENTS={
  purple:"#7666e8",
  blue:"#3995e8",
  pink:"#e76baf",
  green:"#48ad83",
  orange:"#e69a4a"
};

document.getElementById("saveAppearance").addEventListener("click",()=>{
  state.theme=document.getElementById("themeSelect").value;
  state.accent=document.getElementById("accentSelect").value;
  save();
  applyAppearance();
  showToast("Appearance updated!");
});

function applyAppearance(){
  document.body.classList.toggle("dark",state.theme==="dark");
  document.documentElement.style.setProperty("--accent",ACCENTS[state.accent]||ACCENTS.purple);
  document.documentElement.style.setProperty("--accent-soft",state.theme==="dark"?"#33304b":({
    purple:"#f0edff",blue:"#e7f3ff",pink:"#fff0f8",green:"#e6f7ef",orange:"#fff1e4"
  }[state.accent]||"#f0edff"));
  document.getElementById("themeSelect").value=state.theme;
  document.getElementById("accentSelect").value=state.accent;
}

function renderProfile(){
  const name=state.profile.name||"Student";
  document.getElementById("topGreeting").textContent="Hello, "+name+"!";
  document.getElementById("welcomeTitle").textContent="Let's make today count, "+name+" ✨";
  document.getElementById("profileAvatar").textContent=state.profile.initial||name.charAt(0).toUpperCase();
  document.getElementById("profileName").value=name;
  document.getElementById("profileInitial").value=state.profile.initial||"S";
  document.getElementById("dailyGoalInput").value=state.goal||60;
}

document.getElementById("enableNotifications").addEventListener("click",async()=>{
  if(!("Notification" in window)){
    showToast("Notifications are not supported in this browser.");
    return;
  }
  const permission=await Notification.requestPermission();
  showToast(permission==="granted"?"Notifications enabled!":permission==="denied"?"Notifications blocked in browser settings.":"Permission not granted.");
});

document.getElementById("notificationBtn").addEventListener("click",()=>{
  const tasks=state.tasks.filter(t=>!t.done&&t.date&&t.date<=localDate());
  showToast(tasks.length?tasks.length+" task(s) due today or overdue.":"You're up to date!");
});

/* BACKUP */

document.getElementById("exportData").addEventListener("click",exportData);

function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="StudyFlow-backup-"+localDate()+".json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup downloaded!");
}

document.getElementById("importData").addEventListener("change",e=>{
  const file=e.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const imported=JSON.parse(reader.result);
      if(!imported||typeof imported!=="object"||!Array.isArray(imported.tasks)||!Array.isArray(imported.subjects)){
        throw new Error("Invalid file");
      }
      if(!confirm("Restore this backup? Current data will be replaced."))return;
      state={...blankState(),...imported};
      save();
      renderAll();
      showToast("Backup restored!");
    }catch(err){
      showToast("Invalid backup file.");
    }
  };
  reader.readAsText(file);
  e.target.value="";
});

/* INSTALL */

window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  deferredInstall=e;
});

document.getElementById("installApp").addEventListener("click",async()=>{
  if(!deferredInstall){
    showToast("If install isn't available, use your browser's Install or Add to Home Screen option.");
    return;
  }
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall=null;
});

/* SELECT MENUS */

function populateSelects(){
  const options=state.subjects.map(s=>`<option value="${s.id}">${escapeHTML(s.name)}</option>`).join("");
  ["taskSubject","examSubject","cardSubject","focusSubject"].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const previous=el.value;
    el.innerHTML=options;
    if(state.subjects.some(s=>s.id===previous))el.value=previous;
  });

  const fc=document.getElementById("flashcardSubject");
  const prev=fc.value;
  fc.innerHTML=`<option value="all">All subjects</option>`+options;
  if([...fc.options].some(o=>o.value===prev))fc.value=prev;
}

/* DATE AND QUOTE */

function renderDate(){
  document.getElementById("topDate").textContent=new Date().toLocaleDateString(undefined,{
    weekday:"long",month:"long",day:"numeric",year:"numeric"
  });
  document.getElementById("focusQuote").textContent=QUOTES[Math.floor(Math.random()*QUOTES.length)];
}

/* RENDER ALL */

function renderAll(){
  populateSelects();
  renderProfile();
  renderDashboard();
  renderTasks();
  renderCalendar();
  renderExams();
  renderSessions();
  renderFlashcard();
  renderFlashcardList();
  renderSubjects();
  renderPet();
  renderBadges();
  renderAnalytics();
  renderSettingsSubjects();
}

function init(){
  if(!state.subjects.length)state.subjects=DEFAULT_SUBJECTS.map(x=>({...x}));
  if(!state.goal)state.goal=60;
  if(!state.unlockedPets)state.unlockedPets=["🐱","🐶"];
  if(!state.badges)state.badges=[];
  applyAppearance();
  renderDate();
  renderAll();
  checkBadges();
  save();
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js").catch(()=>{});
  }
}

init();