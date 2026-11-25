// 年間運勢・仕事・カルマ・相性の無料プレビュー（見取り図のみ）の共通定義。
// プレビューで作った星回りと見取り図は、同じ入力・同じ月の申し込みなら台帳に引き継いで再生成しない。
const crypto = require('crypto');
const { YEARLY_CHAPTERS, YEARLY_VOICE, COMPAT_CHAPTERS, COMPAT_VOICE, CAREER_CHAPTERS, CAREER_VOICE, compatChapterIdsFor } = require('./_report-products');
const { KARMA_CHAPTERS, KARMA_CHAPTER_IDS, KARMA_VOICE, findKarmaViolations } = require('./_report-karma');

const PREVIEW_PRODUCTS = new Set(['yearly', 'career', 'karma', 'compat']);
const PREVIEW_LANGS = new Set(['ja']);

function previewDefs(product, relation) {
  if (product === 'yearly') return { defs: YEARLY_CHAPTERS, ids: YEARLY_CHAPTERS.map((c) => c.id), voice: YEARLY_VOICE };
  if (product === 'career') return { defs: CAREER_CHAPTERS, ids: CAREER_CHAPTERS.map((c) => c.id), voice: CAREER_VOICE };
  if (product === 'karma') return { defs: KARMA_CHAPTERS, ids: KARMA_CHAPTER_IDS, voice: KARMA_VOICE, extraViolations: findKarmaViolations };
  return { defs: COMPAT_CHAPTERS, ids: compatChapterIdsFor(relation || 'general'), voice: COMPAT_VOICE };
}

// a / b は report-order の person() と同じ正規化（時刻不明は空文字）
function previewKey({ email, product, lang, relation, a, b }) {
  const parts = [String(email).trim().toLowerCase(), product, lang, a.dob, a.tob, a.place.trim()];
  if (product === 'compat') parts.push(b.dob, b.tob, b.place.trim(), relation || 'general');
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

const jstMonth = (ms) => new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 7);
// 年間運勢・仕事は申し込み月から 12 か月を読むため、作った月と同じ月の間だけ使い回す
const isFresh = (createdAt, now = Date.now()) => Boolean(createdAt) && jstMonth(Date.parse(createdAt)) === jstMonth(now);

// 見取り図のうち画面に出す小見出し（商品ごと）。残りは見出し名だけ送り、本文は送らない（画面側でぼかす）。
// true は全文、数字は先頭からその件数だけ（残りは「（続き）」として伏せる）
const VISIBLE_FIELDS = {
  yearly: { essence: true, themes: true, decisions: 2 },
  career: { essence: true, selfMatch: true, callingType: true, gifts: 2 },
  karma: { rarity: true, essence: true, karmaTheme: true, dharmaTheme: true },
  compat: { destiny: true, evidence: true, bondType: true }
};
const LOCKED_LABELS = {
  yearly: { stance: 'この 1 年を過ごす基本姿勢' },
  career: { gifts: '仕事で武器になる資質', moneyLine: '金運の見取り図', stance: '仕事とお金への基本姿勢' },
  karma: { callingLine: '今世の使命', gifts: '生まれ持った資質', howToRead: 'この書の読み方' },
  compat: { whyNow: 'なぜ今、この相手なのか', strengths: 'この縁の強み', tests: 'この縁が試される点', stance: 'この縁を活かす姿勢' }
};
function maskSummary(product, summary) {
  const visible = VISIBLE_FIELDS[product] || {};
  const labels = LOCKED_LABELS[product] || {};
  const out = { title: summary?.title, catchphrase: summary?.catchphrase };
  const locked = [];
  const labelOf = (key, value) => (value && typeof value === 'object' && !Array.isArray(value) && value.heading) || labels[key] || '';
  for (const [key, value] of Object.entries(summary || {})) {
    if (key === 'title' || key === 'catchphrase') continue;
    const rule = visible[key];
    if (rule === true) { out[key] = value; continue; }
    if (typeof rule === 'number') {
      const list = Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : null;
      if (list) {
        out[key] = Array.isArray(value) ? list.slice(0, rule) : { ...value, items: list.slice(0, rule) };
        if (list.length > rule && labelOf(key, value)) locked.push(`${labelOf(key, value)}（続き）`);
        continue;
      }
      out[key] = value;
      continue;
    }
    locked.push(labelOf(key, value));
  }
  return { summary: out, locked: locked.filter(Boolean) };
}

module.exports = { PREVIEW_PRODUCTS, PREVIEW_LANGS, previewDefs, previewKey, isFresh, maskSummary };
