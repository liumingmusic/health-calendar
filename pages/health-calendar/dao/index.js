// 道家养生页
const core = require('../../../utils/core.js');
const solarTerms = require('../../../data/solar-terms.js');
const healthArr = require('../../../data/health.js');
const dao = require('../../../data/daoism.js');

const HEALTH_MAP = {};
healthArr.forEach(t => { HEALTH_MAP[t.term] = t; });

const DAO_PROMPTS = [
  '今日静坐一刻，观息归根，不随念转。',
  '晨起缓行，披发广步，与生发之气相和。',
  '遇事少言，先吸三息，再作回应。',
  '食不知味时停箸，问己：此身所需几何？',
  '睡前放下万缘，如舟泊岸，神归丹田。',
  '行住坐卧，常令脊直肩松，气自下沉。',
];

Page({
  data: {
    seasonText: '', lesson: {}, seasonGist: [],
    quotes: [], methods: [],
    disclaimerText: core.DISCLAIMER,
  },
  onShow() { this.build(); },
  build() {
    const flat = core.flattenTerms(solarTerms);
    const { cur } = core.findCurrentTerm(flat);
    const season = (HEALTH_MAP[cur.name] && HEALTH_MAP[cur.name].season) || '春';
    const h = core.dateHash(core.todayStr());
    const methods = dao.methods || [];
    const quotes = dao.quotes || [];
    const method = methods[h % methods.length] || {};
    const quote = quotes[(Math.floor(h / 7) + 3) % quotes.length] || {};
    const prompt = DAO_PROMPTS[h % DAO_PROMPTS.length];
    const gist = (dao.seasonGist.find(s => s.season === season) || dao.seasonGist[0] || {}).gist || '';

    const lesson = {
      seasonText: season + '季 · 今日功课',
      methodName: method.name || '',
      methodQuote: method.quote || '',
      methodSteps: (method.how || []).slice(0, 2),
      methodBenefit: method.benefit || '',
      quoteText: quote.text || '',
      quoteSrc: quote.source || '',
      prompt, gist,
    };
    const seasonGist = (dao.seasonGist || []).map(s => ({ season: s.season, gist: s.gist, current: s.season === season }));
    const quotesView = (quotes || []).map(q => ({ text: q.text, source: q.source, plain: q.plain, open: false }));
    const methodsView = (methods || []).map(m => ({
      name: m.name, from: m.from, quote: m.quote,
      steps: m.how || [], benefit: m.benefit || '', note: m.note || '', open: false,
    }));
    this.setData({ seasonText: season, lesson, seasonGist, quotes: quotesView, methods: methodsView });
  },
  toggleQuote(e) {
    const i = e.currentTarget.dataset.i;
    const key = `quotes[${i}].open`;
    this.setData({ [key]: !this.data.quotes[i].open });
  },
  toggleMethod(e) {
    const i = e.currentTarget.dataset.i;
    const key = `methods[${i}].open`;
    this.setData({ [key]: !this.data.methods[i].open });
  },
});
