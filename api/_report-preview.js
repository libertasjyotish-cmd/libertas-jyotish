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

module.exports = { PREVIEW_PRODUCTS, PREVIEW_LANGS, previewDefs, previewKey, isFresh };
