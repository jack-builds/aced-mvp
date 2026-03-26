// ─── Aced — plans.js ─────────────────────────────────────────────────────────
// Handles the My Plans page — lists all saved study plans
// ─────────────────────────────────────────────────────────────────────────────

const app = document.getElementById('app');

function getAllPlans() {
  try {
    return JSON.parse(localStorage.getItem('acedPlans') || '{}');
  } catch { return {}; }
}

function deletePlan(id) {
  const plans = getAllPlans();
  delete plans[id];
  localStorage.setItem('acedPlans', JSON.stringify(plans));
  renderPlans();
}

function totalItems(plan) {
  return plan.sections.reduce((a, s) => a + s.items.length, 0);
}

function checkedCount(plan) {
  const checked = plan.checked || {};
  return Object.values(checked).filter(Boolean).length;
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderPlans() {
  const plans = getAllPlans();
  const planList = Object.values(plans).sort((a, b) => b.savedAt - a.savedAt);

  if (planList.length === 0) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h2>No saved plans yet</h2>
        <p>Generate your first study plan and it'll appear here automatically.</p>
        <a href="index.html" class="new-plan-cta">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Generate a Study Plan
        </a>
      </div>`;
    return;
  }

  app.innerHTML = `
    <div class="plans-header">
      <h1 class="plans-title">My Study Plans</h1>
      <p class="plans-sub">${planList.length} saved plan${planList.length !== 1 ? 's' : ''}</p>
    </div>
    <div class="plans-list">
      ${planList.map(plan => {
        const total = totalItems(plan);
        const done  = checkedCount(plan);
        const pct   = total ? Math.round((done / total) * 100) : 0;
        const mins  = parseInt(plan.totalTime) || 0;
        const hrStr = mins >= 60
          ? `${Math.floor(mins/60)}h ${mins%60>0?(mins%60)+'m':''}`.trim()
          : `${mins}m`;

        return `
          <div class="plan-card" onclick="window.location.href='generate.html?plan=${plan.id}'">
            <div class="plan-card-info">
              <div class="plan-card-title">${esc(plan.title)}</div>
              <div class="plan-card-meta">
                <span>⏱ ${hrStr}</span>
                <span>·</span>
                <span>${plan.sections.length} sections</span>
                <span>·</span>
                <span>${total} topics</span>
                <span>·</span>
                <span>Saved ${formatDate(plan.savedAt)}</span>
              </div>
              <div class="plan-card-progress">
                <div class="plan-card-bar">
                  <div class="plan-card-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="plan-card-pct">${pct}% complete</span>
              </div>
            </div>
            <button class="plan-card-delete" onclick="event.stopPropagation(); deletePlan('${plan.id}')" title="Delete">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>`;
      }).join('')}
    </div>`;
}

renderPlans();
