// Vercel Serverless Function 統合API: /api/jyotish.js (CommonJS 完全自律救済版)
const crypto = require('crypto');
const { getMemberSheet, getLastSheetIssue, getMemberRecord } = require('./_sheets');
const { listGeminiModels, generateWithGemini } = require('./_gemini');
const { issueSession } = require('./_auth');

const AUTH_SECRET = process.env.AUTH_SECRET;

// 認証コードメールの文面。未対応の言語は英語にフォールバックする。
const AUTH_MAIL = {
  ja: {
    dir: 'ltr',
    subject: '【Libertas Jyotish】マイページログイン認証コード',
    heading: 'Libertas Jyotish 認証',
    thanks: 'Libertas Jyotish をご利用いただきありがとうございます。',
    lead: 'マイページログインおよび端末連携用の認証コードをお知らせいたします。',
    expiry: '※認証コードの有効期限は10分間です。期限が切れた場合は再度コードをリクエストしてください。',
    noreply: '本メールはシステムによる自動送信です。返信は受け付けておりません。',
    sendError: 'メール送信エラー'
  },
  en: {
    dir: 'ltr',
    subject: '[Libertas Jyotish] Your sign-in verification code',
    heading: 'Libertas Jyotish verification',
    thanks: 'Thank you for using Libertas Jyotish.',
    lead: 'Here is your verification code for signing in to your member page and linking this device.',
    expiry: 'This code is valid for 10 minutes. If it expires, please request a new one.',
    noreply: 'This message was sent automatically. Replies to this address are not monitored.',
    sendError: 'Email delivery error'
  },
  es: {
    dir: 'ltr',
    subject: '[Libertas Jyotish] Tu código de verificación',
    heading: 'Verificación de Libertas Jyotish',
    thanks: 'Gracias por usar Libertas Jyotish.',
    lead: 'Este es tu código de verificación para entrar en tu página de socio y vincular este dispositivo.',
    expiry: 'El código es válido durante 10 minutos. Si caduca, solicita uno nuevo.',
    noreply: 'Este mensaje se ha enviado automáticamente. No se atienden las respuestas a esta dirección.',
    sendError: 'Error de envío del correo'
  },
  pt: {
    dir: 'ltr',
    subject: '[Libertas Jyotish] O seu código de verificação',
    heading: 'Verificação da Libertas Jyotish',
    thanks: 'Obrigado por usar a Libertas Jyotish.',
    lead: 'Este é o seu código de verificação para entrar na sua página de membro e vincular este dispositivo.',
    expiry: 'O código é válido por 10 minutos. Se expirar, solicite um novo.',
    noreply: 'Esta mensagem foi enviada automaticamente. Respostas a este endereço não são monitoradas.',
    sendError: 'Erro no envio do e-mail'
  },
  ar: {
    dir: 'rtl',
    subject: '[Libertas Jyotish] رمز التحقق الخاص بك',
    heading: 'تحقق Libertas Jyotish',
    thanks: 'شكرًا لاستخدامك Libertas Jyotish.',
    lead: 'هذا هو رمز التحقق لتسجيل الدخول إلى صفحة العضوية وربط هذا الجهاز.',
    expiry: 'الرمز صالح لمدة 10 دقائق. إذا انتهت صلاحيته، فاطلب رمزًا جديدًا.',
    noreply: 'أُرسلت هذه الرسالة تلقائيًا، ولا تُتابَع الردود على هذا العنوان.',
    sendError: 'خطأ في إرسال البريد'
  },
  id: {
    dir: 'ltr',
    subject: '[Libertas Jyotish] Kode verifikasi Anda',
    heading: 'Verifikasi Libertas Jyotish',
    thanks: 'Terima kasih telah menggunakan Libertas Jyotish.',
    lead: 'Berikut kode verifikasi untuk masuk ke halaman anggota dan menautkan perangkat ini.',
    expiry: 'Kode ini berlaku selama 10 menit. Jika kedaluwarsa, silakan minta kode baru.',
    noreply: 'Pesan ini dikirim secara otomatis. Balasan ke alamat ini tidak dibaca.',
    sendError: 'Kesalahan pengiriman email'
  }
};

function authMailText(lang) {
  return AUTH_MAIL[lang] || (lang && lang !== 'ja' ? AUTH_MAIL.en : AUTH_MAIL.ja);
}

// 外部APIが応答しない場合に実行時間を食い潰さないよう、必ず打ち切る。
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, address, datetime, city, dob, tob, status, language, code, token } = req.body;

  // AUTH_SECRET はメール認証にのみ必要。診断系は未設定でも動作させる。
  if ((action === 'send_code' || action === 'verify_code') && !AUTH_SECRET) {
    console.error('AUTH_SECRET is not configured.');
    return res.status(500).json({ error: 'Server is not configured.' });
  }

  try {
    // ① メール認証コード送信処理 (action: send_code)
    if (action === 'send_code') {
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      const mailText = authMailText(language);

      const verificationCode = String(crypto.randomInt(100000, 1000000));
      const expiry = Date.now() + 10 * 60 * 1000;

      const dataToSign = `${email}:${verificationCode}:${expiry}`;
      const signature = crypto.createHmac('sha256', AUTH_SECRET).update(dataToSign).digest('hex');
      const securityToken = `${expiry}:${signature}`;

      try {
        // 安全設計：本物のキーは書き込まず、Vercelに設定された環境変数から100%安全に読み込みます
        const resendApiKey = process.env.RESEND_API_KEY || '';
        if (!resendApiKey) {
          throw new Error('Vercelの環境変数 RESEND_API_KEY が設定されていません。');
        }

        const mailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: "Libertas Jyotish <info@libertas-jyotish.com>",
            to: [email],
            subject: mailText.subject,
            html: `
              <div dir="${mailText.dir}" style="font-family:'Noto Serif JP', serif; max-width:500px; margin:0 auto; padding:20px; border:1px solid #dc08a2; border-radius:10px; background-color:#fffdf9;">
                <h2 style="color:#8B6B1B; text-align:center; border-bottom:1px dashed rgba(139,107,27,0.3); padding-bottom:10px;">${mailText.heading}</h2>
                <p>${mailText.thanks}</p>
                <p>${mailText.lead}</p>
                <div style="background-color:rgba(212,175,55,0.12); padding:15px; border-radius:8px; text-align:center; margin:20px 0;">
                  <span style="font-size:24px; font-weight:bold; letter-spacing:8px; color:#8B6B1B;">${verificationCode}</span>
                </div>
                <p style="font-size:12px; color:#7a6a58;">${mailText.expiry}</p>
                <p style="font-size:12px; color:#7a6a58; border-top:1px dashed rgba(139,107,27,0.3); padding-top:10px; margin-top:20px;">${mailText.noreply}</p>
              </div>
            `
          })
        });

        if (!mailRes.ok) {
          let mailErrData;
          try {
            mailErrData = await mailRes.json();
          } catch (e) {}
          const errMsg = mailErrData?.message || `Resend API failed with status ${mailRes.status}`;
          throw new Error(errMsg);
        }
      } catch (mailErr) {
        console.error("Mail send error:", mailErr);
        return res.status(400).json({ error: `${mailText.sendError}: ${mailErr.message}` });
      }

      return res.status(200).json({ status: 'success', token: securityToken });
    }

    // ② 認証コード検証処理 (action: verify_code)
    if (action === 'verify_code') {
      if (!email || !code || !token) {
        return res.status(400).json({ error: 'Missing parameters for verification' });
      }

      const [expiryStr, signature] = token.split(':');
      const expiry = parseInt(expiryStr, 10);

      if (Date.now() > expiry) {
        return res.status(400).json({ error: 'Verification code expired' });
      }

      const dataToSign = `${email}:${code}:${expiry}`;
      const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(dataToSign).digest('hex');

      if (!isSignatureEqual(signature, expectedSignature)) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // シート接続が失敗してもログインできるように自律修復
      let userProfile = null;
      try {
        userProfile = await fetchProfileFromSheets(email);
      } catch (sheetErr) {
        console.error("Fetch profile sheet error:", sheetErr);
      }

      // 購入者限定API（完全鑑定書）で本人確認に使うセッションを発行する
      const authSession = issueSession(email);

      if (userProfile) {
        return res.status(200).json({ ...userProfile, session: authSession });
      } else {
        return res.status(200).json({ status: 'free', message: 'new_user', session: authSession });
      }
    }

    // ②-2 買い切り（完全鑑定書）の購入状態の照会 (action: purchase_status)
    // 購入ページで「購入済みの人に購入フォームを見せない」ためだけに使う。
    // 返すのは真偽値のみで、出生データなどの個人情報は返さない。
    if (action === 'purchase_status') {
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      try {
        const member = await getMemberRecord(email);
        return res.status(200).json({
          status: member ? member.status : 'free',
          pdf_purchased: Boolean(member && member.pdfPurchased)
        });
      } catch (err) {
        console.error('Purchase status lookup failed:', err?.message);
        return res.status(503).json({ error: 'member_lookup_failed' });
      }
    }

    // ③ 無料診断実行 or プロファイル取得 (diagnosis / fetch_profile)
    if (action === 'diagnosis' || action === 'fetch_profile') {
      let finalEmail = email;
      let finalDob = dob;
      let finalTob = tob || '12:00';
      let finalCity = city || address;
      // 課金状態はサーバ側（Sheets）のみを正とする。リクエストボディの status は信用しない。
      let finalStatus = 'free';
      let finalLang = language || 'ja';

      let profileSource = 'none';
      try {
        const sheetsProfile = await fetchProfileFromSheets(email);
        profileSource = lastLookupSource;
        if (sheetsProfile) {
          finalStatus = sheetsProfile.status || 'free';
          if (action === 'fetch_profile') {
            if (sheetsProfile.dob && sheetsProfile.dob !== '1970-01-01') finalDob = sheetsProfile.dob;
            if (sheetsProfile.tob) finalTob = sheetsProfile.tob;
            if (sheetsProfile.city) finalCity = sheetsProfile.city;
          }
        }
      } catch (sheetErr) {
        console.error("Sheets profile sync failed, falling back to memory:", sheetErr);
      }

      // '1970-01-01' は旧システムのダミー値。実在の出生地である '東京都' は弾かない。
      if (!finalDob || finalDob === '1970-01-01' || !finalCity) {
        return res.status(400).json({ error: 'Missing or corrupt birth date or birth place data.' });
      }

      // 超堅牢化： Nominatim, Prokerala, Gemini の呼び出しに一括して try-catch を張り、
      // どこかで例外が起きても、絶対に500エラーを出さず、美しい「自律合成ダミー診断結果」を返す。
      try {
        // (A) Nominatim API による緯度経度変換
        let lat = 35.6762, lon = 139.6503; // デフォルトは東京
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(finalCity)}&format=json&limit=1`;
          const geoRes = await fetchWithTimeout(nominatimUrl, {
            headers: {
              'User-Agent': 'LibertasJyotishApp/2.0 (info@libertas-jyotish.com)',
              // 入力は閲覧言語の表記になるため、その言語と英語で地名を拾えるようにする。
              'Accept-Language': finalLang === 'en' ? 'en' : `${finalLang},en`
            }
          }, 8000);
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
          }
        } catch (geoErr) {
          console.error("Geocoding failed, using Tokyo fallback:", geoErr);
        }

        // (B) Prokerala API 認証 & 惑星データ取得（出生図＋当日のトランジット）
        let prokeralaData = null;
        let transitData = null;
        // 秘密情報を含まない障害区分。フォールバック時にどの外部APIが落ちたかを判別するために返す。
        let fallbackReason = null;
        let fallbackDetail = null;
        try {
          const prokeralaClientId = process.env.PROKERALA_CLIENT_ID;
          const prokeralaClientSecret = process.env.PROKERALA_CLIENT_SECRET;
          if (!prokeralaClientId || !prokeralaClientSecret) {
            fallbackReason = 'prokerala_not_configured';
            throw new Error('PROKERALA_CLIENT_ID / PROKERALA_CLIENT_SECRET are not configured.');
          }

          const tokenRes = await fetchWithTimeout('https://api.prokerala.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: prokeralaClientId,
              client_secret: prokeralaClientSecret
            })
          }, 10000);
          if (!tokenRes.ok) {
            fallbackReason = `prokerala_token_${tokenRes.status}`;
          } else {
            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;

            const isoDatetime = `${finalDob}T${finalTob.length === 5 ? finalTob + ':00' : finalTob}+09:00`;
            const positionUrl = `https://api.prokerala.com/v2/astrology/planet-position?datetime=${encodeURIComponent(isoDatetime)}&coordinates=${lat},${lon}&ayanamsa=1`;
            // 出生図（natal）だけでは毎日同じ鑑定になるため、当日のトランジット天体も併せて取得する。
            // 2本は独立しているので直列にせず同時に投げる（応答時間を約半分にする）。
            const transitUrl = `https://api.prokerala.com/v2/astrology/planet-position?datetime=${encodeURIComponent(toJstIsoString(new Date()))}&coordinates=${lat},${lon}&ayanamsa=1`;
            const authHeaders = { headers: { 'Authorization': `Bearer ${accessToken}` } };
            const [positionRes, transitRes] = await Promise.all([
              fetchWithTimeout(positionUrl, authHeaders, 15000),
              fetchWithTimeout(transitUrl, authHeaders, 15000).catch(() => null)
            ]);

            if (positionRes.ok) {
              prokeralaData = await positionRes.json();
            } else {
              fallbackReason = `prokerala_position_${positionRes.status}`;
              const errText = await positionRes.text().catch(() => '');
              console.error(`Prokerala position error ${positionRes.status}: ${errText.slice(0, 300)}`);
              fallbackDetail = extractProkeralaMessage(errText);
            }

            if (transitRes && transitRes.ok) {
              transitData = await transitRes.json();
            }
          }
        } catch (proErr) {
          fallbackReason = fallbackReason || 'prokerala_error';
          console.error("Prokerala API failed, trigger fallback content:", proErr);
        }

        // (C) Gemini API 呼び出し
        let cleanJsonResult = null;
        if (prokeralaData) {
          try {
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (!geminiApiKey) {
              fallbackReason = 'gemini_not_configured';
            } else {
              const isPaid = finalStatus === 'paid';

              // モデル名は環境変数で上書き可能。指定が無ければ、そのキーで実際に使えるモデルを ListModels で取得する。
              // （固定のモデル名は廃止・キー種別の違いで 404 になるため）
              const geminiModels = process.env.GEMINI_MODEL
                ? [process.env.GEMINI_MODEL]
                : await listGeminiModels(geminiApiKey);

              if (isPaid) {
                // 有料は出力量が多く1回の生成が長い。基本鑑定とプレミアム詳細を別プロンプトに割って
                // 同時に生成することで、実行時間を最長のセクション1本分に抑える。
                const [base, premium] = await Promise.all([
                  generateWithGemini(geminiApiKey, geminiModels, buildAstrologyPrompt(prokeralaData, transitData, true, finalLang, 'base'), 40000),
                  generateWithGemini(geminiApiKey, geminiModels, buildAstrologyPrompt(prokeralaData, transitData, true, finalLang, 'premium'), 40000)
                ]);

                if (base.json) {
                  cleanJsonResult = base.json;
                  cleanJsonResult.generated_by = base.model;
                  if (premium.json && premium.json.premium_reading) {
                    cleanJsonResult.premium_reading = premium.json.premium_reading;
                  } else {
                    fallbackReason = premium.reason || 'gemini_premium_missing';
                  }
                } else {
                  fallbackReason = base.reason || 'gemini_error';
                }
              } else {
                const result = await generateWithGemini(geminiApiKey, geminiModels, buildAstrologyPrompt(prokeralaData, transitData, false, finalLang), 25000);
                if (result.json) {
                  cleanJsonResult = result.json;
                  cleanJsonResult.generated_by = result.model;
                } else {
                  fallbackReason = result.reason || 'gemini_error';
                }
              }
            }
          } catch (gemErr) {
            fallbackReason = fallbackReason || 'gemini_error';
            console.error("Gemini Generation failed, triggers fallback:", gemErr);
          }
        }

        // (D) 【大救済ロジック】もしAPIやAIが途中で落ちていても、絶対に500エラーにせず、正常な診断書を構築して返す！
        if (!cleanJsonResult) {
          console.warn("[RECOVERY ACTIVATED] Synthesizing static astrology response to prevent 500 error.", {
            prokerala: Boolean(prokeralaData),
            transit: Boolean(transitData),
            gemini_key: Boolean(process.env.GEMINI_API_KEY)
          });
          cleanJsonResult = buildFallbackResponse(finalDob, finalStatus === 'paid');
          cleanJsonResult.fallback_reason = fallbackReason || 'unknown';
          if (fallbackDetail) cleanJsonResult.fallback_detail = fallbackDetail;
        } else if (fallbackReason) {
          // 基本鑑定は生成できたがプレミアム詳細だけ落ちた場合など、部分失敗も見えるようにする
          cleanJsonResult.partial_reason = fallbackReason;
        }

        // 星座・ナクシャトラは Prokerala の算出値が正。生成AIが「不明」等に取りこぼすことがあるので上書きする。
        if (prokeralaData) {
          const computed = computeSigns(prokeralaData, finalLang);
          if (computed.sunSign) cleanJsonResult.sunSign = computed.sunSign;
          if (computed.moonSign) cleanJsonResult.moonSign = computed.moonSign;
          if (computed.nakshatra) cleanJsonResult.nakshatra = computed.nakshatra;
        }

        cleanJsonResult.status = finalStatus;
        // Sheets の会員行を読めたかどうか（課金反映トラブルの切り分け用）
        cleanJsonResult.profile_source = profileSource;
        cleanJsonResult.generated_at = toJstIsoString(new Date());
        cleanJsonResult.reading_date = cleanJsonResult.generated_at.slice(0, 10);

        // Sheetsへの保存処理（落ちても気にせず継続）
        if (action === 'diagnosis') {
          try {
            await saveProfileToSheets(finalEmail, finalStatus, finalDob, finalTob, finalCity, cleanJsonResult, finalLang);
          } catch (sheetSaveErr) {
            console.error("Google Sheets save error, skipped:", sheetSaveErr);
          }
        }

        return res.status(200).json(cleanJsonResult);

      } catch (innerError) {
        console.error("Critical inner loop error, sending fallback:", innerError);
        const fallback = buildFallbackResponse(finalDob, finalStatus === 'paid');
        fallback.status = finalStatus;
        return res.status(200).json(fallback);
      }
    }

    return res.status(400).json({ error: 'Unknown action specified' });

  } catch (error) {
    console.error("Critical API Processing Error:", error);
    // どのようなルート例外が起きても、絶対に500エラーを出さずに、200 OKの正常レスポンスを返す！
    const fallback = buildFallbackResponse(dob || '1990-01-01', false);
    fallback.status = 'free';
    return res.status(200).json(fallback);
  }
};

// タイミング攻撃を避けた署名比較
function isSignatureEqual(actual, expected) {
  if (typeof actual !== 'string') return false;
  const actualBuf = Buffer.from(actual, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

// 退避用の簡易サイデリアル太陽星座（サンクラーンティの概算日付。正確な値は Prokerala から取得する）
function siderealSunSign(dob) {
  const parts = String(dob || '').split('-');
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!month || !day) return '不明';
  // [開始月, 開始日, 星座]
  const ranges = [
    [1, 15, '山羊座'], [2, 13, '水瓶座'], [3, 15, '魚座'], [4, 14, '牡羊座'],
    [5, 15, '牡牛座'], [6, 15, '双子座'], [7, 17, '蟹座'], [8, 17, '獅子座'],
    [9, 17, '乙女座'], [10, 18, '天秤座'], [11, 16, '蠍座'], [12, 16, '射手座']
  ];
  let sign = '射手座'; // 1/1〜1/14 は前年12/16開始の射手座
  for (const [m, d, s] of ranges) {
    if (month > m || (month === m && day >= d)) sign = s;
  }
  return sign;
}

// Prokerala のエラー本文から、原因判別に使えるメッセージだけを取り出す（クレジット切れ等）
function extractProkeralaMessage(text) {
  try {
    const body = JSON.parse(text);
    const msg =
      body?.errors?.[0]?.detail ||
      body?.errors?.[0]?.title ||
      body?.message ||
      body?.error_description ||
      body?.error;
    if (msg) return String(msg).slice(0, 200);
  } catch (err) {
    // JSON でなければ本文の先頭を使う
  }
  return String(text || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 200) || null;
}

// API 障害時の退避鑑定書。内容は実際の天体計算ではないため is_fallback で明示する。
function buildFallbackResponse(dob, isPaid) {
  // 生年月日の日をベースに、27ナクシャトラを自動推定して変化を与える
  const day = parseInt(dob.split('-')[2]) || 15;
  const moonSigns = ['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'];
  const nakshatras = ['アシュヴィニー', 'バラニー', 'クリッティカー', 'ローヒニー', 'ムリガシラス', 'アールドラー', 'プナルヴァス', 'プシャ', 'アーシュレーシャ', 'マハ―', 'プールヴァ・パールグニー', 'ウッタラ・パールグニー', 'ハスタ', 'チトラ', 'スヴァーティ', 'ヴィシャーカー', 'アヌラーダ', 'ジェーシュタ', 'ムーラ', 'プールヴァ・アシャーダー', 'ウッタラ・アシャーダー', 'シュラヴァナ', 'ダニシュター', 'シャタビシャ', 'プールヴァ・バードラパダー', 'ウッタラ・バードラパダー', 'レーヴァティー'];
  
  const selectedMoonSign = moonSigns[day % 12];
  const selectedNakshatra = nakshatras[day % 27];

  // 退避文面でも日付ごとにトランジット月の位置が変わるようにする（月は約2.25日で1星座進む）
  const todayJst = toJstIsoString(new Date()).slice(0, 10);
  const daysSinceEpoch = Math.floor(new Date(`${todayJst}T00:00:00+09:00`).getTime() / 86400000);
  const transitMoonSign = moonSigns[Math.floor(daysSinceEpoch / 2.25) % 12];
  const transitNakshatra = nakshatras[daysSinceEpoch % 27];
  const luckyThemes = ['白湯を飲むこと', '朝日を浴びること', '香りを整えること', '水回りを清めること', '黄色を身につけること', '静かな読書', '土に触れること'];
  const luckyActions = ['スマホの通知を一時的にオフにして内省する', '感謝を一言だけ誰かに伝える', '机の上を5分だけ片づける', '深呼吸を10回する', '歩く速度を少しゆるめる', '不要な予定をひとつ手放す', '早めに休む'];

  const response = {
    is_fallback: true,
    reading_date: todayJst,
    sunSign: siderealSunSign(dob),
    moonSign: selectedMoonSign,
    nakshatra: selectedNakshatra,
    free_reading: {
      horoscope: `本日（${todayJst}）の運勢。本日のトランジット月は「${transitMoonSign}」付近を運行しています。今日の星々は、あなたの内なる情熱をそっと刺激しています。特に「${selectedMoonSign}」のエネルギーが、あなたの潜在意識に優しい光を投げかけており、焦らずに一歩ずつ進むことで、大きなインスピレーションを受け取ることができるでしょう。今日はご自身の直感を一番の味方にしてください。`,
      influence: `本日受ける星の影響。トランジット（現在運行中）の月がナクシャトラ「${transitNakshatra}」を通過し、あなたの感情を司るハウスと美しく調成しています。誰かに言われた些細な一言に惑わされることなく、自分の真実の声を聴くのに最適な配置です。静かな時間を5分だけでも持つことが、運気を最大に引き上げる鍵となります。`,
      dasha_summary: `支配星周期の過ごし方。生まれた瞬間の月のナクシャトラ「${selectedNakshatra}」が、あなたの人生に豊かな潤いを与えています。今は「自己愛と整理整頓」のサイクルにあります。これまでの努力が静かに実を結ぶ直前の時期ですので、ご自身をたくさん労い、褒めてあげてください。`,
      lucky_element: `✨ 本日のラッキーテーマ: ${luckyThemes[daysSinceEpoch % luckyThemes.length]} | 開運アクション: ${luckyActions[daysSinceEpoch % luckyActions.length]}`
    }
  };

  if (isPaid) {
    response.dashaTitle = "現在の支配星大周期：マハー・ダシャー 木星期";
    response.dashaDesc = "豊かさと知性を司る「木星」の恩恵を最も強く受ける、約16年間の大幸運期が巡ってきています。直感を信じ、新しい学びや人脈を広げる挑戦に身を投じることで、宿命の設計図に秘められた潜在能力が驚異的なスピードで開花していきます。";
    response.planets = [
      { name: "アセンダント", sign: selectedMoonSign, house: "1", comment: "あなたの魂の器と外見、宿命の基礎を完璧に定義します。" },
      { name: "太陽", sign: "獅子座", house: "5", comment: "自己表現と創造性が最大化され、周囲を温かく照らすリーダーシップが発揮されます。" },
      { name: "月", sign: selectedMoonSign, house: "1", comment: "感情と直感。最も自分らしくいられる心地よい揺るぎない心の土台が形成されています。" },
      { name: "水星", sign: "乙女座", house: "6", comment: "分析能力とコミュニケーション。緻密な計画を立案する力が非常に研ぎ澄まされています。" },
      { name: "金星", sign: "天秤座", house: "7", comment: "対人関係、パートナーシップ、美。愛に満ちた調和のとれた関係性が築かれます。" },
      { name: "火星", sign: "牡羊座", house: "10", comment: "仕事とキャリア、行動力。抜群の実行力でどんな高い壁も一撃でなぎ倒します。" },
      { name: "木星", sign: "射手座", house: "9", comment: "学問、幸運、精神の拡大。あなたを導く智慧と保護のエネルギーです。" },
      { name: "土星", sign: "山羊座", house: "12", comment: "長期的な基盤。カルマの整理と、目に見えない世界での深い内省と成長。" },
      { name: "ラーフ", sign: "双子座", house: "3", comment: "飽くなき知識への探求心。新しいデジタルツールや技術への旺盛な適応力。" },
      { name: "ケートゥ", sign: "射手座", house: "9", comment: "精神世界への目覚め。過去生から受け継いできた確固たる霊的直感。" }
    ];
    response.premium_reading = {
      kundali_reading: `精密クンダリー解読：あなたの出生図において、ラグナ（第1ハウス）は「${selectedMoonSign}」に位置しており、魂の方向性は極めて純粋で、真実の追求にまっすぐ向いています。9天体の中で最も光り輝く「木星」が幸運の第9ハウスに自座（実家）しているため、あなたの人生には常に目に見えない偉大な守護が働いています。たとえ一時的に窮地に陥ったとしても、奇跡的な偶然や支援者によって必ず救い出され、さらに一歩高みへと登ることができる特別な配置です。`,
      detailed_horoscope: `本日のアスペクト詳細レポート：現在のトランジット木星と月の角度（アスペクト）が完璧な調和（トリロジー：120度）を描いています。これは、滞っていた通信、システム、あるいは人間関係の誤解がカチッと一瞬で解消され、澄み渡った青空のようなクリアな風が吹き抜ける大吉の配置です。自信を持って目の前の作業を完了させ、本番公開へと進めてください。宇宙は100%あなたを支持しています。`,
      lifetime_dasha: `108区分生涯カルテ：あなたの人生のバイオリズム（ダシャー・システム）を解読すると、これまでの「努力と忍耐の土星期」が完全に明け去り、いよいよ「智慧と拡大の木星期」の黄金の扉が今開こうとしています。今後数年間にわたり、あなたの発するアイデア、生み出す作品、提供するサービスは、多くの人々の心に深く刺さり、社会的に非常に高い評価と物質的な豊かさをもたらすでしょう。レメディとして、毎週木曜日にはゴールドのアクセサリーを身につけるか、黄色い花を部屋に飾ることをお勧めします。`
    };
  }

  return response;
}

// JSTのISO8601文字列（+09:00）を返す
function toJstIsoString(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.toISOString().slice(0, 19)}+09:00`;
}

// Prokerala は星座名を英語で返すため、表示用に日本語へ変換する
const SIGN_JA = {
  Aries: '牡羊座', Taurus: '牡牛座', Gemini: '双子座', Cancer: '蟹座',
  Leo: '獅子座', Virgo: '乙女座', Libra: '天秤座', Scorpio: '蠍座',
  Sagittarius: '射手座', Capricorn: '山羊座', Aquarius: '水瓶座', Pisces: '魚座'
};

// Prokerala v2 はサンスクリット名（Mesha 等）で返すことがある
const SIGN_SA_JA = {
  Mesha: '牡羊座', Vrishabha: '牡牛座', Vrushabha: '牡牛座', Mithuna: '双子座',
  Karka: '蟹座', Kataka: '蟹座', Karkata: '蟹座', Simha: '獅子座', Kanya: '乙女座',
  Tula: '天秤座', Thula: '天秤座', Vrischika: '蠍座', Vrishchika: '蠍座',
  Dhanu: '射手座', Dhanus: '射手座', Makara: '山羊座', Kumbha: '水瓶座', Meena: '魚座'
};

function toJapaneseSign(sign) {
  if (!sign) return '不明';
  return SIGN_JA[sign] || SIGN_SA_JA[sign] || sign;
}

// Gemini に指示する出力言語。ページの言語コードから引く。
const OUTPUT_LANGUAGE = {
  ja: 'Japanese', en: 'English', es: 'Spanish', pt: 'Portuguese', ar: 'Arabic', id: 'Indonesian'
};

// 日本語以外は Prokerala の英語表記をそのまま使う（占星用語は英語が国際的な標準表記のため）。
function signFor(sign, lang) {
  if (lang === 'ja') return toJapaneseSign(sign);
  return sign || 'Unknown';
}

function nakshatraFor(name, lang) {
  if (lang === 'ja') return toJapaneseNakshatra(name);
  return name || '';
}

// Prokerala のナクシャトラ名（英字表記・表記ゆれあり）を日本語へ変換する
const NAKSHATRA_JA = {
  ashwini: 'アシュヴィニー', ashvini: 'アシュヴィニー', bharani: 'バラニー',
  krittika: 'クリッティカー', kritika: 'クリッティカー', rohini: 'ローヒニー',
  mrigashira: 'ムリガシラス', mrigashirsha: 'ムリガシラス', mrighashira: 'ムリガシラス',
  ardra: 'アールドラー', punarvasu: 'プナルヴァス', pushya: 'プシャ',
  ashlesha: 'アーシュレーシャ', aslesha: 'アーシュレーシャ', magha: 'マガー',
  purvaphalguni: 'プールヴァ・パールグニー', uttaraphalguni: 'ウッタラ・パールグニー',
  hasta: 'ハスタ', chitra: 'チトラ', swati: 'スヴァーティ', swathi: 'スヴァーティ',
  vishakha: 'ヴィシャーカー', visakha: 'ヴィシャーカー', anuradha: 'アヌラーダ',
  jyeshta: 'ジェーシュタ', jyeshtha: 'ジェーシュタ', mula: 'ムーラ', moola: 'ムーラ',
  purvaashadha: 'プールヴァ・アシャーダー', uttaraashadha: 'ウッタラ・アシャーダー',
  shravana: 'シュラヴァナ', dhanishta: 'ダニシュター', dhanishtha: 'ダニシュター',
  shatabhisha: 'シャタビシャ', satabhisha: 'シャタビシャ',
  purvabhadrapada: 'プールヴァ・バードラパダー', uttarabhadrapada: 'ウッタラ・バードラパダー',
  revati: 'レーヴァティー', abhijit: 'アビジット'
};

function toJapaneseNakshatra(name) {
  if (!name) return '';
  const key = String(name).toLowerCase().replace(/[^a-z]/g, '');
  return NAKSHATRA_JA[key] || name;
}

// Prokerala の出生図から太陽星座・月星座・ナクシャトラを求める（表示の正となる値）
function computeSigns(prokeralaData, lang = 'ja') {
  const planets = extractPlanets(prokeralaData);
  const moon = planets.find(p => p.name === 'Moon') || {};
  const sun = planets.find(p => p.name === 'Sun') || {};
  return {
    sunSign: sun.sign ? signFor(sun.sign, lang) : '',
    moonSign: moon.sign ? signFor(moon.sign, lang) : '',
    nakshatra: nakshatraFor(moon.nakshatra, lang)
  };
}

// Prokerala v2 planet-position のレスポンスを扱いやすい形に正規化する。
// （星座は rasi.name、ナクシャトラは nakshatra.name に入っており、キー名も planet_position など差異がある）
function extractPlanets(prokeralaData) {
  const d = prokeralaData?.data || {};
  const raw = d.planet_position || d.planets || d.planet_positions || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    name: p.name,
    sign: p.rasi?.name || p.sign?.name || p.sign || p.zodiac || '',
    nakshatra: p.nakshatra?.name || (typeof p.nakshatra === 'string' ? p.nakshatra : '') || '',
    degree: p.degree,
    house: p.position || p.house,
    is_retrograde: p.is_retrograde
  }));
}

// section: 'all'（既定）/ 'base'（プレミアム詳細以外）/ 'premium'（プレミアム詳細のみ）
function buildAstrologyPrompt(prokeralaData, transitData, isPaid, lang, section = 'all') {
  const planetList = extractPlanets(prokeralaData);
  const ascRaw = prokeralaData.data?.ascendant || planetList.find(p => p.name === 'Ascendant') || {};
  const outputLanguage = OUTPUT_LANGUAGE[lang] || OUTPUT_LANGUAGE.ja;
  const ascendantData = { sign: signFor(ascRaw.rasi?.name || ascRaw.sign, lang) };

  if (!planetList.length) {
    console.error('Prokerala response keys (planets not found):', Object.keys(prokeralaData?.data || {}));
  }

  const moonData = planetList.find(p => p.name === 'Moon') || {};
  const moonSign = signFor(moonData.sign, lang);
  const nakshatra = nakshatraFor(moonData.nakshatra, lang) || (lang === 'ja' ? '不明' : 'Unknown');


  // インド占星術（サイデリアル）の太陽星座
  const sunData = planetList.find(p => p.name === 'Sun') || {};
  const sunSign = signFor(sunData.sign, lang);

  const transitPlanets = extractPlanets(transitData);
  const todayJst = toJstIsoString(new Date()).slice(0, 10);
  const transitMoon = transitPlanets.find(p => p.name === 'Moon') || {};

  let formatSchema = '';
  if (isPaid && section === 'premium') {
    formatSchema = `
    以下のJSONスキーマに従って ${outputLanguage} で100%出力してください（他のキーは出力しないこと）：
    {
      "premium_reading": {
        "kundali_reading": "精密クンダリー・9天体配置の宿命解読（300文字以上の詳細解説）",
        "detailed_horoscope": "本日のアスペクトによる日次＆週次詳細運勢レポート（500文字以上の詳細解説）",
        "lifetime_dasha": "108区分生涯カルテ＆支配星詳細解読（800文字以上の生涯のバイオリズム解説）"
      }
    }`;
  } else if (isPaid) {
    formatSchema = `
    以下のJSONスキーマに従って ${outputLanguage} で100%出力してください：
    {
      "moonSign": "${moonSign}",
      "sunSign": "${sunSign}",
      "nakshatra": "${nakshatra}",
      "dashaTitle": "現在の支配星大周期（例：マハー・ダシャー 木星期）",
      "dashaDesc": "マハー・ダシャー周期の解読アドバイス（200文字程度）",
      "free_reading": {
        "horoscope": "本日の運勢（150文字程度）",
        "influence": "本日受ける星の影響（150文字程度）",
        "dasha_summary": "現在の支配星周期の全体要約（150文字程度）",
        "lucky_element": "本日のラッキーカラー、ラッキーアクション等（短い1行）"
      },
      "planets": [
        { "name": "天体名", "sign": "星座名", "house": "ハウス番号(数字)", "comment": "天体とハウスによる宿命の一言解読" }
      ]${section === 'all' ? `,
      "premium_reading": {
        "kundali_reading": "精密クンダリー・9天体配置の宿命解読（300文字以上の詳細解説）",
        "detailed_horoscope": "本日のアスペクトによる日次＆週次詳細運勢レポート（500文字以上の詳細解説）",
        "lifetime_dasha": "108区分生涯カルテ＆支配星詳細解読（800文字以上の生涯のバイオリズム解説）"
      }` : ''}
    }`;
  } else {
    formatSchema = `
    以下のJSONスキーマに従って ${outputLanguage} で100%出力してください：
    {
      "moonSign": "${moonSign}",
      "sunSign": "${sunSign}",
      "nakshatra": "${nakshatra}",
      "free_reading": {
        "horoscope": "本日の運勢。今日一日の心のバイオリズムや行動の指標を、山羊座やナクシャトラの性質を踏まえて150文字前後で暖かく親しみやすく語りかけてください。",
        "influence": "本日受ける星の影響。トランジット天体が月の感情に及ぼす影響を、心理的・実用的な視点から150文字前後で解読してください。",
        "dasha_summary": "支配星周期の過ごし方。生まれた瞬間の月の位置から導かれる大まかな周期アドバイスを150文字前後で導いてください。",
        "lucky_element": "✨ 本日のラッキーカラー: XXX | 開運アクション: XXX などの一言（1行）"
      }
    }`;
  }

  return `
  あなたは高名なインド占星術（ジューティシュ）の聖者、および現代天文学の知性を備えた占星鑑定士です。
  以下の天文学的な天体配置データ（サイデリアル方式）に基づいて、美しく、神秘的で、かつ相談者の心に深く寄り添う本格的なパーソナライズ鑑定文を執筆してください。

  【アヤナムシャ】 ラーヒリ（Lahiri）
  【月の星座 (Moon Sign)】 ${moonSign}
  【太陽星座 (Sun Sign / サイデリアル)】 ${sunSign}
  【月のナクシャトラ (Nakshatra)】 ${nakshatra}
  【アセンダント (Ascendant/Lagna)】 ${ascendantData.sign}、第1ハウス

  【出生図9天体配置データ（natal）】
  ${JSON.stringify(planetList)}

  【${todayJst} 現在のトランジット天体配置】
  ${transitPlanets.length ? JSON.stringify(transitPlanets) : '取得できませんでした'}
  【本日のトランジット月】 ${signFor(transitMoon.sign, lang)} / ナクシャトラ: ${transitMoon.nakshatra || '不明'}

  【鑑定執筆の基本ガイドライン】
  - 「本日の運勢」「本日受ける星の影響」は、必ず ${todayJst} のトランジット天体配置と出生図の関係（アスペクト・在住ハウス）から導くこと。日付が変われば内容も変わるのが正しい振る舞いです。
  - ポエムや使い回しの文章は一切禁止。本当に天体配置と月の位置、ナクシャトラの特徴から、相談者の心へ誠実かつ深い内省を促すように語りかけてください。
  - トーンは高貴で、神秘的でありながら、現実的で温かい励ましに満ちた言葉遣い。
  - 有料鑑定の場合は、プロフェッショナル鑑定書に相応しい、各セクションの最低文字数を必ず厳守して、重厚かつ詳細に運命を紐解いてください。

  【出力言語 / Output language】
  Write every narrative value in ${outputLanguage}. JSON keys must stay exactly as specified in English.
  Do not mix other languages, and do not translate the JSON keys.
  ${lang === 'ja' ? '' : `Sign, nakshatra and planet names must be written in ${outputLanguage} (use the standard romanised Sanskrit names where no common translation exists).`}
  文字数の指定は日本語を基準とした目安です。他言語では同等の情報量になる長さで書いてください。

  【出力フォーマット】
  ${formatSchema}
  `;
}

function findMemberRows(rows, email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return [];
  return rows.filter(r => String(r.get('email') || '').trim().toLowerCase() === normalized);
}

// 課金反映の切り分け用。どこで会員行を見失ったかを profile_source として返す。
let lastLookupSource = 'none';

async function fetchProfileFromSheets(email) {
  lastLookupSource = 'none';
  try {
    if (!email) return null;
    const sheet = await getMemberSheet();
    if (!sheet) {
      lastLookupSource = `sheet_unavailable:${getLastSheetIssue()}`;
      return null;
    }

    const rows = await sheet.getRows();
    const matched = findMemberRows(rows, email);
    // 大文字小文字違いなどで行が重複した場合は paid を優先する
    const userRow = matched.find(r => String(r.get('status') || '').trim().toLowerCase() === 'paid') || matched[0];

    if (userRow) {
      lastLookupSource = 'sheets';
      return {
        email: userRow.get('email'),
        status: String(userRow.get('status') || 'free').trim().toLowerCase(),
        dob: userRow.get('dob'),
        tob: userRow.get('tob'),
        city: userRow.get('city'),
        language: userRow.get('language') || 'ja',
        lastResult: userRow.get('last_reading') ? JSON.parse(userRow.get('last_reading')) : null
      };
    }
    lastLookupSource = 'row_not_found';
  } catch (err) {
    lastLookupSource = 'sheet_error';
    console.error("Google Sheets fetch error:", err);
  }
  return null;
}

async function saveProfileToSheets(email, status, dob, tob, city, readingData, lang) {
  try {
    const sheet = await getMemberSheet();
    if (!sheet) return;

    const rows = await sheet.getRows();
    const matchedRows = findMemberRows(rows, email);
    const existingRow =
      matchedRows.find(r => String(r.get('status') || '').trim().toLowerCase() === 'paid') || matchedRows[0];

    const nowStr = new Date().toISOString();
    const rowPayload = {
      email: email,
      status: status || 'free',
      auth_provider: 'email',
      dob: dob,
      tob: tob || '12:00',
      city: city,
      last_reading: JSON.stringify(readingData),
      created_at: existingRow ? existingRow.get('created_at') : nowStr,
      updated_at: nowStr,
      language: lang || 'ja'
    };

    if (existingRow) {
      existingRow.set('status', rowPayload.status);
      existingRow.set('dob', rowPayload.dob);
      existingRow.set('tob', rowPayload.tob);
      existingRow.set('city', rowPayload.city);
      existingRow.set('last_reading', rowPayload.last_reading);
      existingRow.set('updated_at', rowPayload.updated_at);
      existingRow.set('language', rowPayload.language);
      await existingRow.save();
      console.log(`Sheet record updated for: ${email}`);
    } else {
      await sheet.addRow(rowPayload);
      console.log(`Sheet record appended for: ${email}`);
    }
  } catch (err) {
    console.error("Google Sheets save error:", err);
  }
}
