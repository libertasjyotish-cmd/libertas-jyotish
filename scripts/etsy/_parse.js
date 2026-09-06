// Etsy のパーソナライズ欄（自由入力）から出生データを取り出す。
// 曖昧な入力は推測せず missing に積み、呼び出し側が購入者へ確認できるようにする。
const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  janeiro: 1, fevereiro: 2, março: 3, maio: 5, junho: 6, julho: 7, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  januari: 1, februari: 2, maret: 3, mei: 5, juni: 6, juli: 7, agustus: 8, oktober: 10, desember: 12
};

// 国名（Brazil 等）は出生地と衝突するので言語の手掛かりにしない
const LANGUAGE_HINTS = [
  ['ja', /日本語|japanese|japon[eé]s|nihongo/gi],
  ['es', /español|espanol|spanish|castellano/gi],
  ['pt', /português|portugues|portuguese/gi],
  ['ar', /العربية|عربي|arabic/gi],
  ['id', /bahasa(\s+indonesia)?|indonesian/gi],
  ['en', /english|inglés|ingles|inglês/gi]
];

const UNKNOWN_TIME = /\b(unknown|don'?t know|not sure|no idea|n\/a|desconocid[oa]|não sei|nao sei|tidak tahu|不明|わからない|分からない|غير معروف|لا أعرف)\b/i;

function pad(n) {
  return String(n).padStart(2, '0');
}

function validDate(y, m, d) {
  if (y < 1900 || y > new Date().getFullYear() || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

// 戻り値: { value: 'YYYY-MM-DD' } | { ambiguous: true } | null
function parseDate(text) {
  let m = text.match(/\b(\d{4})[-/.年]\s*(\d{1,2})[-/.月]\s*(\d{1,2})日?\b/);
  if (m) return { value: validDate(+m[1], +m[2], +m[3]), match: m[0] };

  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+)?([a-zA-Zçã]+)\s+(?:de\s+)?(\d{4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) return { value: validDate(+m[3], MONTHS[m[2].toLowerCase()], +m[1]), match: m[0] };

  m = text.match(/\b([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/);
  if (m && MONTHS[m[1].toLowerCase()]) return { value: validDate(+m[3], MONTHS[m[1].toLowerCase()], +m[2]), match: m[0] };

  m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    if (a > 12 && b <= 12) return { value: validDate(y, b, a), match: m[0] };
    if (b > 12 && a <= 12) return { value: validDate(y, a, b), match: m[0] };
    return { ambiguous: true, match: m[0] };
  }
  return null;
}

// 戻り値: { value: 'HH:MM' } | { unknown: true } | { ambiguous: true } | null
function parseTime(text) {
  const unknown = text.match(UNKNOWN_TIME);
  if (unknown) return { unknown: true, match: unknown[0] };
  const m = text.match(/\b(\d{1,2})[:h時]\s*(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i)
    || text.match(/\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (!m) return null;
  let hour = +m[1];
  const hasMinutes = /^\d{2}$/.test(m[2] || '');
  const minute = hasMinutes ? +m[2] : 0;
  const suffix = String(m[3] || (hasMinutes ? '' : m[2]) || '').toLowerCase().replace(/\./g, '');
  if (hour > 23 || minute > 59) return null;
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  // 午前/午後なしの 1〜12 時は 12 時間表記の可能性がある。ゼロ埋め（09:30）は 24 時間表記とみなす。
  if (!suffix && hour >= 1 && hour <= 12 && !/^0\d$/.test(m[1])) return { ambiguous: true, match: m[0] };
  return { value: `${pad(hour)}:${pad(minute)}`, match: m[0] };
}

function parseLanguage(text) {
  for (const [lang, re] of LANGUAGE_HINTS) {
    if (text.match(re)) return lang;
  }
  return null;
}

// 出生地は「日付・時刻・言語を除いた残り」から、番号ラベル付きの行を優先して取る
function parsePlace(text, consumed) {
  let rest = text;
  for (const c of consumed) rest = rest.replace(c, ' ');
  const lines = rest.split(/[\n;|]+|\(\d\)|\d\)|\d\./).map((s) => s.replace(/^[\s:,\-–—]+|[\s:,\-–—]+$/g, '')).filter(Boolean);
  // 「Place: …」のようにラベル＋区切りがある行を優先し、無ければ最初の文字列行を採る
  const LABEL = /^(place|city|town|birthplace|born in|lugar|ciudad|cidade|local|tempat|kota|出生地|مكان|مدينة)(\s+(of\s+birth|de\s+nacimiento|de\s+nascimento|lahir|الميلاد))?\s*[:：\-–]\s*/i;
  const inline = rest.match(new RegExp(`(?:^|[\\s,.;])${LABEL.source.slice(1)}([^\\n;|]+)`, 'i'));
  const labelled = lines.find((l) => LABEL.test(l));
  const candidate = inline
    ? inline[inline.length - 1]
    : labelled
    ? labelled.replace(LABEL, '')
    : lines.find((l) => /[\p{L}]{3,}/u.test(l) && !/^(report|language|idioma|bahasa|言語|اللغة)/i.test(l));
  if (!candidate) return null;
  return candidate.replace(/\b(report\s+)?languages?\b.*$/i, '').replace(/[\s:,\-–—]+$/g, '').trim() || null;
}

// 戻り値: { dob, tob, tobUnknown, place, language, missing: [], notes: [] }
function parsePersonalization(raw) {
  const text = String(raw || '').replace(/\r/g, '').trim();
  const out = { dob: null, tob: null, tobUnknown: false, place: null, language: 'en', missing: [], notes: [] };
  const consumed = [];

  const date = parseDate(text);
  if (date && date.value) {
    out.dob = date.value;
    consumed.push(date.match);
  } else {
    out.missing.push('dob');
    if (date && date.ambiguous) {
      out.notes.push('date_ambiguous_day_month');
      consumed.push(date.match);
    }
  }

  const withoutDate = consumed.reduce((acc, c) => acc.replace(c, ' '), text);
  const time = parseTime(withoutDate);
  if (time && time.unknown) {
    out.tob = '12:00';
    out.tobUnknown = true;
    consumed.push(time.match);
  } else if (time && time.value) {
    out.tob = time.value;
    consumed.push(time.match);
  } else {
    out.missing.push('tob');
    if (time && time.ambiguous) {
      out.notes.push('time_needs_am_pm');
      consumed.push(time.match);
    }
  }

  const language = parseLanguage(text);
  if (language) {
    out.language = language;
    const hint = LANGUAGE_HINTS.find(([lang]) => lang === language);
    consumed.push(...text.match(hint[1]));
  }

  out.place = parsePlace(text, consumed);
  if (!out.place) out.missing.push('place');

  return out;
}

module.exports = { parsePersonalization, parseDate, parseTime, parseLanguage };
