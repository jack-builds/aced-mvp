// ─── Aced — app.js ───────────────────────────$
// Handles all UI logic for the upload page (index.html)
// ──────────────────────────────────────$ById('error-msg');

const dropZone       = document.getElementById('drop-zone');  
const fileInput      = document.getElementById('file-input'); 
const fileSelectedEl = document.getElementById('file-selected');
const fileIconEl     = document.getElementById('file-icon');
const fileNameEl     = document.getElementById('file-name');
const fileSizeEl     = document.getElementById('file-size');
const fileRemoveBtn  = document.getElementById('file-remove');
const generateBtn    = document.getElementById('generate-btn');
const errorMsgEl     = document.getElementById('error-msg');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMsgEl   = document.getElementById('loading-msg');
const loadingBarEl   = document.getElementById('loading-bar');
const loadingPctEl   = document.getElementById('loading-pct');

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED  = ['pdf', 'doc', 'docx', 'txt'];
let selectedFile = null;

// ── Helpers ───────────────────────────────$

function getIcon(ext) { 
  return { pdf: '📕', docx: '📘', doc: '📘', txt: '📝' }[ext] || '📄';
}

function formatSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function setFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED.includes(ext)) { showError(`"${file.name}" isn't supported. Use ${ALLOWED.join(', ')}`); return; }
  if (file.size > MAX_SIZE)   { showError(`File is ${formatSize(file.size)} — max size is ${formatSize(MAX_SIZE)}`); return; }
  selectedFile = file;  
  hideError();
  fileIconEl.textContent = getIcon(ext);
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatSize(file.size);
  fileSelectedEl.classList.add('show');
  generateBtn.disabled = false;
}

function clearFile() {
  selectedFile = null;  
  fileInput.value = '';
  fileSelectedEl.classList.remove('show');
  generateBtn.disabled = true;
  hideError();
}

function showError(msg) { errorMsgEl.textContent = msg; errorMsgEl.classList.add('show'); }
function hideError()    { errorMsgEl.classList.remove('show'); }

function showLoading() { loadingOverlay.classList.add('show'); setProgress(0, 'Getting started...'); }
function hideLoading() { loadingOverlay.classList.remove('show'); }

function setProgress(pct, msg) {
  loadingBarEl.style.width = pct + '%';
  loadingPctEl.textContent = pct + '%';
  if (msg) loadingMsgEl.textContent = msg;
}

// ── Events ───────────────────────────────────────────────────────────────────

fileInput.addEventListener('change', e => { if (e.target.files[0]) setFile(e.target.files[0]); });

dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
});

fileRemoveBtn.addEventListener('click', e => { e.stopPropagation(); clearFile(); });

// ── Generate Button with Spam Prevention ─────────────────────────────────────

generateBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  // Prevent spamming
  if (generateBtn.disabled) return;  // already running
  generateBtn.disabled = true;       // disable immediately

  hideError();
  showLoading();

  try {
    await processFile(selectedFile, (pct, msg) => setProgress(pct, msg));
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    hideLoading();
    generateBtn.disabled = false;   // re-enable after processing
  }
});
