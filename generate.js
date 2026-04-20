// ─── Aced — generate.js ──────────────────────────────────────────────────────
// Handles all UI logic for the study plan page (generate.html)
// ─────────────────────────────────────────────────────────────────────────────

const app = document.getElementById('app');
let currentPlan = null;
let currentPlanId = null;

const state = {
  checked:   {},
  collapsed: {},
};

// ─── Storage Helpers ──────────────────────────────────────────────────────────

function getAllPlans() {
  try {
    return JSON.parse(localStorage.getItem('acedPlans') || '{}');
  } catch { return {}; }
}

function savePlanToLibrary(plan) {
  const plans = getAllPlans();
  const id = plan.id || `plan_${Date.now()}`;
  plan.id = id;
  plans[id] = {
    id,
    title: plan.title,
    totalTime: plan.totalTime,
    sections: plan.sections,
    savedAt: Date.now(),
    checked: {},
  };
  localStorage.setItem('acedPlans', JSON.stringify(plans));
  return id;
}

function saveProgress(planId, checked) {
  const plans = getAllPlans();
  if (plans[planId]) {
    plans[planId].checked = checked;
    localStorage.setItem('acedPlans', JSON.stringify(plans));
  }
}

function loadPlan(planId) {
  const plans = getAllPlans();
  return plans[planId] || null;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

// Check if we're loading a specific saved plan
const urlParams = new URLSearchParams(window.location.search);
const loadId = urlParams.get('plan');

if (loadId) {
  // Loading a saved plan from My Plans page
  const saved = loadPlan(loadId);
  if (saved) {
    currentPlanId = loadId;
    Object.assign(state.checked, saved.checked || {});
    renderPlan(saved);
  } else {
    showError();
  }
} else {
  // Loading a freshly generated plan from localStorage
  const raw = localStorage.getItem('acedStudyPlan');
  if (!raw) {
    showError();
  } else {
    try {
      const plan = JSON.parse(raw);
      currentPlanId = savePlanToLibrary(plan);
      plan.id = currentPlanId;
      renderPlan(plan);
      localStorage.removeItem('acedStudyPlan'); // clean up temp storage
    } catch (e) {
      showError();
    }
  }
}

function showError() {
  app.innerHTML = `
    <div class="error-state">
      <div class="icon">📋</div>
      <h2>No study plan found</h2>
      <p>It looks like there's no plan loaded yet. Upload a study guide to get started.</p>
      <a href="index.html" class="go-back-btn">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
        Upload a Study Guide
      </a>
    </div>`;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderPlan(plan) {
  currentPlan = plan;
  plan.sections.forEach(s => { state.collapsed[s.id] = false; });

  const total  = totalItems(plan);
  const mins   = parseInt(plan.totalTime) || 0;
  const hrStr  = mins >= 60
    ? `${Math.floor(mins/60)}h ${mins%60>0?(mins%60)+'m':''}`.trim()
    : `${mins}m`;

  app.innerHTML = `
    <div class="plan-header">
      <h1 class="plan-title">${esc(plan.title)}</h1>
      <p class="plan-subtitle">Work through each topic below. Check it off when you feel confident you know it. 💪</p>
      <div class="plan-meta">
        <span class="meta-pill">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 6v6l4 2"/>
          </svg>
          <span id="time-remaining">${hrStr}</span> remaining
        </span>
        <span class="meta-pill">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          ${plan.sections.length} sections
        </span>
        <span class="meta-pill">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" d="M4 6h16M4 10h16M4 14h16M4 18h7"/>
          </svg>
          ${total} topics
        </span>
      </div>
    </div>

    <div class="progress-wrap">
      <div class="progress-label">
        <span>Your Progress</span>
        <span class="progress-pct" id="pct">0%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" id="fill"></div>
      </div>
      <div class="progress-stats">
        <span class="stat"><b id="done-count">0</b> / ${total} topics done</span>
      </div>
    </div>

    <div class="sections-list" id="sections">
      ${plan.sections.map((s, si) => renderSection(s, si)).join('')}
    </div>

    <div class="complete-banner" id="complete-banner">
      <div class="complete-icon">🎉</div>
      <h2>Study session complete!</h2>
      <p>You've covered every topic. Go crush that test!</p>
      <button class="reset-btn" onclick="resetAll()">Start Over</button>
    </div>
  `;

  document.querySelectorAll('.section-header').forEach(h => {
    h.addEventListener('click', () => toggleSection(h.dataset.id));
  });
  document.querySelectorAll('.item-row').forEach(r => {
    r.addEventListener('click', () => toggleItem(r.dataset.key, plan));
  });

  updateProgress(plan);
}

function renderSection(section, idx) {
  const delay = 0.12 + idx * 0.07;
  return `
    <div class="section-card open" id="card-${section.id}" style="animation-delay:${delay}s">
      <div class="section-header" data-id="${section.id}">
        <span class="section-emoji">${section.emoji || '📚'}</span>
        <div class="section-info">
          <div class="section-title">${esc(section.title)}</div>
          <div class="section-sub">
            <span class="section-time">⏱ ${section.timeEstimate}m</span>
            <span class="section-count">${section.items.length} topics</span>
            <div class="section-progress-mini">
              <div class="section-progress-mini-fill" id="mini-${section.id}" style="width:0%"></div>
            </div>
          </div>
        </div>
        <svg class="chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
      <div class="items-list">
        ${section.items.map((item, i) => renderItem(section.id, i, item)).join('')}
      </div>
    </div>`;
}

function renderItem(sectionId, index, item) {
  const key  = `${sectionId}__${index}`;
  const done = state.checked[key] ? 'done' : '';

  if (typeof item === 'string') {
    // ... keep your existing string logic ...
  }

  return `
    <div class="item-row ${done}" data-key="${key}">
      <div class="item-checkbox" onclick="event.stopPropagation(); toggleItem('${key}', currentPlan)">
        <svg fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>

      <div class="item-content" onclick="toggleAnswer(this)">
        <div class="item-prompt">${esc(item.prompt)}</div>
        <div class="item-answer" style="display:none; margin-top: 8px; color: #555; font-size: 0.95em; border-left: 2px solid #c8a96e; padding-left: 10px;">
          ${esc(item.answer)}
          ${item.hint ? `<br><small style="font-style: italic; color: #888;">💡 Hint: ${esc(item.hint)}</small>` : ''}
        </div>
      </div>
    </div>`;
}

// ─── Interactions ─────────────────────────────────────────────────────────────

function toggleSection(id) {
  const card = document.getElementById('card-' + id);
  if (card) card.classList.toggle('open');
}

function toggleItem(key, plan) {
  state.checked[key] = !state.checked[key];
  const row = document.querySelector(`[data-key="${key}"]`);
  if (row) row.classList.toggle('done', state.checked[key]);
  updateProgress(plan);
  if (currentPlanId) saveProgress(currentPlanId, state.checked);
}

function updateProgress(plan) {
  const total = totalItems(plan);
  const done  = checkedCount();
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const fillEl = document.getElementById('fill');
  const pctEl  = document.getElementById('pct');
  const doneEl = document.getElementById('done-count');
  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl)  pctEl.textContent  = pct + '%';
  if (doneEl) doneEl.textContent = done;

  // Update time remaining
  const timeEl = document.getElementById('time-remaining');
  if (timeEl) {
    let minsLeft = 0;
    plan.sections.forEach(s => {
      const sTotal = s.items.length;
      const sDone  = s.items.filter((_, i) => state.checked[`${s.id}__${i}`]).length;
      const sRemaining = sTotal - sDone;
      const minsPerItem = parseInt(s.timeEstimate) / sTotal;
      minsLeft += Math.round(minsPerItem * sRemaining);
    });
    const hrStr = minsLeft >= 60
      ? `${Math.floor(minsLeft/60)}h ${minsLeft%60>0?(minsLeft%60)+'m':''}`.trim()
      : `${minsLeft}m`;
    timeEl.textContent = minsLeft > 0 ? hrStr : 'Done!';
  }

  plan.sections.forEach(s => {
    const sTotal = s.items.length;
    const sDone  = s.items.filter((_, i) => state.checked[`${s.id}__${i}`]).length;
    const sPct   = sTotal ? Math.round((sDone / sTotal) * 100) : 0;
    const mini   = document.getElementById('mini-' + s.id);
    if (mini) mini.style.width = sPct + '%';
    const card   = document.getElementById('card-' + s.id);
    if (card) card.classList.toggle('completed', sDone === sTotal && sTotal > 0);
  });

  const banner = document.getElementById('complete-banner');
  if (banner) {
    if (done === total && total > 0) {
      banner.classList.add('show');
      if (!banner.dataset.fired) {
        banner.dataset.fired = '1';
        launchConfetti();
      }
    } else {
      banner.classList.remove('show');
      delete banner.dataset.fired;
    }
  }
}

function resetAll() {
  Object.keys(state.checked).forEach(k => delete state.checked[k]);
  if (currentPlanId) saveProgress(currentPlanId, state.checked);
  if (currentPlan) renderPlan(currentPlan);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function totalItems(plan) {
  return plan.sections.reduce((a, s) => a + s.items.length, 0);
}

function checkedCount() {
  return Object.values(state.checked).filter(Boolean).length;
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function launchConfetti() {
  const canvas = document.getElementById('confetti');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#c8a96e','#7db87d','#e8dcc8','#9a7e4f','#a3c4a3'];
  const pieces = Array.from({length: 100}, () => ({
    x:  Math.random() * canvas.width,
    y:  -10 - Math.random() * 40,
    w:  6 + Math.random() * 8,
    h:  3 + Math.random() * 5,
    r:  Math.random() * Math.PI * 2,
    dr: (Math.random() - 0.5) * 0.15,
    dx: (Math.random() - 0.5) * 2,
    dy: 2 + Math.random() * 3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.dx; p.y += p.dy; p.r += p.dr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 120);
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 130) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

function toggleAnswer(contentEl) {
  const answer = contentEl.querySelector('.item-answer');
  if (answer) {
    const isHidden = answer.style.display === 'none';
    answer.style.display = isHidden ? 'block' : 'none';
    contentEl.parentElement.classList.toggle('expanded', isHidden);
  }
}
