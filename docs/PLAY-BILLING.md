# Google Play 課金（Android アプリ内購入）の接続手順

Android アプリ（TWA）内で鑑定書・プレミアム会員を販売するには Google Play 課金が必須。
アプリ側（`/home/ubuntu/twa`、Bubblewrap `playBilling.enabled: true`、`androidbrowserhelper:billing`）と
サイト側（`js/play-billing.js` → `/api/play-verify`、`/api/play-rtdn`）は実装済み。
以下は審査通過後に Play Console / Google Cloud で行う接続作業。

## 1. 商品を登録（Play Console → 収益化 → 商品）

| product | 種別 | 商品 ID | 価格の目安 |
|---|---|---|---|
| pdf（完全鑑定書） | アプリ内アイテム（非消費型） | `report_pdf` | T1 8,800円 相当（各国は Play の自動換算＋国別調整） |
| premium（プレミアム会員） | 定期購入 | `premium_monthly` | 基本プラン ID `monthly`、月額、T1 980円 相当 |

商品 ID は `api/_play.js` の `PLAY_PRODUCTS` と `js/play-billing.js` の `SKUS` と一致させる。
事前に「収益化のセットアップ」で Google Payments 加盟店プロフィール（法人住所・銀行口座・税務情報）を完了しておく。

## 2. Play Developer API 用サービスアカウント

1. Google Cloud で Play Console と紐づくプロジェクトを作成／選択し、Google Play Android Developer API を有効化。
2. サービスアカウントを作成し、JSON 鍵をダウンロード。
3. Play Console → ユーザーと権限 → 招待で、そのサービスアカウントのメールに
   「財務データの表示」「注文と定期購入の管理」権限をアプリ単位で付与。
4. Vercel 環境変数:
   - `PLAY_PACKAGE_NAME=com.libertas_jyotish.app`
   - `PLAY_SERVICE_ACCOUNT_EMAIL` / `PLAY_PRIVATE_KEY`（JSON の `client_email` / `private_key`）
   - 未設定時は Sheets 用 `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` を流用する。
     同じサービスアカウントを Play Console に招待するだけでも良い。

## 3. リアルタイム デベロッパー通知（RTDN）

1. Cloud Pub/Sub でトピック（例 `play-rtdn`）を作成し、
   `google-play-developer-notifications@system.gserviceaccount.com` に「Pub/Sub パブリッシャー」を付与。
2. push サブスクリプションを作成。エンドポイント:
   `https://www.libertas-jyotish.com/api/play-rtdn?token=<PLAY_RTDN_TOKEN>`
   （`PLAY_RTDN_TOKEN` は Vercel に設定する長いランダム文字列）
3. Play Console → 収益化のセットアップ → トピック名を入力し「テスト通知を送信」→ Vercel ログで `test_ok` を確認。

## 4. 動作確認

- Play Console → 設定 → ライセンス テストにテスト用 Google アカウントを追加（実課金なし）。
- 内部テストトラックで AAB を配布し、アプリからマイページ → 購入ボタン → Play の購入シートが出ることを確認。
- 購入後 `会員データ` シートに `billing=play`、`play_purchase_token`、`paid_until` が入り、
  マイページの「プランの管理」が Play の定期購入画面へ誘導することを確認。

## 動作の流れ

```
アプリ内の購入ボタン
  → LJCheckoutGuard.start()  （getDigitalGoodsService があれば Play 課金へ分岐）
  → LJPlayBilling.buy()      PaymentRequest(https://play.google.com/billing, {sku})
  → POST /api/play-verify    Play Developer API で purchaseToken を照会
                             → Sheets に付与（pdf_purchased / status=paid, billing=play）→ acknowledge
  → ページ再読み込みで反映

更新・解約・失効
  → Pub/Sub → POST /api/play-rtdn → purchaseToken で会員を逆引き → API 照会 → status / paid_until 更新
  → 解約後の期限切れは komoju-cron（日次）が billing=play も対象にして free へ戻す
```

ブラウザ（PWA）からの購入は従来どおり KOMOJU（日本）／Gumroad（海外）。Play 課金はアプリ内のみ。
