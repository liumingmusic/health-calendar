// 历法助手：节气扁平化、当前节气、三伏/数九、今日专属徽标、时辰推算
const { dateStr, dayGZ } = require('./bazi.js');

// 两日期相隔天数（b - a），入参为 Date
function dayDiff(a, b) {
  const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate())
    - new Date(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round(ms / 86400000);
}
// 求某日期当年夏至后第 n 个庚日（推三伏）；返回 Date
function nthGengAfter(fromDate, n) {
  const d = new Date(fromDate);
  let count = 0;
  for (let i = 0; i < 80; i++) {
    if (dayGZ(d).gan === 6) { count++; if (count === n) return new Date(d); }
    d.setDate(d.getDate() + 1);
  }
  return null;
}
// 计算“今日专属”标签：交节 / 三伏 / 数九 / 节气第N天
function computeTodaySpecial(date, flat, cur) {
  const today = dateStr(date);
  const y = date.getFullYear();
  const find = (name, yy) => flat.find(t => t.name === name && t.date.startsWith(yy + '-'));

  // 1) 今日交节
  const curInfo = flat.filter(t => t.date <= today).sort((a, b) => a.date.localeCompare(b.date)).pop();
  if (curInfo && curInfo.date === today) {
    return { tag: `交${cur.name}`, kind: 'jie' };
  }

  // 2) 三伏
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

  // 3) 数九
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

  // 4) 节气第N天（默认）
  const daysIn = curInfo ? dayDiff(new Date(curInfo.date + 'T00:00:00'), date) + 1 : 1;
  return { tag: `${cur.name}第${daysIn}天`, kind: 'term' };
}

// 把多年的节气数组合并为按日期排序的扁平列表
function flattenTerms(years) {
  const list = [];
  years.forEach(y => y.terms.forEach(t => list.push(t)));
  list.sort((a, b) => a.date.localeCompare(b.date));
  return list;
}
// 取当前节气与下一节气
function findCurrentTerm(flat) {
  const today = dateStr(new Date());
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
// 当前时辰索引（0=子,1=丑,...）
function currentHourIndex() {
  const h = new Date().getHours();
  return Math.floor((h + 1) / 2) % 12;
}

module.exports = {
  dayDiff, nthGengAfter, computeTodaySpecial,
  flattenTerms, findCurrentTerm, daysBetween, currentHourIndex,
};
