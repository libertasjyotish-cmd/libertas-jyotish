// 個別鑑定書（相性・年間運勢・仕事）のサイト直販: POST /api/report-order
// 入力を台帳（Etsy と共通）に awaiting_payment で登録し、決済先の URL を返す。
//   日本かつ KOMOJU 有効 … KOMOJU ホストページ（metadata.order_id で台帳行に紐づく）
//   それ以外           … 503 unavailable（サイト内決済が未接続の国・時期）
// 決済確定（komoju-return / komoju-webhook）で status を new に進めると etsy-cron が生成・納品する。
const crypto = require('crypto');
const { AMOUNTS, resolveTier, resolveProvider, countryFrom } = require('./_pricing');
const { createSession } = require('./_komoju');
const { normalizeLang } = require('./_terms');
const ledger = require('./_etsy-ledger');

const PRODUCTS = new Set(['compat', 'yearly', 'career']);
const RELATIONS = new Set(['romance', 'friend', 'business', 'general']);

function siteOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function str(v, max = 200) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d.getTime() < Date.now();
}

function validTime(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function person(body, suffix) {
  const dob = str(body[`dob${suffix}`], 10);
  const tobUnknown = body[`tob_unknown${suffix}`] === true || body[`tob_unknown${suffix}`] === 'true';
  const tob = tobUnknown ? '' : str(body[`tob${suffix}`], 5);
  const place = str(body[`place${suffix}`], 120);
  const errors = [];
  if (!validDate(dob)) errors.push(`dob${suffix}`);
  if (!tobUnknown && !validTime(tob)) errors.push(`tob${suffix}`);
  if (place.length < 2) errors.push(`place${suffix}`);
  return { dob, tob, tobUnknown, place, errors };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  res.setHeader('Cache-Control', 'no-store');

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const product = str(body.product, 20);
  const email = str(body.email, 200).toLowerCase();
  const name = str(body.name, 80);
  const lang = normalizeLang(body.lang || 'ja');
  if (!PRODUCTS.has(product)) return res.status(400).json({ error: 'invalid_product' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid_email' });

  const a = person(body, '');
  const errors = [...a.errors];
  let b = null;
  let relation = '';
  if (product === 'compat') {
    b = person(body, '_b');
    errors.push(...b.errors);
    relation = str(body.relation, 20);
    if (!RELATIONS.has(relation)) relation = 'general';
  }
  if (errors.length) return res.status(400).json({ error: 'invalid_fields', fields: errors });

  const country = countryFrom(req);
  const provider = resolveProvider(country);
  if (provider !== 'komoju') {
    return res.status(503).json({ error: 'unavailable' });
  }

  const orderId = `${ledger.WEB_PREFIX}${crypto.randomBytes(8).toString('hex')}`;
  const amount = AMOUNTS[product][resolveTier(country)];
  try {
    await ledger.upsertOrder(orderId, {
      product,
      relation,
      delivery: 'email',
      buyer_email: email,
      buyer_name: name,
      personalization: `web:${product}`,
      dob: a.dob,
      tob: a.tob,
      tob_unknown: a.tobUnknown ? 'true' : 'false',
      place: a.place,
      dob_b: b ? b.dob : '',
      tob_b: b ? b.tob : '',
      tob_unknown_b: b && b.tobUnknown ? 'true' : 'false',
      place_b: b ? b.place : '',
      language: lang,
      status: ledger.STATUS.AWAITING_PAYMENT
    });
    const origin = siteOrigin(req);
    const session = await createSession({
      product,
      amount,
      email,
      lang,
      returnUrl: `${origin}/api/komoju-return?product=${product}&lang=${lang}&order=${orderId}`,
      externalCustomerId: email,
      metadata: { order_id: orderId }
    });
    return res.status(200).json({ provider: 'komoju', url: session.session_url, order: orderId });
  } catch (err) {
    console.error('report-order failed:', err.message);
    return res.status(500).json({ error: 'order_failed' });
  }
};
