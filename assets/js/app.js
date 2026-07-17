'use strict';

/* ============ 配置 ============ */
const SEASON_COLORS = {
  '春': '#4a8c6a',
  '夏': '#c0392b',
  '长夏': '#cf9a1c',
  '秋': '#c8772e',
  '冬': '#34526e',
};
const SEASON_ORDER = ['春', '夏', '长夏', '秋', '冬'];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

const HABITS = [
  { id: 'water', label: '喝够水' },
  { id: 'early', label: '早睡' },
  { id: 'baDuan', label: '八段锦' },
  { id: 'food', label: '食养' },
];
const CHECKIN_KEY = 'yc_checkins_v1';

/* ============ 工具 ============ */
function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayStr() { return dateStr(new Date()); }

async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`加载失败 ${url}: ${res.status}`);
  return res.json();
}

/* ============ 时辰推算 ============ */
function currentHourIndex() {
  const h = new Date().getHours();
  return Math.floor((h + 1) / 2) % 12; // 0=子,1=丑,...
}

/* ============ 节气推算 ============ */
function flattenTerms(years) {
  const list = [];
  years.forEach(y => y.terms.forEach(t => list.push(t)));
  list.sort((a, b) => a.date.localeCompare(b.date));
  return list;
}
function findCurrentTerm(flat) {
  const today = todayStr();
  let cur = flat[0];
  for (const t of flat) {
    if (t.date <= today) cur = t; else break;
  }
  const idx = flat.indexOf(cur);
  const next = flat[idx + 1] || null;
  return { cur, next };
}
function daysBetween(aStr, bStr) {
  const a = new Date(aStr + 'T00:00:00');
  const b = new Date(bStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

/* ============ 渲染：头部 ============ */
function renderHeader(term, daysToNext, hour, nextName) {
  const now = new Date();
  const dateText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`;
  document.getElementById('todayDate').textContent = dateText;

  const termMain = document.getElementById('termBadge').querySelector('.badge-main');
  termMain.textContent = daysToNext > 0
    ? `${term.name} · 距${nextName} ${daysToNext}天`
    : `${term.name}`;

  const hourMain = document.getElementById('hourBadge').querySelector('.badge-main');
  hourMain.textContent = `${hour.name} · ${hour.meridian.replace('当令', '')}`;
  document.getElementById('termBadge').style.borderLeftColor = SEASON_COLORS[termSeasonOf(term.name)] || '#4a8c6a';
}

// 由节气名反查季节
let HEALTH_MAP = {};
let HOU_MAP = {};
function termSeasonOf(name) { return HEALTH_MAP[name] ? HEALTH_MAP[name].season : '春'; }

/* ============ 渲染：今日养生主卡 ============ */
function healthHTML(t) {
  const diet = t.diet.map(d => `<span class="chip">${d}</span>`).join('');
  const living = t.living.map(d => `<span class="chip">${d}</span>`).join('');
  const exercise = t.exercise.map(d => `<span class="chip">${d}</span>`).join('');
  const acu = t.acupoint.map(d => `<span class="chip acu">${d}</span>`).join('');
  const avoid = t.avoid.map(d => `<li>${d}</li>`).join('');
  return `
    <div class="block">
      <div class="block-title"><span class="dot"></span>节气气候</div>
      <p class="organ-line">当令脏腑：${t.organ}</p>
      <p>${t.climate}</p>
      <p class="key-line">养生总纲：${t.key}</p>
    </div>
    <div class="block">
      <div class="block-title"><span class="dot"></span>饮食 · 药食同源</div>
      <div class="chips">${diet}</div>
    </div>
    <div class="block">
      <div class="block-title"><span class="dot"></span>起居宜忌</div>
      <div class="chips">${living}</div>
      <ul class="avoid-list">${avoid}</ul>
    </div>
    <div class="block">
      <div class="block-title"><span class="dot"></span>导引术 · 八段锦 / 五禽戏</div>
      <div class="chips">${exercise}</div>
    </div>
    <div class="block">
      <div class="block-title"><span class="dot"></span>保健穴位</div>
      <div class="chips">${acu}</div>
    </div>`;
}

function renderMainCard(t) {
  document.getElementById('seasonChip').textContent = `${t.season} · ${t.solar}`;
  document.getElementById('seasonChip').style.background = SEASON_COLORS[t.season];
  document.getElementById('cardBody').innerHTML = healthHTML(t);
}

/* ============ 渲染：时辰条 ============ */
function renderHourBar(hours, curIdx) {
  const bar = document.getElementById('hourBar');
  bar.innerHTML = hours.map((h, i) => `
    <div class="hour-seg ${i === curIdx ? 'current' : ''}" data-i="${i}" style="background:${h.color}">
      <div class="hs-name">${h.name}</div>
      <div class="hs-range">${h.range.replace('–', '-')}</div>
    </div>`).join('');
  const segs = bar.querySelectorAll('.hour-seg');
  segs.forEach(seg => seg.addEventListener('click', () => {
    renderHourDetail(hours[+seg.dataset.i]);
    segs.forEach(s => s.classList.remove('current'));
    seg.classList.add('current');
  }));
  renderHourDetail(hours[curIdx]);
}
function renderHourDetail(h) {
  document.getElementById('hourDetail').innerHTML = `
    <div><span class="hd-title">${h.name}时</span><span class="hd-meridian">${h.meridian} · ${h.range}</span></div>
    <p class="hd-advice">宜：${h.advice}</p>
    <p class="hd-avoid">忌：${h.avoid}</p>`;
}

/* ============ 渲染：七十二候 ============ */
function renderHouCurrent(termName) {
  const arr = HOU_MAP[termName] || [];
  document.getElementById('houCurrent').innerHTML = arr.map(h => `
    <div class="hou-item">
      <span class="h-idx">第${['一', '二', '三'][h.idx - 1]}候</span>
      <span class="h-name">${h.name}</span>
      <span class="h-phenom">${h.phenom}</span>
    </div>`).join('');
}
function renderHouYear() {
  const box = document.getElementById('houYear');
  const groups = Object.keys(HOU_MAP).map(term => ({ term, hou: HOU_MAP[term] }));
  box.innerHTML = groups.map(g => `
    <div class="hou-year-group">
      <h4>${g.term}</h4>
      ${g.hou.map(h => `<div class="hou-year-row"><span class="hy-name">${h.idx === 1 ? '初候 ' : h.idx === 2 ? '二候 ' : '三候 '}${h.name}</span><span class="hy-phenom">${h.phenom}</span></div>`).join('')}
    </div>`).join('');
}

/* ============ 渲染：全年总览 ============ */
let ALL_TERMS_FLAT = [];
function renderOverview(health, flat, activeSeason) {
  const tabs = document.getElementById('seasonTabs');
  const tabDefs = [['all', '全部']].concat(SEASON_ORDER.map(s => [s, s]));
  tabs.innerHTML = tabDefs.map(([s, label]) =>
    `<button class="season-tab ${s === activeSeason ? 'active' : ''}" data-season="${s}">${label}</button>`).join('');
  tabs.querySelectorAll('.season-tab').forEach(btn => btn.addEventListener('click', () => {
    renderOverview(health, flat, btn.dataset.season);
  }));

  const grid = document.getElementById('termGrid');
  const cells = health.filter(t => activeSeason === 'all' || t.season === activeSeason);
  const curName = window.__curTermName;
  grid.innerHTML = cells.map(t => {
    const color = SEASON_COLORS[t.season];
    const solarDate = (flat.find(f => f.name === t.term) || {}).date || '';
    const mmdd = solarDate ? solarDate.slice(5).replace('-', '/') : '';
    const isCur = t.term === curName;
    return `<div class="term-cell ${isCur ? 'current' : ''}" data-term="${t.term}" style="--cell-color:${color}">
      <span class="t-name">${t.term}</span>
      <span class="t-solar">${mmdd}</span>
    </div>`;
  }).join('');
  grid.querySelectorAll('.term-cell').forEach(cell => cell.addEventListener('click', () => {
    openTermModal(cell.dataset.term);
  }));
}

/* ============ 弹层 ============ */
function openTermModal(termName) {
  const t = HEALTH_MAP[termName];
  const hou = HOU_MAP[termName] || [];
  const houHTML = hou.map(h => `<div class="hou-year-row"><span class="hy-name">${['初候', '二候', '三候'][h.idx - 1]} ${h.name}</span><span class="hy-phenom">${h.phenom}</span></div>`).join('');
  document.getElementById('modalBody').innerHTML = `
    <h3 style="color:${SEASON_COLORS[t.season]}">${t.term}</h3>
    <p class="m-sub">${t.season}季 · 公历 ${t.solar} · 当令脏腑：${t.organ}</p>
    ${healthHTML(t)}
    <div class="block"><div class="block-title"><span class="dot"></span>七十二候</div>${houHTML}</div>`;
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

/* ============ 打卡 ============ */
function loadCheckins() {
  try { return JSON.parse(localStorage.getItem(CHECKIN_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveCheckins(obj) { localStorage.setItem(CHECKIN_KEY, JSON.stringify(obj)); }
function computeStreak(store) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 200; i++) {
    const ds = dateStr(d);
    const rec = store[ds];
    const any = rec && Object.values(rec).some(Boolean);
    if (any) streak++;
    else if (i === 0) { /* 今日未打卡，继续往前看 */ }
    else break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
function renderCheckin() {
  const store = loadCheckins();
  const today = todayStr();
  const rec = store[today] || {};
  const box = document.getElementById('habits');
  box.innerHTML = HABITS.map(h => `
    <div class="habit ${rec[h.id] ? 'done' : ''}" data-id="${h.id}">
      <span class="box">${rec[h.id] ? '✓' : ''}</span>
      <span class="h-label">${h.label}</span>
    </div>`).join('');
  box.querySelectorAll('.habit').forEach(el => el.addEventListener('click', () => {
    const id = el.dataset.id;
    const s = loadCheckins();
    const r = s[today] || {};
    r[id] = !r[id];
    s[today] = r;
    saveCheckins(s);
    renderCheckin();
  }));
  const streak = computeStreak(store);
  document.getElementById('streakLabel').textContent = `连续打卡 ${streak} 天`;
}

/* ============ 主流程 ============ */
async function init() {
  try {
    const [years, health, hou, hours] = await Promise.all([
      loadJSON('data/solar-terms.json'),
      loadJSON('data/health.json'),
      loadJSON('data/hou.json'),
      loadJSON('data/hours.json'),
    ]);

    health.forEach(t => { HEALTH_MAP[t.term] = t; });
    hou.forEach(h => { HOU_MAP[h.term] = h.hou; });

    const flat = flattenTerms(years);
    ALL_TERMS_FLAT = flat;
    const { cur, next } = findCurrentTerm(flat);
    const daysToNext = next ? daysBetween(todayStr(), next.date) : 0;
    window.__curTermName = cur.name;
    window.__nextTermName = next ? next.name : '';

    const curIdx = currentHourIndex();
    const curHour = hours[curIdx];

    renderHeader(cur, daysToNext, curHour, next ? next.name : '');
    renderMainCard(HEALTH_MAP[cur.name]);
    renderHourBar(hours, curIdx);
    renderHouCurrent(cur.name);
    renderHouYear();
    renderOverview(health, flat, 'all');
    renderCheckin();

    // 全年候历 切换
    const toggleBtn = document.getElementById('toggleHouYear');
    const houYear = document.getElementById('houYear');
    toggleBtn.addEventListener('click', () => {
      const hidden = houYear.classList.toggle('hidden');
      toggleBtn.textContent = hidden ? '查看全年候历' : '收起全年候历';
    });

    // 弹层关闭
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  } catch (err) {
    console.error(err);
    document.getElementById('cardBody').innerHTML =
      `<p class="loading">数据加载失败，请通过本地服务器或 GitHub Pages 访问（请勿用 file:// 直接打开）。<br><small>${err.message}</small></p>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
