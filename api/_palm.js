// 手相写真の特徴抽出（Gemini Vision）。写真から「見える形」だけを固定スキーマの JSON にし、
// 解釈・断定は一切させない（解釈は章生成側で出生図と併せて行う）。
// 個人の特定・年齢・性別・人種・健康状態の推定はプロンプトで禁止し、出力スキーマにも項目を持たない。
const { generateWithGemini } = require('./_gemini');

const MOUNTS = ['jupiter', 'saturn', 'sun', 'mercury', 'mars_upper', 'mars_lower', 'venus', 'moon'];
const LINES = ['heart', 'head', 'life', 'fate', 'sun', 'mercury'];
const LEVELS = new Set(['prominent', 'average', 'flat', 'unclear']);
const CLARITY = new Set(['clear', 'faint', 'broken', 'chained', 'absent', 'unclear']);
const LENGTHS = new Set(['long', 'medium', 'short', 'unclear']);
const HAND_SHAPES = new Set(['earth', 'air', 'water', 'fire', 'mixed', 'unclear']);
// 名前を持つ古典的な形（神秘十字・大三角・ソロモンの環・金星帯）は一般名（cross/triangle）より優先して使わせる。
const NAMED_MARKS = ['mystic_cross', 'great_triangle', 'ring_of_solomon', 'girdle_of_venus'];
const MARKS = new Set([...NAMED_MARKS, 'fish', 'lotus', 'conch', 'trident', 'star', 'triangle', 'square', 'cross', 'island', 'grille', 'circle', 'other']);
const MARK_TYPES = [...MARKS].join('|');
const QUALITY = new Set(['good', 'fair', 'poor']);

const SCHEMA = `{
  "image_quality": { "right": "good|fair|poor", "left": "good|fair|poor", "notes": "short text, English" },
  "hands": {
    "right": {
      "hand_shape": "earth|air|water|fire|mixed|unclear",
      "finger_lengths": { "index_vs_ring": "index_longer|ring_longer|equal|unclear", "little": "long|medium|short|unclear", "thumb": "long|medium|short|unclear" },
      "mounts": { "jupiter": "prominent|average|flat|unclear", "saturn": "...", "sun": "...", "mercury": "...", "mars_upper": "...", "mars_lower": "...", "venus": "...", "moon": "..." },
      "lines": {
        "heart": { "clarity": "clear|faint|broken|chained|absent|unclear", "length": "long|medium|short|unclear", "course": "short text", "at": { "x": 0-100, "y": 0-100 } },
        "head":  { "clarity": "...", "length": "...", "course": "short text", "at": { "x": 0-100, "y": 0-100 } },
        "life":  { "clarity": "...", "length": "...", "course": "short text", "at": { "x": 0-100, "y": 0-100 } },
        "fate":  { "clarity": "...", "length": "...", "course": "short text", "at": { "x": 0-100, "y": 0-100 } },
        "sun":   { "clarity": "...", "length": "...", "course": "short text", "at": { "x": 0-100, "y": 0-100 } },
        "mercury": { "clarity": "...", "length": "...", "course": "short text", "at": { "x": 0-100, "y": 0-100 } }
      },
      "marks": [ { "type": "${MARK_TYPES}", "location": "short text (which mount/line)", "confidence": "high|medium|low", "at": { "x": 0-100, "y": 0-100 } } ],
      "notes": "short text, English"
    },
    "left": { same structure }
  },
  "asymmetry": ["short English phrases: notable differences between right and left"],
  "unclear": ["short English phrases: features that could not be judged and why"]
}`;

function buildPrompt(hand) {
  return `You are assisting a traditional Indian palmistry (Hasta Samudrika Shastra) report. Two photos are attached:
image 1 = RIGHT palm, image 2 = LEFT palm. The person's dominant hand is: ${hand}.

Describe ONLY what is visible: the shape of the hand, relative finger lengths, how raised each planetary mount appears,
the clarity/length/course of the main lines, and any classical marks (fish, lotus, conch, trident, star, triangle, square, cross, island, grille, circle).
Named classical formations — when the shape matches, use the named type instead of the generic one:
- mystic_cross: an independent cross in the quadrangle between the heart line and the head line (usually under the middle/ring finger), not formed by the main lines themselves.
- great_triangle: the large triangle enclosed by the head line, the life line and the fate line (or mercury line) in the centre of the palm.
- ring_of_solomon: a curved line/arc around the base of the index finger (on the mount of Jupiter).
- girdle_of_venus: a curved line above the heart line, arching under the middle and ring fingers.
Positions: "at" is the point where a label should be drawn on THAT hand's photo — the centre of a mark, or a clearly visible midpoint of a line — as percentages of the image width (x) and height (y) from the top-left corner. Omit "at" if the feature is absent/unclear.
Rules:
- Do NOT interpret, predict, or give meanings. Do NOT mention health, illness, lifespan, pregnancy, death, accidents, wealth, or fortune.
- Do NOT estimate or mention age, sex, gender, ethnicity, skin condition, identity, or anything that could identify the person.
- If a photo is blurry, cropped, or a feature cannot be judged, use "unclear"/"poor" and explain briefly in "unclear". Never guess.
- If an image is not a human palm, set image_quality to "poor" and describe in notes.
- Output valid JSON only, exactly in this schema (no extra keys, no markdown):
${SCHEMA}`;
}

const pick = (v, set, fallback = 'unclear') => (set.has(v) ? v : fallback);
const short = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const pct = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? Math.round(v) : null);
const point = (p) => {
  if (!p || typeof p !== 'object') return null;
  const x = pct(p.x), y = pct(p.y);
  return x == null || y == null ? null : { x, y };
};

function normalizeHand(h) {
  const src = h && typeof h === 'object' ? h : {};
  const fl = src.finger_lengths && typeof src.finger_lengths === 'object' ? src.finger_lengths : {};
  const mounts = {};
  for (const m of MOUNTS) mounts[m] = pick(src.mounts && src.mounts[m], LEVELS);
  const lines = {};
  for (const l of LINES) {
    const line = src.lines && typeof src.lines[l] === 'object' ? src.lines[l] : {};
    const clarity = pick(line.clarity, CLARITY);
    const at = ['absent', 'unclear'].includes(clarity) ? null : point(line.at);
    lines[l] = { clarity, length: pick(line.length, LENGTHS), course: short(line.course, 160), ...(at ? { at } : {}) };
  }
  const marks = (Array.isArray(src.marks) ? src.marks : []).slice(0, 12)
    .filter((m) => m && typeof m === 'object' && MARKS.has(m.type))
    .map((m) => {
      const at = point(m.at);
      return { type: m.type, location: short(m.location, 80), confidence: ['high', 'medium', 'low'].includes(m.confidence) ? m.confidence : 'low', ...(at ? { at } : {}) };
    });
  return {
    hand_shape: pick(src.hand_shape, HAND_SHAPES),
    finger_lengths: {
      index_vs_ring: ['index_longer', 'ring_longer', 'equal'].includes(fl.index_vs_ring) ? fl.index_vs_ring : 'unclear',
      little: pick(fl.little, LENGTHS),
      thumb: pick(fl.thumb, LENGTHS)
    },
    mounts,
    lines,
    marks,
    notes: short(src.notes, 300)
  };
}

// Vision の出力を固定スキーマに正規化する。未知の値は unclear に落とし、余計なキーや長文は捨てる。
function normalizePalm(json) {
  const src = json && typeof json === 'object' ? json : {};
  const q = src.image_quality && typeof src.image_quality === 'object' ? src.image_quality : {};
  const strs = (arr) => (Array.isArray(arr) ? arr : []).filter((s) => typeof s === 'string').map((s) => s.slice(0, 160)).slice(0, 10);
  const hands = src.hands && typeof src.hands === 'object' ? src.hands : {};
  return {
    image_quality: { right: pick(q.right, QUALITY, 'poor'), left: pick(q.left, QUALITY, 'poor'), notes: short(q.notes, 300) },
    hands: { right: normalizeHand(hands.right), left: normalizeHand(hands.left) },
    asymmetry: strs(src.asymmetry),
    unclear: strs(src.unclear)
  };
}

// 両手とも poor なら読めないので撮り直し（needs_info）。片手 poor は続行して章側で「不鮮明」と扱う。
function palmUnreadable(palm) {
  return palm.image_quality.right === 'poor' && palm.image_quality.left === 'poor';
}

async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo fetch ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// 写真 URL（Blob）を取得して Vision に渡す。戻りは { palm, model } または { palm: null, reason }。
async function analyzePalm({ photoRight, photoLeft, hand = 'right', apiKey, models, timeoutMs = 60000, deadline, fetchPhoto = fetchImage }) {
  const [right, left] = await Promise.all([fetchPhoto(photoRight), fetchPhoto(photoLeft)]);
  const images = [right, left].map((buf) => ({ mimeType: 'image/jpeg', data: buf.toString('base64') }));
  const result = await generateWithGemini(apiKey, models, { text: buildPrompt(hand), images }, timeoutMs, deadline);
  if (!result.json) return { palm: null, reason: result.reason || 'gemini_error', model: result.model };
  return { palm: normalizePalm(result.json), model: result.model };
}

module.exports = { analyzePalm, normalizePalm, palmUnreadable, buildPrompt, fetchImage, MOUNTS, LINES, NAMED_MARKS };
