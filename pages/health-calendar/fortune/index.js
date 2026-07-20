// 每日签运页
const core = require('../../utils/core.js');
const store = require('../../utils/store.js');
const solarTerms = require('../../data/solar-terms.js');
const sticksData = require('../../data/fortune-sticks.js');

const STICKS = sticksData.sticks || [];
const SIGN_INTRO = '《吕祖灵签》共一百签，吕祖即吕洞宾，道教全真道尊为纯阳祖师。签文古奥，宜自参悟；此处仅录签诗与解曰原文，不作吉凶断言，亦不替代道观实物签谱。';

Page({
  data: {
    intro: SIGN_INTRO,
    dailyNo: 0, dailyTitle: '',
    shaking: false, revealed: false,
    current: null,
    showPro: false,
    fortune: { cells: [], lead: '', zong: '' },
    mySigns: [],
    disclaimerText: core.DISCLAIMER,
  },
  onLoad() { this.build(); },
  onShow() {
    this.build();
    this.setData({ mySigns: store.loadMySigns().slice().reverse() });
  },
  build() {
    const flat = core.flattenTerms(solarTerms);
    const now = new Date();
    const daily = STICKS[core.signDailyIndex()] || {};
    const showPro = store.loadMode() === 'pro';
    const f = core.zodiacFortuneData(now);
    const lead = core.fortuneLeadData(now, flat);
    this.setData({
      dailyNo: daily.no || 0, dailyTitle: daily.title || '',
      showPro,
      fortune: { cells: f.cells, lead: lead.lead, zong: lead.zong },
    });
  },
  pickRandom() {
    if (!STICKS.length) return 0;
    return Math.floor(Math.random() * STICKS.length);
  },
  shake() {
    if (this.data.shaking) return;
    this.setData({ shaking: true, revealed: false });
    setTimeout(() => {
      const idx = this.pickRandom();
      this.reveal(idx);
    }, 1100);
  },
  reroll() {
    if (this.data.shaking) return;
    let r = this.pickRandom();
    const cur = this.data.current ? this.data.current.no : -1;
    if (STICKS.length > 1) { let guard = 0; while (STICKS[r].no === cur && guard < 20) { r = this.pickRandom(); guard++; } }
    this.setData({ shaking: true, revealed: false });
    setTimeout(() => this.reveal(r), 700);
  },
  reveal(idx) {
    const s = STICKS[idx];
    if (!s) { this.setData({ shaking: false }); return; }
    const current = {
      no: s.no, title: s.title,
      poem: s.poem || [],
      jie: s.jie || '',
      explain: core.signExplain(s),
    };
    store.saveMySign(s.no, s.title);
    this.setData({ shaking: false, revealed: true, current, mySigns: store.loadMySigns().slice().reverse() });
  },
});
