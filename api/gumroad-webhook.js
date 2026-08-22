// Gumroad Ping / resource subscriptions: /api/gumroad-webhook?token=<GUMROAD_PING_TOKEN>
// 月額会員（plan-*）の購入・解約・終了・再開と、完全鑑定書（report-*）の購入・返金を会員シートへ反映する。
// Gumroad の通知は署名されないため、URL に付けた秘密トークンで正当性を確認する。
// Settings → Advanced の Ping URL（sale）と、API の resource_subscriptions
// （refund / cancellation / subscription_ended / subscription_restarted / dispute）に同じURLを登録する。
const crypto = require('crypto');
const { setMemberStatus, setPdfPurchased, revokePdfPurchase, downgradeMember } = require('./_sheets');

// 商品スラッグで会員（サブスク）と完全鑑定書（買い切り）を見分ける。
const MEMBERSHIP_SLUG = /plan-t[123]/i;
const REPORT_SLUG = /report-t[123]/i;

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function requestToken(req) {
  const url = new URL(req.url, 'https://localhost');
  return url.searchParams.get('token') || '';
}

function truthy(value) {
  return String(value).trim().toLowerCase() === 'true';
}

// sale/refund はバイヤーの email、サブスク系イベントは user_email で届く。
function extractEmail(body) {
  return body.email || body.user_email || null;
}

// sale/refund は product_permalink（商品URL）、サブスク系は product_permalink かスラッグのみのことがある。
function productKind(body) {
  const source = [body.product_permalink, body.permalink, body.short_product_id, body.product_name]
    .filter(Boolean)
    .join(' ');
  if (REPORT_SLUG.test(source)) return 'report';
  if (MEMBERSHIP_SLUG.test(source)) return 'membership';
  // スラッグが判別できない場合、継続課金の情報があれば会員とみなす。
  return body.recurrence || body.subscription_id ? 'membership' : null;
}

// Gumroad は同じ通知を複数回送るため、どのイベントかは resource_name か固有フィールドで判定する。
function resolveResource(req, body) {
  const url = new URL(req.url, 'https://localhost');
  const declared = url.searchParams.get('resource') || body.resource_name;
  if (declared) return String(declared);
  if (body.ended_at || body.ended_reason) return 'subscription_ended';
  if (body.restarted_at) return 'subscription_restarted';
  if (body.cancelled_at || truthy(body.cancelled)) return 'cancellation';
  if (truthy(body.refunded)) return 'refund';
  if (body.sale_id) return 'sale';
  return '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GUMROAD_PING_TOKEN;
  if (!token) {
    console.error('GUMROAD_PING_TOKEN is not configured.');
    return res.status(500).json({ error: 'Server is not configured.' });
  }
  if (!timingSafeEqualStr(requestToken(req), token)) {
    console.error('Gumroad ping token mismatch.');
    return res.status(401).json({ error: 'Invalid token' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sellerId = process.env.GUMROAD_SELLER_ID;
  if (sellerId && body.seller_id && body.seller_id !== sellerId) {
    return res.status(200).json({ received: true, ignored: 'other_seller' });
  }

  const resource = resolveResource(req, body);
  const email = extractEmail(body);
  const kind = productKind(body);

  if (!email) {
    console.error(`Gumroad ${resource || 'unknown'}: no email in payload`);
    return res.status(200).json({ received: true, skipped: 'no_email' });
  }

  try {
    switch (resource) {
      case 'sale':
      case 'subscription_restarted': {
        // 自分でテスト購入した通知は権利を付与しない
        if (truthy(body.test)) return res.status(200).json({ received: true, ignored: 'test_purchase' });
        if (kind === 'report') {
          if (!(await setPdfPurchased(email))) return res.status(500).json({ error: 'Member sheet unavailable' });
        } else if (kind === 'membership') {
          if (!(await setMemberStatus(email, 'paid'))) return res.status(500).json({ error: 'Member sheet unavailable' });
        } else {
          return res.status(200).json({ received: true, skipped: 'unknown_product' });
        }
        break;
      }
      case 'refund':
      case 'dispute': {
        if (kind === 'report') {
          if (!(await revokePdfPurchase(email))) return res.status(500).json({ error: 'Member sheet unavailable' });
        } else {
          const result = await downgradeMember({ email });
          if (!result.updated && result.reason !== 'member_not_found') {
            return res.status(500).json({ error: 'Failed to downgrade status', reason: result.reason });
          }
        }
        break;
      }
      case 'subscription_ended': {
        const result = await downgradeMember({ email });
        if (!result.updated && result.reason !== 'member_not_found') {
          return res.status(500).json({ error: 'Failed to downgrade status', reason: result.reason });
        }
        break;
      }
      // 解約の申し出は期末まで閲覧できるため、ここでは権利を外さない（subscription_ended で外す）。
      case 'cancellation':
      case 'subscription_updated':
      case 'dispute_won':
        return res.status(200).json({ received: true, ignored: resource });
      default:
        return res.status(200).json({ received: true, ignored: resource || 'unknown' });
    }
  } catch (err) {
    console.error(`Failed to apply Gumroad ${resource}:`, err.message);
    // 5xx を返すと Gumroad が再送する
    return res.status(500).json({ error: 'Failed to update status' });
  }

  console.log(`Gumroad ${resource}: applied for ${kind || 'unknown'} product`);
  return res.status(200).json({ received: true, resource });
};
