// 每日签运页（对齐 web：吕祖灵签摇签 + 签文弹层 + 生肖运程 + 我的签历）
const core = require('../../../utils/core.js');
const store = require('../../../utils/store.js');
const solarTerms = require('../../../data/solar-terms.js');
const sticksData = require('../../../data/fortune-sticks.js');
const tick = require('../../../utils/tick.js');

const STICKS = sticksData.sticks || [];
const SIGN_INTRO = '《吕祖灵签》共一百签，吕祖即吕洞宾，道教全真道尊为纯阳祖师。签文古奥，宜自参悟；此处仅录签诗与解曰原文，不作吉凶断言，亦不替代道观实物签谱。';
const SIGN_NOTE = '签文录自《吕祖灵签》通行本（吕洞宾，道教全真道纯阳祖师，共一百签），仅作修身自省之镜，不作吉凶断言与占卜判定，亦不替代道观实物签谱。';
const FORTUNE_NOTE = '运程依据当日干支、建除十二神与值神黄黑道离线推算，仅供传统养生与文化参考，不替代专业命理或医疗建议。';
const PROMPT = '焚香净手，心诚意正，于心中默念所问之事，再摇签筒以求今日之签。';

Page({
  data: {
    intro: SIGN_INTRO,
    signNote: SIGN_NOTE,
    fortuneNote: FORTUNE_NOTE,
    prompt: PROMPT,
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
    tick.bindTimeTick(this, () => {
      this.build();
      this.setData({ mySigns: store.loadMySigns().slice().reverse() });
    });
  },
  onHide() { tick.unbindTimeTick(this); },
  onUnload() { tick.unbindTimeTick(this); },
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
    }, 1500);
  },
  reroll() {
    if (this.data.shaking) return;
    let r = this.pickRandom();
    const cur = this.data.current ? this.data.current.no : -1;
    if (STICKS.length > 1) { let guard = 0; while (STICKS[r].no === cur && guard < 20) { r = this.pickRandom(); guard++; } }
    this.setData({ shaking: true, revealed: false });
    setTimeout(() => this.reveal(r), 1100);
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
