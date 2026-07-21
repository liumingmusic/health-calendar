// 养生日历小程序 · 核心算法与内容生成
// 纯函数 / 无 DOM / 无小程序 API —— 可在 node 直接 require 测试
'use strict';

/* ============ 配置常量 ============ */
const SEASON_COLORS = { '春': '#5f8a3a', '夏': '#c4452f', '长夏': '#cf9a1c', '秋': '#c47a2c', '冬': '#3a5d7a' };
const SEASON_ORDER = ['春', '夏', '长夏', '秋', '冬'];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

const HABITS = [
  { id: 'water', label: '喝够水' },
  { id: 'early', label: '早睡' },
  { id: 'baDuan', label: '八段锦' },
  { id: 'food', label: '食养' },
];
const CHECKIN_KEY = 'yc_checkins_v1';
const CHECKIN_BEST_KEY = 'yc_checkin_best_v1';
const CHECKIN_MILESTONES = [
  { days: 3, title: '初心' },
  { days: 7, title: '一候' },
  { days: 21, title: '成习' },
  { days: 49, title: '筑基' },
  { days: 100, title: '百日功' },
  { days: 365, title: '周天' },
];
const MODE_KEY = 'healthcal_mode_v1';
const SEASON_WX = { '春': '木', '夏': '火', '长夏': '土', '秋': '金', '冬': '水' };
const WX_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WX_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const TRIGRAMS = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
const EIGHT_MEN = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];
const TERM_ORDER = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];
const DIRS = [
  { name: '北', deg: 180, major: true }, { name: '东北', deg: 225, major: false },
  { name: '东', deg: 270, major: true }, { name: '东南', deg: 315, major: false },
  { name: '南', deg: 0, major: true }, { name: '西南', deg: 45, major: false },
  { name: '西', deg: 90, major: true }, { name: '西北', deg: 135, major: false },
];

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
const PENG_GAN = ['不开仓财物耗散', '不栽植千株不长', '不修灶必见灾殃', '不剃头头必生疮', '不受田田主不祥', '不破券二比并亡', '不经络织机虚张', '不合酱主人不尝', '不汲水更难提防', '不词讼理弱敌强'];
const PENG_ZHI = ['不问卜自惹祸殃', '不冠带主不还乡', '不祭祀神鬼不尝', '不穿井水泉不香', '不哭泣必主重丧', '不远行财物伏藏', '不苫盖屋主更张', '不服药毒气入肠', '不安床鬼祟入房', '不会客醉坐颠狂', '不吃犬作怪上床', '不嫁娶不利新郎'];
const ZHISHEN = [
  { z: '子', n: '青龙', type: '黄' }, { z: '丑', n: '明堂', type: '黄' }, { z: '寅', n: '天刑', type: '黑' },
  { z: '卯', n: '朱雀', type: '黑' }, { z: '辰', n: '金匮', type: '黄' }, { z: '巳', n: '天德', type: '黄' },
  { z: '午', n: '白虎', type: '黑' }, { z: '未', n: '玉堂', type: '黄' }, { z: '申', n: '天牢', type: '黑' },
  { z: '酉', n: '玄武', type: '黑' }, { z: '戌', n: '司命', type: '黄' }, { z: '亥', n: '勾陈', type: '黑' },
];
const CHONGSHA = [
  { z: '子', chong: '马', sha: '南' }, { z: '丑', chong: '羊', sha: '东' }, { z: '寅', chong: '猴', sha: '北' },
  { z: '卯', chong: '鸡', sha: '西' }, { z: '辰', chong: '狗', sha: '南' }, { z: '巳', chong: '猪', sha: '东' },
  { z: '午', chong: '鼠', sha: '北' }, { z: '未', chong: '牛', sha: '西' }, { z: '申', chong: '虎', sha: '南' },
  { z: '酉', chong: '兔', sha: '东' }, { z: '戌', chong: '龙', sha: '北' }, { z: '亥', chong: '蛇', sha: '西' },
];
const XISHEN = { 甲: '东北', 乙: '西北', 丙: '西南', 丁: '正南', 戊: '东南', 己: '东北', 庚: '西北', 辛: '西南', 壬: '正南', 癸: '东南' };
const CAISHEN = { 甲: '东北', 乙: '东北', 丙: '正南', 丁: '正南', 戊: '正北', 己: '正北', 庚: '正东', 辛: '正东', 壬: '正西', 癸: '正西' };
const FUSHEN = { 甲: '东南', 乙: '东南', 丙: '正东', 丁: '正东', 戊: '正北', 己: '正北', 庚: '西南', 辛: '西南', 壬: '西北', 癸: '西北' };
const JIE_MONTH = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
const JIE_BRANCH = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const DIR_OF_ZHI = { 子: '北', 丑: '东北', 寅: '东北', 卯: '东', 辰: '东南', 巳: '东南', 午: '南', 未: '西南', 申: '西南', 酉: '西', 戌: '西北', 亥: '西北' };
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

/* 奇门遁甲（简化示意排盘） */
const QIMEN_STARS = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
const QIMEN_MEN = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];
const MEN_PALACE = { 1: '休', 3: '伤', 4: '杜', 2: '死', 9: '景', 7: '惊', 8: '生', 6: '开' };
const QIMEN_SHEN = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
const PALACE_INFO = {
  1: { gua: '坎', dir: '北' }, 2: { gua: '坤', dir: '西南' }, 3: { gua: '震', dir: '东' },
  4: { gua: '巽', dir: '东南' }, 5: { gua: '中', dir: '中' }, 6: { gua: '乾', dir: '西北' },
  7: { gua: '兑', dir: '西' }, 8: { gua: '艮', dir: '东北' }, 9: { gua: '离', dir: '南' },
};
const LUOSHU_POS = {
  4: [1, 1], 9: [1, 2], 2: [1, 3],
  3: [2, 1], 5: [2, 2], 7: [2, 3],
  8: [3, 1], 1: [3, 2], 6: [3, 3],
};
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

/* 生肖运程 */
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
  if (WX_SHENG[a] === b) score -= 0.5;
  else if (WX_SHENG[b] === a) score += 1;
  else if (WX_KE[a] === b) score += 0.3;
  else if (WX_KE[b] === a) score -= 1;
  return { score, rel };
}

const ZODIAC_ZHI = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };

/* 免责声明（全局复用） */
const DISCLAIMER = '本小程序内容仅为传统节气养生与民俗文化参考，不构成任何医疗诊断、治疗建议或吉凶占断。如有健康问题，请遵医嘱。';

/* ============ 通用工具 ============ */
function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayStr() { return dateStr(new Date()); }
function dateHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function dayDiff(a, b) {
  const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate())
    - new Date(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round(ms / 86400000);
}
function daysBetween(aStr, bStr) {
  const a = new Date(aStr + 'T00:00:00');
  const b = new Date(bStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
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

/* 节气 / 时辰 / 历法 */
function flattenTerms(years) {
  const list = [];
  years.forEach(y => y.terms.forEach(t => list.push(t)));
  list.sort((a, b) => a.date.localeCompare(b.date));
  return list;
}
function findCurrentTerm(flat) {
  const today = todayStr();
  let cur = flat[0];
  for (const t of flat) { if (t.date <= today) cur = t; else break; }
  const idx = flat.indexOf(cur);
  const next = flat[idx + 1] || null;
  return { cur, next };
}
function currentHourIndex() {
  const h = new Date().getHours();
  return Math.floor((h + 1) / 2) % 12;
}
function nthGengAfter(fromDate, n) {
  const d = new Date(fromDate);
  let count = 0;
  for (let i = 0; i < 80; i++) {
    if (dayGZ(d).gan === 6) { count++; if (count === n) return new Date(d); }
    d.setDate(d.getDate() + 1);
  }
  return null;
}
// 今日专属标签：交节 / 三伏 / 数九 / 节气第N天
function computeTodaySpecial(date, flat, cur) {
  const today = dateStr(date);
  const y = date.getFullYear();
  const find = (name, yy) => flat.find(t => t.name === name && t.date.startsWith(yy + '-'));
  const curInfo = flat.filter(t => t.date <= today).sort((a, b) => a.date.localeCompare(b.date)).pop();
  if (curInfo && curInfo.date === today) return { tag: `交${cur.name}`, kind: 'jie' };

  const xiazhi = find('夏至', y);
  const liqiu = find('立秋', y);
  if (xiazhi && liqiu) {
    const chufu = nthGengAfter(new Date(xiazhi.date + 'T00:00:00'), 3);
    const zhongfu = nthGengAfter(new Date(xiazhi.date + 'T00:00:00'), 4);
    const mofu = nthGengAfter(new Date(liqiu.date + 'T00:00:00'), 1);
    if (chufu && zhongfu && mofu) {
      const dc = dayDiff(chufu, date), dz = dayDiff(zhongfu, date), dm = dayDiff(mofu, date);
      if (dc >= 0 && dz < 0) return { tag: `初伏第${dc + 1}天`, kind: 'fu' };
      if (dz >= 0 && dm < 0) return { tag: `中伏第${dz + 1}天`, kind: 'fu' };
      if (dm >= 0 && dm < 10) return { tag: `末伏第${dm + 1}天`, kind: 'fu' };
    }
  }
  const dongzhiThis = find('冬至', y);
  const dongzhiLast = find('冬至', y - 1);
  const NINE = ['一九', '二九', '三九', '四九', '五九', '六九', '七九', '八九', '九九'];
  const checkNine = (dzInfo) => {
    if (!dzInfo) return null;
    const off = dayDiff(new Date(dzInfo.date + 'T00:00:00'), date);
    if (off >= 0 && off < 81) {
      const n = Math.floor(off / 9);
      return { tag: `${NINE[n]}第${off % 9 + 1}天`, kind: 'nine' };
    }
    return null;
  };
  const n1 = checkNine(dongzhiThis) || checkNine(dongzhiLast);
  if (n1) return n1;
  const daysIn = curInfo ? dayDiff(new Date(curInfo.date + 'T00:00:00'), date) + 1 : 1;
  return { tag: `${cur.name}第${daysIn}天`, kind: 'term' };
}

/* 八字 */
function yearGZ(date, flat) {
  const y = date.getFullYear();
  const lc = flat.find(t => t.name === '立春' && t.date.startsWith(y + '-'))
    || flat.find(t => t.name === '立春' && t.date.startsWith((y - 1) + '-'));
  let yFor = y;
  if (lc && dateStr(date) < lc.date) yFor = y - 1;
  return { gan: (((yFor - 4) % 10) + 10) % 10, zhi: (((yFor - 4) % 12) + 12) % 12 };
}
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
function dayGZ(date) {
  const idx = (((jdn(date.getFullYear(), date.getMonth() + 1, date.getDate()) - 11) % 60) + 60) % 60;
  return { gan: idx % 10, zhi: idx % 12 };
}
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
function lunarLabel(date, bz) {
  return `${bz.pillars.年.gz}年 ${bz.pillars.月.gz}月 ${bz.pillars.日.gz}日`;
}

/* 五行体质倾向 + 个性化养生建议（仅文化养生，不作吉凶断言） */
function constitutionAdvice(bz) {
  const wx = bz.wuxing;
  const rgWX = GAN_WX[GAN[bz.riGan]];
  let weak = '木', strong = '木', wv = 99, sv = -1;
  for (const k in wx) {
    if (wx[k] < wv) { wv = wx[k]; weak = k; }
    if (wx[k] > sv) { sv = wx[k]; strong = k; }
  }
  let tendency;
  if (weak === strong) {
    tendency = `日主属「${rgWX}」，五行分布均衡，体质平和，宜顺时养正、劳逸结合。`;
  } else {
    tendency = `日主属「${rgWX}」；五行中「${weak}」偏弱、「${strong}」偏旺，整体偏${strong}气较盛，宜适当涵养${weak}气、平衡${strong}气。`;
  }
  return { tendency, weak, strong, rgWX };
}

/* ============ 内容生成（返回纯数据，供 WXML 渲染） ============ */
// 节气养生主卡分段
function healthSections(t) {
  return {
    organ: t.organ || '',
    climate: t.climate || '',
    key: t.key || '',
    diet: (t.diet || []).map(d => ({ text: d })),
    living: (t.living || []).map(d => ({ text: d })),
    avoid: (t.avoid || []).map(d => ({ text: d })),
    exercise: (t.exercise || []).map(d => ({ text: d })),
    acupoint: (t.acupoint || []).map(d => ({ text: d })),
  };
}
// 今日侧重：当前节气内按日轮选（同一节气每天不同）
function todayFocusData(t) {
  const h = dateHash(todayStr());
  const pick = (arr, salt) => (arr && arr.length) ? arr[(h + salt) % arr.length] : '';
  const items = [];
  const diet = pick(t.diet, 0), living = pick(t.living, 3), exercise = pick(t.exercise, 7), acu = pick(t.acupoint, 5);
  if (diet) items.push({ tag: '食', text: diet });
  if (living) items.push({ tag: '居', text: living });
  if (exercise) items.push({ tag: '动', text: exercise });
  if (acu) items.push({ tag: '穴', text: acu });
  return items;
}
// 体质 × 当日时令：录入生辰后，按日主五行 + 偏弱 + 季节生克给定制建议
function personalizedData(t, profile, flat, CONSTITUTION) {
  if (!profile) return { show: false };
  let bz;
  try { bz = computeBazi(new Date(profile.y, profile.m - 1, profile.d), profile.h, flat); }
  catch (e) { return { show: false }; }
  const adv = constitutionAdvice(bz);
  const weak = adv.weak, rgWX = adv.rgWX;
  const seasonWX = SEASON_WX[t.season] || '木';
  const cw = (CONSTITUTION || {})[weak] || {};
  let rel;
  if (seasonWX === weak) {
    rel = `当前${t.season}季正当令「${seasonWX}」，与你偏弱的「${weak}」同气，是补养${cw.organ || weak}的好时机。`;
  } else if (WX_SHENG[seasonWX] === weak) {
    rel = `当前${t.season}季当令「${seasonWX}」，「${seasonWX}生${weak}」，时令之气正助你涵养偏弱的「${weak}」。`;
  } else if (WX_KE[seasonWX] === weak) {
    rel = `当前${t.season}季当令「${seasonWX}」，「${seasonWX}克${weak}」，你偏弱的「${weak}」易受耗，尤需着意顾护${cw.organ || weak}。`;
  } else {
    rel = `当前${t.season}季当令「${seasonWX}」，宜顺时养正，兼顾涵养偏弱的「${weak}」（养${cw.organ || weak}）。`;
  }
  return {
    show: true,
    rgWX, weak, organ: cw.organ || weak,
    rel,
    foods: (cw.foods || []).slice(0, 5),
    meridian: cw.meridian || '',
    mindset: cw.mindset || '',
    avoid: (cw.foods_avoid || []).join('、'),
  };
}
// 八字四柱 + 五行条（数值）
function baziBars(wx) {
  const max = Math.max(1, ...Object.values(wx));
  return ['木', '火', '土', '金', '水'].map(w => ({
    name: w, value: wx[w] || 0, pct: Math.round((wx[w] || 0) / max * 100),
  }));
}
// 黄历宜忌 + 吉神方位 + 经络取穴
function almanacData(date, hourIdx, flat, curHour) {
  const bz = computeBazi(date, hourIdx, flat);
  const riZhi = ZHI[bz.pillars.日.z];
  const riGan = GAN[bz.riGan];
  const pillars = ['年', '月', '日', '时'].map(k => {
    const p = bz.pillars[k];
    return { label: k === '日' ? '日主' : k + '柱', gz: p.gz, wx: p.wx, nayin: p.nayin };
  });
  const jieBranch = JIE_BRANCH[JIE_MONTH.indexOf(
    flat.filter(t => JIE_MONTH.includes(t.name)).sort((a, b) => a.date.localeCompare(b.date))
      .filter(t => t.date <= dateStr(date)).pop().name)];
  const jcIdx = (ZHI.indexOf(riZhi) - ZHI.indexOf(jieBranch) + 12) % 12;
  const jc = JIANCHU[jcIdx];
  const jcYJ = JIANCHU_YIJI[jc];
  const zs = ZHISHEN[ZHI.indexOf(riZhi)];
  const cs = CHONGSHA[ZHI.indexOf(riZhi)];
  const nianZhi = ZHI[bz.pillars.年.z];
  const taiDir = DIR_OF_ZHI[nianZhi];
  const suiPo = DIR_OF_ZHI[ZHI[(ZHI.indexOf(nianZhi) + 6) % 12]];
  const sanShaMap = { '申': '南', '子': '南', '辰': '南', '亥': '西', '卯': '西', '未': '西', '寅': '北', '午': '北', '戌': '北', '巳': '东', '酉': '东', '丑': '东' };
  const sanSha = sanShaMap[nianZhi] || '—';
  const h = curHour || {};
  return {
    pillars,
    wuxing: baziBars(bz.wuxing),
    riGan, riZhi,
    nayin: bz.pillars.日.nayin,
    summary: `日主 ${riGan}，五行偏${dominant(bz.wuxing)}；农历 ${lunarLabel(date, bz)}`,
    jc, jcYi: jcYJ.yi, jcJi: jcYJ.ji,
    zhiShen: zs.n, zhiShenType: zs.type,
    chong: cs.chong, sha: cs.sha,
    peng: `${riGan}${PENG_GAN[bz.riGan]}；${riZhi}${PENG_ZHI[ZHI.indexOf(riZhi)]}`,
    xi: XISHEN[riGan], cai: CAISHEN[riGan], fu: FUSHEN[riGan],
    taiDir, nianZhi, suiPo, sanSha,
    meridianName: h.name || '', meridianText: h.meridian || '', meridianOrgan: h.organ || '',
    yuan: h.yuan || '', luo: h.luo || '', mu: h.mu || '',
    cardSummary: `今日${riGan}${riZhi}日（${bz.pillars.日.nayin}）· ${jc}日 · ${zs.n}${zs.type}道\n宜：${jcYJ.yi.slice(0, 5).join('、')}　忌：${jcYJ.ji.slice(0, 4).join('、')}\n吉神 喜神${XISHEN[riGan]} · 财神${CAISHEN[riGan]} · 福神${FUSHEN[riGan]}`,
  };
}
// 奇门遁甲九宫数据
function qimenData(date, termName) {
  const yang = YANG_TERMS.includes(termName);
  const ju = QIMEN_JU[termName] || 1;
  const dg = dayGZ(date);
  const riIdx = gzSolve(dg.gan, dg.zhi);
  const xunStart = Math.floor(riIdx / 10) * 10;
  const xunShouZhi = ZHI[xunStart % 12];
  const liuyiChar = XUN_LIUYI['甲' + xunShouZhi];
  const yiMap = {};
  let p = ju;
  for (let i = 0; i < 9; i++) { yiMap[p] = LIUYI_ORDER[i]; p = nextPalace(p, yang); }
  let valuePalace = 5;
  for (const k in yiMap) if (yiMap[k] === liuyiChar) { valuePalace = +k; break; }
  const starAtValue = valuePalace - 1;
  const starMap = {};
  p = valuePalace;
  for (let i = 0; i < 9; i++) {
    starMap[p] = QIMEN_STARS[((starAtValue + (yang ? i : -i)) % 9 + 9) % 9];
    p = nextPalace(p, yang);
  }
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
  const shenMap = {};
  shenMap[valuePalace] = '值符';
  p = nextPalace(valuePalace, yang);
  for (let i = 1; i < 8; i++) {
    shenMap[p] = QIMEN_SHEN[yang ? (i % 8) : ((8 - i) % 8)];
    p = nextPalace(p, yang);
  }
  const cells = [];
  for (let g = 1; g <= 9; g++) {
    const info = PALACE_INFO[g];
    cells.push({
      g, gua: info.gua, dir: info.dir,
      shen: shenMap[g] || '', star: starMap[g] || '', men: menMap[g] || '', yi: yiMap[g] || '',
      isCenter: g === 5, isZhifu: g === valuePalace, isZhishi: menAtValue && g === valuePalace,
    });
  }
  const cap = `今日${yang ? '阳遁' : '阴遁'}${ju}局 · 旬首甲${xunShouZhi}${liuyiChar} · 值符${starMap[valuePalace]} · 值使${menAtValue || '—'}门`;
  return { cells, cap };
}
// 天干地支全览
function ganzhiData(date) {
  const GAN_YIN = {}; GAN.forEach((g, i) => { GAN_YIN[g] = i % 2 === 0 ? '阳' : '阴'; });
  const ZHI_YIN = {}; ZHI.forEach((z, i) => { ZHI_YIN[z] = i % 2 === 0 ? '阳' : '阴'; });
  const dg = dayGZ(date);
  const nowIdx = gzSolve(dg.gan, dg.zhi);
  const riGan = GAN[dg.gan], riZhi = ZHI[dg.zhi];
  const ganRows = GAN.map(g => ({ g, yin: GAN_YIN[g], wx: GAN_WX[g], isNow: g === riGan }));
  const zhiRows = ZHI.map(z => ({ z, yin: ZHI_YIN[z], wx: ZHI_WX[z], zodiac: ZODIAC_ZHI[z], isNow: z === riZhi }));
  const jiazi = [];
  for (let i = 0; i < 60; i++) jiazi.push({ gz: GAN[i % 10] + ZHI[i % 12], isNow: i === nowIdx });
  return { riGan, riZhi, ganRows, zhiRows, jiazi };
}
// 生肖运程
function zodiacFortuneData(date) {
  const dg = dayGZ(date);
  const riZhi = ZHI[dg.zhi];
  const nayin = NAYIN[Math.floor(gzSolve(dg.gan, dg.zhi) / 2)];
  const jieList = JIE_MONTH; // 仅用于建除（与 web 一致，用全局节气顺序推算）
  // 建除需 flat；这里单独传入
  const ranked = ZODIAC.map(z => {
    const r = zodiacScore(z.z, riZhi);
    return { s: z.s, z: z.z, score: r.score, rel: r.rel };
  }).sort((x, y) => y.score - x.score);
  const cells = ranked.map((z, i) => {
    const lv = luckOf(i);
    return { s: z.s, z: z.z, lv, rel: z.rel, comment: REL_COMMENT[z.rel], color: LUCK_COLORS[lv] };
  });
  return { cells, riGan: GAN[dg.gan], riZhi, nayin };
}
// 生肖运程本日综论（需 flat 推算建除/值神）
function fortuneLeadData(date, flat) {
  const dg = dayGZ(date);
  const riGanIdx = dg.gan, riZhi = ZHI[dg.zhi];
  const nayin = NAYIN[Math.floor(gzSolve(riGanIdx, riZhi) / 2)];
  const jieList = flat.filter(t => JIE_MONTH.includes(t.name)).sort((a, b) => a.date.localeCompare(b.date));
  const curJie = jieList.filter(t => t.date <= dateStr(date)).pop();
  const jieBranch = JIE_BRANCH[JIE_MONTH.indexOf(curJie.name)];
  const jcIdx = (ZHI.indexOf(riZhi) - ZHI.indexOf(jieBranch) + 12) % 12;
  const jc = JIANCHU[jcIdx];
  const zs = ZHISHEN[ZHI.indexOf(riZhi)];
  const lead = `今日为 ${GAN[riGanIdx]}${riZhi} 日（${nayin}），${jc}日，值神${zs.n}（${zs.type}道）。`;
  const zsText = zs.type === '黄' ? '值黄道，百事可为、顺势而动。' : '值黑道，宜静守、忌兴作大事。';
  const zong = `${JIANCHU_ZONG[jc]}${zsText}`;
  return { lead, zong };
}
// 签文白话疏解（不作吉凶断言，仅自省之镜）
function signExplain(s) {
  const txt = (s.title + (s.jie || '') + (s.poem || []).join('')).replace(/\s/g, '');
  const score = { 吉: 0, 凶: 0, 待: 0 };
  const jix = ['大吉', '吉', '庆', '喜', '喜喜', '利', '顺', '遂', '成', '圆', '祐', '好', '亨', '昌'];
  const xiongx = ['凶', '险', '惊', '忧', '苦', '阻', '滞', '悔', '危', '祸', '败', '惊'];
  const daix = ['待', '守', '耐', '迟', '未', '藏', '潜', '候'];
  jix.forEach(k => { if (txt.includes(k)) score.吉++; });
  xiongx.forEach(k => { if (txt.includes(k)) score.凶++; });
  daix.forEach(k => { if (txt.includes(k)) score.待++; });
  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const tone = sorted[0][1] === 0 ? '平' : sorted[0][0];
  const toneMap = {
    吉: '气象明朗，如云开见日', 凶: '先见波折，但并非绝境',
    待: '重在藏守，时机尚未成熟', 平: '平正中和，得失参半',
  };
  const adviceMap = {
    吉: '此签所示多呈顺遂，眼前之事可望有成。然顺境之中更须守正谦和，不可因一时得意而忘形；凡事以诚敬处之，人和自至。',
    凶: '此签当下或有阻滞，警示行事不可冒进。最宜稳守本分、反省己过、积德行善；待时机回转，自能转危为安。',
    待: '此签主“待时”。时机未到，强求无益；此时宜藏锋守拙、蓄积力量、修德养身，春风一至，水到渠成。',
    平: '此签不温不火，主平常之象。提示你凡事尽心尽力即可，不必过于执着结果；守分、谦和、持续用功，便是最好的回应。',
  };
  const firstLine = s.poem && s.poem[0] ? s.poem[0] : '签诗';
  return [
    `此签题曰「${s.title}」，以「${firstLine}」起笔，整体意涵${toneMap[tone]}。`,
    `通行本解曰：“${s.jie}”`,
    adviceMap[tone],
    '签文古奥，重在反观自身。无论际遇如何，诚心正意、谨言慎行、积德修善，皆是趋吉避凶之本。本站不作吉凶断言，仅供修身自省之镜。',
  ];
}
// 每日一签索引（按日稳定）
function signDailyIndex() { return Math.floor(dateHash(todayStr()) % 100); }

/* ============ 打卡 ============ */
function milestoneOf(streak) {
  let earned = null, next = null;
  for (const m of CHECKIN_MILESTONES) {
    if (streak >= m.days) earned = m;
    else { next = m; break; }
  }
  return { earned, next };
}
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
// 生辰八字展示数据
function profileView(profile, flat, CONSTITUTION) {
  if (!profile) return null;
  let bz;
  try { bz = computeBazi(new Date(profile.y, profile.m - 1, profile.d), profile.h, flat); }
  catch (e) { return null; }
  const adv = constitutionAdvice(bz);
  const keys = Array.from(new Set([adv.weak, adv.rgWX]));
  const advice = keys.map(k => {
    const c = (CONSTITUTION || {})[k] || {};
    return {
      element: k, organ: c.organ || k, season: c.season || '',
      points: [
        `宜食：${(c.foods || []).join('、')}`,
        `少沾：${(c.foods_avoid || []).join('、')}`,
        `起居：${c.exercise || ''}`,
        `经络：${c.meridian || ''}`,
        `情志：${c.mindset || ''}`,
      ],
    };
  });
  return {
    pillars: ['年', '月', '日', '时'].map(k => {
      const p = bz.pillars[k];
      return { label: k === '日' ? '日主' : k + '柱', gz: p.gz, wx: p.wx, nayin: p.nayin };
    }),
    wuxing: baziBars(bz.wuxing),
    tendency: adv.tendency,
    advice,
  };
}
// 打卡展示数据（best 由调用方读取/写入）
function checkinView(store, today, best) {
  const rec = store[today] || {};
  const doneToday = HABITS.filter(h => rec[h.id]).length;
  const total = HABITS.length;
  const allDone = doneToday === total;
  const streak = computeStreak(store);
  let nb = best;
  if (streak > nb) nb = streak;
  const { earned, next } = milestoneOf(streak);
  const nextTip = next
    ? `再坚持 ${next.days - streak} 天达成「${next.title}」`
    : '已抵达最高里程碑「周天」，善莫大焉';
  const dots = HABITS.map(h => ({ id: h.id, label: h.label, done: !!rec[h.id] }));
  return {
    doneToday, total, allDone, streak, best: nb,
    earnedTitle: earned ? earned.title : '', earnedDays: earned ? earned.days : 0,
    nextTip: allDone ? '🎉 今日四事圆满，身心俱养，明日再见！' : nextTip,
    dots,
  };
}

module.exports = {
  SEASON_COLORS, SEASON_ORDER, WEEK, HABITS, CHECKIN_KEY, CHECKIN_BEST_KEY, CHECKIN_MILESTONES,
  MODE_KEY, SEASON_WX, WX_SHENG, WX_KE, BRANCHES, TRIGRAMS, EIGHT_MEN, TERM_ORDER, DIRS,
  GAN, ZHI, GAN_WX, ZHI_WX, NAYIN, PENG_GAN, PENG_ZHI, ZHISHEN, CHONGSHA, XISHEN, CAISHEN, FUSHEN,
  JIE_MONTH, JIE_BRANCH, DIR_OF_ZHI, JIANCHU, JIANCHU_YIJI, JIANCHU_ZONG,
  QIMEN_STARS, QIMEN_MEN, MEN_PALACE, QIMEN_SHEN, PALACE_INFO, LUOSHU_POS, QIMEN_JU, YANG_TERMS,
  ZODIAC, Z_WX, SIX_HE, SAN_HE, LIU_CHONG, LIU_HAI, SAN_XING, REL_COMMENT, LUCK_COLORS, ZODIAC_ZHI,
  DISCLAIMER,
  pad, dateStr, todayStr, dateHash, dayDiff, daysBetween, jdn, gzSolve,
  flattenTerms, findCurrentTerm, currentHourIndex, computeTodaySpecial,
  yearGZ, monthGZ, dayGZ, hourGZ, pillar, computeBazi, dominant, lunarLabel,
  constitutionAdvice, healthSections, todayFocusData, personalizedData, baziBars,
  almanacData, qimenData, ganzhiData, zodiacFortuneData, fortuneLeadData, signExplain, signDailyIndex,
  milestoneOf, computeStreak, checkinView, zodiacScore, luckOf, profileView,
};
