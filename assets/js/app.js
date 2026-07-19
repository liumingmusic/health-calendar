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
// 二十四节气顺序（外圈历盘用）
const TERM_ORDER = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];
// 方位：北(上) 东(右) 南(下) 西(左) + 四维
const DIRS = [
  { name: '北', deg: 0, major: true }, { name: '东北', deg: 45, major: false },
  { name: '东', deg: 90, major: true }, { name: '东南', deg: 135, major: false },
  { name: '南', deg: 180, major: true }, { name: '西南', deg: 225, major: false },
  { name: '西', deg: 270, major: true }, { name: '西北', deg: 315, major: false },
];

/* ============ 工具 ============ */
function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayStr() { return dateStr(new Date()); }
// 日期散列：用于按日确定地选取内容（同一天稳定、跨天不同）
function dateHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

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

/* ============ 今日总览：首页汇总卡 ============ */
function renderTodayOverview(date, flat, cur, daysToNext, next, curHour, curIdx) {
  const bz = computeBazi(date, curIdx, flat);
  const riZhi = ZHI[bz.pillars.日.z];
  const riGan = GAN[bz.riGan];
  // 建除 + 宜忌
  const jieBranch = JIE_BRANCH[JIE_MONTH.indexOf(
    flat.filter(t => JIE_MONTH.includes(t.name)).sort((a, b) => a.date.localeCompare(b.date))
      .filter(t => t.date <= dateStr(date)).pop().name)];
  const jcIdx = (ZHI.indexOf(riZhi) - ZHI.indexOf(jieBranch) + 12) % 12;
  const jc = JIANCHU[jcIdx];
  const jcYJ = JIANCHU_YIJI[jc];

  // 道家今日功课
  const dh = dateHash(dateStr(date));
  const daoMethod = DAO.methods[dh % DAO.methods.length];
  const daoQuote = DAO.quotes[(Math.floor(dh / 7) + 3) % DAO.quotes.length];

  // 今日一签
  const sign = STICKS.sticks[dateHash(todayStr()) % STICKS.sticks.length];

  // 生肖运程最佳
  const dg = dayGZ(date);
  const rz = ZHI[dg.zhi];
  const ranked = ZODIAC.map(z => ({ s: z.s, score: zodiacScore(z.z, rz).score }))
    .sort((a, b) => b.score - a.score);
  const topZ = ranked[0];

  const now = new Date();
  const season = (HEALTH_MAP[cur.name] && HEALTH_MAP[cur.name].season) || '春';

  document.getElementById('ovSeason').textContent = season + '季';
  document.getElementById('ovDate').textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`;
  document.getElementById('ovGanzhi').textContent = `${bz.pillars.年.gz}年 ${bz.pillars.月.gz}月 ${bz.pillars.日.gz}日 ${bz.pillars.时.gz}时`;
  document.getElementById('ovTerm').textContent = cur.name;
  document.getElementById('ovTermMeta').textContent = daysToNext > 0 ? `距${next ? next.name : ''} ${daysToNext}天` : '今日交节';
  document.getElementById('ovHour').textContent = curHour.name;
  document.getElementById('ovOrgan').textContent = '当令 · ' + curHour.organ;
  document.getElementById('ovBazi').textContent = ['年', '月', '日', '时'].map(k => bz.pillars[k].gz).join(' ');
  document.getElementById('ovYi').textContent = '宜：' + jcYJ.yi.slice(0, 4).join('、');
  document.getElementById('ovJi').textContent = '忌：' + jcYJ.ji.slice(0, 3).join('、');
  document.getElementById('ovDao').textContent = `主修「${daoMethod.name}」· ${daoQuote.source}`;
  document.getElementById('ovSign').innerHTML =
    `<span class="ov-lv">吕祖灵签</span>第${sign.no}签「${sign.title}」`;
  document.getElementById('ovFortune').textContent = `今日最利 · ${topZ.s}`;
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
  let html = healthHTML(t);
  if (CUR_HOUR) {
    html += `
      <div class="block">
        <div class="block-title"><span class="dot"></span>本时辰 · 经络取穴</div>
        <p class="organ-line">${CUR_HOUR.meridian}（${CUR_HOUR.organ}）</p>
        <div class="chips">
          <span class="chip acu">原穴 · ${CUR_HOUR.yuan}</span>
          <span class="chip acu">络穴 · ${CUR_HOUR.luo}</span>
          <span class="chip acu">募穴 · ${CUR_HOUR.mu}</span>
        </div>
      </div>`;
  }
  document.getElementById('cardBody').innerHTML = html;
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

/* ============ 古历罗盘时钟（太极·八卦·八门·十二时辰·方位 + 时分秒指针） ============ */
function ringPoint(cx, cy, r, deg) {
  const a = deg * Math.PI / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}
const C1 = n => n.toFixed(1);
/* 环形扇形路径（rIn~rOut 之间的扇环，角度自正上方顺时针，与 ringPoint 同约定） */
function annSector(cx, cy, rIn, rOut, a0, a1) {
  const o0 = ringPoint(cx, cy, rOut, a0);
  const o1 = ringPoint(cx, cy, rOut, a1);
  const i0 = ringPoint(cx, cy, rIn, a0);
  const i1 = ringPoint(cx, cy, rIn, a1);
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${C1(o0.x)} ${C1(o0.y)} ` +
         `A ${rOut} ${rOut} 0 ${large} 1 ${C1(o1.x)} ${C1(o1.y)} ` +
         `L ${C1(i1.x)} ${C1(i1.y)} ` +
         `A ${rIn} ${rIn} 0 ${large} 0 ${C1(i0.x)} ${C1(i0.y)} Z`;
}

function buildLunarClock(hours, curIdx) {
  const cx = 160, cy = 160;
  const R_JIE = 150, R_JIE_TICK = 153, R_BAGUA = 128, R_DIR = 106, R_MEN = 86, R_SHI = 64;
  const curTerm = window.__curTermName;

  // 外圈：24 节气刻度 + 名称（当前节气高亮）
  let jie = '';
  TERM_ORDER.forEach((name, i) => {
    const deg = i * 15;
    const p1 = ringPoint(cx, cy, R_JIE_TICK, deg);
    const p2 = ringPoint(cx, cy, R_JIE_TICK - 7, deg);
    const isCur = name === curTerm;
    jie += `<line x1="${C1(p1.x)}" y1="${C1(p1.y)}" x2="${C1(p2.x)}" y2="${C1(p2.y)}" class="clk-tick${isCur ? ' cur' : ''}"/>`;
    const pn = ringPoint(cx, cy, R_JIE, deg);
    jie += `<text x="${C1(pn.x)}" y="${C1(pn.y + 3)}" text-anchor="middle" class="clk-jie${isCur ? ' cur' : ''}">${name}</text>`;
  });

  // 八卦环
  let bagua = '';
  TRIGRAMS.forEach((g, i) => {
    const p = ringPoint(cx, cy, R_BAGUA, i * 45 + 22.5);
    bagua += `<text x="${C1(p.x)}" y="${C1(p.y + 6)}" text-anchor="middle" class="clk-bagua">${g}</text>`;
  });

  // 方位环（北东南西 + 四维）
  let dir = '';
  DIRS.forEach(d => {
    const p = ringPoint(cx, cy, R_DIR, d.deg);
    dir += `<text x="${C1(p.x)}" y="${C1(p.y + 4)}" text-anchor="middle" class="clk-dir${d.major ? ' major' : ''}">${d.name}</text>`;
  });

  // 八门环
  let men = '';
  EIGHT_MEN.forEach((m, i) => {
    const p = ringPoint(cx, cy, R_MEN, i * 45 - 90);
    men += `<text x="${C1(p.x)}" y="${C1(p.y + 5)}" text-anchor="middle" class="clk-men">${m}</text>`;
  });

  // 十二时辰环（静止；当前时辰高亮）
  let shi = '';
  hours.forEach((h, i) => {
    const p = ringPoint(cx, cy, R_SHI, i * 30);
    const cur = i === curIdx ? ' cur' : '';
    shi += `<text x="${C1(p.x)}" y="${C1(p.y + 6)}" text-anchor="middle" class="clk-shichen${cur}">${BRANCHES[i]}</text>`;
  });

  // 雷达扫描 = 秒针本身：朝上的光束 + 尾随覆盖扇（50°）+ 尖端亮点；由 startClock 按 s*6 逐帧旋转（60s/圈）
  const sweepAngle = 50; // 尾随覆盖扇的张角
  const radarTrail = `<path class="clk-radar-trail" d="${annSector(cx, cy, 0, 150, -sweepAngle, 0)}"/>`;
  const beamTip = ringPoint(cx, cy, 150, 0);
  const radarBeam = `<line class="clk-radar-beam" x1="${cx}" y1="${cy}" x2="${C1(beamTip.x)}" y2="${C1(beamTip.y)}"/>`;
  const radarDot = `<circle class="clk-radar-dot" cx="${C1(beamTip.x)}" cy="${C1(beamTip.y)}" r="4"/>`;
  const shiCover = `<path class="clk-cover" d="${annSector(cx, cy, 58, 66, curIdx * 30 - 15, curIdx * 30 + 15)}"/>`;

  const svg =
    `<svg viewBox="0 0 320 320" class="clk-svg" role="img" aria-label="古历罗盘时钟：太极、八卦、八门、十二时辰、方位与二十四节气，时分秒指针中秒针即雷达扫描光束">
      <circle cx="160" cy="160" r="156" class="clk-rim"/>
      <defs>
        <radialGradient id="radarTrailGrad" cx="160" cy="160" r="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="var(--seal)" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="var(--seal)" stop-opacity="0.03"/>
        </radialGradient>
      </defs>
      ${jie}
      <circle cx="160" cy="160" r="138" class="clk-ring"/>
      ${bagua}
      <circle cx="160" cy="160" r="116" class="clk-ring"/>
      ${dir}
      <circle cx="160" cy="160" r="94" class="clk-ring"/>
      ${men}
      <circle cx="160" cy="160" r="72" class="clk-ring"/>
      ${shiCover}
      ${shi}
      <g id="clkHands">
        <line id="clkHandShi" x1="160" y1="162" x2="160" y2="98" class="clk-hand-shi"/>
        <line id="clkHandMin" x1="160" y1="162" x2="160" y2="56" class="clk-hand-min"/>
        <g id="clkRadar">
          ${radarTrail}
          ${radarBeam}
          ${radarDot}
        </g>
        <circle cx="160" cy="160" r="5.5" class="clk-hub"/>
      </g>
      <g class="clk-spin-taiji">
        <circle cx="160" cy="160" r="15" fill="var(--seal)"/>
        <path d="M160 145 A15 15 0 0 1 160 175 A7.5 7.5 0 0 1 160 160 A7.5 7.5 0 0 0 160 145 Z" fill="var(--paper)"/>
        <circle cx="160" cy="152.5" r="2.6" fill="var(--paper)"/>
        <circle cx="160" cy="167.5" r="2.6" fill="var(--seal)"/>
      </g>
    </svg>`;
  document.getElementById('lunarClock').innerHTML = svg;

  const h = hours[curIdx];
  document.getElementById('clockCap').textContent = `${h.name}当令 · 雷达光束扫过盘面 · 当前时辰覆盖扇高亮`;
}

/* 真实钟表走字：时辰指针（时）+ 分针 + 秒针，平滑走动（逐帧细分角度，无跳秒） */
function startClock() {
  const setRot = (id, deg) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('transform', `rotate(${deg.toFixed(3)} 160 160)`);
  };
  const loop = () => {
    const now = new Date();
    const ms = now.getMilliseconds();
    const s = now.getSeconds() + ms / 1000;
    const m = now.getMinutes() + s / 60;
    const hh = (now.getHours() % 12) + m / 60;
    setRot('clkRadar', s * 6);
    setRot('clkHandMin', m * 6);
    setRot('clkHandShi', hh * 30);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
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
let STICKS = null;

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
  box.innerHTML = DAO.methods.map((m, idx) => {
    const steps = m.how.map(h => `<li>${h}</li>`).join('');
    return `<div class="dao-method" data-i="${idx}">
      <div class="dm-summary">
        <span class="dm-caret">▸</span>
        <span class="dm-name">${m.name}</span>
        <span class="dm-from">${m.from}</span>
      </div>
      <div class="dm-detail"><div>
        <blockquote class="dm-quote">「${m.quote}」</blockquote>
        <div class="dm-sub">行法要点</div>
        <ol class="dm-steps">${steps}</ol>
        <p class="dm-benefit"><span class="dm-tag ok">功效</span>${m.benefit}</p>
        <p class="dm-note"><span class="dm-tag warn">注意</span>${m.note}</p>
      </div></div>
    </div>`;
  }).join('');
  box.querySelectorAll('.dao-method').forEach(el =>
    el.addEventListener('click', () => el.classList.toggle('open')));
}

function renderDaoQuotes() {
  const box = document.getElementById('daoQuotes');
  box.innerHTML = DAO.quotes.map((q, idx) => `
    <div class="dao-quote" data-i="${idx}">
      <div class="dq-summary">
        <span class="dq-caret">▸</span>
        <blockquote class="dq-text">「${q.text}」</blockquote>
        <div class="dq-src">${q.source}</div>
      </div>
      <div class="dq-detail"><div>
        <p class="dq-plain">${q.plain}</p>
      </div></div>
    </div>`).join('');
  box.querySelectorAll('.dao-quote').forEach(el =>
    el.addEventListener('click', () => el.classList.toggle('open')));
}

/* 今日道家功课：按日确定地轮换，使「道家养生」每天不同、各有侧重 */
const DAO_PROMPTS = [
  '今日静坐一刻，观息归根，不随念转。',
  '晨起缓行，披发广步，与生发之气相和。',
  '遇事少言，先吸三息，再作回应。',
  '食不知味时停箸，问己：此身所需几何？',
  '睡前放下万缘，如舟泊岸，神归丹田。',
  '行住坐卧，常令脊直肩松，气自下沉。',
];
function renderDaoTodayLesson(date, curSeason) {
  if (!DAO) return;
  const h = dateHash(dateStr(date));
  const method = DAO.methods[h % DAO.methods.length];
  const quote = DAO.quotes[(Math.floor(h / 7) + 3) % DAO.quotes.length];
  const prompt = DAO_PROMPTS[h % DAO_PROMPTS.length];
  const gist = (DAO.seasonGist.find(s => s.season === curSeason) || DAO.seasonGist[0]).gist;

  document.getElementById('daoLessonDay').textContent = `${curSeason}季 · 今日功课`;
  document.getElementById('daoLessonBody').innerHTML = `
    <div class="dao-lesson-block">
      <span class="dl-k">主修功法</span>
      <div class="dl-method-name">${method.name}</div>
      <blockquote class="dl-method-quote">「${method.quote}」</blockquote>
      <ol class="dl-method-steps">${method.how.slice(0, 2).map(s => `<li>${s}</li>`).join('')}</ol>
      <p class="dl-method-benefit"><b>功效：</b>${method.benefit}</p>
    </div>
    <div class="dao-lesson-block">
      <span class="dl-k">今日诵持</span>
      <p class="dl-quote-text">「${quote.text}」</p>
      <div class="dl-quote-src">${quote.source}</div>
    </div>
    <div class="dao-lesson-block">
      <span class="dl-k">今日心法</span>
      <p class="dl-prompt">${prompt}</p>
    </div>
    <div class="dao-lesson-block">
      <span class="dl-k">当令要旨</span>
      <p class="dl-season">${gist}</p>
    </div>`;
}

/* ============ 八字 · 黄历 · 方位 · 经络取穴 ============ */
let CUR_HOUR = null;            // 当前时辰数据（取穴用）
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
const PENG_GAN = ['不开仓财物耗散', '不栽植千株不长', '不修灶必见灾殃', '不剃头头必生疮', '不受田田主不祥', '不破券二比并亡', '不经络织机虚张', '不合酱主人不尝', '不汲水更难提防', '不词讼理弱敌强'];
const PENG_ZHI = ['不问卜自惹祸殃', '不冠带主不还乡', '不祭祀神鬼不尝', '不穿井水泉不香', '不哭泣必主重丧', '不远行财物伏藏', '不苫盖屋主更张', '不服药毒气入肠', '不安床鬼祟入房', '不会客醉坐颠狂', '不吃犬作怪上床', '不嫁娶不利新郎'];
// 值神（黄黑道），按下地支
const ZHISHEN = [
  { z: '子', n: '青龙', type: '黄' }, { z: '丑', n: '明堂', type: '黄' }, { z: '寅', n: '天刑', type: '黑' },
  { z: '卯', n: '朱雀', type: '黑' }, { z: '辰', n: '金匮', type: '黄' }, { z: '巳', n: '天德', type: '黄' },
  { z: '午', n: '白虎', type: '黑' }, { z: '未', n: '玉堂', type: '黄' }, { z: '申', n: '天牢', type: '黑' },
  { z: '酉', n: '玄武', type: '黑' }, { z: '戌', n: '司命', type: '黄' }, { z: '亥', n: '勾陈', type: '黑' },
];
// 冲煞，按下地支
const CHONGSHA = [
  { z: '子', chong: '马', sha: '南' }, { z: '丑', chong: '羊', sha: '东' }, { z: '寅', chong: '猴', sha: '北' },
  { z: '卯', chong: '鸡', sha: '西' }, { z: '辰', chong: '狗', sha: '南' }, { z: '巳', chong: '猪', sha: '东' },
  { z: '午', chong: '鼠', sha: '北' }, { z: '未', chong: '牛', sha: '西' }, { z: '申', chong: '虎', sha: '南' },
  { z: '酉', chong: '兔', sha: '东' }, { z: '戌', chong: '龙', sha: '北' }, { z: '亥', chong: '蛇', sha: '西' },
];
// 喜神 / 财神 / 福神（下日干）
const XISHEN = { 甲: '东北', 乙: '西北', 丙: '西南', 丁: '正南', 戊: '东南', 己: '东北', 庚: '西北', 辛: '西南', 壬: '正南', 癸: '东南' };
const CAISHEN = { 甲: '东北', 乙: '东北', 丙: '正南', 丁: '正南', 戊: '正北', 己: '正北', 庚: '正东', 辛: '正东', 壬: '正西', 癸: '正西' };
const FUSHEN = { 甲: '东南', 乙: '东南', 丙: '正东', 丁: '正东', 戊: '正北', 己: '正北', 庚: '西南', 辛: '西南', 壬: '西北', 癸: '西北' };
// 月建之「节」与对应月支
const JIE_MONTH = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
const JIE_BRANCH = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
// 地支 → 简化方位
const DIR_OF_ZHI = { 子: '北', 丑: '东北', 寅: '东北', 卯: '东', 辰: '东南', 巳: '东南', 午: '南', 未: '西南', 申: '西南', 酉: '西', 戌: '西北', 亥: '西北' };
// 建除十二神 + 宜忌
const JIANCHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
const JIANCHU_YIJI = {
  '建': { yi: ['出行', '祈福', '动土', '订盟', '嫁娶', '修造'], ji: ['开仓', '出货', '乘船'] },
  '除': { yi: ['沐浴', '求医', '疗病', '扫舍', '祭祀'], ji: ['求官', '上任', '出行'] },
  '满': { yi: ['祭祀', '祈福', '开市', '交易', '纳财'], ji: ['动土', '安葬', '移徙'] },
  '平': { yi: ['修造', '嫁娶', '安神', '移徙'], ji: ['开渠', '放水', '栽种'] },
  '定': { yi: ['祭祀', '祈福', '嫁娶', '造屋', '入宅'], ji: ['词讼', '出行', '医疗'] },
  '执': { yi: ['捕捉', '修造', '嫁娶', '祈福'], ji: ['开市', '移徙', '出行'] },
  '破': { yi: ['（诸事不宜）'], ji: ['一切兴作', '嫁娶', '出行'] },
  '危': { yi: ['安床', '祭祀', '祈福'], ji: ['出行', '登高', '乘船'] },
  '成': { yi: ['嫁娶', '开市', '入学', '动土', '修造'], ji: ['词讼', '出行'] },
  '收': { yi: ['收纳', '嫁娶', '入仓', '纳财'], ji: ['放债', '出行', '安葬'] },
  '开': { yi: ['祭祀', '祈福', '开市', '动土', '出行'], ji: ['安葬', '嫁娶'] },
  '闭': { yi: ['筑堤', '补垣', '埋穴', '安葬'], ji: ['开市', '出行', '求医'] },
};

/* ============ 奇门遁甲（简化示意排盘） ============ */
const QIMEN_STARS = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英']; // 宫1..9
const QIMEN_MEN = ['休', '生', '伤', '杜', '景', '死', '惊', '开']; // 八门顺序
const MEN_PALACE = { 1: '休', 3: '伤', 4: '杜', 2: '死', 9: '景', 7: '惊', 8: '生', 6: '开' }; // 门本宫
const QIMEN_SHEN = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
const PALACE_INFO = {
  1: { gua: '坎', dir: '北' }, 2: { gua: '坤', dir: '西南' }, 3: { gua: '震', dir: '东' },
  4: { gua: '巽', dir: '东南' }, 5: { gua: '中', dir: '中' }, 6: { gua: '乾', dir: '西北' },
  7: { gua: '兑', dir: '西' }, 8: { gua: '艮', dir: '东北' }, 9: { gua: '离', dir: '南' },
};
// 九宫格在屏幕上的洛书位置（行、列）
const LUOSHU_POS = {
  4: [1, 1], 9: [1, 2], 2: [1, 3],
  3: [2, 1], 5: [2, 2], 7: [2, 3],
  8: [3, 1], 1: [3, 2], 6: [3, 3],
};
// 节气 -> 局数（上元局号，阳遁取奇数值/阴遁取偶数值，仅作示意）
const QIMEN_JU = {
  '冬至': 1, '小寒': 2, '大寒': 3, '立春': 8, '雨水': 9, '惊蛰': 1,
  '春分': 3, '清明': 4, '谷雨': 5, '立夏': 4, '小满': 5, '芒种': 6,
  '夏至': 9, '小暑': 8, '大暑': 7, '立秋': 2, '处暑': 1, '白露': 9,
  '秋分': 7, '寒露': 6, '霜降': 5, '立冬': 6, '小雪': 5, '大雪': 4,
};
const YANG_TERMS = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种'];
const XUN_LIUYI = { '甲子': '戊', '甲戌': '己', '甲申': '庚', '甲午': '辛', '甲辰': '壬', '甲寅': '癸' };
const LIUYI_ORDER = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
function nextPalace(p, yang) { return yang ? (p % 9) + 1 : (p === 1 ? 9 : p - 1); }

function renderQimen(date) {
  const termName = window.__curTermName || '夏至';
  const yang = YANG_TERMS.includes(termName);
  const ju = QIMEN_JU[termName] || 1;
  const dg = dayGZ(date);
  const riIdx = gzSolve(dg.gan, dg.zhi);
  const xunStart = Math.floor(riIdx / 10) * 10;
  const xunShouZhi = ZHI[xunStart % 12];
  const liuyiChar = XUN_LIUYI['甲' + xunShouZhi];

  // 三奇六仪布局（阳遁顺、阴遁逆，起局于 ju 宫）
  const yiMap = {};
  let p = ju;
  for (let i = 0; i < 9; i++) { yiMap[p] = LIUYI_ORDER[i]; p = nextPalace(p, yang); }
  // 旬首落宫 = 含 liuyiChar 的宫
  let valuePalace = 5;
  for (const k in yiMap) if (yiMap[k] === liuyiChar) { valuePalace = +k; break; }
  // 九星布局：值符星起于旬首落宫
  const starAtValue = valuePalace - 1;
  const starMap = {};
  p = valuePalace;
  for (let i = 0; i < 9; i++) {
    starMap[p] = QIMEN_STARS[((starAtValue + (yang ? i : -i)) % 9 + 9) % 9];
    p = nextPalace(p, yang);
  }
  // 八门布局：值使门起于旬首落宫
  const menAtValue = MEN_PALACE[valuePalace] || null;
  const menMap = {};
  if (menAtValue) {
    const menIdx = QIMEN_MEN.indexOf(menAtValue);
    menMap[valuePalace] = menAtValue;
    p = nextPalace(valuePalace, yang);
    for (let i = 1; i < 8; i++) {
      menMap[p] = QIMEN_MEN[((menIdx + (yang ? i : -i)) % 8 + 8) % 8];
      p = nextPalace(p, yang);
    }
  }
  // 八神布局（阳顺阴逆，顺序固定）
  const shenMap = {};
  shenMap[valuePalace] = '值符';
  p = nextPalace(valuePalace, yang);
  for (let i = 1; i < 8; i++) {
    shenMap[p] = QIMEN_SHEN[yang ? (i % 8) : ((8 - i) % 8)];
    p = nextPalace(p, yang);
  }

  let cells = '';
  for (let g = 1; g <= 9; g++) {
    const [r, c] = LUOSHU_POS[g];
    const info = PALACE_INFO[g];
    const star = starMap[g] || '';
    const men = menMap[g] || '';
    const shen = shenMap[g] || '';
    const yi = yiMap[g] || '';
    const cls = ['qm-cell'];
    if (g === 5) cls.push('center');
    if (g === valuePalace) cls.push('zhifu');       // 值符落宫
    if (menAtValue && g === valuePalace) cls.push('zhishi'); // 值使落宫
    cells += `<div class="${cls.join(' ')}" style="grid-row:${r};grid-column:${c}">
      <span class="qm-luoshu">${g}</span>
      <span class="qm-gua">${info.gua}</span>
      <span class="qm-dir">${info.dir}</span>
      ${shen ? `<span class="qm-shen">${shen}</span>` : ''}
      <span class="qm-star">${star}</span>
      ${men ? `<span class="qm-men">${men}</span>` : ''}
      <span class="qm-yi">${yi}</span>
    </div>`;
  }
  document.getElementById('qimenBoard').innerHTML = cells;
  document.getElementById('qimenCap').textContent =
    `今日${yang ? '阳遁' : '阴遁'}${ju}局 · 旬首甲${xunShouZhi}${liuyiChar} · 值符${starMap[valuePalace]} · 值使${menAtValue || '—'}门`;
}

/* ============ 天干地支全览 ============ */
function renderGanzhi(date) {
  const GAN_YIN = { 甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳', 己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴' };
  const ZHI_YIN = {}; ZHI.forEach((z, i) => { ZHI_YIN[z] = (i % 2 === 0 ? '阳' : '阴'); });
  const ZODIAC_ZHI = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };
  const dg = dayGZ(date);
  const riGan = GAN[dg.gan], riZhi = ZHI[dg.zhi];
  const nowIdx = gzSolve(dg.gan, dg.zhi);
  const ganRows = GAN.map(g => `<tr class="${g === riGan ? 'gz-now' : ''}"><td>${g}</td><td>${GAN_YIN[g]}</td><td>${GAN_WX[g]}</td></tr>`).join('');
  const zhiRows = ZHI.map(z => `<tr class="${z === riZhi ? 'gz-now' : ''}"><td>${z}</td><td>${ZHI_YIN[z]}</td><td>${ZHI_WX[z]}</td><td>${ZODIAC_ZHI[z]}</td></tr>`).join('');
  const jiazi = [];
  for (let i = 0; i < 60; i++) {
    const g = GAN[i % 10], z = ZHI[i % 12];
    jiazi.push(`<div class="gz-jz${i === nowIdx ? ' now' : ''}">${g}${z}</div>`);
  }
  document.getElementById('ganzhiBody').innerHTML = `
    <div class="gz-section">
      <div class="gz-h">十天干（今日日干 ${riGan} 高亮）</div>
      <table class="gz-table"><thead><tr><th>天干</th><th>阴阳</th><th>五行</th></tr></thead><tbody>${ganRows}</tbody></table>
    </div>
    <div class="gz-section">
      <div class="gz-h">十二地支（今日日支 ${riZhi} 高亮）</div>
      <table class="gz-table"><thead><tr><th>地支</th><th>阴阳</th><th>五行</th><th>生肖</th></tr></thead><tbody>${zhiRows}</tbody></table>
    </div>
    <div class="gz-section">
      <div class="gz-h">六十甲子（今日 ${riGan}${riZhi} 高亮）</div>
      <div class="gz-jiazi">${jiazi.join('')}</div>
    </div>`;
}

function jdn(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524;
}
function gzSolve(ganIdx, zhiIdx) {
  for (let k = 0; k < 60; k++) if (k % 10 === ganIdx && k % 12 === zhiIdx) return k;
  return 0;
}
// 年柱：以立春为界
function yearGZ(date, flat) {
  const y = date.getFullYear();
  const lc = flat.find(t => t.name === '立春' && t.date.startsWith(y + '-'))
    || flat.find(t => t.name === '立春' && t.date.startsWith((y - 1) + '-'));
  let yFor = y;
  if (lc && dateStr(date) < lc.date) yFor = y - 1;
  return { gan: (((yFor - 4) % 10) + 10) % 10, zhi: (((yFor - 4) % 12) + 12) % 12 };
}
// 月柱：以「节」为界
function monthGZ(date, flat) {
  const jieList = flat.filter(t => JIE_MONTH.includes(t.name)).sort((a, b) => a.date.localeCompare(b.date));
  let cur = jieList[0];
  for (const t of jieList) if (t.date <= dateStr(date)) cur = t;
  const branch = JIE_BRANCH[JIE_MONTH.indexOf(cur.name)];
  const yg = yearGZ(date, flat).gan;
  const zhengYue = { 甲: 2, 乙: 4, 丙: 6, 丁: 8, 戊: 0, 己: 2, 庚: 4, 辛: 6, 壬: 8, 癸: 0 }[GAN[yg]];
  const p = (ZHI.indexOf(branch) - ZHI.indexOf('寅') + 12) % 12;
  return { gan: (zhengYue + p) % 10, zhi: ZHI.indexOf(branch) };
}
// 日柱：儒略日算法（偏移 11，0=甲子）
function dayGZ(date) {
  const idx = (((jdn(date.getFullYear(), date.getMonth() + 1, date.getDate()) - 11) % 60) + 60) % 60;
  return { gan: idx % 10, zhi: idx % 12 };
}
// 时柱：五鼠遁（日上起时）
function hourGZ(hourIdx, dayGan) {
  const ziGan = { 甲: 0, 乙: 2, 丙: 4, 丁: 6, 戊: 8, 己: 0, 庚: 2, 辛: 4, 壬: 6, 癸: 8 }[GAN[dayGan]];
  return { gan: (ziGan + hourIdx) % 10, zhi: hourIdx };
}
function pillar(g, z) {
  const idx = gzSolve(g, z);
  return { g, z, gz: GAN[g] + ZHI[z], wx: GAN_WX[GAN[g]] + ZHI_WX[ZHI[z]], nayin: NAYIN[Math.floor(idx / 2)] };
}
function computeBazi(date, hourIdx, flat) {
  const y = yearGZ(date, flat), m = monthGZ(date, flat), d = dayGZ(date), h = hourGZ(hourIdx, d.gan);
  const pillars = { 年: pillar(y.gan, y.zhi), 月: pillar(m.gan, m.zhi), 日: pillar(d.gan, d.zhi), 时: pillar(h.gan, h.zhi) };
  // 五行统计（四柱 干支）
  const cnt = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  ['年', '月', '日', '时'].forEach(k => {
    cnt[GAN_WX[GAN[pillars[k].g]]]++;
    cnt[ZHI_WX[ZHI[pillars[k].z]]]++;
  });
  return { pillars, riGan: d.gan, wuxing: cnt };
}

function renderAlmanac(date, hourIdx, flat) {
  const bz = computeBazi(date, hourIdx, flat);
  const riZhi = ZHI[bz.pillars.日.z];
  const riGan = GAN[bz.riGan];
  // 四柱卡
  const pillarHTML = ['年', '月', '日', '时'].map(k => {
    const p = bz.pillars[k];
    return `<div class="bz-pillar">
      <span class="bz-label">${k === '日' ? '日主' : k + '柱'}</span>
      <span class="bz-gz">${p.gz}</span>
      <span class="bz-wx">${p.wx}</span>
      <span class="bz-nayin">${p.nayin}</span>
    </div>`;
  }).join('');
  const wxHTML = ['木', '火', '土', '金', '水'].map(w =>
    `<span class="wx-tag wx-${w}">${w} ${bz.wuxing[w]}</span>`).join('');

  // 值神 / 冲煞
  const zs = ZHISHEN[ZHI.indexOf(riZhi)];
  const cs = CHONGSHA[ZHI.indexOf(riZhi)];
  // 建除
  const jieBranch = JIE_BRANCH[JIE_MONTH.indexOf(
    flat.filter(t => JIE_MONTH.includes(t.name)).sort((a, b) => a.date.localeCompare(b.date))
      .filter(t => t.date <= dateStr(date)).pop().name)];
  const jcIdx = (ZHI.indexOf(riZhi) - ZHI.indexOf(jieBranch) + 12) % 12;
  const jc = JIANCHU[jcIdx];
  const jcYJ = JIANCHU_YIJI[jc];
  // 方位：喜/财/福（日干）+ 太岁（年支）
  const nianZhi = ZHI[bz.pillars.年.z];
  const taiDir = DIR_OF_ZHI[nianZhi];
  const suiPo = DIR_OF_ZHI[ZHI[(ZHI.indexOf(nianZhi) + 6) % 12]];
  const sanShaMap = { '申': '南', '子': '南', '辰': '南', '亥': '西', '卯': '西', '未': '西', '寅': '北', '午': '北', '戌': '北', '巳': '东', '酉': '东', '丑': '东' };
  const sanSha = sanShaMap[nianZhi] || '—';
  const xi = XISHEN[riGan], cai = CAISHEN[riGan], fu = FUSHEN[riGan];
  // 经络取穴（当前时辰）
  const h = CUR_HOUR;

  document.getElementById('baziPillars').innerHTML = pillarHTML;
  document.getElementById('baziWuxing').innerHTML = wxHTML;
  document.getElementById('baziSummary').textContent =
    `日主 ${riGan}，五行${bz.wuxing.木 > 0 ? '' : ''}偏${dominant(bz.wuxing)}；农历 ${lunarLabel(date, bz)}`;
  document.getElementById('almanacBody').innerHTML = `
    <div class="alm-grid">
      <div class="alm-card">
        <div class="alm-h">黄历宜忌</div>
        <p class="alm-row"><span class="alm-k">建除</span>${jc}日</p>
        <p class="alm-yi">宜：${jcYJ.yi.join('、')}</p>
        <p class="alm-ji">忌：${jcYJ.ji.join('、')}</p>
        <p class="alm-row"><span class="alm-k">值神</span>${zs.n}（<b class="${zs.type === '黄' ? 'huang' : 'hei'}">${zs.type}道</b>）</p>
        <p class="alm-row"><span class="alm-k">冲煞</span>冲${cs.chong}煞${cs.sha}</p>
        <p class="alm-row"><span class="alm-k">彭祖</span>${riGan}${PENG_GAN[bz.riGan]}；${riZhi}${PENG_ZHI[ZHI.indexOf(riZhi)]}</p>
      </div>
      <div class="alm-card">
        <div class="alm-h">吉神方位</div>
        <p class="alm-row"><span class="alm-k">喜神</span>${xi}</p>
        <p class="alm-row"><span class="alm-k">财神</span>${cai}</p>
        <p class="alm-row"><span class="alm-k">福神</span>${fu}</p>
        <p class="alm-row"><span class="alm-k">太岁</span>${taiDir}（${nianZhi}）</p>
        <p class="alm-row"><span class="alm-k">岁破</span>${suiPo}</p>
        <p class="alm-row"><span class="alm-k">三煞</span>${sanSha}方</p>
      </div>
      <div class="alm-card alm-meridian">
        <div class="alm-h">经络 · 取穴（${h.name}）</div>
        <p class="alm-mer-line"><b>${h.meridian}</b>（${h.organ}）</p>
        <p class="alm-row"><span class="alm-k">原穴</span>${h.yuan}</p>
        <p class="alm-row"><span class="alm-k">络穴</span>${h.luo}</p>
        <p class="alm-row"><span class="alm-k">募穴</span>${h.mu}</p>
        <p class="alm-mer-tip">原穴为本经气血输注之处，络穴联络表里两经，募穴为脏腑之气结聚于胸腹之所。</p>
      </div>
    </div>`;

  document.getElementById('baziSummaryCard').innerHTML =
    `<span class="sc-k">今日</span>${riGan}${riZhi}日（${bz.pillars.日.nayin}）· ${jc}日 · ${zs.n}${zs.type}道<br>` +
    `<span class="sc-yi">宜：${jcYJ.yi.slice(0, 5).join('、')}</span>　<span class="sc-ji">忌：${jcYJ.ji.slice(0, 4).join('、')}</span><br>` +
    `<span class="sc-k">吉神</span>喜神${xi} · 财神${cai} · 福神${fu}`;
}
function dominant(cnt) {
  let max = '', v = -1;
  for (const k in cnt) if (cnt[k] > v) { v = cnt[k]; max = k; }
  return max;
}
function lunarLabel(date, bz) {
  // 简化农历标注：年干支 + 月 + 日。具体农历月日需农历库，此处给干支月日。
  return `${bz.pillars.年.gz}年 ${bz.pillars.月.gz}月 ${bz.pillars.日.gz}日`;
}

/* ============ 每日签运：每日一签（吕祖灵签通行本） ============ */
// 说明：签文录自《吕祖灵签》通行本（吕洞宾，道教全真道纯阳祖师，共一百签）。
// 原签本不逐签标注吉凶，故本站不伪造吉凶等级与养生解读，仅呈签诗与解曰原文。
const SIGN_INTRO = '《吕祖灵签》共一百签，吕祖即吕洞宾，道教全真道尊为纯阳祖师。签文古奥，宜自参悟；此处仅录签诗与解曰原文，不作吉凶断言，亦不替代道观实物签谱。';

function renderSignResult(s) {
  document.getElementById('signNo').textContent = `第 ${s.no} 签`;
  document.getElementById('signTitle').textContent = s.title;
  document.getElementById('signPoem').innerHTML = s.poem.map(p => `<span>${p}</span>`).join('');
  document.getElementById('signJie').textContent = s.jie;
}
function buildSticks() {
  const holder = document.getElementById('qianSticks');
  if (!holder) return;
  holder.innerHTML = '';
  const COUNT = 11;
  const seed = dateHash(todayStr());
  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement('span');
    s.className = 'qian-stick';
    const n1 = (seed * 9301 + 49297 + i * 113) % 233280;
    const n2 = (seed * 49297 + 9301 + i * 131) % 233280;
    const n3 = (seed * 233280 + 49297 + i * 97) % 233280;
    const n4 = (seed * 35537 + 11113 + i * 71) % 233280;
    const tx = -26 + (n1 / 233280) * 52;
    const rot = -16 + (n2 / 233280) * 32;
    const h = 30 + (n3 / 233280) * 22;
    const delay = (n4 / 233280) * 150;
    s.style.setProperty('--tx', tx.toFixed(1) + 'px');
    s.style.setProperty('--rot', rot.toFixed(1) + 'deg');
    s.style.setProperty('--h', Math.round(h) + 'px');
    s.style.setProperty('--delay', Math.round(delay) + 'ms');
    holder.appendChild(s);
  }
}
function setupSign() {
  if (!STICKS) return;
  const stage = document.getElementById('signStage');
  const tong = document.getElementById('qianTong');
  const result = document.getElementById('signResult');
  const shakeBtn = document.getElementById('shakeSign');
  const rerollBtn = document.getElementById('rerollSign');
  const promptEl = document.getElementById('signPrompt');
  const shakingEl = document.getElementById('signShaking');
  const sticks = STICKS.sticks;
  if (!sticks.length) return;
  document.getElementById('signIntro').textContent = SIGN_INTRO;
  buildSticks();
  const PIOUS = '摇签之前，宜焚香净手、心诚意正，于心中默念所问之事，不可戏谑；签出之后，宜静坐片刻、反求诸己。';
  promptEl.textContent =
    '焚香净手，心诚意正，于心中默念所问之事，再摇签筒以求今日之签。';

  const SHOW_MS = 5000;   // 真实摇晃 5 秒
  let busy = false;

  function reveal(idx) {
    renderSignResult(sticks[idx]);
    result.classList.remove('hidden'); result.classList.add('show');
    stage.classList.add('revealed');
    shakeBtn.classList.add('hidden'); rerollBtn.classList.remove('hidden');
    shakingEl.classList.add('hidden');
    promptEl.classList.remove('hidden');
    promptEl.textContent = PIOUS;
    busy = false;
  }

  // 真实摇签：筒中签支剧烈摇晃 5 秒 -> 停筒 -> 展开签文
  function doShake(dailyIdx) {
    if (busy) return; busy = true;
    stage.classList.remove('revealed');
    result.classList.remove('show'); result.classList.add('hidden');
    rerollBtn.classList.add('hidden');
    shakeBtn.classList.add('hidden');
    promptEl.classList.add('hidden');
    shakingEl.classList.remove('hidden');
    tong.classList.add('shaking'); stage.classList.add('shaking');
    setTimeout(() => {
      tong.classList.remove('shaking'); stage.classList.remove('shaking');
      setTimeout(() => { reveal(dailyIdx); }, 700); // 筒停稳后展开签文
    }, SHOW_MS);
  }

  shakeBtn.addEventListener('click', () => doShake(dateHash(todayStr()) % sticks.length));
  rerollBtn.addEventListener('click', () => {
    const cur = dateHash(todayStr()) % sticks.length;
    let r = cur;
    if (sticks.length > 1) { do { r = Math.floor(Math.random() * sticks.length); } while (r === cur); }
    doShake(r);
  });
}

/* 今日运程：生肖 12 运程（依当日干支）+ 本日干支综论 */
const ZODIAC = [
  { s: '鼠', z: '子' }, { s: '牛', z: '丑' }, { s: '虎', z: '寅' }, { s: '兔', z: '卯' },
  { s: '龙', z: '辰' }, { s: '蛇', z: '巳' }, { s: '马', z: '午' }, { s: '羊', z: '未' },
  { s: '猴', z: '申' }, { s: '鸡', z: '酉' }, { s: '狗', z: '戌' }, { s: '猪', z: '亥' },
];
const Z_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const SIX_HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const SAN_HE = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']];
const LIU_CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const LIU_HAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
const SAN_XING = [['寅', '巳'], ['巳', '寅'], ['寅', '申'], ['申', '寅'], ['巳', '申'], ['申', '巳'], ['丑', '戌'], ['戌', '丑'], ['丑', '未'], ['未', '丑'], ['戌', '未'], ['未', '戌'], ['子', '卯'], ['卯', '子']];
const WX_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WX_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const REL_COMMENT = {
  '六合': '与今日六合，贵人暗助，宜主动谋事、结善缘。',
  '三合': '逢三合之局，朋侪助力，合作可成、谋事顺遂。',
  '六冲': '冲犯日支，变动宜慎，守成为上，忌远行重大决策。',
  '三刑': '遇刑伤，易生口舌波折，宜忍让避让、勿争闲气。',
  '六害': '犯六害，防小人暗扰，慎言谨行以避是非。',
  '值日': '值日守中，稳健行事，宜静不宜躁、随分而安。',
};
const LUCK_COLORS = { '大吉': '#1f8a5a', '中吉': '#3f9a4a', '平': '#cf9a1c', '小凶': '#b06a2c', '凶': '#a8445a' };
function luckOf(rank) {
  if (rank <= 1) return '大吉';
  if (rank <= 4) return '中吉';
  if (rank <= 7) return '平';
  if (rank <= 9) return '小凶';
  return '凶';
}
function zodiacScore(branch, rz) {
  let score = 0, rel = '值日';
  if (branch === rz) { /* 自身 */ }
  else if (SIX_HE[branch] === rz) { score += 3; rel = '六合'; }
  else if (SAN_HE.some(g => g.includes(branch) && g.includes(rz))) { score += 2; rel = '三合'; }
  else if (LIU_CHONG[branch] === rz) { score -= 3; rel = '六冲'; }
  else if (SAN_XING.some(p => p[0] === branch && p[1] === rz)) { score -= 2; rel = '三刑'; }
  else if (LIU_HAI[branch] === rz) { score -= 1; rel = '六害'; }
  const a = Z_WX[branch], b = Z_WX[rz];
  if (WX_SHENG[a] === b) score -= 0.5;       // 我生（泄）
  else if (WX_SHENG[b] === a) score += 1;    // 生我（印）
  else if (WX_KE[a] === b) score += 0.3;     // 我克（得）
  else if (WX_KE[b] === a) score -= 1;       // 被克
  return { score, rel };
}
const JIANCHU_ZONG = {
  '建': '万物始生，宜立新规、出行谋划，忌仓促兴作。',
  '除': '除旧布新，宜沐浴祛秽、疗病扫舍，忌上任赴官。',
  '满': '丰盈之时，宜祭祀纳财、开市交易，忌动土安葬。',
  '平': '平顺守常，宜修造嫁娶、安神移徙，忌放水栽种。',
  '定': '安定可成，宜祈福造屋、入宅订盟，忌词讼出行。',
  '执': '执守为用，宜捕捉修造、祈福嫁娶，忌开市移徙。',
  '破': '破败之日，诸事不宜，尤忌兴作嫁娶远行。',
  '危': '登高临危，宜安床祈福，忌出行乘船登高。',
  '成': '事成可就，宜嫁娶开市、入学动土，忌词讼。',
  '收': '收敛纳藏，宜收纳嫁娶、入仓纳财，忌放债出行。',
  '开': '开通顺利，宜祭祀开市、动土出行，忌安葬嫁娶。',
  '闭': '闭藏为宜，宜筑堤补垣、安葬，忌开市求医出行。',
};
function renderDailyFortune(date, flat) {
  const dg = dayGZ(date);
  const riGanIdx = dg.gan, riZhi = ZHI[dg.zhi];
  const nayin = NAYIN[Math.floor(gzSolve(riGanIdx, dg.zhi) / 2)];

  // 建除 + 值神（复用既有常量）
  const jieList = flat.filter(t => JIE_MONTH.includes(t.name)).sort((a, b) => a.date.localeCompare(b.date));
  const curJie = jieList.filter(t => t.date <= dateStr(date)).pop();
  const jieBranch = JIE_BRANCH[JIE_MONTH.indexOf(curJie.name)];
  const jcIdx = (ZHI.indexOf(riZhi) - ZHI.indexOf(jieBranch) + 12) % 12;
  const jc = JIANCHU[jcIdx];
  const zs = ZHISHEN[ZHI.indexOf(riZhi)];

  // 生肖运程
  const ranked = ZODIAC.map(z => {
    const r = zodiacScore(z.z, riZhi);
    return { s: z.s, z: z.z, score: r.score, rel: r.rel };
  }).sort((x, y) => y.score - x.score);

  const cells = ranked.map((z, i) => {
    const lv = luckOf(i);
    return `<div class="zodiac" style="border-top-color:${LUCK_COLORS[lv]}">
      <div class="zx-name">${z.s}</div>
      <div class="zx-zhi">${z.z}</div>
      <span class="zx-badge" style="background:${LUCK_COLORS[lv]}">${lv}</span>
      <div class="zx-comment">${REL_COMMENT[z.rel]}</div>
    </div>`;
  }).join('');
  document.getElementById('zodiacGrid').innerHTML = cells;

  // 本日综论
  document.getElementById('fortuneLead').textContent =
    `今日为 ${GAN[riGanIdx]}${riZhi} 日（${nayin}），${jc}日，值神${zs.n}（${zs.type}道）。`;
  const zsText = zs.type === '黄' ? '值黄道，百事可为、顺势而动。' : '值黑道，宜静守、忌兴作大事。';
  document.getElementById('dayZong').innerHTML =
    `<span class="dz-h">本日综论</span>${JIANCHU_ZONG[jc]}${zsText}`;
}

/* ============ 使用说明 ============ */
function renderHelp(date, flat, curIdx, curHour) {
  const bz = computeBazi(date, curIdx, flat);
  const riGan = GAN[bz.riGan], riZhi = ZHI[bz.pillars.日.z];
  const term = window.__curTermName || '';
  document.getElementById('helpToday').innerHTML = `
    <div class="help-today-row"><span class="ht-k">今日节气</span><span class="ht-v">${term}</span></div>
    <div class="help-today-row"><span class="ht-k">当前时辰</span><span class="ht-v">${curHour.name} · ${curHour.meridian}</span></div>
    <div class="help-today-row"><span class="ht-k">今日日干支</span><span class="ht-v">${riGan}${riZhi}日</span></div>
    <div class="help-today-row"><span class="ht-k">农历标注</span><span class="ht-v">${lunarLabel(date, bz)}</span></div>`;
}

/* ============ Tab 切换 ============ */
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = { summary: 'tab-summary', today: 'tab-today', bazi: 'tab-bazi', dao: 'tab-dao', fortune: 'tab-fortune', overview: 'tab-overview', help: 'tab-help' };
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
    const [years, health, hou, hours, dao, fortune] = await Promise.all([
      loadJSON('data/solar-terms.json'),
      loadJSON('data/health.json'),
      loadJSON('data/hou.json'),
      loadJSON('data/hours.json'),
      loadJSON('data/daoism.json'),
      loadJSON('data/fortune-sticks.json'),
    ]);

    health.forEach(t => { HEALTH_MAP[t.term] = t; });
    hou.forEach(h => { HOU_MAP[h.term] = h.hou; });
    DAO = dao;
    STICKS = fortune;

    const flat = flattenTerms(years);
    ALL_TERMS_FLAT = flat;
    const { cur, next } = findCurrentTerm(flat);
    const daysToNext = next ? daysBetween(todayStr(), next.date) : 0;
    window.__curTermName = cur.name;
    window.__nextTermName = next ? next.name : '';

    const curIdx = currentHourIndex();
    const curHour = hours[curIdx];
    CUR_HOUR = curHour;

    renderHeaderDate();
    renderHero(cur, daysToNext, curHour, next ? next.name : '');
    renderTodayOverview(new Date(), flat, cur, daysToNext, next, curHour, curIdx);
    renderMainCard(HEALTH_MAP[cur.name]);
    renderHourBar(hours, curIdx);
    buildLunarClock(hours, curIdx);
    startClock();
    renderHouCurrent(cur.name);
    renderHouYear();
    renderOverview(health, flat, 'all');
    renderCheckin();

    // 八字 · 黄历 · 方位 · 经络取穴
    renderAlmanac(new Date(), curIdx, flat);
    renderQimen(new Date());
    renderGanzhi(new Date());

    // 道家养生
    const curSeason = (HEALTH_MAP[cur.name] && HEALTH_MAP[cur.name].season) || '春';
    renderDaoDaily();
    renderDaoSeason(curSeason);
    renderDaoMethods();
    renderDaoQuotes();
    renderDaoTodayLesson(new Date(), curSeason);

    // 每日签运
    setupSign();
    renderDailyFortune(new Date(), flat);

    // 使用说明
    renderHelp(new Date(), flat, curIdx, curHour);

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
