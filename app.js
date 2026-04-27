// ─── Aced — app.js (TEXT INPUT VERSION) ─────────────────────────────────────

const studyInput    = document.getElementById('study-input');
const generateBtn   = document.getElementById('generate-btn');
const errorMsgEl    = document.getElementById('error-msg');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingMsgEl   = document.getElementById('loading-msg');
const loadingBarEl   = document.getElementById('loading-bar');
const loadingPctEl   = document.getElementById('loading-pct');

let isProcessing = false;

const WORD_LIMIT = 6000;


studyInput.addEventListener('input', () => {
  const words = studyInput.value.trim().split(/\s+/).filter(Boolean);

  if (words.length > WORD_LIMIT) {
    errorMsgEl.textContent = `Too long (${words.length} words). Max is ${WORD_LIMIT}.`;
    errorMsgEl.classList.add('show');
    generateBtn.disabled = true;
  } else {
    errorMsgEl.classList.remove('show');
    generateBtn.disabled = studyInput.value.trim().length < 50;
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

// ── Main Action ────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', async () => {
  if (isProcessing) return;
  
  const text = studyInput.value;

  if (!text || text.trim().length < 50) {
    errorMsgEl.textContent = "Paste more of your study guide.";
    errorMsgEl.classList.add('show');
    return;
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length > WORD_LIMIT) {
    errorMsgEl.textContent = `Too long. Max is ${WORD_LIMIT} words.`;
    errorMsgEl.classList.add('show');
    return;
  }

  isProcessing = true;
  generateBtn.disabled = true;
  errorMsgEl.classList.remove('show');

  loadingOverlay.classList.add('show');

  try {
    await processText(text);
  } catch (err) {
    errorMsgEl.textContent = "Something went wrong.";
    errorMsgEl.classList.add('show');
  } finally {
    loadingOverlay.classList.remove('show');
    isProcessing = false;
    generateBtn.disabled = false;
  }
});
