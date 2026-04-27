// ─── Aced — app.js (TEXT INPUT VERSION) ─────────────────────────────────────

// 1. DEFINE VARIABLES FIRST
const studyInput    = document.getElementById('study-input');
const generateBtn   = document.getElementById('generate-btn');
const errorMsgEl    = document.getElementById('error-msg');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingMsgEl   = document.getElementById('loading-msg');
const loadingBarEl   = document.getElementById('loading-bar');
const loadingPctEl   = document.getElementById('loading-pct');

let isProcessing = false;
const WORD_LIMIT = 6000;

// 2. NOW DO THE RESET
window.onload = () => {
  isProcessing = false;
  if (generateBtn) generateBtn.disabled = true; // Start disabled until they type
  if (studyInput) studyInput.value = '';        // Clears the "ghost spaces"
};

// ── Event Listeners ────────────────────────────────────────────────────────

studyInput.addEventListener('input', () => {
  const words = studyInput.value.trim().split(/\s+/).filter(Boolean);
  const isTooShort = studyInput.value.trim().length < 50;
  const isTooLong  = words.length > WORD_LIMIT;

  if (isTooLong) {
    showError(`Too long (${words.length} words). Max is ${WORD_LIMIT}.`);
  } else if (isTooShort) {
    // We don't necessarily want to show an error while they are still typing
    hideError(); 
  } else {
    hideError();
  }

  generateBtn.disabled = isTooShort || isTooLong || isProcessing;
});

// ── Main Action ────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', async (e) => {
  if (e) e.preventDefault(); 
  
  if (generateBtn.disabled || isProcessing) return;
  
  const text = studyInput.value;

  if (!text || text.trim().length < 50) {
    showError("Paste more of your study guide.");
    return;
  }

  isProcessing = true;
  generateBtn.disabled = true;
  hideError();
  showLoading();

  // ─── START PROGRESS SIMULATION ───
  let currentPct = 0;
  const progressInterval = setInterval(() => {
    if (currentPct < 90) {
      // Moves faster at first, then slows down as it nears 90
      const increment = Math.random() * 12; 
      currentPct += increment;
      if (currentPct > 90) currentPct = 90;
      
      // Update messages based on percentage
      let msg = "Analyzing your guide...";
      if (currentPct > 30) msg = "Organizing topics...";
      if (currentPct > 60) msg = "Generating interactive checklist...";
      
      setProgress(Math.floor(currentPct), msg);
    }
  }, 800); // Updates every 0.8 seconds
  // ────────────────────────────────

  try {
    await processText(text); 
    
    // Success! Finish the bar
    clearInterval(progressInterval);
    setProgress(100, "Done! Redirecting...");
  } catch (err) {
    clearInterval(progressInterval);
    showError("Something went wrong.");
    isProcessing = false;
    generateBtn.disabled = false;
    hideLoading();
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function showError(msg) {
  errorMsgEl.textContent = msg;
  errorMsgEl.classList.add('show');
}

function hideError() {
  errorMsgEl.classList.remove('show');
}

function showLoading() {
  loadingOverlay.classList.add('show');
  setProgress(0, 'Getting started...');
}

function hideLoading() {
  loadingOverlay.classList.remove('show');
}

function setProgress(pct, msg) {
  loadingBarEl.style.width = pct + '%';
  loadingPctEl.textContent = pct + '%';
  if (msg) loadingMsgEl.textContent = msg;
}
