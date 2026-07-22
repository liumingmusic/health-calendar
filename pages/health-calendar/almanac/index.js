// 黄历八字页（对齐 web：生辰体质 → 今日一眼通 → 八字四柱命盘 → 奇门 → 黄历宜忌·方位·取穴 → 六十甲子）
const core = require('../../../utils/core.js');
const store = require('../../../utils/store.js');
const solarTerms = require('../../../data/solar-terms.js');
const hours = require('../../../data/hours.js');
const constitution = require('../../../data/constitution.js');
const tick = require('../../../utils/tick.js');

const WX = { 木: 'mu', 火: 'huo', 土: 'tu', 金: 'jin', 水: 'shui' };

Page({
  data: {
    profile: null, hasProfile: false,
    almanac: {}, showPro: false, qimen: null, ganzhi: null,
    disclaimerText: core.DISCLAIMER,
  },
  onShow() {
    this.build();
    tick.bindTimeTick(this, () => { this.build(); });
  },
  onHide() { tick.unbindTimeTick(this); },
  onUnload() { tick.unbindTimeTick(this); },
  build() {
    const flat = core.flattenTerms(solarTerms);
    const { cur } = core.findCurrentTerm(flat);
    const now = new Date();
    const hIdx = core.currentHourIndex();
    const hour = hours[hIdx] || {};
    const almanac = core.almanacData(now, hIdx, flat, hour);
    // 宜/忌用顿号连接（与 web 一致）
    almanac.jcYiText = (almanac.jcYi || []).join('、');
    almanac.jcJiText = (almanac.jcJi || []).join('、');
    if (almanac.wuxing) almanac.wuxing.forEach(x => { x.cls = WX[x.name] || ''; });

    const profile = core.profileView(store.loadProfile(), flat, constitution);
    if (profile) {
      if (profile.wuxing) profile.wuxing.forEach(x => { x.cls = WX[x.name] || ''; });
      if (profile.advice) profile.advice.forEach(a => { a.cls = WX[a.element] || ''; });
    }

    const showPro = store.loadMode() === 'pro';
    const qimen = showPro ? core.qimenData(now, cur.name) : null;
    const ganzhi = showPro ? core.ganzhiData(now) : null;
    if (ganzhi) {
      ganzhi.ganRows.forEach(r => { r.cls = WX[r.wx] || ''; });
      ganzhi.zhiRows.forEach(r => { r.cls = WX[r.wx] || ''; });
    }

    this.setData({ almanac, profile, hasProfile: !!profile, showPro, qimen, ganzhi });
  },
  goProfile() { wx.navigateTo({ url: '../profile/index' }); },
});
