#!/usr/bin/env node
/**
 * gen-terms.js
 * 生成 2024–2035 每年 24 个二十四节气公历日期（含 2026 准确）。
 *
 * 算法：用 Meeus《天文算法》计算太阳视黄经（apparent ecliptic longitude），
 * 二分查找太阳视黄经穿越每个节气目标经度（315° + 15°·k）的时刻，
 * 折算为北京时间（UTC+8）的公历日期。无需网络、无需 key。
 *
 * 输出：data/solar-terms.json
 *   结构：{ "year": 2026, "terms": [ { "name": "立春", "date": "2026-02-04" }, ... ] }
 *   每年自「立春」起，至次年「大寒」止（共 24 个）。
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ---- 节气定义：下标 k 对应目标黄经 = (315 + 15k) % 360 ----
const TERMS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
];
const TARGETS = TERMS.map((_, k) => (315 + 15 * k) % 360); // 度 [0,360)

// ---- 公历(北京时间) -> 儒略日(UT) ----
function gregorianToJD(year, month, day, hourBJT) {
  let Y = year, M = month;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const hourUT = hourBJT - 8; // 北京(UTC+8) -> UT
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + day + B - 1524.5 + hourUT / 24;
}

// ---- 儒略日(UT) -> 公历(取日期，北京时间) ----
function jdToDate(jd) {
  // 先折算为北京时间
  const bjt = jd + 8 / 24;
  const z = Math.floor(bjt + 0.5);
  const f = bjt + 0.5 - z;
  let A = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    A = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + f;
  const month = (E < 14) ? E - 1 : E - 13;
  const year = (month > 2) ? C - 4716 : C - 4715;
  return { year, month, day: Math.floor(day) };
}

// ---- 太阳视黄经（度，[0,360)） ----
function solarLongitude(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);
  const trueLon = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  let app = trueLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);
  app = app % 360;
  if (app < 0) app += 360;
  return app;
}

// ---- 在 JD 区间 [jdA, jdB] 内二分查找黄经穿越目标 T 的时刻 ----
function findCrossing(jdA, jdB, T) {
  let lo = jdA, hi = jdB;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const L = solarLongitude(mid);
    if (T === 0) {
      // 春分穿越 360->0：lo 侧黄经接近 360，hi 侧接近 0
      if (L > 180) lo = mid; else hi = mid;
    } else {
      if (L < T) lo = mid; else hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// ---- 主流程：扫描 2024-01-01 .. 2037-12-31，按序收集全部节气 ----
function generate() {
  const all = []; // {name, date:'YYYY-MM-DD'}
  let prevLon = null;
  let idx = 0; // 从「小寒」(285°) 开始 —— 每年第一个被跨越的目标
  const start = new Date(Date.UTC(2024, 0, 1, 4, 0, 0)); // 2024-01-01 12:00 BJT = 04:00 UT
  const end = new Date(Date.UTC(2037, 11, 31, 4, 0, 0));
  const startJD = gregorianToJD(2024, 1, 1, 12);
  const endJD = gregorianToJD(2037, 12, 31, 12);

  for (let jd = startJD; jd <= endJD; jd += 1) {
    const curLon = solarLongitude(jd);
    if (prevLon !== null) {
      const wrapped = prevLon > 300 && curLon < 60;
      const target = TARGETS[idx];
      let crossed = false;
      if (wrapped && target === 0) crossed = true;
      else if (!wrapped && prevLon < target && curLon >= target) crossed = true;

      if (crossed) {
        const crossJD = findCrossing(jd - 1, jd, target);
        const d = jdToDate(crossJD);
        const mm = String(d.month).padStart(2, '0');
        const dd = String(d.day).padStart(2, '0');
        all.push({ name: TERMS[idx], date: `${d.year}-${mm}-${dd}` });
        idx = (idx + 1) % 24;
      }
    }
    prevLon = curLon;
  }
  return all;
}

// ---- 将扁平列表按「立春」切分到各年份 ----
function groupByYear(all) {
  const byDate = all.slice().sort((a, b) => a.date.localeCompare(b.date));
  const out = [];
  for (let Y = 2024; Y <= 2035; Y++) {
    const startStr = `${Y}-02-04`;
    const endStr = `${Y + 1}-02-04`;
    const terms = byDate.filter(t => t.date >= startStr && t.date < endStr);
    out.push({ year: Y, terms });
  }
  return out;
}

const all = generate();
const grouped = groupByYear(all);
const outPath = path.join(__dirname, '..', 'data', 'solar-terms.json');
fs.writeFileSync(outPath, JSON.stringify(grouped, null, 2) + '\n', 'utf8');

// ---- 校验打印 2026 ----
const y2026 = grouped.find(g => g.year === 2026);
console.log('=== 2026 节气表 ===');
y2026.terms.forEach(t => console.log(`${t.name}\t${t.date}`));
console.log(`\n共生成 ${grouped.length} 年，写入 ${outPath}`);
console.log(`首项: ${grouped[0].year} ${grouped[0].terms[0].name} ${grouped[0].terms[0].date}`);
console.log(`末项: ${grouped[grouped.length-1].year} ${grouped[grouped.length-1].terms[grouped[grouped.length-1].terms.length-1].name} ${grouped[grouped.length-1].terms[grouped[grouped.length-1].terms.length-1].date}`);
