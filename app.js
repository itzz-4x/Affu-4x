// ✅ Start date for week 1 unlock
const START_DATE = new Date("2025-10-20T00:00:00");
const TOTAL_WEEKS = 20;
const QUESTIONS_PER_WEEK = 180;

// 🧩 DOM elements
let enterBtn, studentNameInput, enterSection, weeksSection, weeksContainer;
let userBadge, examSection, examTitle, questionArea, backToWeeks;
let resultSection, resultContent, doneBtn, timerDisplay;

// Variables
let currentUser = null;
let loadedQuestions = [];
let currIndex = 0;
let answers = [];
let timerInterval;
let totalSeconds = 180 * 60;

// ✅ Firebase services - ADD THIS
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Initialize everything after page load
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 NEET Portal Started");
    initializeDOMElements();
    setupEventListeners();
});

function initializeDOMElements() {
    enterBtn = document.getElementById('enterBtn');
    studentNameInput = document.getElementById('studentName');
    enterSection = document.getElementById('enterSection');
    weeksSection = document.getElementById('weeksSection');
    weeksContainer = document.getElementById('weeksContainer');
    userBadge = document.getElementById('userBadge');
    examSection = document.getElementById('examSection');
    examTitle = document.getElementById('examTitle');
    questionArea = document.getElementById('questionArea');
    backToWeeks = document.getElementById('backToWeeks');
    resultSection = document.getElementById('resultSection');
    resultContent = document.getElementById('resultContent');
    doneBtn = document.getElementById('doneBtn');
    timerDisplay = document.getElementById('timeDisplay');
}

function setupEventListeners() {
    // ✅ Enter button FIXED
    if (enterBtn && studentNameInput) {
        enterBtn.addEventListener('click', handleEnterClick);
        
        // Enter key support
        studentNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleEnterClick();
            }
        });
    }

    // Navigation buttons
    if (backToWeeks) {
        backToWeeks.addEventListener('click', function() {
            examSection.classList.add('hidden');
            weeksSection.classList.remove('hidden');
            clearInterval(timerInterval);
        });
    }

    if (doneBtn) {
        doneBtn.addEventListener('click', function() {
            resultSection.classList.add('hidden');
            weeksSection.classList.remove('hidden');
        });
    }

    // ✅ EXAM CONTROLS - FIXED (No Firebase auth dependency)
    const prevQ = document.getElementById('prevQ');
    const nextQ = document.getElementById('nextQ');
    const skipQ = document.getElementById('skipQ');
    const submitExamBtn = document.getElementById('submitExam'); // Changed variable name

    if (prevQ) {
        prevQ.addEventListener('click', () => {
            if (currIndex > 0) { 
                currIndex--; 
                renderQuestion(currIndex); 
            }
        });
    }
    
    if (nextQ) {
        nextQ.addEventListener('click', () => {
            if (currIndex < loadedQuestions.length - 1) { 
                currIndex++; 
                renderQuestion(currIndex); 
            }
        });
    }
    
    if (skipQ) {
        skipQ.addEventListener('click', () => {
            answers[currIndex] = null;
            if (currIndex < loadedQuestions.length - 1) { 
                currIndex++; 
                renderQuestion(currIndex); 
            }
        });
    }
    
    // ✅ SUBMIT BUTTON - FIXED (Different variable name)
    if (submitExamBtn) {
        submitExamBtn.addEventListener('click', function() {
            console.log("Submit button clicked!");
            submitExam();
        });
    } else {
        console.error("Submit button not found!");
    }
}

// ✅ Enter button handler - FIXED
async function handleEnterClick() {
    const name = studentNameInput.value.trim();
    if (!name) {
        alert("Please enter your name");
        return;
    }

    // Save name and update UI
    sessionStorage.setItem('studentName', name);
    if (userBadge) {
        userBadge.textContent = `Hello, ${name}`;
        userBadge.classList.remove('hidden');
    }

    // ✅ FIREBASE AUTH - WITH ERROR HANDLING
    try {
        currentUser = await signInAnon();
        if (currentUser) {
            await db.collection('Students').doc(currentUser.uid).set({
                Name: name,
                LastSeen: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("✅ User saved to Firebase");
        }
    } catch (error) {
        console.log("⚠️ Using demo mode - Firebase auth skipped");
        currentUser = { uid: 'demo-user-' + Date.now() };
    }

    enterSection.classList.add('hidden');
    renderWeeks();
    weeksSection.classList.remove('hidden');
}

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
    if (!weeksContainer) return;
    
    weeksContainer.innerHTML = '';
    for (let i = 1; i <= TOTAL_WEEKS; i++) {
        const card = document.createElement('div');
        card.className = 'week-card ' + (isWeekUnlocked(i) ? 'unlocked' : 'locked');
        card.innerHTML = `<h3>Week ${i}</h3><p>Weekly Practice Test</p>`;
        const btn = document.createElement('button');
        btn.className = 'start-exam';
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
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        totalSeconds--;
        updateTimerDisplay();
        
        if (totalSeconds <= 0) {
            clearInterval(timerInterval);
            alert("⏰ Time's up! Submitting automatically...");
            submitExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (!timerDisplay) return;
    
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    timerDisplay.textContent = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Color warnings
    if (totalSeconds < 300) {
        timerDisplay.style.color = '#ff6b6b';
    } else if (totalSeconds < 600) {
        timerDisplay.style.color = '#ffd93d';
    }
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
    if (!questionArea) return;
    
    if (!loadedQuestions || loadedQuestions.length === 0) {
        questionArea.innerHTML = `<p>No questions loaded.</p>`;
        return;
    }
    
    const q = loadedQuestions[index];
    questionArea.innerHTML = `
        <div class="q-card">
            <div><strong>Q ${index + 1}.</strong> ${escapeHtml(q.question)}</div>
            <div class="options">
                ${q.options.map((opt, i) => `
                    <div class="opt ${answers[index] === i ? 'selected' : ''}" data-idx="${i}">
                        ${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}
                    </div>
                `).join('')}
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

// ✅ Submit exam - FIXED
async function submitExam() {
    clearInterval(timerInterval);
    if (!confirm("Submit your answers?")) return;

    let correct = 0, wrong = 0, skipped = 0;
    loadedQuestions.forEach((q, i) => {
        const chosenIndex = answers[i];
        if (chosenIndex === null || chosenIndex === undefined) { 
            skipped++; 
            return; 
        }
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
        <div class="result-details">
            <h3>🎉 Exam Completed!</h3>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Correct:</strong> ${correct}</p>
            <p><strong>Wrong:</strong> ${wrong}</p>
            <p><strong>Skipped:</strong> ${skipped}</p>
            <p><strong>Attempted:</strong> ${attempted}</p>
            <p><strong>Marks:</strong> ${marks}</p>
            <p><strong>Percentage:</strong> ${percentage}%</p>
        </div>
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
        }
    } catch (err) {
        console.error("❌ Firestore save error:", err);
    }
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"'`]/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]
    ));
}
