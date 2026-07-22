// 时间推进触发重算：页面停留期间，若"日"或"时辰"发生变化，
// 自动触发回调（通常是重新 build）。秒级由罗盘 RAF 覆盖，这里只管
// 时辰(约2h)与跨午夜(日)两档 —— 这正是页面文字快照不会随时间更新的根因。
//
// 用法（在各页 onShow 调用 bindTimeTick，onHide/onUnload 调用 unbindTimeTick）：
//   const tick = require('../../../utils/tick.js');
//   onShow() {
//     this.build();
//     tick.bindTimeTick(this, () => { this.build(); this.refreshCheckin && this.refreshCheckin(); });
//   }
//   onHide() { tick.unbindTimeTick(this); }
//   onUnload() { tick.unbindTimeTick(this); }
//
// 单页独立 timer，互不干扰；离开页面即清理，不会在后台空跑。

const core = require('./core.js');

// 当前"日 + 时辰"指纹；任一变化即代表需要重算。
function timeKey() {
  const d = new Date();
  const day = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  return day + '#' + core.currentHourIndex();
}

function bindTimeTick(page, onChange) {
  if (!page || typeof onChange !== 'function') return;
  // 先清掉可能残留的旧 timer
  if (page._tickTimer) {
    clearInterval(page._tickTimer);
    page._tickTimer = null;
  }
  let last = timeKey();
  // 15s 检查一次：足够轻量，又能即时捕捉跨时辰/跨午夜瞬间。
  page._tickTimer = setInterval(() => {
    const k = timeKey();
    if (k !== last) {
      last = k;
      onChange();
    }
  }, 15000);
}

function unbindTimeTick(page) {
  if (page && page._tickTimer) {
    clearInterval(page._tickTimer);
    page._tickTimer = null;
  }
}

module.exports = { bindTimeTick, unbindTimeTick };
