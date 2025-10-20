// app.js
// start date for week 1 unlock (your requirement): Monday 20 Oct 2025
const START_DATE = new Date("2025-10-20T00:00:00");

const TOTAL_WEEKS = 20; // change to 28 if needed
const QUESTIONS_PER_WEEK = 180; // 90 bio, 45 chem, 45 phys (your plan)

const enterBtn = document.getElementById('enterBtn');
const studentNameInput = document.getElementById('studentName');
const enterSection = document.getElementById('enterSection');
const weeksSection = document.getElementById('weeksSection');
const weeksContainer = document.getElementById('weeksContainer');
const userBadge = document.getElementById('userBadge');

const examSection = document.getElementById('examSection');
const examTitle = document.getElementById('examTitle');
const questionArea = document.getElementById('questionArea');
const backToWeeks = document.getElementById('backToWeeks');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const doneBtn = document.getElementById('doneBtn');

let currentUser = null;
let loadedQuestions = []; // questions for current week
let currIndex = 0;
let answers = []; // user chosen options

// Timer variables
let examTimer;
let timeRemaining = 180 * 60; // 180 minutes (3 hours) in seconds

// Timer functions
function startTimer() {
  clearInterval(examTimer);
  timeRemaining = 180 * 60; // 3 hours in seconds
  updateTimerDisplay();
  
  examTimer = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    
    // Warning at 30 minutes
    if (timeRemaining === 30 * 60) {
      alert("⚠️ 30 minutes remaining!");
    }
    
    // Warning at 10 minutes  
    if (timeRemaining === 10 * 60) {
      alert("🚨 10 minutes remaining! Hurry up!");
    }
    
    // Auto submit at 0
    if (timeRemaining <= 0) {
      clearInterval(examTimer);
      alert("⏰ Time's up! Submitting your exam automatically...");
      submitExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  
  document.getElementById('timeDisplay').textContent = 
    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
  // Color change for warnings
  const timerElement = document.getElementById('timer');
  if (timeRemaining <= 10 * 60) { // 10 minutes
    timerElement.style.background = '#ffcccc';
    timerElement.style.color = '#cc0000';
  } else if (timeRemaining <= 30 * 60) { // 30 minutes
    timerElement.style.background = '#fff0cc';
    timerElement.style.color = '#cc6600';
  } else {
    timerElement.style.background = '#f0f8ff';
    timerElement.style.color = '#000';
  }
}

function stopTimer() {
  clearInterval(examTimer);
}

// anonymous auth when entering (so we can have UID if needed)
async function signInAnon(){
  try{
    const res = await auth.signInAnonymously();
    return res.user;
  }catch(e){
    console.warn("Anonymous sign-in failed:", e);
    return null;
  }
}

enterBtn.addEventListener('click', async () => {
  const name = studentNameInput.value.trim();
  if(!name){ alert("Enter your name"); return; }

  // save in session
  sessionStorage.setItem('studentName', name);

  // show badge
  userBadge.textContent = `Hello, ${name}`;
  userBadge.classList.remove('hidden');

  // sign in anonymously to get uid
  currentUser = await signInAnon();
  if(currentUser){
    // save name in firestore under collection 'students' with doc = uid
    db.collection('students').doc(currentUser.uid).set({
      name,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // hide enter, show weeks
  enterSection.classList.add('hidden');
  renderWeeks();
  weeksSection.classList.remove('hidden');
});

function weeksUnlockedCount(){
  const now = new Date();
  const diff = now - START_DATE;
  if(diff < 0) return 0;
  const weeks = Math.floor(diff / (7*24*60*60*1000)) + 1;
  return Math.max(0, Math.min(weeks, TOTAL_WEEKS));
}

function isWeekUnlocked(weekNumber){
  return weekNumber <= weeksUnlockedCount();
}

function renderWeeks(){
  weeksContainer.innerHTML = '';
  for(let i=1;i<=TOTAL_WEEKS;i++){
    const card = document.createElement('div');
    card.className = 'week-card ' + (isWeekUnlocked(i) ? 'unlocked' : 'locked');
    card.innerHTML = `<h3>Week ${i}</h3>
                      <p>${i<=10? 'PUC 1 topics' : (i<=20? 'PUC 2 topics' : 'Revision')}</p>`;
    const btn = document.createElement('button');
    btn.textContent = isWeekUnlocked(i) ? 'Start Exam' : 'Locked';
    if(isWeekUnlocked(i)){
      btn.addEventListener('click', ()=> loadWeek(i));
    } else {
      btn.disabled = true;
    }
    card.appendChild(btn);
    weeksContainer.appendChild(card);
  }
}

// dynamic load questions file: expects file at `questions/week{n}.js`
// which should set global `week{n}Questions`
function loadWeek(weekNumber){
  // clear previous
  loadedQuestions = [];
  answers = [];
  currIndex = 0;

  examTitle.textContent = `Week ${weekNumber} - Exam`;
  weeksSection.classList.add('hidden');
  examSection.classList.remove('hidden');

  // Start timer
  startTimer();

  // load script
  const scriptId = 'weekScript';
  const old = document.getElementById(scriptId);
  if(old) old.remove();

  const s = document.createElement('script');
  s.id = scriptId;
  s.src = `questions/week${weekNumber}.js`;
  s.onload = () => {
    // after load, the file must define global variable `week{weekNumber}Questions`
    const varName = `week${weekNumber}Questions`;
    // eslint-disable-next-line no-undef
    if(window[varName] && Array.isArray(window[varName]) && window[varName].length>=1){
      loadedQuestions = window[varName].slice(); // copy
      // init answers
      answers = new Array(loadedQuestions.length).fill(null);
      currIndex = 0;
      renderQuestion(currIndex);
    } else {
      questionArea.innerHTML = `<p style="color:#f88">Questions file not found or invalid. Place questions/week${weekNumber}.js and set ${varName} array.</p>`;
    }
  };
  s.onerror = () => {
    questionArea.innerHTML = `<p style="color:#f88">Failed to load questions/week${weekNumber}.js</p>`;
  };
  document.body.appendChild(s);
}

function renderQuestion(index){
  if(!loadedQuestions || loadedQuestions.length===0){
    questionArea.innerHTML = `<p>No questions loaded.</p>`;
    return;
  }
  const q = loadedQuestions[index];
  questionArea.innerHTML = `
    <div class="q-card">
      <div><strong>Q ${index+1}.</strong> ${escapeHtml(q.question)}</div>
      <div class="options">
        ${q.options.map((opt,i)=>`<div class="opt ${answers[index]===i? 'selected':''}" data-idx="${i}">${String.fromCharCode(65+i)}. ${escapeHtml(opt)}</div>`).join('')}
      </div>
    </div>
    <div style="text-align:center"><small>Question ${index+1} of ${loadedQuestions.length}</small></div>
  `;
  // attach click handlers on options
  document.querySelectorAll('.opt').forEach(el=>{
    el.addEventListener('click', ()=>{
      const idx = parseInt(el.getAttribute('data-idx'));
      answers[index] = idx;
      renderQuestion(index);
    });
  });
}

// controls
document.getElementById('prevQ').addEventListener('click', ()=>{
  if(currIndex>0){ currIndex--; renderQuestion(currIndex); }
});
document.getElementById('nextQ').addEventListener('click', ()=>{
  if(currIndex < loadedQuestions.length-1){ currIndex++; renderQuestion(currIndex); }
});
document.getElementById('skipQ').addEventListener('click', ()=>{
  answers[currIndex] = null;
  if(currIndex < loadedQuestions.length-1){ currIndex++; renderQuestion(currIndex); }
});
backToWeeks.addEventListener('click', ()=>{
  stopTimer();
  examSection.classList.add('hidden');
  weeksSection.classList.remove('hidden');
});

// submit
document.getElementById('submitExam').addEventListener('click', submitExam);

function submitExam(){
  stopTimer();
  
  if(!confirm("Submit your answers? You cannot change after submit.")) return;
  // calculate
  let correct=0, wrong=0, skipped=0;
  loadedQuestions.forEach((q, i)=>{
    const chosenIndex = answers[i];
    if(chosenIndex === null || chosenIndex === undefined){ skipped++; return; }
    const chosenText = q.options[chosenIndex];
    if(chosenText === q.answer) correct++;
    else wrong++;
  });
  const attempted = correct + wrong;
  const marks = correct*4 + wrong*(-1);
  const percentage = +(marks/720*100).toFixed(2); // total marks 720

  // show result
  examSection.classList.add('hidden');
  resultSection.classList.remove('hidden');
  resultContent.innerHTML = `
    <p>Name: ${escapeHtml(sessionStorage.getItem('studentName')||'Unknown')}</p>
    <p>Correct: ${correct}</p>
    <p>Wrong: ${wrong}</p>
    <p>Skipped: ${skipped}</p>
    <p>Attempted: ${attempted}</p>
    <p>Marks: ${marks}</p>
    <p>Percentage: ${percentage}%</p>
  `;

  // save to Firestore if auth available
  const uid = auth.currentUser ? auth.currentUser.uid : null;
  const name = sessionStorage.getItem('studentName') || 'Unknown';
  const payload = {
    name, week: parseInt(examTitle.textContent.replace(/[^0-9]/g,'')),
    attempted, correct, wrong, skipped, marks, percentage,
    ts: firebase.firestore.FieldValue.serverTimestamp()
  };
  if(uid){
    db.collection('results').add(payload).then(()=> console.log('Saved')).catch(e=>console.error(e));
    // also update student's latest record
    db.collection('students').doc(uid).set({
      name, lastResult: payload
    }, { merge: true });
  } else {
    // still try to save without uid
    db.collection('results').add(payload).then(()=> console.log('Saved (no uid)')).catch(e=>console.error(e));
  }
}

doneBtn.addEventListener('click', ()=>{
  stopTimer();
  resultSection.classList.add('hidden');
  weeksSection.classList.remove('hidden');
});

// helper
function escapeHtml(s){ return String(s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'})[c]); }  weeksSection.classList.add('hidden');
  examSection.classList.remove('hidden');

  // load script
  const scriptId = 'weekScript';
  const old = document.getElementById(scriptId);
  if(old) old.remove();

  const s = document.createElement('script');
  s.id = scriptId;
  s.src = `questions/week${weekNumber}.js`;
  s.onload = () => {
    // after load, the file must define global variable `week{weekNumber}Questions`
    const varName = `week${weekNumber}Questions`;
    // eslint-disable-next-line no-undef
    if(window[varName] && Array.isArray(window[varName]) && window[varName].length>=1){
      loadedQuestions = window[varName].slice(); // copy
      // init answers
      answers = new Array(loadedQuestions.length).fill(null);
      currIndex = 0;
      renderQuestion(currIndex);
    } else {
      questionArea.innerHTML = `<p style="color:#f88">Questions file not found or invalid. Place questions/week${weekNumber}.js and set ${varName} array.</p>`;
    }
  };
  s.onerror = () => {
    questionArea.innerHTML = `<p style="color:#f88">Failed to load questions/week${weekNumber}.js</p>`;
  };
  document.body.appendChild(s);
}

function renderQuestion(index){
  if(!loadedQuestions || loadedQuestions.length===0){
    questionArea.innerHTML = `<p>No questions loaded.</p>`;
    return;
  }
  const q = loadedQuestions[index];
  questionArea.innerHTML = `
    <div class="q-card">
      <div><strong>Q ${index+1}.</strong> ${escapeHtml(q.question)}</div>
      <div class="options">
        ${q.options.map((opt,i)=>`<div class="opt ${answers[index]===i? 'selected':''}" data-idx="${i}">${String.fromCharCode(65+i)}. ${escapeHtml(opt)}</div>`).join('')}
      </div>
    </div>
    <div style="text-align:center"><small>Question ${index+1} of ${loadedQuestions.length}</small></div>
  `;
  // attach click handlers on options
  document.querySelectorAll('.opt').forEach(el=>{
    el.addEventListener('click', ()=>{
      const idx = parseInt(el.getAttribute('data-idx'));
      answers[index] = idx;
      renderQuestion(index);
    });
  });
}

// controls
document.getElementById('prevQ').addEventListener('click', ()=>{
  if(currIndex>0){ currIndex--; renderQuestion(currIndex); }
});
document.getElementById('nextQ').addEventListener('click', ()=>{
  if(currIndex < loadedQuestions.length-1){ currIndex++; renderQuestion(currIndex); }
});
document.getElementById('skipQ').addEventListener('click', ()=>{
  answers[currIndex] = null;
  if(currIndex < loadedQuestions.length-1){ currIndex++; renderQuestion(currIndex); }
});
backToWeeks.addEventListener('click', ()=>{
  examSection.classList.add('hidden');
  weeksSection.classList.remove('hidden');
});

// submit
document.getElementById('submitExam').addEventListener('click', submitExam);

function submitExam(){
  if(!confirm("Submit your answers? You cannot change after submit.")) return;
  // calculate
  let correct=0, wrong=0, skipped=0;
  loadedQuestions.forEach((q, i)=>{
    const chosenIndex = answers[i];
    if(chosenIndex === null || chosenIndex === undefined){ skipped++; return; }
    const chosenText = q.options[chosenIndex];
    if(chosenText === q.answer) correct++;
    else wrong++;
  });
  const attempted = correct + wrong;
  const marks = correct*4 + wrong*(-1);
  const percentage = +(marks/720*100).toFixed(2); // total marks 720

  // show result
  examSection.classList.add('hidden');
  resultSection.classList.remove('hidden');
  resultContent.innerHTML = `
    <p>Name: ${escapeHtml(sessionStorage.getItem('studentName')||'Unknown')}</p>
    <p>Correct: ${correct}</p>
    <p>Wrong: ${wrong}</p>
    <p>Skipped: ${skipped}</p>
    <p>Attempted: ${attempted}</p>
    <p>Marks: ${marks}</p>
    <p>Percentage: ${percentage}%</p>
  `;

  // save to Firestore if auth available
  const uid = auth.currentUser ? auth.currentUser.uid : null;
  const name = sessionStorage.getItem('studentName') || 'Unknown';
  const payload = {
    name, week: parseInt(examTitle.textContent.replace(/[^0-9]/g,'')),
    attempted, correct, wrong, skipped, marks, percentage,
    ts: firebase.firestore.FieldValue.serverTimestamp()
  };
  if(uid){
    db.collection('results').add(payload).then(()=> console.log('Saved')).catch(e=>console.error(e));
    // also update student's latest record
    db.collection('students').doc(uid).set({
      name, lastResult: payload
    }, { merge: true });
  } else {
    // still try to save without uid
    db.collection('results').add(payload).then(()=> console.log('Saved (no uid)')).catch(e=>console.error(e));
  }
}

doneBtn.addEventListener('click', ()=>{
  resultSection.classList.add('hidden');
  weeksSection.classList.remove('hidden');
});

// helper
function escapeHtml(s){ return String(s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'})[c]); }
