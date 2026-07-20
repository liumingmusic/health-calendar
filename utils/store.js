// 存储封装：用 wx 存储模拟 web 的 localStorage，便于逻辑迁移
const core = require('./core.js');
const CHECKIN_KEY = core.CHECKIN_KEY;
const CHECKIN_BEST_KEY = core.CHECKIN_BEST_KEY;
const MODE_KEY = core.MODE_KEY;
const PROFILE_KEY = 'healthcal_profile_v1';
const MY_SIGNS_KEY = 'healthcal_my_signs_v1';

function get(k, def) {
  try { const v = wx.getStorageSync(k); return (v === '' || v == null) ? def : v; }
  catch (e) { return def; }
}
function set(k, v) { try { wx.setStorageSync(k, v); } catch (e) {} }
function remove(k) { try { wx.removeStorageSync(k); } catch (e) {} }

/* 打卡 */
function loadCheckins() { return get(CHECKIN_KEY, {}); }
function saveCheckins(obj) { set(CHECKIN_KEY, obj); }
function loadBestStreak() { return get(CHECKIN_BEST_KEY, 0) || 0; }
function saveBestStreak(v) { set(CHECKIN_BEST_KEY, v); }

/* 生辰 */
const HOUR_OPTS = [
  { i: 0, name: '子时', range: '23:00–01:00' },
  { i: 1, name: '丑时', range: '01:00–03:00' },
  { i: 2, name: '寅时', range: '03:00–05:00' },
  { i: 3, name: '卯时', range: '05:00–07:00' },
  { i: 4, name: '辰时', range: '07:00–09:00' },
  { i: 5, name: '巳时', range: '09:00–11:00' },
  { i: 6, name: '午时', range: '11:00–13:00' },
  { i: 7, name: '未时', range: '13:00–15:00' },
  { i: 8, name: '申时', range: '15:00–17:00' },
  { i: 9, name: '酉时', range: '17:00–19:00' },
  { i: 10, name: '戌时', range: '19:00–21:00' },
  { i: 11, name: '亥时', range: '21:00–23:00' },
];
function loadProfile() { return get(PROFILE_KEY, null); }
function saveProfile(p) { set(PROFILE_KEY, p); }
function clearProfile() { remove(PROFILE_KEY); }

/* 双模式 */
function loadMode() { return get(MODE_KEY, 'novice') === 'pro' ? 'pro' : 'novice'; }
function saveMode(mode) { set(MODE_KEY, mode); }

/* 我的签历 */
function loadMySigns() { return get(MY_SIGNS_KEY, []); }
function saveMySign(no, title) {
  const list = loadMySigns();
  const today = core.todayStr();
  const ex = list.find(x => x.date === today);
  if (ex) { ex.no = no; ex.title = title; }
  else list.push({ date: today, no, title });
  set(MY_SIGNS_KEY, list);
}

module.exports = {
  PROFILE_KEY, HOUR_OPTS,
  loadCheckins, saveCheckins, loadBestStreak, saveBestStreak,
  loadProfile, saveProfile, clearProfile,
  loadMode, saveMode,
  loadMySigns, saveMySign,
};
