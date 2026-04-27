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

// Added 'e' here in the parentheses!
generateBtn.addEventListener('click', async (e) => {
  if (e) e.preventDefault(); 
  
  if (generateBtn.disabled || isProcessing) return;
  
  const text = studyInput.value;

  // Final length check
  if (!text || text.trim().length < 50) {
    showError("Paste more of your study guide.");
    return;
  }

  isProcessing = true;
  generateBtn.disabled = true;
  hideError();

  showLoading();

  try {
    // This calls the function in processor.js
    await processText(text); 
  } catch (err) {
    showError("Something went wrong.");
    isProcessing = false;
    generateBtn.disabled = false;
    hideLoading();
  }
  // Note: We don't hideLoading in 'finally' if processText redirects the page
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
