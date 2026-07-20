// 今日（总览 + 养生合并）主页面
const core = require('../../../utils/core.js');
const store = require('../../../utils/store.js');
const solarTerms = require('../../../data/solar-terms.js');
const healthArr = require('../../../data/health.js');
const hours = require('../../../data/hours.js');
const houArr = require('../../../data/hou.js');
const constitution = require('../../../data/constitution.js');

// 索引表（与 web 一致）
const HEALTH_MAP = {};
healthArr.forEach(t => { HEALTH_MAP[t.term] = t; });
const HOU_MAP = {};
houArr.forEach(g => { HOU_MAP[g.term] = g.hou; });

const HOUR_NAMES = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
const HOU_IDX = ['一', '二', '三'];
const WEEK = core.WEEK;

Page({
  data: {
    dateText: '', termName: '', termSolar: '', season: '', seasonColor: '',
    organ: '', key: '', summary: '', badge: '', badgeKind: '',
    hourName: '', compass: [],
    hDeg: 0, mDeg: 0, sDeg: 0,
    personalized: { show: false }, focus: [], health: {},
    meridian: {}, houItems: [],
    checkin: {}, mode: 'novice',
    disclaimerText: core.DISCLAIMER,
  },
  onLoad() {
    this.build();
    this.startClock();
  },
  onShow() {
    this.build();
    this.refreshCheckin();
    this.startClock();
  },
  onHide() { this.stopClock(); },
  onUnload() { this.stopClock(); },
  startClock() {
    if (this._clock) return;
    this.updateClock();
    this._clock = setInterval(() => this.updateClock(), 1000);
  },
  stopClock() {
    if (this._clock) { clearInterval(this._clock); this._clock = null; }
  },
  updateClock() {
    const t = new Date();
    const h = t.getHours() % 12;
    const m = t.getMinutes();
    const s = t.getSeconds();
    this.setData({
      hDeg: (h + m / 60) * 30,
      mDeg: (m + s / 60) * 6,
      sDeg: s * 6,
    });
  },
  build() {
    const flat = core.flattenTerms(solarTerms);
    const { cur, next } = core.findCurrentTerm(flat);
    const now = new Date();
    const hIdx = core.currentHourIndex();
    const hourName = HOUR_NAMES[hIdx];
    const info = HEALTH_MAP[cur.name] || {};
    const special = core.computeTodaySpecial(now, flat, cur);
    const season = info.season || '春';
    const seasonColor = core.SEASON_COLORS[season] || core.SEASON_COLORS['春'];
    const hour = hours[hIdx] || {};

    // 一句话摘要
    const summary = this.buildSummary(cur, info, special, hour, hIdx, flat);

    // 罗盘：12 地支定位（午正上、子正下），百分比坐标适配各种屏宽
    const compass = core.ZHI.map((z, i) => {
      const angle = (i - 6) * 30;
      const rad = (angle - 90) * Math.PI / 180;
      return {
        z,
        x: Math.round(50 + 38 * Math.cos(rad)),
        y: Math.round(50 + 38 * Math.sin(rad)),
        active: i === hIdx,
      };
    });

    // 养生主卡
    const health = core.healthSections(info);
    const TF = { 食: 'food', 居: 'live', 动: 'move', 穴: 'acu' };
    const focus = core.todayFocusData(info).map(f => ({ ...f, cls: TF[f.tag] || '' }));
    const profile = store.loadProfile();
    const personalized = core.personalizedData(info, profile, flat, constitution);
    const meridian = {
      name: hour.name || '', meridian: hour.meridian || '', organ: hour.organ || '',
      yuan: hour.yuan || '', luo: hour.luo || '', mu: hour.mu || '',
    };

    // 七十二候（当前节气）
    const houItems = (HOU_MAP[cur.name] || []).map(h => ({
      idx: HOU_IDX[h.idx - 1], name: h.name, phenom: h.phenom,
    }));

    // 当前节气的公历日期（数据里是 cur.date，形如 2026-07-07）
    const termSolar = cur.date ? `${+cur.date.slice(5, 7)}月${+cur.date.slice(8, 10)}日` : '';

    this.setData({
      dateText: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`,
      termName: cur.name, termSolar, season, seasonColor,
      organ: info.organ || '', key: info.key || '', summary,
      badge: special.tag, badgeKind: special.kind, hourName, compass,
      personalized, focus, health, meridian, houItems,
      mode: store.loadMode(),
    });
  },
  buildSummary(cur, info, special, hour, hIdx, flat) {
    const bz = core.computeBazi(new Date(), hIdx, flat);
    const jieBranch = core.JIE_BRANCH[core.JIE_MONTH.indexOf(
      flat.filter(t => core.JIE_MONTH.includes(t.name)).sort((a, b) => a.date.localeCompare(b.date))
        .filter(t => t.date <= core.todayStr()).pop().name)];
    const jcIdx = (core.ZHI.indexOf(core.ZHI[bz.pillars.日.z]) - core.ZHI.indexOf(jieBranch) + 12) % 12;
    const jcYJ = core.JIANCHU_YIJI[core.JIANCHU[jcIdx]];
    const dg = core.dayGZ(new Date());
    const rz = core.ZHI[dg.zhi];
    const ranked = core.ZODIAC.map(z => ({ s: z.s, score: core.zodiacScore(z.z, rz).score }))
      .sort((a, b) => b.score - a.score);
    const topZ = ranked[0];
    const keyLine = (info.key || '顺时养正').replace(/[。.]$/, '');
    const yiFirst = jcYJ.yi.slice(0, 2).join('、');
    const h = hours[hIdx] || {};
    return (special.kind === 'jie' ? `今日交${cur.name}` : `${cur.name}时节`) +
      `，当令养${h.organ || info.organ}；${keyLine}。` +
      `今日${bz.pillars.日.gz}日宜${yiFirst}，` +
      `此刻${hour.name}正当${h.meridian || ''}，最利${topZ.s}。`;
  },
  refreshCheckin() {
    const storeObj = store.loadCheckins();
    const today = core.todayStr();
    let best = store.loadBestStreak();
    const view = core.checkinView(storeObj, today, best);
    if (view.best > best) { store.saveBestStreak(view.best); best = view.best; }
    this.setData({ checkin: view });
  },
  toggleHabit(e) {
    const id = e.currentTarget.dataset.id;
    const s = store.loadCheckins();
    const today = core.todayStr();
    const r = s[today] || {};
    r[id] = !r[id];
    s[today] = r;
    store.saveCheckins(s);
    this.refreshCheckin();
  },
  goProfile() {
    wx.navigateTo({ url: '../profile/index' });
  },
  onShareAppMessage() {
    const d = this.data;
    return {
      title: `养生日历 · ${d.termName} · ${d.summary}`,
      path: '/pages/health-calendar/today/index',
    };
  },
  onShareTimeline() {
    const d = this.data;
    return { title: `养生日历 · ${d.termName} · ${d.summary}` };
  },
});
