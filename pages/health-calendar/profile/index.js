// 生辰录入页（子页）
const store = require('../../utils/store.js');
const core = require('../../utils/core.js');

const YEARS = [];
for (let y = 2026; y >= 1930; y--) YEARS.push(y);
const MONTHS = []; for (let m = 1; m <= 12; m++) MONTHS.push(m);
const DAYS = []; for (let d = 1; d <= 31; d++) DAYS.push(d);

Page({
  data: {
    years: YEARS, months: MONTHS, days: DAYS, hours: store.HOUR_OPTS,
    sel: { yi: 0, mi: 0, di: 0, hi: 6 },
    hasProfile: false,
    disclaimerText: core.DISCLAIMER,
  },
  onLoad() {
    const p = store.loadProfile();
    const sel = { yi: 0, mi: 0, di: 0, hi: 6 };
    if (p) {
      const yi = YEARS.indexOf(p.y); sel.yi = yi >= 0 ? yi : 0;
      sel.mi = (p.m - 1 + 12) % 12;
      sel.di = (p.d - 1 + 31) % 31;
      sel.hi = p.h;
    }
    this.setData({ sel, hasProfile: !!p });
  },
  onYear(e) { this.setData({ 'sel.yi': +e.detail.value }); },
  onMonth(e) { this.setData({ 'sel.mi': +e.detail.value }); },
  onDay(e) { this.setData({ 'sel.di': +e.detail.value }); },
  onHour(e) { this.setData({ 'sel.hi': +e.detail.value }); },
  save() {
    const s = this.data.sel;
    const y = YEARS[s.yi], m = MONTHS[s.mi], d = DAYS[s.di], h = store.HOUR_OPTS[s.hi].i;
    if (!y || !m || !d) { wx.showToast({ title: '请填写完整', icon: 'none' }); return; }
    if (m < 1 || m > 12 || d < 1 || d > 31) { wx.showToast({ title: '月/日不合法', icon: 'none' }); return; }
    store.saveProfile({ y, m, d, h });
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 600);
  },
  clear() {
    store.clearProfile();
    wx.showToast({ title: '已清除', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 600);
  },
});
