'use strict';

const DATA_URL = 'data.json';
const shekels = new Intl.NumberFormat('he-IL', {
  style: 'currency', currency: 'ILS', maximumFractionDigits: 0
});
const integer = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dateOnly = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

function safeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function formatMoney(value) {
  return shekels.format(safeAmount(value)).replace(/\u200f/g, '');
}

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function initials(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('') || '•';
}

function emptyState() {
  const box = document.createElement('div');
  box.className = 'empty-state';
  box.innerHTML = '<div class="empty-state__icon" aria-hidden="true">+</div><strong>מוכנים לצאת לדרך</strong><p>הסוכנים והמכירות שיוזנו לקבוצה יופיעו כאן באופן אוטומטי.</p>';
  return box;
}

function renderAgent(agent) {
  const row = document.createElement('div');
  row.className = 'agent-row';
  const avatar = document.createElement('span');
  avatar.className = 'agent-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = initials(agent.name);
  const name = document.createElement('span');
  name.className = 'agent-name';
  name.textContent = String(agent.name || 'סוכן ללא שם');
  const sales = document.createElement('span');
  sales.className = 'agent-sales';
  sales.textContent = formatMoney(agent.sales);
  row.append(avatar, name, sales);
  return row;
}

function renderTeam(team) {
  const fragment = document.getElementById('team-template').content.cloneNode(true);
  const card = fragment.querySelector('.team-card');
  const agents = Array.isArray(team.agents) ? team.agents : [];
  const total = agents.reduce((sum, agent) => sum + safeAmount(agent.sales), 0);
  card.querySelector('.team-card__name').textContent = team.name || 'קבוצה ללא שם';
  const photo = card.querySelector('.team-photo');
  photo.src = team.managerImage || '';
  photo.alt = team.name ? `תמונה של מנהל ${team.name}` : 'תמונת מנהל הקבוצה';
  card.querySelector('.team-total strong').textContent = formatMoney(total);
  const agentsBox = card.querySelector('.agents');
  if (agents.length === 0) agentsBox.append(emptyState());
  else agents.forEach(agent => agentsBox.append(renderAgent(agent)));
  return { card, total, agentCount: agents.length };
}

function render(data) {
  const campaign = data.campaign || {};
  const teams = Array.isArray(data.teams) ? data.teams : [];
  const target = safeAmount(campaign.target);
  const teamsBox = document.getElementById('teams');
  let sold = 0;
  let agentCount = 0;
  teamsBox.replaceChildren();

  teams.forEach(team => {
    const rendered = renderTeam(team);
    sold += rendered.total;
    agentCount += rendered.agentCount;
    teamsBox.append(rendered.card);
  });

  const remaining = Math.max(target - sold, 0);
  const rawProgress = target > 0 ? (sold / target) * 100 : 0;
  const visualProgress = Math.min(Math.max(rawProgress, 0), 100);
  const progressText = `${percent.format(rawProgress)}%`;

  document.title = campaign.title || '250 מיליון לאלטשולר שחם';
  document.getElementById('campaign-title').textContent = campaign.title || '250 מיליון לאלטשולר שחם';
  document.getElementById('sold-total').textContent = formatMoney(sold);
  document.getElementById('remaining-total').textContent = formatMoney(remaining);
  document.getElementById('target-caption').textContent = `מתוך יעד של ${formatMoney(target)}`;
  document.getElementById('progress-percent').textContent = progressText;
  document.getElementById('progress-fill').style.width = `${visualProgress}%`;
  const progress = document.querySelector('.progress');
  progress.setAttribute('aria-valuenow', String(Math.round(visualProgress)));
  progress.setAttribute('aria-valuetext', `${progressText} מהיעד`);
  document.getElementById('progress-status').textContent = sold === 0
    ? 'המסע ליעד מתחיל כאן'
    : rawProgress >= 100 ? `היעד הושג — ${formatMoney(sold - target)} מעבר ליעד`
      : `${formatMoney(remaining)} נותרו להשלמת היעד`;
  document.getElementById('agent-count').textContent = `${integer.format(agentCount)} ${agentCount === 1 ? 'סוכן' : 'סוכנים'}`;

  const deadline = validDate(`${campaign.deadline}T12:00:00`);
  document.getElementById('deadline').textContent = deadline ? dateOnly.format(deadline) : 'לא הוגדר';
  const updated = validDate(campaign.lastUpdated);
  const time = document.getElementById('last-updated');
  time.textContent = updated ? dateTime.format(updated) : 'לא הוגדר';
  if (updated) time.dateTime = updated.toISOString();
}

function showError(error) {
  console.error(error);
  document.getElementById('teams').innerHTML = '<div class="error-banner" role="alert"><strong>לא הצלחנו לטעון את נתוני המכירות.</strong><br>יש לוודא שהאתר מוגש באמצעות שרת מקומי ושקובץ data.json תקין.</div>';
  document.getElementById('data-status').textContent = 'שגיאה בטעינת הנתונים';
}

fetch(DATA_URL, { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
    return response.json();
  })
  .then(render)
  .catch(showError);
