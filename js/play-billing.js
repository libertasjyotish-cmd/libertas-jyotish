// Android アプリ（TWA）内では Google Play 課金で購入させる（Digital Goods API + PaymentRequest）。
// Play 配信アプリ内の有料機能・サブスクは Play 課金が必須のため、ブラウザ用の Gumroad/KOMOJU 導線を置き換える。
// 利用可否は window.getDigitalGoodsService の有無で判定し、無ければ何もしない（ブラウザは従来どおり）。
(function () {
  var METHOD = 'https://play.google.com/billing';
  // Play Console に登録した商品 ID（api/_play.js の PLAY_PRODUCTS と揃える）
  var SKUS = { pdf: 'report_pdf', premium: 'premium_monthly' };
  var servicePromise = null;

  function supported() {
    return typeof window.getDigitalGoodsService === 'function' && typeof window.PaymentRequest === 'function';
  }

  function service() {
    if (!servicePromise) {
      servicePromise = window.getDigitalGoodsService(METHOD).catch(function () { return null; });
    }
    return servicePromise;
  }

  function verify(product, purchaseToken, email) {
    var lang = (window.LJ_I18N && window.LJ_I18N.lang) || 'ja';
    return fetch('/api/play-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        session: localStorage.getItem('lj_session'),
        product: product,
        purchaseToken: purchaseToken,
        lang: lang
      })
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok || !data || !data.ok) throw new Error((data && data.error) || 'verify_failed');
        return data;
      });
    });
  }

  window.LJPlayBilling = {
    supported: supported,
    // 利用可能なら true。TWA でも Play 課金が初期化できない端末では false。
    available: function () {
      if (!supported()) return Promise.resolve(false);
      return service().then(function (s) { return !!s; });
    },
    // Play ストアの現地価格（表示用）。取得できなければ null。
    price: function (product) {
      return service().then(function (s) {
        if (!s) return null;
        return s.getDetails([SKUS[product]]).then(function (items) {
          var item = items && items[0];
          if (!item || !item.price) return null;
          try {
            return new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: item.price.currency
            }).format(Number(item.price.value));
          } catch (e) {
            return item.price.value + ' ' + item.price.currency;
          }
        });
      }).catch(function () { return null; });
    },
    // 購入 → サーバー検証 → 権限付与。解決値は /api/play-verify の応答。
    buy: function (product, email) {
      var sku = SKUS[product];
      if (!sku) return Promise.reject(new Error('invalid_product'));
      var request = new PaymentRequest(
        [{ supportedMethods: METHOD, data: { sku: sku } }],
        { total: { label: 'Total', amount: { currency: 'JPY', value: '0' } } }
      );
      return request.show().then(function (response) {
        var token = response.details && response.details.purchaseToken;
        return verify(product, token, email).then(function (data) {
          return response.complete('success').then(function () { return data; });
        }, function (err) {
          return response.complete('fail').then(function () { throw err; });
        });
      });
    },
    // 端末で既に購入済み（再インストール・別ブラウザ等）のものをサーバーに再登録する。
    restore: function (email) {
      return service().then(function (s) {
        if (!s || !s.listPurchases) return [];
        return s.listPurchases().then(function (purchases) {
          var jobs = (purchases || []).map(function (p) {
            var product = Object.keys(SKUS).filter(function (k) { return SKUS[k] === p.itemId; })[0];
            if (!product) return Promise.resolve(null);
            return verify(product, p.purchaseToken, email).catch(function () { return null; });
          });
          return Promise.all(jobs).then(function (r) { return r.filter(Boolean); });
        });
      }).catch(function () { return []; });
    },
    // 定期購入の管理（解約）は Play ストア側で行う
    manageUrl: function () {
      return 'https://play.google.com/store/account/subscriptions?sku=' + SKUS.premium +
        '&package=com.libertas_jyotish.app';
    }
  };
})();
