'use strict';

const DATA_URL = 'data.json';
const shekels = new Intl.NumberFormat('he-IL', {
  style: 'currency', currency: 'ILS', maximumFractionDigits: 0
});
const integer = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'Asia/Jerusalem'
});

const BANTER_SETS = [
  {
    leader: ({ loser }) => `איפה אתה, ${loser}? 👀`,
    trailing: ({ leader }) => `נמחץ על ידי ${leader} 🫠`,
  },
  {
    leader: ({ loser }) => `מישהו ראה את ${loser}? 🔍`,
    trailing: ({ leader }) => `אוכל אבק של ${leader} 💨`,
  },
  {
    leader: ({ loser }) => `${loser}, נגמרה ההפסקה ☕`,
    trailing: () => 'הקאמבק תקוע בפקקים 🚗',
  },
  {
    leader: ({ loser }) => `תביאו משקפת, ${loser} מאחור 🔭`,
    trailing: ({ leader }) => `רואה את ${leader} רק מאחור 👋`,
  },
  {
    leader: ({ leader }) => `${leader} על טורבו 🚀`,
    trailing: () => 'עדיין מחפש את דוושת הגז 🐢',
  },
  {
    leader: ({ loser }) => `שומעים את ${loser}, או שזה רק הד? 📢`,
    trailing: ({ leader }) => `${leader} כבר מכר, מה איתך? 😴`,
  },
];

const TIE_BANTER = [
  'הרבה דיבורים, אפס פער 😏',
  'תיקו? איזה מנומסים 🤭',
  'שניכם באותו פקק 🚗',
  'מי ממצמץ ראשון? 👀',
];

function safeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function formatMoney(value) {
  return shekels.format(safeAmount(value)).replace(/\u200f/g, '');
}

function formatCompactMoney(value) {
  const amount = safeAmount(value);
  if (amount >= 1000000) {
    const millions = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(amount / 1000000);
    return `${millions}M ₪`;
  }
  if (amount >= 1000) {
    const thousands = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(amount / 1000);
    return `${thousands}K ₪`;
  }
  return formatMoney(amount);
}

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function renderCampaignTitle(value) {
  const title = String(value || 'אורן מזרח מוכרת 250M אלטשולר שחם 💸').trim();
  const marker = 'אלטשולר שחם';
  const markerIndex = title.indexOf(marker);
  const lines = markerIndex > 0
    ? [title.slice(0, markerIndex).trim(), title.slice(markerIndex).trim()]
    : [title];
  const heading = document.getElementById('campaign-title');
  heading.replaceChildren(...lines.map(line => {
    const span = document.createElement('span');
    const targetIndex = line.indexOf('250M');
    if (targetIndex < 0) {
      span.textContent = line;
      return span;
    }
    span.append(document.createTextNode(line.slice(0, targetIndex)));
    const target = document.createElement('bdi');
    target.className = 'campaign-target';
    target.dir = 'ltr';
    target.textContent = '250M';
    span.append(target, document.createTextNode(line.slice(targetIndex + 4)));
    return span;
  }));
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
  const salesAmount = safeAmount(agent.sales);
  const target = safeAmount(agent.target);
  const attainment = target > 0 ? (salesAmount / target) * 100 : 0;
  const visualAttainment = Math.min(Math.max(attainment, 0), 100);
  const details = document.createElement('div');
  details.className = 'agent-details';
  const name = document.createElement('span');
  name.className = 'agent-name';
  name.textContent = String(agent.name || 'סוכן ללא שם');
  const sales = document.createElement('span');
  sales.className = 'agent-sales';
  sales.textContent = formatCompactMoney(salesAmount);
  const heading = document.createElement('div');
  heading.className = 'agent-heading';
  heading.append(name, sales);
  details.append(heading);
  if (target > 0) {
    const progressMeta = document.createElement('div');
    progressMeta.className = 'agent-progress-meta';
    const progressText = document.createElement('span');
    progressText.textContent = `${percent.format(attainment)}%`;
    const targetText = document.createElement('span');
    targetText.textContent = `יעד אישי 🎯 ${formatCompactMoney(target)}`;
    progressMeta.append(progressText, targetText);
    const progressBar = document.createElement('div');
    progressBar.className = 'agent-progress';
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-label', `עמידה ביעד של ${agent.name || 'הסוכן'}`);
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-valuenow', String(Number(visualAttainment.toFixed(2))));
    const progressFill = document.createElement('span');
    progressFill.className = 'agent-progress__fill';
    progressFill.style.width = `${visualAttainment}%`;
    progressBar.append(progressFill);
    details.append(progressMeta, progressBar);
  }
  row.append(details);
  return row;
}

function teamTotal(team) {
  const agents = Array.isArray(team.agents) ? team.agents : [];
  return agents.reduce((sum, agent) => sum + safeAmount(agent.sales), 0);
}

function teamFirstName(team) {
  return String(team?.name || '')
    .replace(/^קבוצת\s+/, '')
    .trim()
    .split(/\s+/)[0] || 'המתחרה';
}

function renderTeam(team, total, isLeader, isTrailing, badgeText) {
  const fragment = document.getElementById('team-template').content.cloneNode(true);
  const card = fragment.querySelector('.team-card');
  const agents = (Array.isArray(team.agents) ? [...team.agents] : [])
    .sort((a, b) => safeAmount(b.sales) - safeAmount(a.sales));
  card.classList.add(`team-card--${team.id || 'default'}`);
  card.classList.toggle('team-card--leader', isLeader);
  card.querySelector('.team-card__name').textContent = team.name || 'קבוצה ללא שם';
  const photo = card.querySelector('.team-photo');
  photo.src = team.managerImage || '';
  photo.alt = team.name ? `תמונה של מנהל ${team.name}` : 'תמונת מנהל הקבוצה';
  card.querySelector('.team-card__total').textContent = formatCompactMoney(total);
  const badge = card.querySelector('.leader-badge');
  badge.hidden = !badgeText;
  badge.classList.toggle('leader-badge--trailing', isTrailing);
  badge.textContent = badgeText;
  const agentsBox = card.querySelector('.agents');
  if (agents.length === 0) agentsBox.append(emptyState());
  else {
    const rows = agents.map((agent, index) => {
      const row = renderAgent(agent);
      if (index >= 3) row.hidden = true;
      agentsBox.append(row);
      return row;
    });
    if (agents.length > 3) {
      const moreCount = agents.length - 3;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'agents-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = `הצג עוד (${integer.format(moreCount)})`;
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        rows.slice(3).forEach(row => { row.hidden = expanded; });
        toggle.setAttribute('aria-expanded', String(!expanded));
        toggle.textContent = expanded ? `הצג עוד (${integer.format(moreCount)})` : 'הצג פחות';
      });
      agentsBox.append(toggle);
    }
  }
  return { card, total };
}

function render(data) {
  const campaign = data.campaign || {};
  const teams = Array.isArray(data.teams) ? data.teams : [];
  const target = safeAmount(campaign.target);
  const teamsBox = document.getElementById('teams');
  let sold = 0;
  teamsBox.replaceChildren();

  const rankedTeams = teams
    .map((team, originalIndex) => ({ team, total: teamTotal(team), originalIndex }))
    .sort((a, b) => b.total - a.total || a.originalIndex - b.originalIndex);
  const leaderTotal = rankedTeams[0]?.total || 0;
  const leaders = leaderTotal > 0
    ? rankedTeams.filter(({ total }) => total === leaderTotal).length
    : 0;
  const runnerUp = rankedTeams[1]?.total || 0;
  const banterIndex = Number.isFinite(Number(campaign.banterIndex))
    ? Math.max(0, Math.trunc(Number(campaign.banterIndex)))
    : 0;
  const banter = BANTER_SETS[banterIndex % BANTER_SETS.length];
  const tieBanter = TIE_BANTER[banterIndex % TIE_BANTER.length];
  const leaderFirstName = teamFirstName(rankedTeams[0]?.team);
  const runnerFirstName = teamFirstName(rankedTeams[1]?.team);

  rankedTeams.forEach(({ team, total }) => {
    const isLeader = leaders === 1 && total === leaderTotal;
    const isTrailing = leaders === 1 && !isLeader;
    let badgeText = '';
    if (leaders === 1) {
      badgeText = isLeader
        ? banter.leader({ leader: leaderFirstName, loser: runnerFirstName })
        : banter.trailing({ leader: leaderFirstName, loser: teamFirstName(team) });
    } else if (leaders > 1) {
      badgeText = tieBanter;
    }
    const rendered = renderTeam(team, total, isLeader, isTrailing, badgeText);
    sold += rendered.total;
    teamsBox.append(rendered.card);
  });

  const remaining = Math.max(target - sold, 0);
  const rawProgress = target > 0 ? (sold / target) * 100 : 0;
  const visualProgress = Math.min(Math.max(rawProgress, 0), 100);
  const progressText = `${percent.format(rawProgress)}%`;

  document.title = document.querySelector('meta[property="og:title"]')?.content
    || campaign.title
    || 'אורן מזרח מוכרת 250M אלטשולר שחם💸';
  renderCampaignTitle(campaign.title);
  document.getElementById('sold-total').textContent = formatCompactMoney(sold);
  document.getElementById('remaining-total').textContent = formatCompactMoney(remaining);
  document.getElementById('target-caption').textContent = `מתוך יעד של ${formatCompactMoney(target)}`;
  document.getElementById('progress-percent').textContent = progressText;
  document.getElementById('progress-fill').style.width = `${visualProgress}%`;
  const progress = document.querySelector('.progress');
  progress.setAttribute('aria-valuenow', String(Number(visualProgress.toFixed(2))));
  progress.setAttribute('aria-valuetext', `${progressText} מהיעד`);
  document.getElementById('progress-status').textContent = sold === 0
    ? 'המסע ליעד מתחיל כאן'
    : rawProgress >= 100 ? `היעד הושג — ${formatMoney(sold - target)} מעבר ליעד`
      : `${formatCompactMoney(remaining)} נותרו להשלמת היעד`;
  const leaderStatus = document.getElementById('leader-status');
  if (leaders === 1) {
    const leaderName = rankedTeams[0].team.name || 'הקבוצה המובילה';
    leaderStatus.textContent = `${leaderName} מובילה · פער ${formatCompactMoney(leaderTotal - runnerUp)}`;
  } else if (leaders > 1) {
    leaderStatus.textContent = 'תיקו בצמרת — הכול פתוח';
  } else {
    leaderStatus.textContent = 'המרוץ מתחיל עכשיו';
  }

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
