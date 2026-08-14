# Libertas Jyotish PWA システム設計書 (As-Built / Ver 13.0)

- 対象リポジトリ: `libertas-jyotish`
- 位置づけ: 旧設計書 `Ver 12.0 (Production Lock)`（`Agent.pdf`）を、実際のコードに合わせて書き直したもの
- 差分の詳細と未解決課題は [GAP-AUDIT.md](./GAP-AUDIT.md) を参照

## 1. システム概要

Vercel 上でホストされる静的 PWA（HTML/CSS/JS）と、単一の Vercel Serverless Function
`api/jyotish.js`（Node.js / CommonJS）で構成される、インド占星術（サイデリアル方式）鑑定アプリ。
Make.com などのノーコード自動化ツールは使用しない。

会員の主キーはメールアドレス（`email`）。会員データは Google Sheets の `会員データ` シートに保存する。

## 2. リポジトリ構成（実装ベース）

```
index.html          言語振り分け（現状は常に /ja/index.html へ redirect）
manifest.json       PWA マニフェスト
sw.js               Service Worker（CACHE_NAME = 'libertas-jyotish-v12'）
vercel.json         cleanUrls / redirects / rewrites
package.json        google-spreadsheet, google-auth-library
api/jyotish.js      統合 API（4 アクション + フォールバック）
ja/index.html       トップ・出生情報入力
ja/result.html      鑑定結果（無料/有料）
ja/mypage.html      メール認証ログイン・マイページ
ja/pdf-purchase.html 完全鑑定書（PDF）購入
ja/pdf-success.html  PDF 購入完了
ja/success.html      有料登録完了
ja/legal.html        特商法・利用規約・プライバシーポリシー
ja/reissue.html      マイページ URL 再発行
img/                 bg-jyotish.jpg, libertas-logo.png
push.py              GitHub API 経由の補助スクリプト（本番動作には不要）
Agent.pdf            旧 v12 設計書（アーカイブ）
```

## 3. 外部サービスと役割

| 役割 | サービス | 実装箇所 | 必要な環境変数 |
| --- | --- | --- | --- |
| ホスティング / API | Vercel | 全体 | - |
| ジオコーディング | Nominatim (OpenStreetMap) | `api/jyotish.js` | 不要（User-Agent 必須） |
| 天体計算 | Prokerala API v2 | `api/jyotish.js` | `PROKERALA_CLIENT_ID`, `PROKERALA_CLIENT_SECRET` |
| 鑑定文生成 | Gemini API (`gemini-1.5-flash`) | `api/jyotish.js` | `GEMINI_API_KEY` |
| 会員 DB | Google Sheets (`会員データ`) | `api/jyotish.js` | `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` |
| 認証メール | Resend API | `api/jyotish.js` | `RESEND_API_KEY` |
| トークン署名 | Node.js crypto (HMAC-SHA256) | `api/jyotish.js` | `AUTH_SECRET` |
| 決済 | Stripe Payment Link | `ja/*.html` | - （URL 直書き） |

Tally は設計書 v12 に記載があるが、実装では Stripe Payment Link に一本化されている
（`ja/mypage.html` に到達不能な Tally 分岐が残存。GAP-AUDIT 参照）。

## 4. API 仕様: `POST /api/jyotish`

CORS は全オリジン許可。`OPTIONS` は 200、`POST` 以外は 405。
リクエストボディの `action` で分岐する。

### 4.1 `send_code`（認証コード送信）
- 入力: `email`
- 処理: 6 桁コード生成 → 有効期限 10 分 → `HMAC-SHA256(AUTH_SECRET, "email:code:expiry")` を計算し
  `token = "<expiry>:<signature>"` を発行 → Resend API で `info@libertas-jyotish.com` から送信
- 出力: `{ status: 'success', token }`
- 失敗時: `400 { error: 'メール送信エラー: ...' }`（コードはサーバーログに `[RECOVERY]` として記録）
- Sheets への書き込みは行わない

### 4.2 `verify_code`（コード検証）
- 入力: `email`, `code`, `token`
- 処理: 期限チェック → 署名再計算で照合 → 成功時に Sheets からプロフィールを復元
- 出力: プロフィール（`email, status, dob, tob, city, language, lastResult`）
  または新規ユーザー時 `{ status: 'free', message: 'new_user' }`
- Sheets 接続に失敗してもログインは成立する（自律修復）

### 4.3 `diagnosis`（鑑定実行）
- 入力: `email`, `dob`, `tob`, `city`（`address` でも可）, `status`, `language`
- 処理:
  1. Nominatim で都市名 → 緯度経度（失敗時は東京 35.6762 / 139.6503 にフォールバック）
  2. Prokerala `POST /token`（client_credentials）→ `GET /v2/astrology/planet-position`（`ayanamsa=1` = Lahiri）
  3. Gemini `gemini-1.5-flash` に天体データを渡し、JSON 形式の鑑定文を生成
  4. Google Sheets `会員データ` に email をキーとして upsert（失敗しても継続）
- 出力: 鑑定 JSON（後述）
- バリデーション: `dob` 未設定 / `1970-01-01`、`city` 未設定 / `東京都` の場合は `400`

### 4.4 `fetch_profile`（プロフィール取得）
- 入力: `email`
- 処理: Sheets からプロフィールを取得し、`status/dob/tob/city` を補完してから鑑定と同じフローを実行
- 出力: 鑑定 JSON

### 4.5 レスポンス JSON スキーマ

```jsonc
{
  "moonSign": "牡羊座",
  "nakshatra": "アシュヴィニー",
  "status": "free | paid",
  "free_reading": {
    "horoscope": "本日の運勢 (150字程度)",
    "influence": "本日受ける星の影響 (150字程度)",
    "dasha_summary": "支配星周期の過ごし方 (150字程度)",
    "lucky_element": "ラッキーテーマ / 開運アクション (1行)"
  },
  // status === 'paid' の場合のみ追加
  "dashaTitle": "現在の支配星大周期",
  "dashaDesc": "マハー・ダシャー解説 (200字程度)",
  "planets": [{ "name": "", "sign": "", "house": "", "comment": "" }],
  "premium_reading": {
    "kundali_reading": "精密クンダリー解読 (300字以上)",
    "detailed_horoscope": "日次・週次詳細運勢 (500字以上)",
    "lifetime_dasha": "108区分生涯カルテ (800字以上)"
  }
}
```

## 5. 自律フォールバック設計

`api/jyotish.js` は **いかなる例外でも 500 を返さない**。

- Nominatim 失敗 → 東京の座標を使用
- Prokerala 失敗 / トークン取得失敗 → `prokeralaData = null`
- Gemini 失敗、または `GEMINI_API_KEY` 未設定 → `cleanJsonResult = null`
- `cleanJsonResult` が null の場合 → `buildFallbackResponse(dob, isPaid)` が
  生年月日の「日」から月星座（`day % 12`）とナクシャトラ（`day % 27`）を決定し、静的な鑑定文を合成
- ハンドラ全体の catch でも同じフォールバックを返し、常に `200` で応答する

> 注意: フォールバックの月星座・ナクシャトラは実際の天体計算ではなく、日付からの機械的な割り当て。
> 占術的な正確性はない（GAP-AUDIT の「占術精度リスク」参照）。

## 6. フロントエンド仕様

### 6.1 ルーティング（`vercel.json`）
- `cleanUrls: true`
- `/` → `/ja/index.html`（302）
- `/mypage.html` → `/ja/mypage.html`、`/legal.html` → `/ja/legal.html`（rewrite）
- ルートの `index.html` にも JS リダイレクトがあり、対応予定 6 言語（ja/en/es/pt/ar/id）の判定コードは
  コメントアウトされ、現状は常に `ja` へ送られる

### 6.2 ストレージのキー

| キー | 場所 | 用途 |
| --- | --- | --- |
| `lj_app_version` | localStorage | `LJ_APP_VERSION = 'v12'` と比較しキャッシュ強制破棄 |
| `lj_user_email` | localStorage | ログイン中のメール |
| `lj_user_input` | sessionStorage | 診断リクエストのペイロード |
| `lj_user_input_backup` | localStorage | 上記の二重バックアップ（レスキュー用） |
| `lj_diagnosis_result` | sessionStorage | 直近の鑑定結果 |
| `jyotish_user` | localStorage | マイページ即時描画用キャッシュ |
| `lj_auth_token` | sessionStorage | `send_code` で得た署名トークン |
| `dob` / `tob` / `city` | localStorage | 出生情報 |
| `lj_status` / `lj_pdf_purchased` | localStorage | 決済完了フラグ |

### 6.3 キャッシュ大掃除時のレスキュー
`ja/index.html` / `ja/mypage.html` / `ja/result.html` の先頭で `lj_app_version` を検査し、
不一致なら `lj_user_email`・`lj_user_input`・`lj_user_input_backup` を退避 → `localStorage.clear()` /
`sessionStorage.clear()` → 退避データを復元 → `location.reload()`。
`result.html` は `lj_user_input` が消えていても `lj_user_input_backup` から復元してトップへの強制送還を防ぐ。

### 6.4 Service Worker（`sw.js`）
- `CACHE_NAME = 'libertas-jyotish-v12'`
- install で `skipWaiting()`、activate で旧キャッシュを全削除し `clients.claim()`
- fetch は network-first（成功時にキャッシュ更新、失敗時に `caches.match`）
- `GET` 以外と Googlebot は素通し
- プリキャッシュ対象のパスがディレクトリ移動前のもの（`./mypage.html` 等）のままである点は GAP-AUDIT 参照

## 7. 決済フロー

- Stripe Payment Link: `https://buy.stripe.com/dRmaEZ0I73Bx6g8auH24000?prefilled_email=<email>`
- サブスク登録・PDF 単品購入とも同じリンクを使用
- 完了ページ: `ja/success.html`（`lj_status = 'paid'`）、`ja/pdf-success.html`（`lj_pdf_purchased = 'true'`）
- Stripe Webhook: `POST /api/stripe-webhook`
  - `STRIPE_WEBHOOK_SECRET` で署名検証（HMAC-SHA256 / タイムスタンプ許容 300 秒）
  - `checkout.session.completed` / `checkout.session.async_payment_succeeded` / `invoice.paid` で Sheets の `status` を `paid` に昇格
  - メールは `customer_details.email` → `customer_email` → `receipt_email` → `metadata.email` の順で解決
- 課金状態は **Sheets のみを正** とし、`/api/jyotish` はリクエストボディの `status` を無視する（改ざんによる昇格と、診断時の `free` 上書きによる降格の両方を防止）
- 決済直後は `/ja/mypage?status=paid` で Webhook 反映待ちのリトライ（最大 5 回 / 4 秒間隔）を行う

## 8. デザインガイドライン（v12 から継承・実装済み）

| 要素 | 値 |
| --- | --- |
| 背景 | `#0c1a1f` + `img/bg-jyotish.jpg` |
| 羊皮紙カード | `radial-gradient(circle at 50% 25%, #FFFDF5 0%, #F5E9D0 55%, #DCC8A2 100%)` |
| 二重金箔フレーム | `border: 1px solid rgba(184,142,60,0.65)` / `outline: 1px solid rgba(212,175,55,0.35)` |
| 文字色 | 見出し `#8B6B1B` / `#D4AF37`、本文 `#2C221E` |
| フォント | 英字 `Cinzel`、和文 `Noto Serif JP` |
| プレミアムロック | `status: 'free'` 時に `filter: blur(5px)` + 購入 CTA を重ねる |

## 9. 環境変数一覧

| 変数名 | 必須 | 未設定時の挙動 |
| --- | --- | --- |
| `AUTH_SECRET` | 推奨 | ハードコードされた既定値にフォールバック（要修正） |
| `RESEND_API_KEY` | 必須 | `send_code` が 400 を返す |
| `PROKERALA_CLIENT_ID` / `PROKERALA_CLIENT_SECRET` | 必須 | ハードコード値にフォールバック（要修正） |
| `GEMINI_API_KEY` | 必須 | 静的フォールバック鑑定に切り替わる |
| `GOOGLE_SHEETS_ID` | 推奨 | ハードコード値にフォールバック |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` | 必須 | メモリのみで動作し永続化されない |
