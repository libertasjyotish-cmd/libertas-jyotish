// 長文セルの Blob 退避と Etsy トークン使い回しの検証（ネットワーク・シートには接続しない）。
//   node scripts/check-sheet-blob.js
const assert = require('assert');
process.env.ETSY_API_KEY = process.env.ETSY_API_KEY || 'test';
const storage = require('../api/_etsy-storage');
const etsy = require('../api/_etsy-api');

const blobs = new Map();
let seq = 0;
storage.storeText = async (pathname, text) => { const url = `https://blob.test/${pathname}/${seq += 1}.json`; blobs.set(url, text); return url; };
storage.loadText = async (url) => { if (!blobs.has(url)) throw new Error('Blob read 404'); return blobs.get(url); };
storage.deleteBlobs = async (urls) => { for (const u of urls) blobs.delete(u); };

const sheetBlob = require('../api/_sheet-blob');
const { connectEtsy } = require('../api/_etsy-fulfill');

(async () => {
  const short = 'x'.repeat(sheetBlob.MAX_INLINE_CHARS);
  assert.strictEqual(await sheetBlob.externalize(short, 'p'), short, 'short text stays inline');
  const long = JSON.stringify({ body: 'あ'.repeat(30000) });
  const ref = await sheetBlob.externalize(long, 'p');
  assert.ok(sheetBlob.isRef(ref) && ref.length < 100, 'long text becomes a short ref');
  assert.strictEqual(await sheetBlob.externalize(ref, 'p'), ref, 'ref is not re-uploaded');
  assert.strictEqual(await sheetBlob.resolve(ref), long, 'ref resolves to original text');
  assert.strictEqual(await sheetBlob.resolve(short), short);
  assert.strictEqual(await sheetBlob.resolve(''), '');
  await assert.rejects(sheetBlob.resolve('blob:https://blob.test/missing'), /404/, 'unreadable ref throws instead of returning empty');

  const ref2 = await sheetBlob.externalize(long + ' ', 'p');
  await sheetBlob.deleteReplaced([ref, short], [ref2]);
  assert.ok(!blobs.has(ref.slice(5)) && blobs.has(ref2.slice(5)), 'replaced blob deleted, new kept');

  // Etsy トークン: 期限まで使い回し、期限が近いときだけ更新して書く
  let refreshes = 0;
  etsy.refreshAccessToken = async () => { refreshes += 1; return { access_token: `at${refreshes}`, refresh_token: `rt${refreshes}`, expires_in: 3600 }; };
  const state = { refresh_token: 'rt0', shop_id: '1' };
  let writes = 0;
  const store = { async getState() { return { ...state }; }, async setState(e) { writes += 1; Object.assign(state, e); } };
  let conn = await connectEtsy(store);
  assert.deepStrictEqual([refreshes, writes, conn.cached], [1, 1, false], 'first run refreshes');
  for (let i = 0; i < 5; i += 1) conn = await connectEtsy(store);
  assert.deepStrictEqual([refreshes, writes, conn.cached], [1, 1, true], 'later runs reuse token without writing');
  state.access_expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  conn = await connectEtsy(store);
  assert.deepStrictEqual([refreshes, writes, state.access_token], [2, 2, 'at2'], 'near expiry refreshes');
  conn = await connectEtsy(store, { force: true });
  assert.deepStrictEqual([refreshes, state.refresh_token], [3, 'rt3'], 'force refresh');
  console.log('check-sheet-blob: ok');
})().catch((err) => { console.error(err); process.exit(1); });
