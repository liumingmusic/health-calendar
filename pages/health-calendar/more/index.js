// 更多页：全年总览(节气+时辰+七十二候) + 使用说明 + 设置 + 免责
const core = require('../../../utils/core.js');
const store = require('../../../utils/store.js');
const solarTerms = require('../../../data/solar-terms.js');
const healthArr = require('../../../data/health.js');
const hours = require('../../../data/hours.js');
const hou = require('../../../data/hou.js');
const tick = require('../../../utils/tick.js');

const HEALTH_MAP = {};
healthArr.forEach(t => { HEALTH_MAP[t.term] = t; });

const HELP = [
  { title: '今日总览', open: false, items: [
    '公历 / 农历：今日干支与纪日。',
    '当前节气：所在节气与距下一节气天数。',
    '当前时辰：当令经络与脏腑。',
    '八字四柱：年、月、日、时四组干支。',
    '今日宜忌：按建除十二神推断当日所宜所忌。',
    '道家功课：今日主修功法与诵持道经。',
    '今日一签：当日吕祖灵签的签号与签题（古人典故）。',
    '生肖运程：今日最利生肖。',
  ]},
  { title: '今日养生', open: false, items: [
    '道经今读：每日轮换一句《道德经》《庄子》原句与体悟。',
    '今日养生：当令脏腑、气候、饮食起居宜忌、导引术与保健穴位，并附当前时辰的经络取穴（原穴/络穴/募穴）。',
    '七十二候：当前节气的三候物候。',
    '每日打卡：喝够水/早睡/八段锦/食养，仅存本机。',
  ]},
  { title: '黄历八字', open: false, items: [
    '八字四柱：年/月/日/时各一组干支（共八字）、五行与纳音。日柱那一格叫「日主」，是论命的重心。',
    '奇门遁甲：据节气与日干支排的九宫盘，看九宫里落了哪颗星、哪道门、哪位神，外加三奇六仪。纯文化示意，看着「牛」就好，不必深究。',
    '黄历宜忌：今日宜/忌、建除十二神、值神黄黑道、冲煞、彭祖百忌，及喜神/财神/福神方位。',
    '天干地支：十天干、十二地支、六十甲子，今日日干支高亮。',
  ]},
  { title: '道家养生', open: false, items: [
    '今日道家功课：依公历日期推算，每天不同、人人相同（不是随机）。含主修功法、今日诵持、今日心法、当令要旨。',
    '四时顺要：春生夏长秋收冬藏的顺时养生总纲。',
    '功法全录 / 道经全览：点标题展开详情（守静、坐忘、六字诀、导引等）。',
  ]},
  { title: '每日签运', open: false, items: [
    '每日一签：点「摇签求签」，筒中竹签摇晃后跳出一签——每次摇签独立真随机，不同人、不同时刻结果皆不相同。「再摇一签」同样随机，仅避开上一支以免重复。总览卡的「今日一签」为全站按日共用的每日签，二者互不影响。',
    '今日运程：十二生肖按今日日支的六合/三合/冲/刑/害与五行生克排定每日运程，并附本日干支综论。',
  ]},
  { title: '全年总览', open: false, items: [
    '二十四节气：可按季节筛选，点格子看某节气详情。',
    '十二时辰：子午流注，点时段看当令经络与宜忌。',
    '七十二候：全年候历。',
  ]},
  { title: '术语小词典', open: false, items: [
    '节气：把一年分为 24 段，标记气候与物候的交接点。',
    '候：每节气分三候（初/二/三候），共七十二候，记物候变化。',
    '时辰：一天 12 时辰（子丑寅…），每两小时一辰，对应经络当令。',
    '干支：十天干+十二地支，60 一循环，用来记年月日时。',
    '八字：出生/当日的年、月、日、时四组干支。',
    '纳音：干支两两配出的五行「音律」之名，如「海中金」。',
    '奇门遁甲：传统术数，以九宫排星、门、神、三奇六仪推演时空。',
    '建除：建/除/满/平…十二神轮值，定每日宜忌基调。',
    '值神黄黑道：青龙等六黄道吉、天刑等六黑道凶。',
  ]},
];

function hourDetailOf(h) {
  return { name: h.name, meridian: h.meridian, range: h.range, advice: h.advice, avoid: h.avoid };
}

Page({
  data: {
    terms: [], activeSeason: 'all',
    seasonTabs: [{ key: 'all', label: '全部' }],
    hourSegs: [], selHour: 0, hourDetail: {},
    houGroups: [],
    helpToday: {}, help: HELP.map(h => ({ ...h })),
    mode: 'novice', hasProfile: false,
    disclaimerText: core.DISCLAIMER,
  },
  onShow() {
    this.build();
    tick.bindTimeTick(this, () => { this.build(); });
  },
  onHide() { tick.unbindTimeTick(this); },
  onUnload() { tick.unbindTimeTick(this); },
  build() {
    const flat = core.flattenTerms(solarTerms);
    const { cur } = core.findCurrentTerm(flat);
    const curName = cur.name;
    const curHour = core.currentHourIndex();
    const now = new Date();
    const bz = core.computeBazi(now, curHour, flat);
    const riGan = core.GAN[bz.riGan], riZhi = core.ZHI[bz.pillars.日.z];

    const terms = healthArr.map(t => {
      const f = flat.find(x => x.name === t.term) || {};
      const mmdd = (f.date || '').slice(5).replace('-', '/');
      return { term: t.term, season: t.season, color: core.SEASON_COLORS[t.season], mmdd, isCur: t.term === curName };
    });
    const seasonTabs = [{ key: 'all', label: '全部' }].concat(core.SEASON_ORDER.map(s => ({ key: s, label: s })));

    const hourSegs = hours.map((h, i) => ({ i, name: h.name, range: h.range, color: h.color, current: i === curHour }));
    const selHour = curHour;
    const hourDetail = hourDetailOf(hours[selHour] || hours[0]);

    const houGroups = hou.map(g => ({
      term: g.term,
      rows: g.hou.map(h => ({ label: h.idx === 1 ? '初候' : h.idx === 2 ? '二候' : '三候', name: h.name, phenom: h.phenom })),
    }));

    const helpToday = {
      term: curName,
      hour: `${hours[curHour].name} · ${hours[curHour].meridian}`,
      ganzhi: `${riGan}${riZhi}日`,
      lunar: core.lunarLabel(now, bz),
    };

    this.setData({
      terms, seasonTabs, hourSegs, selHour, hourDetail, houGroups, helpToday,
      mode: store.loadMode(), hasProfile: !!store.loadProfile(),
    });
  },
  setSeason(e) { this.setData({ activeSeason: e.currentTarget.dataset.key }); },
  tapHour(e) {
    const i = +e.currentTarget.dataset.i;
    this.setData({ selHour: i, hourDetail: hourDetailOf(hours[i] || hours[0]) });
  },
  toggleHelp(e) {
    const i = e.currentTarget.dataset.i;
    const key = `help[${i}].open`;
    this.setData({ [key]: !this.data.help[i].open });
  },
  setMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.mode) return;
    store.saveMode(mode);
    this.setData({ mode });
    wx.showToast({ title: mode === 'pro' ? '已切到「进阶」' : '已切到「简明」', icon: 'none' });
  },
  goProfile() { wx.navigateTo({ url: '../profile/index' }); },
});
