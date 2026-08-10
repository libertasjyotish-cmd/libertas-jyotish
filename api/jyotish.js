// Vercel Serverless Function 統合API: /api/jyotish.js
// 依存関係: google-auth-library, google-spreadsheet (package.json に記載してデプロイ)

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import crypto from 'crypto';

// セキュリティ用の固定暗号シークレット（環境変数がない場合の安全弁）
const AUTH_SECRET = process.env.AUTH_SECRET || 'libertas_jyotish_secret_key_2026_secure';

export default async function handler(req, res) {
  // CORSヘッダーの設定（本本番ドメインおよびローカル検証からのアクセスを許可）
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

  try {
    // ----------------------------------------------------
    // ① メール認証コード送信処理 (action: send_code)
    // ----------------------------------------------------
    if (action === 'send_code') {
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      // 6桁の認証コード生成
      const verificationCode = String(Math.floor(Math.random() * 900000) + 100000);
      const expiry = Date.now() + 10 * 60 * 1000; // 有効期限 10分

      // 署名トークンの作成 (ステートレスセキュリティ：Google Sheetsを汚さずブラウザで一時保持)
      const dataToSign = `${email}:${verificationCode}:${expiry}`;
      const signature = crypto.createHmac('sha256', AUTH_SECRET).update(dataToSign).digest('hex');
      const securityToken = `${expiry}:${signature}`;

      // Resend API を使ってメール送信
      const resendApiKey = process.env.RESEND_API_KEY || 're_H1ViarMr_6YN6nR4t1fbBHRocrhBep9zs';
      const mailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: "Libertas Jyotish <info@libertas-jyotish.com>",
          to: [email],
          subject: "【Libertas Jyotish】マイページログイン認証コード",
          html: `
            <div style="font-family:'Noto Serif JP', serif; max-width:500px; margin:0 auto; padding:20px; border:1px solid #dc08a2; border-radius:10px; background-color:#fffdf9;">
              <h2 style="color:#8B6B1B; text-align:center; border-bottom:1px dashed rgba(139,107,27,0.3); padding-bottom:10px;">Libertas Jyotish 認証</h2>
              <p>Libertas Jyotish をご利用いただきありがとうございます。</p>
              <p>マイページログインおよび端末連携用の認証コードをお知らせいたします。</p>
              <div style="background-color:rgba(212,175,55,0.12); padding:15px; border-radius:8px; text-align:center; margin:20px 0;">
                <span style="font-size:24px; font-weight:bold; letter-spacing:8px; color:#8B6B1B;">${verificationCode}</span>
              </div>
              <p style="font-size:12px; color:#7a6a58;">※認証コードの有効期限は10分間です。期限が切れた場合は再度コードをリクエストしてください。</p>
              <p style="font-size:12px; color:#7a6a58; border-top:1px dashed rgba(139,107,27,0.3); padding-top:10px; margin-top:20px;">本メールはシステムによる自動送信です。返信は受け付けておりません。</p>
            </div>
          `
        })
      });

      if (!mailRes.ok) {
        const errText = await mailRes.text();
        throw new Error(`Resend API sending failed: ${errText}`);
      }

      return res.status(200).json({ status: 'success', token: securityToken });
    }

    // ----------------------------------------------------
    // ② 認証コード検証処理 (action: verify_code)
    // ----------------------------------------------------
    if (action === 'verify_code') {
      if (!email || !code || !token) {
        return res.status(400).json({ error: 'Missing parameters for verification' });
      }

      const [expiryStr, signature] = token.split(':');
      const expiry = parseInt(expiryStr, 10);

      if (Date.now() > expiry) {
        return res.status(400).json({ error: 'Verification code expired' });
      }

      // 署名の再検証
      const dataToSign = `${email}:${code}:${expiry}`;
      const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(dataToSign).digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // 認証成功時、会員データをスプレッドシートから引いて返す（自動ログイン復元）
      const userProfile = await fetchProfileFromSheets(email);
      if (userProfile) {
        return res.status(200).json(userProfile);
      } else {
        // まだ Sheets に会員データがない新規ユーザーの場合は空でステータスのみ返す
        return res.status(200).json({ status: 'free', message: 'new_user' });
      }
    }

    // ----------------------------------------------------
    // ③ 無料診断実行 or プロファイル取得 (diagnosis / fetch_profile)
    // ----------------------------------------------------
    if (action === 'diagnosis' || action === 'fetch_profile') {
      let finalEmail = email;
      let finalDob = dob;
      let finalTob = tob || '12:00'; // 仕様書準拠の正午補填
      let finalCity = city || address;
      let finalStatus = status || 'free';
      let finalLang = language || 'ja';

      // (A) fetch_profile時、ブラウザ出生データがなければ Sheets からプロファイルを完全復元
      if (action === 'fetch_profile') {
        const sheetsProfile = await fetchProfileFromSheets(email);
        if (sheetsProfile) {
          finalStatus = sheetsProfile.status || 'free';
          // スプレッドシートから本物の出生データを復元（ダミー値の上書きを絶対防止！）
          if (sheetsProfile.dob && sheetsProfile.dob !== '1970-01-01') finalDob = sheetsProfile.dob;
          if (sheetsProfile.tob) finalTob = sheetsProfile.tob;
          if (sheetsProfile.city && sheetsProfile.city !== '東京都') finalCity = sheetsProfile.city;
        }
      }

      // 出生データの最終チェック（生年月日と都市名は必須。1970年や東京都などのゴミデータ送信を絶対ブロック）
      if (!finalDob || finalDob === '1970-01-01' || !finalCity || finalCity === '東京都') {
        return res.status(400).json({ error: 'Missing or corrupt birth date or birth place data.' });
      }

      // (B) Nominatim API による緯度経度への動的変換
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(finalCity)}&format=json&limit=1`;
      const geoRes = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'LibertasJyotishApp/2.0 (info@libertas-jyotish.com)' }
      });
      const geoData = await geoRes.json();
      if (!geoData || geoData.length === 0) {
        throw new Error(`出生地「${finalCity}」の緯度経度変換に失敗しました。正しい地名を入力してください。`);
      }
      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);

      // (C) Prokerala API クライアントクレデンシャル認証
      const prokeralaClientId = process.env.PROKERALA_CLIENT_ID || '2413eb05-2b3a-4c00-b92e-5e12ad3fadd6';
      const prokeralaClientSecret = process.env.PROKERALA_CLIENT_SECRET || 'V5gyYkEDx0DYgV6knOQfX576fBgmmB6ZuhWfWgsO';
      
      const tokenRes = await fetch('https://api.prokerala.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: prokeralaClientId,
          client_secret: prokeralaClientSecret
        })
      });
      if (!tokenRes.ok) throw new Error('Failed to authorize with Prokerala API');
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // (D) Prokerala API からの精密サイデリアル天体位置取得
      const isoDatetime = `${finalDob}T${finalTob.length === 5 ? finalTob + ':00' : finalTob}+09:00`;
      const positionUrl = `https://api.prokerala.com/v2/astrology/planet-position?datetime=${encodeURIComponent(isoDatetime)}&coordinates=${lat},${lon}&ayanamsa=1`;
      const positionRes = await fetch(positionUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!positionRes.ok) {
        const errText = await positionRes.text();
        throw new Error(`Prokerala planet-position API failed: ${errText}`);
      }
      const prokeralaData = await positionRes.json();

      // (E) Gemini API による鑑定結果JSONの生成
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) throw new Error('Missing GEMINI_API_KEY environment variable.');

      const isPaid = finalStatus === 'paid';
      const geminiModel = isPaid ? 'gemini-1.5-flash' : 'gemini-1.5-flash'; // より安定したモデルに統一
      
      // システム鑑定プロンプトの構築
      const promptText = buildAstrologyPrompt(prokeralaData, isPaid, finalLang);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: "application/json" // 100%確実にJSONフォーマットで出力させる
          }
        })
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API generating failed: ${errText}`);
      }

      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates[0].content.parts[0].text;
      const cleanJsonResult = JSON.parse(rawText.trim());

      // 返却データに必要なステータスと共通プロパティを再結合して整合性を保証
      cleanJsonResult.status = finalStatus;

      // (F) 【データ汚染＆無限増殖バグ完全防止】action === 'diagnosis' の時のみ Google Sheets に保存
      if (action === 'diagnosis') {
        await saveProfileToSheets(finalEmail, finalStatus, finalDob, finalTob, finalCity, cleanJsonResult, finalLang);
      }

      return res.status(200).json(cleanJsonResult);
    }

    return res.status(400).json({ error: 'Unknown action specified' });

  } catch (error) {
    console.error("API Processing Error:", error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// ────────────────────────────────----------------──
// 🛠️ 補助ヘルパー関数群
// ──────────────────────────────────────────────────

// Gemini 占星術パーソナライズプロンプト構築ロジック
function buildAstrologyPrompt(prokeralaData, isPaid, lang) {
  const planetList = prokeralaData.data?.planets || [];
  const ascendantData = prokeralaData.data?.ascendant || {};
  
  // 月星座とナクシャトラの抽出
  const moonData = planetList.find(p => p.name === 'Moon') || {};
  const moonSign = moonData.sign || '不明';
  const nakshatra = moonData.nakshatra || '不明';

  let formatSchema = '';
  if (isPaid) {
    formatSchema = `
    以下のJSONスキーマに従って日本語で100%出力してください：
    {
      "moonSign": "${moonSign}",
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
        { "name": "天体名（例：太陽、月、火星、水星、木星、金星、土星、ラーフ、ケートゥ、アセンダント）", "sign": "星座名", "house": "ハウス番号(数字)", "comment": "天体とハウスによる宿命の一言解読" }
      ],
      "premium_reading": {
        "kundali_reading": "精密クンダリー・9天体配置の宿命解読（300文字以上の詳細解説）",
        "detailed_horoscope": "本日のアスペクトによる日次＆週次詳細運勢レポート（500文字以上の詳細解説）",
        "lifetime_dasha": "108区分生涯カルテ＆支配星詳細解読（800文字以上の生涯のバイオリズム解説）"
      }
    }`;
  } else {
    formatSchema = `
    以下のJSONスキーマに従って日本語で100%出力してください：
    {
      "moonSign": "${moonSign}",
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
  【月のナクシャトラ (Nakshatra)】 ${nakshatra}
  【アセンダント (Ascendant/Lagna)】 ${ascendantData.sign || '不明'}、第1ハウス

  【9天体配置データ】
  ${JSON.stringify(planetList)}

  【鑑定執筆の基本ガイドライン】
  - ポエムや使い回しの文章は一切禁止。本当に天体配置と月の位置、ナクシャトラの特徴から、相談者の心へ誠実かつ深い内省を促すように語りかけてください。
  - トーンは高貴で、神秘的でありながら、現実的で温かい励ましに満ちた言葉遣い（日本語）。
  - 有料鑑定の場合は、プロフェッショナル鑑定書に相応しい、各セクションの最低文字数を必ず厳守して、重厚かつ詳細に運命を紐解いてください。

  【出力フォーマット】
  ${formatSchema}
  `;
}

// Google スプレッドシートからプロファイル（出生データ・ステータス）を検索・取得
async function fetchProfileFromSheets(email) {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_ID || '12bVoLkNY2EEoOztv2Ij6nZYjVwu1vhgquo2SBVGFfIo';
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      console.warn("Google credentials missing. Running in memory-only mode.");
      return null;
    }

    const auth = new JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sheetId, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['会員データ'];
    if (!sheet) return null;

    const rows = await sheet.getRows();
    const userRow = rows.find(r => r.get('email') === email);

    if (userRow) {
      return {
        email: userRow.get('email'),
        status: userRow.get('status') || 'free',
        dob: userRow.get('dob'),
        tob: userRow.get('tob'),
        city: userRow.get('city'),
        language: userRow.get('language') || 'ja',
        lastResult: userRow.get('last_reading') ? JSON.parse(userRow.get('last_reading')) : null
      };
    }
  } catch (err) {
    console.error("Google Sheets fetch error:", err);
  }
  return null;
}

// 新規無料診断時に Google Sheets へ新規行を追加（会員登録）
async function saveProfileToSheets(email, status, dob, tob, city, readingData, lang) {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_ID || '12bVoLkNY2EEoOztv2Ij6nZYjVwu1vhgquo2SBVGFfIo';
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      console.warn("Google credentials missing. Skipping spreadsheet save.");
      return;
    }

    const auth = new JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sheetId, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['会員データ'];
    if (!sheet) {
      console.warn("'会員データ' sheet not found in spreadsheet.");
      return;
    }

    // 重複登録を避けるため、すでに同一メールアドレスがあれば行を更新、なければ新規追加
    const rows = await sheet.getRows();
    const existingRow = rows.find(r => r.get('email') === email);

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
