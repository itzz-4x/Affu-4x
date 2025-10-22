// ✅ Start date for week 1 unlock
const START_DATE = new Date("2025-10-20T00:00:00");
const TOTAL_WEEKS = 20;
const QUESTIONS_PER_WEEK = 180;

// 🧩 DOM elements
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
const timerDisplay = document.getElementById('timer');

let currentUser = null;
let loadedQuestions = [];
let currIndex = 0;
let answers = [];
let timerInterval;
let totalSeconds = 180 * 60; // 3 hours timer

// ✅ Firebase anonymous login
async function signInAnon() {
  try {
    const res = await auth.signInAnonymously();
    return res.user;
  } catch (e) {
    console.warn("Anonymous sign-in failed:", e);
    return null;
  }
}

// ✅ Enter button
enterBtn.addEventListener('click', async () => {
  const name = studentNameInput.value.trim();
  if (!name) {
    alert("Enter your name");
    return;
  }

  sessionStorage.setItem('studentName', name);
  userBadge.textContent = `Hello, ${name}`;
  userBadge.classList.remove('hidden');

  currentUser = await signInAnon();
  if (currentUser) {
    await db.collection('Students').doc(currentUser.uid).set({
      Name: name,
      LastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  enterSection.classList.add('hidden');
  renderWeeks();
  weeksSection.classList.remove('hidden');
});

// ✅ Week unlock logic
function weeksUnlockedCount() {
  const now = new Date();
  const diff = now - START_DATE;
  if (diff < 0) return 0;
  const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.max(0, Math.min(weeks, TOTAL_WEEKS));
}

function isWeekUnlocked(weekNumber) {
  return weekNumber <= weeksUnlockedCount();
}

function renderWeeks() {
  weeksContainer.innerHTML = '';
  for (let i = 1; i <= TOTAL_WEEKS; i++) {
    const card = document.createElement('div');
    card.className = 'week-card ' + (isWeekUnlocked(i) ? 'unlocked' : 'locked');
    card.innerHTML = `<h3>Week ${i}</h3><p>Weekly Practice Test</p>`;
    const btn = document.createElement('button');
    btn.textContent = isWeekUnlocked(i) ? 'Start Exam' : 'Locked';
    if (isWeekUnlocked(i)) {
      btn.addEventListener('click', () => loadWeek(i));
    } else {
      btn.disabled = true;
    }
    card.appendChild(btn);
    weeksContainer.appendChild(card);
  }
}

// ✅ Timer
function startTimer() {
  clearInterval(timerInterval);
  totalSeconds = 180 * 60;
  timerInterval = setInterval(() => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    timerDisplay.textContent = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      alert("⏰ Time’s up! Submitting automatically...");
      submitExam();
    }
    totalSeconds--;
  }, 1000);
}

// ✅ Load questions dynamically
function loadWeek(weekNumber) {
  loadedQuestions = [];
  answers = [];
  currIndex = 0;

  examTitle.textContent = `Week ${weekNumber} - Exam`;
  weeksSection.classList.add('hidden');
  examSection.classList.remove('hidden');

  const scriptId = 'weekScript';
  const old = document.getElementById(scriptId);
  if (old) old.remove();

  const s = document.createElement('script');
  s.id = scriptId;
  s.src = `questions/week${weekNumber}.js`;
  s.onload = () => {
    const varName = `week${weekNumber}Questions`;
    if (window[varName] && Array.isArray(window[varName]) && window[varName].length >= 1) {
      loadedQuestions = window[varName].slice();
      answers = new Array(loadedQuestions.length).fill(null);
      currIndex = 0;
      renderQuestion(currIndex);
      startTimer();
    } else {
      questionArea.innerHTML = `<p style="color:#f88">Questions file not found or invalid.</p>`;
    }
  };
  s.onerror = () => {
    questionArea.innerHTML = `<p style="color:#f88">Failed to load questions/week${weekNumber}.js</p>`;
  };
  document.body.appendChild(s);
}

// ✅ Render each question
function renderQuestion(index) {
  if (!loadedQuestions || loadedQuestions.length === 0) {
    questionArea.innerHTML = `<p>No questions loaded.</p>`;
    return;
  }
  const q = loadedQuestions[index];
  questionArea.innerHTML = `
    <div class="q-card">
      <div><strong>Q ${index + 1}.</strong> ${escapeHtml(q.question)}</div>
      <div class="options">
        ${q.options.map((opt, i) => `<div class="opt ${answers[index] === i ? 'selected' : ''}" data-idx="${i}">${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</div>`).join('')}
      </div>
    </div>
    <div style="text-align:center"><small>Question ${index + 1} of ${loadedQuestions.length}</small></div>
  `;
  document.querySelectorAll('.opt').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-idx'));
      answers[index] = idx;
      renderQuestion(index);
    });
  });
}

// ✅ Controls
document.getElementById('prevQ').addEventListener('click', () => {
  if (currIndex > 0) { currIndex--; renderQuestion(currIndex); }
});
document.getElementById('nextQ').addEventListener('click', () => {
  if (currIndex < loadedQuestions.length - 1) { currIndex++; renderQuestion(currIndex); }
});
document.getElementById('skipQ').addEventListener('click', () => {
  answers[currIndex] = null;
  if (currIndex < loadedQuestions.length - 1) { currIndex++; renderQuestion(currIndex); }
});
backToWeeks.addEventListener('click', () => {
  examSection.classList.add('hidden');
  weeksSection.classList.remove('hidden');
  clearInterval(timerInterval);
});

// ✅ Submit
document.getElementById('submitExam').addEventListener('click', submitExam);

async function submitExam() {
  clearInterval(timerInterval);
  if (!confirm("Submit your answers?")) return;

  let correct = 0, wrong = 0, skipped = 0;
  loadedQuestions.forEach((q, i) => {
    const chosenIndex = answers[i];
    if (chosenIndex === null || chosenIndex === undefined) { skipped++; return; }
    const chosenText = q.options[chosenIndex];
    if (chosenText === q.answer) correct++;
    else wrong++;
  });

  const attempted = correct + wrong;
  const marks = correct * 4 + wrong * (-1);
  const percentage = +(marks / 720 * 100).toFixed(2);
  const name = sessionStorage.getItem('studentName') || 'Unknown';

  examSection.classList.add('hidden');
  resultSection.classList.remove('hidden');
  resultContent.innerHTML = `
    <p>Name: ${escapeHtml(name)}</p>
    <p>Correct: ${correct}</p>
    <p>Wrong: ${wrong}</p>
    <p>Skipped: ${skipped}</p>
    <p>Attempted: ${attempted}</p>
    <p>Marks: ${marks}</p>
    <p>Percentage: ${percentage}%</p>
  `;

  try {
    if (currentUser) {
      await db.collection('Students').doc(currentUser.uid).collection('Results').add({
        Name: name,
        Week: parseInt(examTitle.textContent.replace(/[^0-9]/g, '')),
        Correct: correct,
        Wrong: wrong,
        Skipped: skipped,
        Attempted: attempted,
        Marks: marks,
        Percentage: percentage,
        Timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log("✅ Result saved successfully!");
    } else {
      console.error("⚠️ No user signed in");
    }
  } catch (err) {
    console.error("❌ Firestore save error:", err);
  }
}

doneBtn.addEventListener('click', () => {
  resultSection.classList.add('hidden');
  weeksSection.classList.remove('hidden');
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"'`]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]
  ));
      }
