// 全局逻辑（多小程序共享）。health-calendar 是 pages/ 下的一个应用。
App({
  globalData: {
    mode: 'novice',   // novice(简明) | pro(进阶)
    profile: null,    // 生辰八字档案
  },
  onLaunch() {
    const s = require('./utils/storage.js');
    this.globalData.mode = s.getItem('healthcal_mode_v1') === 'pro' ? 'pro' : 'novice';
    const p = s.getItem('healthcal_profile_v1');
    try { this.globalData.profile = p ? JSON.parse(p) : null; } catch (e) { this.globalData.profile = null; }
  },
});
