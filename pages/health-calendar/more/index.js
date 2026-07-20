// 更多页：全年总览 + 使用说明 + 设置
const core = require('../../../utils/core.js');
const store = require('../../../utils/store.js');
const solarTerms = require('../../../data/solar-terms.js');
const healthArr = require('../../../data/health.js');

const HEALTH_MAP = {};
healthArr.forEach(t => { HEALTH_MAP[t.term] = t; });

Page({
  data: {
    terms: [], activeSeason: 'all',
    seasonTabs: [{ key: 'all', label: '全部' }],
    mode: 'novice',
    hasProfile: false,
    disclaimerText: core.DISCLAIMER,
  },
  onShow() { this.build(); },
  build() {
    const flat = core.flattenTerms(solarTerms);
    const { cur } = core.findCurrentTerm(flat);
    const curName = cur.name;
    const terms = healthArr.map(t => {
      const f = flat.find(x => x.name === t.term) || {};
      const mmdd = (f.date || '').slice(5).replace('-', '/');
      return {
        term: t.term, season: t.season,
        color: core.SEASON_COLORS[t.season],
        mmdd, isCur: t.term === curName,
      };
    });
    const seasonTabs = [{ key: 'all', label: '全部' }].concat(core.SEASON_ORDER.map(s => ({ key: s, label: s })));
    this.setData({
      terms, seasonTabs,
      mode: store.loadMode(),
      hasProfile: !!store.loadProfile(),
    });
  },
  setSeason(e) {
    this.setData({ activeSeason: e.currentTarget.dataset.key });
  },
  setMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.mode) return;
    store.saveMode(mode);
    this.setData({ mode });
    wx.showToast({
      title: mode === 'pro' ? '已切到「进阶」' : '已切到「简明」',
      icon: 'none',
    });
  },
  goProfile() { wx.navigateTo({ url: '../profile/index' }); },
});
