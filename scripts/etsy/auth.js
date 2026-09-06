// Etsy OAuth2 (PKCE) の初回認可。ショップオーナーが一度ブラウザで承認し、得たコードをトークンに交換する。
//
//   node scripts/etsy/auth.js url          認可 URL を表示（code_verifier を .etsy-pkce.json に保存）
//   node scripts/etsy/auth.js code <code>  コールバックで受け取った code をトークンに交換し、
//                                          GitHub Secrets に登録する ETSY_REFRESH_TOKEN を表示する
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildAuthorizeUrl, exchangeCode } = require('./_api');

const REDIRECT_URI = process.env.ETSY_REDIRECT_URI || 'https://www.libertas-jyotish.com/api/etsy-callback';
const PKCE_FILE = path.join(os.homedir(), '.etsy-pkce.json');

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function main() {
  const [command, code] = process.argv.slice(2);

  if (command === 'url') {
    const verifier = b64url(crypto.randomBytes(48));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));
    fs.writeFileSync(PKCE_FILE, JSON.stringify({ verifier, state }), { mode: 0o600 });
    console.log(buildAuthorizeUrl({ redirectUri: REDIRECT_URI, state, codeChallenge: challenge }));
    console.log(`\nstate: ${state}`);
    return;
  }

  if (command === 'code' && code) {
    const { verifier } = JSON.parse(fs.readFileSync(PKCE_FILE, 'utf8'));
    const token = await exchangeCode({ code, redirectUri: REDIRECT_URI, codeVerifier: verifier });
    const userId = String(token.access_token || '').split('.')[0];
    console.log(`user_id: ${userId}`);
    console.log(`expires_in: ${token.expires_in}s`);
    console.log('ETSY_REFRESH_TOKEN (register as a GitHub Secret; never commit):');
    console.log(token.refresh_token);
    fs.unlinkSync(PKCE_FILE);
    return;
  }

  console.error('usage: node scripts/etsy/auth.js url | code <code>');
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
