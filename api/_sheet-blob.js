// 長文セルを Blob に逃がし、シートには "blob:<URL>" の参照だけを残す。
// 1 マス数万文字の JSON がファイルを重くし、スマホの Sheets アプリで開けなくなるのを防ぐ。
const storage = require('./_etsy-storage');

const PREFIX = 'blob:';
const MAX_INLINE_CHARS = 1000;
const READ_ATTEMPTS = 3;

const isRef = (value) => typeof value === 'string' && value.startsWith(PREFIX);
const refUrl = (value) => (isRef(value) ? value.slice(PREFIX.length) : '');

async function externalize(text, pathname, { store = storage.storeText } = {}) {
  const value = text == null ? '' : String(text);
  if (value.length <= MAX_INLINE_CHARS || isRef(value)) return value;
  return PREFIX + await store(pathname, value);
}

// 読めなかったときは空として扱わずに投げる（空扱いだと章を作り直してしまうため）
async function resolve(value, { load = storage.loadText } = {}) {
  if (!isRef(value)) return value || '';
  let lastErr = null;
  for (let i = 0; i < READ_ATTEMPTS; i += 1) {
    try { return await load(refUrl(value)); } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

// 上書きで使われなくなった参照の Blob を消す。失敗しても保存は成功扱い（孤立 Blob が残るだけ）。
async function deleteReplaced(before, after, { remove = storage.deleteBlobs } = {}) {
  const keep = new Set(after.filter(isRef));
  const urls = before.filter((v) => isRef(v) && !keep.has(v)).map(refUrl);
  if (urls.length) await remove(urls).catch((err) => console.warn('blob cleanup failed:', err.message));
}

module.exports = { PREFIX, MAX_INLINE_CHARS, isRef, externalize, resolve, deleteReplaced };
