
const $ = id => document.getElementById(id);

const todayKey = () => new Date().toISOString().slice(0,10);
const dateKey = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
};

const defaultState = {
  profile:{name:"",school:"",goal:60},
  tasks:[],
  cards:[],
  sessions:[],
  streak:0,
  lastStudyDate:"",
  xp:0,
  petName:"Study Buddy",
  dark:false,
  dailyGoal:60
};

let state;
try {
  state = {...defaultState,...JSON.parse(localStorage.getItem("studyflow2")||"{}")};
  state.profile={...defaultState.profile,...state.profile};
  state.tasks=state.tasks||[];
  state.cards=state.cards||[];
  state.sessions=state.sessions||[];
} catch {
  state={...defaultState};
}

function save(){
  localStorage.setItem("studyflow2",JSON.stringify(state));
  renderAll();
}

function scrollToSection(id){
  document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
}
window.scrollToSection=scrollToSection;

const quotes=[
  ["Small steps every day lead to big results.","Make today count."],
  ["You don't have to be perfect. Just keep learning.","Progress is progress."],
  ["Your future self will thank you.","Keep going."],
  ["Every page you study is a step forward.","You've got this."],
  ["Dream big. Study smart. Be kind to yourself.","One step at a time."],
  ["Consistency is more powerful than perfection.","Stay curious."]
];

function showQuote(){
  const q=quotes[Math.floor(Math.random()*quotes.length)];
  $("quote").textContent=q[0];
  $("quoteAuthor").textContent=q[1];
}

function taskAdd(e){
  e.preventDefault();
  const name=$("taskName").value.trim();
  if(!name)return;
  state.tasks.push({
    id:Date.now()+Math.random(),
    name,
    subject:$("taskSubject").value,
    type:$("taskType").value,
    date:$("taskDate").value,
    priority:$("taskPriority").value,
    done:false,
    created:todayKey()
  });
  $("taskForm").reset();
  save();
}

let currentFilter="all";

function renderTasks(){
  const list=$("taskList");
  let tasks=[...state.tasks];
  if(currentFilter==="pending")tasks=tasks.filter(t=>!t.done);
  if(currentFilter==="completed")tasks=tasks.filter(t=>t.done);
  tasks.sort((a,b)=>{
    if(a.done!==b.done)return a.done?1:-1;
    if(a.date&&b.date)return a.date.localeCompare(b.date);
    if(a.date)return -1;
    if(b.date)return 1;
    return 0;
  });
  $("taskCount").textContent=state.tasks.filter(t=>!t.done).length+" remaining";
  if(!tasks.length){
    list.innerHTML='<div class="empty">Nothing here yet. Add a task to get started ✨</div>';
    return;
  }
  list.innerHTML=tasks.map(t=>`
    <div class="task-item ${t.done?"done":""}">
      <input type="checkbox" ${t.done?"checked":""} onchange="toggleTask('${t.id}')">
      <div class="task-info">
        <div class="task-title">${escapeHTML(t.name)}</div>
        <div class="task-meta">${escapeHTML(t.subject)} · ${escapeHTML(t.type)} ${t.date?"· "+t.date:""} · <span class="${t.priority==="High"?"priority-high":t.priority==="Low"?"priority-low":""}">${escapeHTML(t.priority)} priority</span></div>
      </div>
      <div class="task-actions">
        <button class="small-btn" onclick="deleteTask('${t.id}')">✕</button>
      </div>
    </div>
  `).join("");
}

function escapeHTML(s){
  return String(s).replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function toggleTask(id){
  const task=state.tasks.find(t=>String(t.id)===String(id));
  if(!task)return;
  task.done=!task.done;
  if(task.done){
    state.xp+=5;
  }
  save();
}

function deleteTask(id){
  state.tasks=state.tasks.filter(t=>String(t.id)!==String(id));
  save();
}
window.toggleTask=toggleTask;
window.deleteTask=deleteTask;

function renderCalendar(){
  const container=$("calendarWeek");
  const now=new Date();
  const start=new Date(now);
  const weekday=(start.getDay()+6)%7;
  start.setDate(start.getDate()-weekday);

  let days=[];
  for(let i=0;i<7;i++){
    let d=new Date(start);
    d.setDate(start.getDate()+i);
    days.push(d);
  }
  container.innerHTML=days.map(d=>{
    let k=dateKey(d);
    let count=state.tasks.filter(t=>t.date===k&&!t.done).length;
    return `<div class="calendar-day ${k===selectedCalendarDate?"selected":""}" onclick="selectCalendarDate('${k}')">
      <small>${d.toLocaleDateString(undefined,{weekday:"short"})}</small>
      <strong>${d.getDate()}</strong>
      <small>${count?count+" task"+(count>1?"s":""):"—"}</small>
    </div>`;
  }).join("");
  renderCalendarTasks();
}

let selectedCalendarDate=todayKey();
function selectCalendarDate(k){
  selectedCalendarDate=k;
  renderCalendar();
}
window.selectCalendarDate=selectCalendarDate;

function renderCalendarTasks(){
  const tasks=state.tasks.filter(t=>t.date===selectedCalendarDate);
  $("calendarTasks").innerHTML=`
    <h3>${selectedCalendarDate===todayKey()?"Today's schedule":selectedCalendarDate}</h3>
    ${tasks.length?tasks.map(t=>`
      <div class="calendar-event">${t.done?"✓ ":""}${escapeHTML(t.name)} · ${escapeHTML(t.subject)} · ${escapeHTML(t.type)}</div>
    `).join(""):'<div class="empty">No tasks scheduled for this day.</div>'}
  `;
}

$("weekToday").addEventListener("click",()=>{
  selectedCalendarDate=todayKey();
  renderCalendar();
});

function renderStats(){
  const completed=state.tasks.filter(t=>t.done).length;
  const minutes=state.sessions.reduce((s,x)=>s+x.minutes,0);
  $("completedStat").textContent=completed;
  $("streakStat").textContent=state.streak+" days";
  $("minutesStat").textContent=minutes;
  $("xpStat").textContent=state.xp+" XP";
}

function petLevel(){
  return Math.floor(state.xp/100)+1;
}
function petEmoji(){
  const level=petLevel();
  if(level>=10)return "🦄";
  if(level>=7)return "🐉";
  if(level>=5)return "🦊";
  if(level>=3)return "🐱";
  if(level>=2)return "🐥";
  return "🐣";
}
function renderPet(){
  let level=petLevel();
  let xpInLevel=state.xp%100;
  $("petEmoji").textContent=petEmoji();
  $("petNameDisplay").textContent=state.petName;
  $("petLevel").textContent="Level "+level;
  $("petMood").textContent=level>=10?"Your pet is legendary!":level>=5?"Your pet is thriving!":"Your pet loves learning with you!";
  $("xpBar").style.width=xpInLevel+"%";
  $("xpProgress").textContent=xpInLevel+" / 100 XP (Level "+level+")";
  const rewards=[
    {level:1,name:"🐣 Starter buddy"},
    {level:2,name:"🐥 Little chick"},
    {level:3,name:"🐱 Cat"},
    {level:5,name:"🦊 Fox"},
    {level:7,name:"🐉 Dragon"},
    {level:10,name:"🦄 Unicorn"}
  ];
  $("rewardList").innerHTML=rewards.map(r=>
    `<span class="reward ${level<r.level?"locked":""}">${r.name} ${level>=r.level?"✓":"🔒"}</span>`
  ).join("");
}

function renderAnalytics(){
  const days=[];
  const now=new Date();
  for(let i=6;i>=0;i--){
    let d=new Date(now);
    d.setDate(now.getDate()-i);
    let k=dateKey(d);
    let minutes=state.sessions.filter(s=>s.date===k).reduce((sum,s)=>sum+s.minutes,0);
    days.push({label:d.toLocaleDateString(undefined,{weekday:"short"}),minutes});
  }
  const max=Math.max(1,...days.map(d=>d.minutes));
  $("weeklyChart").innerHTML=days.map(d=>`
    <div class="bar-column">
      <div class="bar-value">${d.minutes}m</div>
      <div class="bar" style="height:${Math.max(3,d.minutes/max*100)}%"></div>
      <div class="bar-label">${d.label}</div>
    </div>
  `).join("");

  const subjects={};
  state.sessions.forEach(s=>subjects[s.subject||"General"]=(subjects[s.subject||"General"]||0)+s.minutes);
  const entries=Object.entries(subjects).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxSubject=Math.max(1,...entries.map(x=>x[1]));
  $("subjectChart").innerHTML=entries.length?entries.map(([name,m])=>`
    <div class="subject-row">
      <div>${escapeHTML(name)} · ${m} minutes</div>
      <div class="subject-line"><div class="subject-fill" style="width:${m/maxSubject*100}%"></div></div>
    </div>
  `).join(""):'<div class="empty">Complete focus sessions to see your subjects.</div>';

  let total=state.sessions.reduce((s,x)=>s+x.minutes,0);
  let goal=Number(state.profile.goal)||60;
  let todayMinutes=state.sessions.filter(s=>s.date===todayKey()).reduce((s,x)=>s+x.minutes,0);
  $("analyticsSummary").innerHTML=`
    <div class="summary-chip">📚 Total: ${total} minutes</div>
    <div class="summary-chip">🎯 Daily goal: ${todayMinutes}/${goal} minutes</div>
    <div class="summary-chip">✔ Tasks: ${state.tasks.filter(t=>t.done).length}</div>
  `;
}

function renderDeadlines(){
  const upcoming=state.tasks.filter(t=>!t.done&&t.date).sort((a,b)=>a.date.localeCompare(b.date));
  if(!upcoming.length){
    $("deadlineList").innerHTML='<div class="empty">No upcoming deadlines. Add a dated task to see it here.</div>';
    return;
  }
  $("deadlineList").innerHTML=upcoming.slice(0,10).map(t=>{
    const overdue=t.date<todayKey();
    return `<div class="deadline ${overdue?"overdue":""}">
      <div><strong>${escapeHTML(t.name)}</strong><div class="task-meta">${escapeHTML(t.subject)} · ${escapeHTML(t.type)}</div></div>
      <div>${t.date}${overdue?" ⚠️":""}</div>
    </div>`;
  }).join("");
}

function renderCards(){
  const area=$("flashcardArea");
  if(!state.cards.length){
    area.innerHTML='<div class="empty">Create your first flashcard above ✨</div>';
    return;
  }
  area.innerHTML=state.cards.map(c=>`
    <div class="flashcard" onclick="flipCard('${c.id}')">
      <div class="card-label">${escapeHTML(c.subject)} · Click to flip</div>
      <div class="card-text" id="cardText${c.id}">${escapeHTML(c.question)}</div>
      <div class="flashcard-actions">
        <button class="small-btn" onclick="event.stopPropagation();deleteCard('${c.id}')">Delete</button>
        <span class="card-label">↻ Flip</span>
      </div>
    </div>
  `).join("");
}

function flipCard(id){
  let c=state.cards.find(x=>String(x.id)===String(id));
  if(!c)return;
  c.flipped=!c.flipped;
  const el=$("cardText"+id);
  if(el)el.textContent=c.flipped?c.answer:c.question;
}
function deleteCard(id){
  state.cards=state.cards.filter(c=>String(c.id)!==String(id));
  save();
}
window.flipCard=flipCard;
window.deleteCard=deleteCard;

$("cardForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.cards.push({
    id:Date.now(),
    subject:$("cardSubject").value.trim(),
    question:$("cardQuestion").value.trim(),
    answer:$("cardAnswer").value.trim(),
    flipped:false
  });
  $("cardForm").reset();
  save();
});

$("taskForm").addEventListener("submit",taskAdd);
document.querySelectorAll(".filter").forEach(btn=>{
  btn.addEventListener("click",()=>{
    currentFilter=btn.dataset.filter;
    document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    renderTasks();
  });
});

$("profileBtn").addEventListener("click",()=>{
  $("profileName").value=state.profile.name||"";
  $("profileSchool").value=state.profile.school||"";
  $("dailyGoal").value=state.profile.goal||60;
  $("profileDialog").showModal();
});
$("closeProfile").addEventListener("click",()=>$("profileDialog").close());
$("saveProfile").addEventListener("click",()=>{
  state.profile.name=$("profileName").value.trim();
  state.profile.school=$("profileSchool").value.trim();
  state.profile.goal=Math.max(1,Number($("dailyGoal").value)||60);
  $("profileDialog").close();
  save();
});

$("petNameBtn").addEventListener("click",()=>$("petDialog").showModal());
$("closePetDialog").addEventListener("click",()=>$("petDialog").close());
$("savePetName").addEventListener("click",()=>{
  state.petName=$("newPetName").value.trim()||"Study Buddy";
  $("petDialog").close();
  save();
});

$("themeToggle").addEventListener("click",()=>{
  state.dark=!state.dark;
  save();
});

function renderTheme(){
  document.body.classList.toggle("dark",state.dark);
  $("themeToggle").textContent=state.dark?"☀️":"🌙";
}

function renderWelcome(){
  $("welcome").textContent=state.profile.name
    ?"Welcome back, "+state.profile.name+" ✨"
    :"Welcome to StudyFlow ✨";
}

let timerSeconds=25*60;
let timerRunning=false;
let timerInterval=null;
let timerSessionMinutes=25;
let timerSessionLabel="Focus session";

function updateTimer(){
  $("timerDisplay").textContent=
    String(Math.floor(timerSeconds/60)).padStart(2,"0")+":"+
    String(timerSeconds%60).padStart(2,"0");
}

document.querySelectorAll(".timer-select").forEach(btn=>{
  btn.addEventListener("click",()=>{
    stopTimer();
    timerSessionMinutes=Number(btn.dataset.minutes);
    timerSessionLabel=btn.dataset.label;
    timerSeconds=timerSessionMinutes*60;
    $("timerMode").textContent=timerSessionLabel;
    document.querySelectorAll(".timer-select").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    updateTimer();
  });
});

function stopTimer(){
  timerRunning=false;
  clearInterval(timerInterval);
  $("timerStart").textContent="▶ Start";
}

$("timerStart").addEventListener("click",()=>{
  if(timerRunning){
    stopTimer();
    return;
  }
  timerRunning=true;
  $("timerStart").textContent="⏸ Pause";
  timerInterval=setInterval(()=>{
    timerSeconds--;
    updateTimer();
    if(timerSeconds<=0){
      stopTimer();
      timerComplete();
    }
  },1000);
});
$("timerReset").addEventListener("click",()=>{
  stopTimer();
  timerSeconds=timerSessionMinutes*60;
  updateTimer();
});

function timerComplete(){
  if(timerSessionMinutes===25){
    recordStudy(25);
    alert("Focus session complete! 🎉 You earned 25 study minutes and 25 XP!");
  }else{
    alert("Break time is over! Ready for your next session?");
  }
  timerSeconds=timerSessionMinutes*60;
  updateTimer();
}

function recordStudy(minutes){
  const date=todayKey();
  state.sessions.push({date,minutes,subject:"General"});
  state.xp+=minutes;
  if(state.lastStudyDate!==date){
    const yesterday=new Date();
    yesterday.setDate(yesterday.getDate()-1);
    state.streak=state.lastStudyDate===dateKey(yesterday)?state.streak+1:1;
    state.lastStudyDate=date;
  }
  save();
}

$("notificationBtn").addEventListener("click",async()=>{
  if(!("Notification" in window)){
    alert("Notifications are not supported by this browser.");
    return;
  }
  if(Notification.permission==="granted"){
    alert("Reminders are already enabled!");
    checkReminders();
    return;
  }
  if(Notification.permission==="denied"){
    alert("Notifications are blocked by your browser settings. You can change that in browser site settings.");
    return;
  }
  const result=await Notification.requestPermission();
  if(result==="granted"){
    alert("Reminders enabled! Keep StudyFlow open to check deadlines.");
    checkReminders();
  }
});

function checkReminders(){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  const today=todayKey();
  state.tasks.filter(t=>!t.done&&t.date===today).forEach(t=>{
    const reminderKey="studyflow-reminder-"+today+"-"+t.id;
    if(!localStorage.getItem(reminderKey)){
      new Notification("StudyFlow deadline reminder",{body:t.name+" · "+t.subject});
      localStorage.setItem(reminderKey,"yes");
    }
  });
}

function renderAll(){
  renderTheme();
  renderWelcome();
  renderTasks();
  renderCalendar();
  renderStats();
  renderPet();
  renderAnalytics();
  renderDeadlines();
  renderCards();
}

showQuote();
renderAll();
updateTimer();
checkReminders();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./service-worker.js")
      .catch(err=>console.log("Service worker registration failed",err));
  });
}
