// 今日（总览 + 养生合并）主页面 —— M1：首屏骨架（罗盘/节气/时辰/专属徽标/一句话摘要）
const bazi = require('../../utils/bazi.js');
const cal = require('../../utils/calendar.js');
const solarTerms = require('../../data/solar-terms.js');
const healthArr = require('../../data/health.js');
// 养生数据按节气名建索引（与 web HEALTH_MAP 一致）
const HEALTH_MAP = {};
healthArr.forEach(t => { HEALTH_MAP[t.term] = t; });

const HOUR_NAMES = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

Page({
  data: {
    dateText: '', termName: '', termSolar: '', season: '', organ: '', key: '',
    summary: '', badge: '', badgeKind: '', hourName: '', compass: [],
  },
  onLoad() { this.build(); },
  onShow() { this.build(); },
  build() {
    const flat = cal.flattenTerms(solarTerms);
    const { cur } = cal.findCurrentTerm(flat);
    const now = new Date();
    const hIdx = cal.currentHourIndex();
    const hourName = HOUR_NAMES[hIdx];
    const info = HEALTH_MAP[cur.name] || {};
    const special = cal.computeTodaySpecial(now, flat, cur);
    const summary = `今日${cur.name} · 当令${info.organ || ''} · ${info.key || ''}`;
    // 罗盘：12 地支定位（午正上、子正下）
    const C = 230, R = 178;
    const compass = bazi.ZHI.map((z, i) => {
      const angle = (i - 6) * 30;
      const rad = (angle - 90) * Math.PI / 180;
      return {
        z,
        x: Math.round(C + R * Math.cos(rad)),
        y: Math.round(C + R * Math.sin(rad)),
        active: i === hIdx,
      };
    });
    this.setData({
      dateText: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`,
      termName: cur.name, termSolar: cur.solar, season: info.season || '',
      organ: info.organ || '', key: info.key || '', summary,
      badge: special.tag, badgeKind: special.kind, hourName, compass,
    });
  },
});
