// 全局逻辑（多小程序共享）。health-calendar 是 pages/ 下的一个应用。
const store = require('./utils/store.js');
App({
  globalData: {
    mode: 'novice',   // novice(简明) | pro(进阶)
    profile: null,    // 生辰八字档案
  },
  onLaunch() {
    this.globalData.mode = store.loadMode();
    this.globalData.profile = store.loadProfile();
  },
});
