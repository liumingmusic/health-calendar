// 今日（对齐 web：英雄三栏 + 古历罗盘 + 今日总览 + 今日养生）
const core = require('../../../utils/core.js');
const store = require('../../../utils/store.js');
const solarTerms = require('../../../data/solar-terms.js');
const healthArr = require('../../../data/health.js');
const hours = require('../../../data/hours.js');
const houArr = require('../../../data/hou.js');
const constitution = require('../../../data/constitution.js');
const daoism = require('../../../data/daoism.js');
const fortuneSticks = require('../../../data/fortune-sticks.js');
const tick = require('../../../utils/tick.js');

const HEALTH_MAP = {};
healthArr.forEach(t => { HEALTH_MAP[t.term] = t; });
const HOU_MAP = {};
houArr.forEach(g => { HOU_MAP[g.term] = g.hou; });

const HOUR_NAMES = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
const HOU_IDX = ['一', '二', '三'];
const WEEK = core.WEEK;
const STICKS = fortuneSticks.sticks;

// —— 古历罗盘绘制常量（与 web SVG 同坐标系：deg=0 正上方，顺时针） ——
const RIM = 156, R_JIE_TICK = 153, R_JIE = 150, R_BAGUA = 128, R_DIR = 106, R_MEN = 86, R_SHI = 64;
function ringPoint(cx, cy, r, deg) {
  const a = deg * Math.PI / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

Page({
  data: {
    dateText: '', termName: '', termMeta: '', season: '', seasonColor: '',
    hourName: '', hourMer: '', hourYi: '', hourJi: '',
    badge: '', badgeKind: '', summary: '',
    // 今日总览 8 宫格
    ov: { date: '', ganzhi: '', term: '', termMeta: '', hour: '', organ: '', bazi: '', yi: '', ji: '', dao: '', sign: '', fortune: '' },
    daoDaily: { text: '', source: '', insight: '' },
    personalized: { show: false }, focus: [], health: {}, meridian: {}, houItems: [],
    checkin: {}, mode: 'novice',
    disclaimerText: core.DISCLAIMER,
  },
  onLoad() { this.build(); this.initClock(); },
  onReady() { this.initClock(); },
  onShow() {
    this.build();
    this.refreshCheckin();
    this.startClockLoop();
    tick.bindTimeTick(this, () => { this.build(); this.refreshCheckin(); });
  },
  onHide() { this.stopClockLoop(); this.stopWall(); tick.unbindTimeTick(this); },
  onUnload() { this.stopClockLoop(); this.stopWall(); tick.unbindTimeTick(this); },

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

    // 距下一节气天数
    let daysToNext = -1;
    if (next && next.date) {
      const d0 = new Date(now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate());
      const d1 = new Date(next.date.replace(/-/g, '/'));
      daysToNext = Math.round((d1 - d0) / 86400000);
    }
    const termMeta = daysToNext > 0 ? `${season}季 · 距${next ? next.name : ''} ${daysToNext}天` : `${season}季 · 今日交节`;
    const hourYi = (hour.advice || '').split('；')[0].replace(/^宜/, '').trim();

    // —— 八字 / 黄历宜忌（今日总览用） ——
    const bz = core.computeBazi(now, hIdx, flat);
    const alm = core.almanacData(now, hIdx, flat, hour);
    const ganzhi = `${bz.pillars.年.gz}年 ${bz.pillars.月.gz}月 ${bz.pillars.日.gz}日 ${bz.pillars.时.gz}时`;
    const baziStr = ['年', '月', '日', '时'].map(k => bz.pillars[k].gz).join(' ');

    // —— 道家今日功课 ——
    const dh = core.dateHash(core.todayStr());
    const daoMethod = (daoism.methods && daoism.methods.length) ? daoism.methods[dh % daoism.methods.length] : { name: '静养' };
    const daoQuote = daoism.quotes[(Math.floor(dh / 7) + 3) % daoism.quotes.length];

    // —— 今日一签 ——
    const sign = STICKS[core.dateHash(core.todayStr()) % STICKS.length];

    // —— 生肖运程最佳 ——
    const zf = core.zodiacFortuneData(now);
    const topZ = (zf.cells || []).slice().sort((a, b) => b.score - a.score)[0] || { s: '—' };

    // —— 一句话摘要 + 徽标 ——
    const th = HEALTH_MAP[cur.name] || {};
    const keyLine = (th.key || '顺时养正').replace(/[。.]$/, '');
    const yiFirst = (alm.jcYi || []).slice(0, 2).join('、');
    const summary =
      `${special.kind === 'jie' ? '今日交' + cur.name : cur.name + '时节'}，` +
      `当令养${hour.organ || info.organ}；${keyLine}。` +
      `今日${bz.pillars.日.gz}日宜${yiFirst}，` +
      `此刻${hour.name}正当${hour.meridian || ''}，最利${topZ.s}。`;

    // —— 道经今读（按公历年内第几天轮换） ——
    const start = new Date(now.getFullYear(), 0, 0);
    const doy = Math.floor((now - start) / 86400000);
    const q = daoism.quotes[doy % daoism.quotes.length];

    // —— 今日养生各块 ——
    const health = core.healthSections(info);
    const TF = { 食: 'food', 居: 'live', 动: 'move', 穴: 'acu' };
    const focus = core.todayFocusData(info).map(f => ({ ...f, cls: TF[f.tag] || '' }));
    const profile = store.loadProfile();
    const personalized = core.personalizedData(info, profile, flat, constitution);
    const meridian = {
      name: hour.name || '', meridian: hour.meridian || '', organ: hour.organ || '',
      yuan: hour.yuan || '', luo: hour.luo || '', mu: hour.mu || '',
    };
    const houItems = (HOU_MAP[cur.name] || []).map(h => ({
      idx: HOU_IDX[h.idx - 1], name: h.name, phenom: h.phenom,
    }));

    this.setData({
      dateText: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`,
      termName: cur.name, termMeta, season, seasonColor,
      hourName, hourMer: hour.meridian || '', hourYi, hourJi: hour.avoid || '',
      badge: special.tag, badgeKind: special.kind, summary,
      ov: {
        date: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`,
        ganzhi, term: cur.name, termMeta,
        hour: hourName, organ: '当令 · ' + (hour.organ || ''),
        bazi: baziStr,
        yi: '宜：' + (alm.jcYi || []).slice(0, 4).join('、'),
        ji: '忌：' + (alm.jcJi || []).slice(0, 3).join('、'),
        dao: `主修「${daoMethod.name}」· ${daoQuote.source}`,
        sign: `吕祖灵签 第${sign.no}签「${sign.title}」`,
        fortune: `今日最利 · ${topZ.s}`,
      },
      daoDaily: { text: `「${q.text}」`, source: q.source, insight: q.insight },
      personalized, focus, health, meridian, houItems,
      mode: store.loadMode(),
    });
  },

  /* ===== 古历罗盘（canvas 2d，完整复刻 web：太极旋转 + 八卦 + 方位 + 八门 + 十二时辰 + 24 节气 + 雷达秒针） ===== */
  initClock() {
    if (this._clockInit || this._clock2d) return;
    this._clockInit = true;
    const q = wx.createSelectorQuery();
    q.select('#lunarClock').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2;
      const w = res[0].width;
      canvas.width = w * dpr;
      canvas.height = w * dpr;
      this._clock2d = { canvas, ctx, dpr, size: w };
      this._taijiAngle = 0;
      this.startClockLoop();
    });
  },
  startClockLoop() {
    if (!this._clock2d || this._loop) return;
    let last = 0;
    const tick = (ts) => {
      const t = ts || Date.now();
      if (t - last >= 40) {            // 节流到 ~25fps，降低持续重绘对渲染线程的压力
        last = t;
        this._taijiAngle = (this._taijiAngle + 0.6) % 360;
        this.drawClock();
      }
      this._loop = this._clock2d.canvas.requestAnimationFrame(tick);
    };
    tick(Date.now());
  },
  stopClockLoop() {
    if (this._loop && this._clock2d) { this._clock2d.canvas.cancelAnimationFrame(this._loop); this._loop = null; }
  },
  drawClock() {
    const c = this._clock2d; if (!c) return;
    const ctx = c.ctx, S = c.size * c.dpr, sc = S / 320;
    const cx = 160 * sc, cy = 160 * sc;
    const R = r => r * sc;
    ctx.clearRect(0, 0, S, S);
    const seal = '#6e4a8e', paper = '#f5f1e8', ink = '#7a6c52', line = '#d8c8a8', sub = '#9a8c78';
    // 外圈
    ctx.strokeStyle = line; ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.arc(cx, cy, R(RIM), 0, 2 * Math.PI); ctx.stroke();
    // 24 节气
    const curTerm = this.data.termName;
    core.TERM_ORDER.forEach((name, i) => {
      const deg = i * 15;
      const p1 = ringPoint(cx, cy, R(R_JIE_TICK), deg), p2 = ringPoint(cx, cy, R(R_JIE_TICK) - 7 * sc, deg);
      ctx.strokeStyle = (name === curTerm) ? seal : sub;
      ctx.lineWidth = (name === curTerm) ? 2.4 * sc : 1.4 * sc;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      const pn = ringPoint(cx, cy, R(R_JIE), deg);
      ctx.fillStyle = (name === curTerm) ? seal : ink;
      ctx.font = `${(name === curTerm ? 13 : 12) * sc}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name, pn.x, pn.y);
    });
    // 内圈环线
    [138, 116, 94, 72].forEach(rr => {
      ctx.strokeStyle = line; ctx.lineWidth = 1 * sc;
      ctx.beginPath(); ctx.arc(cx, cy, R(rr), 0, 2 * Math.PI); ctx.stroke();
    });
    // 八卦
    ctx.fillStyle = '#8a7a5e'; ctx.font = `${12 * sc}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    core.TRIGRAMS.forEach((g, i) => {
      const p = ringPoint(cx, cy, R(R_BAGUA), i * 45 + 22.5);
      ctx.fillText(g, p.x, p.y);
    });
    // 方位
    core.DIRS.forEach(d => {
      const p = ringPoint(cx, cy, R(R_DIR), d.deg);
      ctx.fillStyle = d.major ? seal : sub; ctx.font = `${(d.major ? 13 : 11) * sc}px sans-serif`;
      ctx.fillText(d.name, p.x, p.y);
    });
    // 八门
    ctx.fillStyle = sub; ctx.font = `${12 * sc}px sans-serif`;
    core.EIGHT_MEN.forEach((m, i) => {
      const p = ringPoint(cx, cy, R(R_MEN), i * 45 - 90);
      ctx.fillText(m, p.x, p.y);
    });
    // 十二时辰（当前高亮 + 覆盖扇）
    const hIdx = core.currentHourIndex();
    // 覆盖扇用 ctx.arc（canvas 原生角度：0 在 3 点、顺时针），与 ringPoint 的时辰标签差 -90° 对齐
    const fanDeg = hIdx * 30 + 90;
    ctx.fillStyle = 'rgba(110,74,142,0.16)';
    ctx.beginPath();
    const a0 = (fanDeg - 15) * Math.PI / 180, a1 = (fanDeg + 15) * Math.PI / 180;
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R(66), a0, a1);
    ctx.closePath(); ctx.fill();
    core.BRANCHES.forEach((z, i) => {
      const p = ringPoint(cx, cy, R(R_SHI), i * 30 + 180);
      const cur = i === hIdx;
      ctx.fillStyle = cur ? seal : ink; ctx.font = `${(cur ? 14 : 13) * sc}px sans-serif`;
      ctx.fillText(z, p.x, p.y);
    });
    // 指针
    const now = new Date();
    const ms = now.getMilliseconds();
    const s = now.getSeconds() + ms / 1000;
    const m = now.getMinutes() + s / 60;
    const ci = Math.floor((core.localHour(now) + 1) / 2) % 12;
    const startH = (((ci * 2 - 1) % 24) + 24) % 24;
    const elapsed = (((core.localHour(now) * 60 + m) - startH * 60) % 1440 + 1440) % 1440;
    const shiDeg = ci * 30 + 180 + (elapsed / 120) * 30;
    const hand = (deg, len, wdt, color) => {
      const a = deg * Math.PI / 180;
      const ex = cx + len * Math.sin(a), ey = cy - len * Math.cos(a);
      ctx.strokeStyle = color; ctx.lineWidth = wdt * sc; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    };
    // 雷达尾迹（与秒针同一坐标系：deg 从12点顺时针；ctx.arc 原生从3点顺时针，故整体 -90°）
    ctx.fillStyle = 'rgba(110,74,142,0.12)';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    const ra0 = (s * 6 - 50 - 90) * Math.PI / 180, ra1 = (s * 6 - 90) * Math.PI / 180;
    ctx.arc(cx, cy, R(150), ra0, ra1); ctx.closePath(); ctx.fill();
    // 时辰针 / 分针 / 雷达光束
    hand(shiDeg, R(98), 4, '#3a78a8');
    hand(m * 6, R(104), 3, '#6e4a8e');
    hand(s * 6, R(150), 2, seal);
    ctx.fillStyle = seal;
    const bp = ringPoint(cx, cy, R(150), s * 6);
    ctx.beginPath(); ctx.arc(bp.x, bp.y, 3 * sc, 0, 2 * Math.PI); ctx.fill();
    // 中心轴
    ctx.fillStyle = seal; ctx.beginPath(); ctx.arc(cx, cy, 5 * sc, 0, 2 * Math.PI); ctx.fill();
    // 旋转太极
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this._taijiAngle * Math.PI / 180);
    const tr = 15 * sc;
    ctx.fillStyle = seal; ctx.beginPath(); ctx.arc(0, 0, tr, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = paper;
    ctx.beginPath(); ctx.arc(0, -tr / 2, tr / 2, Math.PI / 2, Math.PI * 1.5); ctx.arc(0, 0, tr / 2, Math.PI * 1.5, Math.PI / 2, true); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, tr / 2, tr / 2, -Math.PI / 2, Math.PI / 2); ctx.arc(0, 0, tr / 2, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(0, -tr / 2, 2.6 * sc, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = seal; ctx.beginPath(); ctx.arc(0, tr / 2, 2.6 * sc, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
  },

  /* ===== 打卡 ===== */
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
  goProfile() { wx.navigateTo({ url: '../profile/index' }); },
  onShareAppMessage() {
    const d = this.data;
    return { title: `养生日历 · ${d.termName} · ${d.summary}`, path: '/pages/health-calendar/today/index' };
  },
  onShareTimeline() {
    const d = this.data;
    return { title: `养生日历 · ${d.termName} · ${d.summary}` };
  },
});
