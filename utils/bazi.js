// 八字 / 历法核心算法（纯函数，移植自 web 端 app.js，无 DOM 依赖）
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
// 十二节月（用于月柱推算）
const JIE_MONTH = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
const JIE_BRANCH = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

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
  const cnt = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  ['年', '月', '日', '时'].forEach(k => {
    cnt[GAN_WX[GAN[pillars[k].g]]]++;
    cnt[ZHI_WX[ZHI[pillars[k].z]]]++;
  });
  return { pillars, riGan: d.gan, wuxing: cnt };
}
function dominant(cnt) {
  let max = '', v = -1;
  for (const k in cnt) if (cnt[k] > v) { v = cnt[k]; max = k; }
  return max;
}

module.exports = {
  GAN, ZHI, GAN_WX, ZHI_WX, NAYIN, JIE_MONTH, JIE_BRANCH,
  pad, dateStr, jdn, gzSolve, yearGZ, monthGZ, dayGZ, hourGZ, pillar, computeBazi, dominant,
};
