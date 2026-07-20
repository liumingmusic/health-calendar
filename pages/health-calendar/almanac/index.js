// 黄历八字页
const core = require('../../utils/core.js');
const store = require('../../utils/store.js');
const solarTerms = require('../../data/solar-terms.js');
const hours = require('../../data/hours.js');
const constitution = require('../../data/constitution.js');

Page({
  data: {
    almanac: {}, profile: null, hasProfile: false,
    showPro: false, qimen: null, ganzhi: null,
    disclaimerText: core.DISCLAIMER,
  },
  onShow() { this.build(); },
  build() {
    const flat = core.flattenTerms(solarTerms);
    const { cur } = core.findCurrentTerm(flat);
    const now = new Date();
    const hIdx = core.currentHourIndex();
    const hour = hours[hIdx] || {};
    const almanac = core.almanacData(now, hIdx, flat, hour);
    const profile = core.profileView(store.loadProfile(), flat, constitution);
    const showPro = store.loadMode() === 'pro';
    const qimen = showPro ? core.qimenData(now, cur.name) : null;
    const ganzhi = showPro ? core.ganzhiData(now) : null;
    this.setData({ almanac, profile, hasProfile: !!profile, showPro, qimen, ganzhi });
  },
  goProfile() { wx.navigateTo({ url: '../profile/index' }); },
});
