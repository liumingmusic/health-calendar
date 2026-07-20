// 存储封装：用 wx 存储模拟 web 的 localStorage 接口，便于逻辑迁移
module.exports = {
  getItem(k) {
    try {
      const v = wx.getStorageSync(k);
      return (v === '' || v == null) ? null : v;
    } catch (e) { return null; }
  },
  setItem(k, v) {
    try { wx.setStorageSync(k, v); } catch (e) {}
  },
  removeItem(k) {
    try { wx.removeStorageSync(k); } catch (e) {}
  },
};
