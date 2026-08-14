# 設計書 Ver 12.0 と実装の差分監査

対象コミット: `93fa17f`（`Configure Vercel rewrites and redirects for top-level mypage and legal paths`）
対象設計書: `Agent.pdf` = 「Libertas Jyotish 完全システム設計書 Ver 12.0 (Production Lock)」

## サマリ

設計書 v12 に書かれた主要機能（4 アクション統合 API、HMAC 署名トークン、自律フォールバック、
セッション退避レスキュー、羊皮紙デザイン）は **すべて実装済み**。
一方で、設計書に書かれていない挙動や、設計書と食い違う実装がいくつかある。

## A. セキュリティ（最優先）

| # | 内容 | 該当箇所 |
| --- | --- | --- |
| A-1 | **Prokerala の client_id / client_secret がソースにハードコードされ、public リポジトリに公開されている** | `api/jyotish.js:173-174` |
| A-2 | `AUTH_SECRET` の既定値 `'libertas_jyotish_secret_key_2026_secure'` がハードコード。環境変数未設定時、第三者が認証トークンを偽造してマイページにログインできる | `api/jyotish.js:6` |
| A-3 | `GOOGLE_SHEETS_ID` がハードコード（機密性は低いが同様に外出しすべき） | `api/jyotish.js:388, 430` |
| A-4 | 認証コードに `Math.random()` を使用。`crypto.randomInt()` が望ましい | `api/jyotish.js:32` |
| A-5 | 署名比較が `!==` による単純比較。`crypto.timingSafeEqual()` が望ましい | `api/jyotish.js:105` |
| A-6 | CORS が `Access-Control-Allow-Origin: *` かつ `Allow-Credentials: true`。自ドメインに限定すべき | `api/jyotish.js:9-10` |
| A-7 | `send_code` にレート制限がなく、任意アドレスへメールを送信させられる | `api/jyotish.js:27-87` |

> A-1 / A-2 は **鍵のローテーションが必要**。コード修正だけでは既に公開された鍵は無効化されない。

## B. 設計書と実装の食い違い

| # | 設計書 v12 の記述 | 実装 |
| --- | --- | --- |
| B-1 | 決済は「Tally & Stripe」。Tally ポップアップに email を隠しフィールドで引き継ぐ | Tally は事実上未使用。すべて Stripe Payment Link 直リンク。`ja/mypage.html:520` に `TALLY_FORM_ID` を参照する分岐が残るが、**未定義変数**であり到達すれば `ReferenceError` になる |
| B-2 | Gemini API のモデル指定なし（最新想定） | `gemini-1.5-flash` を固定使用。SNS 側システムは `gemini-2.5-flash` を想定しており不統一 |
| B-3 | 「無料性格解説・日次/週次運勢・108区分超詳細鑑定」 | 実装済みだが 108 区分は `premium_reading.lifetime_dasha` の 1 テキストとして生成されるのみ |
| B-4 | メールアドレス主キーで会員 DB を管理 | 実装は Sheets 上の `会員データ` シート固定。シート名・カラム名は設計書に未記載だった（本書で明文化） |
| B-5 | 6 言語対応を示唆（`language` パラメータあり） | `ja` のみ実装。`index.html` の言語判定はコメントアウト。Gemini プロンプトも日本語出力固定で `language` は Sheets 保存にしか使われない |
| B-6 | 「Vercel Hobby」 | `maxDuration` 未指定。Hobby プランの 10 秒制限に対し、Nominatim + Prokerala(2 リクエスト) + Gemini + Sheets を直列実行しており、タイムアウトのリスクがある |

## C. 設計書に記載のない実装

| # | 内容 |
| --- | --- |
| C-1 | `ja/pdf-purchase.html` / `ja/pdf-success.html`（完全鑑定書 PDF 単品販売）。ただし PDF の生成・配信処理はどこにも実装されていない（`pdf-success.html` のダウンロードリンクは `#`） |
| C-2 | `ja/reissue.html`（マイページ URL 再発行）。API 呼び出しはなく、localStorage にメールを保存してマイページへ遷移するだけ |
| C-3 | `vercel.json` の `/mypage.html`・`/legal.html` → `/ja/...` rewrite |
| C-4 | `push.py`（GitHub API 経由のファイル push 補助スクリプト）。本番動作には不要 |

## D. 機能的な不具合・改善候補

| # | 内容 | 該当箇所 |
| --- | --- | --- |
| D-1 | `sw.js` のプリキャッシュ対象が `./mypage.html` `./result.html` `./legal.html` を指しているが、実ファイルは `ja/` 配下。ルート直下に実体がないため `cache.addAll` が reject し、**install イベントごと失敗する可能性がある**（`/mypage.html` は rewrite で解決するが `/result.html` は未定義） | `sw.js:2-11` |
| D-2 | `sw.js` の `CACHE_NAME` とページ側 `LJ_APP_VERSION` がどちらも手書きの `v12`。片方の更新漏れでキャッシュ破棄が効かなくなる | `sw.js:1`, `ja/*.html` |
| D-3 | 「東京都」「1970-01-01」を不正値として弾いているため、**実際に東京都生まれのユーザーが診断できない** | `api/jyotish.js:147` |
| D-4 | Stripe Webhook 未実装のため、決済後の `status: 'paid'` 反映が自動化されていない | 全体 |
| D-5 | フォールバック鑑定は生年月日の「日」から月星座・ナクシャトラを機械的に割り当てるだけで占術的根拠がない。ユーザーには本物の鑑定と区別がつかない | `api/jyotish.js:271-314` |
| D-6 | `result.html` はエラー時に「鑑定データの取得に失敗しました」を表示する。設計書はこの表示の 100% 根絶を謳うが、ネットワーク断や 400 応答では表示され得る | `ja/result.html:225-229` |
| D-7 | Prokerala へ渡す ISO 日時のタイムゾーンが `+09:00` 固定。海外出生地では出生時刻がずれる | `api/jyotish.js:189` |
| D-8 | Nominatim は利用規約上 1 req/s 制限。キャッシュがなく、アクセス増でブロックされる恐れ | `api/jyotish.js:157` |
| D-9 | `verify_code` はコード自体をサーバー保持せず署名のみで検証するため、**リプレイ（同一コードの再利用）を 10 分間防げない** | `api/jyotish.js:90-122` |

## E. 推奨対応の優先順位

1. **A-1 / A-2**: Prokerala 鍵と `AUTH_SECRET` をローテーションし、ハードコード値を削除して環境変数必須化
2. **D-1**: `sw.js` のプリキャッシュ一覧を `ja/` 配下の実パスに修正
3. **D-3**: 「東京都」「1970-01-01」のバリデーションを、値そのものではなく「未入力フラグ」で判定する方式に変更
4. **B-1**: `ja/mypage.html` の到達不能な Tally 分岐を削除
5. **D-4**: Stripe Webhook を追加し `status` を自動昇格
6. **A-7 / D-9**: `send_code` のレート制限とコードのワンタイム化
7. **B-5**: 多言語化（Gemini プロンプトの言語切替 + `en/` 等のページ追加）
8. **C-1**: PDF 生成・配信の実装（現状、購入導線だけが存在する）
