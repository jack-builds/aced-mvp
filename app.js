// ─── Aced — app.js (TEXT INPUT VERSION) ─────────────────────────────────────

const input        = document.getElementById('study-input');
const generateBtn  = document.getElementById('generate-btn');
const errorMsgEl   = document.getElementById('error-msg');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingMsgEl   = document.getElementById('loading-msg');
const loadingBarEl   = document.getElementById('loading-bar');
const loadingPctEl   = document.getElementById('loading-pct');

let isProcessing = false;

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

// ── Main Action ────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', async () => {
  if (isProcessing) return;

  const text = input.value.trim();

  hideError();

  // 🔒 Simple limits (VERY IMPORTANT)
  if (!text) {
    showError('Paste your study guide first.');
    return;
  }

  if (text.length < 50) {
    showError('Add a bit more content to generate a plan.');
    return;
  }

  if (text.length > 8000) {
    showError('Keep it under ~2–3 pages for now.');
    return;
  }

  isProcessing = true;
  generateBtn.disabled = true;
  showLoading();

  try {
    setProgress(20, 'Analyzing your notes...');
    await new Promise(r => setTimeout(r, 400));

    setProgress(60, 'Generating study plan...');
    await processText(text); // 🔥 THIS is your new pipeline

    setProgress(100, 'Done!');

  } catch (err) {
    hideLoading();
    generateBtn.disabled = false;
    isProcessing = false;

    showError(err.message || 'Something went wrong. Try again.');
  }
});
