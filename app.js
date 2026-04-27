// ─── Aced — app.js  ─────────────────────────────────────

const studyInput    = document.getElementById('study-input');
const generateBtn   = document.getElementById('generate-btn');
const errorMsgEl    = document.getElementById('error-msg');
const charCounter   = document.getElementById('char-counter');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingMsgEl   = document.getElementById('loading-msg');
const loadingBarEl   = document.getElementById('loading-bar');
const loadingPctEl   = document.getElementById('loading-pct');

let isProcessing = false;
const CHAR_LIMIT = 6000;

window.onload = () => {
  isProcessing = false;
  if (generateBtn) generateBtn.disabled = true;
  if (studyInput) {
    studyInput.value = '';
  }
  if (charCounter) {
    charCounter.textContent = '0 / 6000';
  }
};

// ── Event Listeners ────────────────────────────────────────────────────────

studyInput.addEventListener('input', () => {
  const charCount = studyInput.value.length;
  const limit = 6000;

  if (charCounter) {
    charCounter.textContent = `${charCount} / ${limit}`;
    charCounter.classList.toggle('limit-near', charCount > 5500);
    charCounter.classList.toggle('limit-reached', charCount >= limit);
  }

  const isTooShort = charCount < 50;
  const isTooLong  = charCount > limit;

  if (isTooLong) {
    showError(`Too long! Please keep it under ${limit} characters.`);
    generateBtn.disabled = true; // ADD THIS LINE
  } else if (isTooShort && charCount > 0) {
    hideError();
    generateBtn.disabled = true; // Ensure it stays disabled if too short
  } else if (charCount === 0) {
    generateBtn.disabled = true;
  } else {
    hideError();
    generateBtn.disabled = false; // Only enable if it's "just right"
  }

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
      const increment = Math.random() * 12; 
      currentPct += increment;
      if (currentPct > 90) currentPct = 90;
      let msg = "Analyzing your guide...";
      if (currentPct > 30) msg = "Organizing topics...";
      if (currentPct > 60) msg = "Generating interactive checklist...";
      setProgress(Math.floor(currentPct), msg);
    }
  }, 800); 
  // ────────────────────────────────

  try {
    await processText(text); 
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
