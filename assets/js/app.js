'use strict';

/* ============ 配置 ============ */
const SEASON_COLORS = {
  '春': '#5f8a3a',
  '夏': '#c4452f',
  '长夏': '#cf9a1c',
  '秋': '#c47a2c',
  '冬': '#3a5d7a',
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

// 十二地支（时辰盘用单字，更似罗盘）
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 八卦（先天卦序：乾兑离震巽坎艮坤）
const TRIGRAMS = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
// 奇门八门：休生伤杜景死惊开
const EIGHT_MEN = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];

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

/* ============ 头部 + 英雄区 ============ */
let HEALTH_MAP = {};
let HOU_MAP = {};
function termSeasonOf(name) { return HEALTH_MAP[name] ? HEALTH_MAP[name].season : '春'; }

function renderHeaderDate() {
  const now = new Date();
  document.getElementById('todayDate').textContent =
    `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`;
}

function renderHero(term, daysToNext, hour, nextName) {
  const season = (HEALTH_MAP[term.name] && HEALTH_MAP[term.name].season) || term.season || '春';
  document.getElementById('heroTermName').textContent = term.name;
  document.getElementById('heroTermMeta').textContent =
    daysToNext > 0 ? `${season}季 · 距${nextName} ${daysToNext}天` : `${season}季 · 今日交节`;
  document.getElementById('heroHourName').textContent = hour.name;
  document.getElementById('heroHourMeta').textContent = `${hour.meridian} · ${hour.range}`;
}

/* ============ 今日养生主卡 ============ */
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
  document.getElementById('seasonChip').textContent = `${t.season}季 · 交节 ${t.solar}`;
  document.getElementById('seasonChip').style.background = SEASON_COLORS[t.season];
  document.getElementById('cardBody').innerHTML = healthHTML(t);
}

/* ============ 时辰条 ============ */
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

/* ============ 古历罗盘（奇门遁甲：太极·八卦·八门·十二时辰） ============ */
function ringPoint(cx, cy, r, deg) {
  const a = deg * Math.PI / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

function buildLunarClock(hours, curIdx, termName) {
  const cx = 160, cy = 160;
  const R_SHICHEN = 104, R_BAGUA = 128, R_MEN = 62, R_TICK = 150;
  const C = n => n.toFixed(1);

  // 十二时辰：当前时辰旋转至正上方；每个标签反向旋转保持正立
  const counter = curIdx * 30;
  let shichen = '';
  hours.forEach((h, i) => {
    const p = ringPoint(cx, cy, R_SHICHEN, i * 30);
    const cur = i === curIdx ? ' cur' : '';
    shichen += `<text x="${C(p.x)}" y="${C(p.y + 6)}" text-anchor="middle" class="clk-shichen${cur}" transform="rotate(${counter} ${C(p.x)} ${C(p.y)})">${BRANCHES[i]}</text>`;
  });
  const dialRot = -curIdx * 30;

  // 八卦（外环，静止正立）
  let bagua = '';
  TRIGRAMS.forEach((g, i) => {
    const p = ringPoint(cx, cy, R_BAGUA, i * 45 + 22.5);
    bagua += `<text x="${C(p.x)}" y="${C(p.y + 6)}" text-anchor="middle" class="clk-bagua">${g}</text>`;
  });

  // 八门（内环，静止正立）
  let men = '';
  EIGHT_MEN.forEach((m, i) => {
    const p = ringPoint(cx, cy, R_MEN, i * 45 - 90);
    men += `<text x="${C(p.x)}" y="${C(p.y + 5)}" text-anchor="middle" class="clk-men">${m}</text>`;
  });

  // 24 节气刻度（外环，缓慢旋转）
  let ticks = '';
  for (let i = 0; i < 24; i++) {
    const p1 = ringPoint(cx, cy, R_TICK, i * 15);
    const p2 = ringPoint(cx, cy, R_TICK - 8, i * 15);
    ticks += `<line x1="${C(p1.x)}" y1="${C(p1.y)}" x2="${C(p2.x)}" y2="${C(p2.y)}" class="clk-tick"/>`;
  }

  const svg =
    `<svg viewBox="0 0 320 320" class="clk-svg" role="img" aria-label="古历罗盘：太极、八卦、八门与十二时辰">
      <circle cx="160" cy="160" r="156" class="clk-rim"/>
      <g class="clk-spin-ticks">${ticks}</g>
      <circle cx="160" cy="160" r="135" class="clk-ring"/>
      ${bagua}
      <circle cx="160" cy="160" r="78" class="clk-ring"/>
      ${men}
      <circle cx="160" cy="160" r="78" fill="none" stroke="var(--line)" stroke-width="1"/>
      <g class="clk-dial" transform="rotate(0 160 160)">${shichen}</g>
      <polygon points="160,4 151,19 169,19" class="clk-pointer"/>
      <line x1="160" y1="160" x2="160" y2="16" class="clk-scan"/>
      <circle cx="160" cy="160" r="42" fill="var(--paper)" stroke="var(--line-strong)" stroke-width="1"/>
      <g class="clk-spin-taiji">
        <circle cx="160" cy="160" r="18" fill="var(--seal)"/>
        <path d="M160 142 A18 18 0 0 1 160 178 A9 9 0 0 1 160 160 A9 9 0 0 0 160 142 Z" fill="var(--paper)"/>
        <circle cx="160" cy="151" r="3.2" fill="var(--paper)"/>
        <circle cx="160" cy="169" r="3.2" fill="var(--seal)"/>
      </g>
    </svg>`;
  document.getElementById('lunarClock').innerHTML = svg;

  // 机关转动：载入后将时辰盘旋至当前时辰（CSS transition 触发）
  const dial = document.querySelector('.clk-dial');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    dial.setAttribute('transform', `rotate(${dialRot} 160 160)`);
  }));

  const h = hours[curIdx];
  document.getElementById('clockCap').textContent = `${h.name}当令 · 太极流转 · 八卦环列`;
}

/* ============ 七十二候 ============ */
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

/* ============ 全年总览 ============ */
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
    <p class="m-sub">${t.season}季 · 公历 ${t.solar}（交节） · 当令脏腑：${t.organ}</p>
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

/* ============ 道家养生 ============ */
let DAO = null;

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function renderDaoDaily() {
  if (!DAO || !DAO.quotes.length) return;
  const q = DAO.quotes[dayOfYear(new Date()) % DAO.quotes.length];
  document.getElementById('daoDailyText').textContent = `「${q.text}」`;
  document.getElementById('daoDailySrc').textContent = q.source;
  document.getElementById('daoDailyInsight').textContent = q.insight;
  document.getElementById('footMaxim').textContent = `「${q.text}」—— ${q.source}`;
}

function renderDaoSeason(curSeason) {
  const box = document.getElementById('daoSeason');
  box.innerHTML = DAO.seasonGist.map(s => {
    const cur = s.season === curSeason ? ' current' : '';
    const color = SEASON_COLORS[s.season] || 'var(--seal)';
    return `<div class="dao-season-item${cur}" style="--sg:${color}">
      <span class="dsg-season">${s.season}</span>
      <span class="dsg-gist">${s.gist}</span>
    </div>`;
  }).join('');
}

function renderDaoMethods() {
  const box = document.getElementById('daoMethods');
  box.innerHTML = DAO.methods.map(m => {
    const steps = m.how.map(h => `<li>${h}</li>`).join('');
    return `<div class="dao-method">
      <div class="dm-head">
        <span class="dm-name">${m.name}</span>
        <span class="dm-from">${m.from}</span>
      </div>
      <blockquote class="dm-quote">「${m.quote}」</blockquote>
      <div class="dm-sub">行法要点</div>
      <ol class="dm-steps">${steps}</ol>
      <p class="dm-benefit"><span class="dm-tag ok">功效</span>${m.benefit}</p>
      <p class="dm-note"><span class="dm-tag warn">注意</span>${m.note}</p>
    </div>`;
  }).join('');
}

function renderDaoQuotes() {
  const box = document.getElementById('daoQuotes');
  box.innerHTML = DAO.quotes.map(q => `
    <div class="dao-quote">
      <blockquote class="dq-text">「${q.text}」</blockquote>
      <div class="dq-src">${q.source}</div>
      <p class="dq-plain">${q.plain}</p>
    </div>`).join('');
}

/* ============ Tab 切换 ============ */
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = { today: 'tab-today', dao: 'tab-dao', overview: 'tab-overview' };
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.tab;
    Object.keys(panels).forEach(k => {
      document.getElementById(panels[k]).classList.toggle('hidden', k !== target);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

/* ============ 主流程 ============ */
async function init() {
  try {
    const [years, health, hou, hours, dao] = await Promise.all([
      loadJSON('data/solar-terms.json'),
      loadJSON('data/health.json'),
      loadJSON('data/hou.json'),
      loadJSON('data/hours.json'),
      loadJSON('data/daoism.json'),
    ]);

    health.forEach(t => { HEALTH_MAP[t.term] = t; });
    hou.forEach(h => { HOU_MAP[h.term] = h.hou; });
    DAO = dao;

    const flat = flattenTerms(years);
    ALL_TERMS_FLAT = flat;
    const { cur, next } = findCurrentTerm(flat);
    const daysToNext = next ? daysBetween(todayStr(), next.date) : 0;
    window.__curTermName = cur.name;
    window.__nextTermName = next ? next.name : '';

    const curIdx = currentHourIndex();
    const curHour = hours[curIdx];

    renderHeaderDate();
    renderHero(cur, daysToNext, curHour, next ? next.name : '');
    renderMainCard(HEALTH_MAP[cur.name]);
    renderHourBar(hours, curIdx);
    buildLunarClock(hours, curIdx, cur.name);
    renderHouCurrent(cur.name);
    renderHouYear();
    renderOverview(health, flat, 'all');
    renderCheckin();

    // 道家养生
    const curSeason = (HEALTH_MAP[cur.name] && HEALTH_MAP[cur.name].season) || '春';
    renderDaoDaily();
    renderDaoSeason(curSeason);
    renderDaoMethods();
    renderDaoQuotes();

    initTabs();

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
