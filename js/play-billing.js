// Android アプリ（TWA）内では Google Play 課金で購入させる（Digital Goods API + PaymentRequest）。
// Play 配信アプリ内の有料機能・サブスクは Play 課金が必須のため、ブラウザ用の Gumroad/KOMOJU 導線を置き換える。
// 利用可否は window.getDigitalGoodsService の有無で判定し、無ければ何もしない（ブラウザは従来どおり）。
(function () {
  var METHOD = 'https://play.google.com/billing';
  // Play Console に登録した商品 ID（api/_play.js の PLAY_PRODUCTS と揃える）
  var SKUS = { pdf: 'report_pdf', premium: 'premium_monthly', yearly: 'report_yearly', career: 'report_career', palm: 'report_palm', compat: 'report_compat', karma: 'report_karma' };
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

  function pay(sku) {
    var request = new PaymentRequest(
      [{ supportedMethods: METHOD, data: { sku: sku } }],
      { total: { label: 'Total', amount: { currency: 'JPY', value: '0' } } }
    );
    return request.show();
  }

  window.LJPlayBilling = {
    supported: supported,
    // 個別鑑定書: 台帳に注文を作る → Play で支払う → サーバーで検証・確定。解決値は /api/play-verify の応答。
    reportCheckout: function (data) {
      var body = Object.assign({}, data, { provider: 'play' });
      if (window.LJTrack) window.LJTrack('begin_checkout', { product: data.product, provider: 'play' });
      return fetch('/api/report-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (res) {
          return res.json().catch(function () { return null; }).then(function (j) {
            if (!res.ok || !j || j.provider !== 'play') { var e = new Error((j && j.error) || 'order_failed'); e.code = j && j.error; throw e; }
            return j;
          });
        })
        .then(function (order) {
          return pay(order.sku).then(function (response) {
            var token = response.details && response.details.purchaseToken;
            return fetch('/api/play-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product: data.product, order: order.order, purchaseToken: token, lang: data.lang })
            }).then(function (res) {
              return res.json().catch(function () { return null; }).then(function (v) {
                if (!res.ok || !v || !v.ok) throw new Error((v && v.error) || 'verify_failed');
                if (window.LJTrack) window.LJTrack('purchase_completed', { product: data.product, provider: 'play' });
                return response.complete('success').then(function () { return v; });
              });
            }, function (err) {
              return response.complete('fail').then(function () { throw err; });
            });
          });
        });
    },
    // 商品ページの注文フォームを Play 課金表示に（ボタンの価格を Play の現地価格に、決済事業者の注記を Google Play に）。
    decorateOrderForm: function (product, btn, sub) {
      if (!supported()) return;
      window.LJPlayBilling.price(product).then(function (price) {
        if (price && btn) btn.textContent = btn.textContent.replace(/[（(][^）)]*[）)]\s*$/, '') + '（' + price + '）';
        if (sub) sub.textContent = 'Google Play';
      });
    },
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
      if (window.LJTrack) window.LJTrack('begin_checkout', { product: product, provider: 'play' });
      return pay(sku).then(function (response) {
        var token = response.details && response.details.purchaseToken;
        return verify(product, token, email).then(function (data) {
          if (window.LJTrack) {
            window.LJTrack(product === 'premium' ? 'premium_signup_completed' : 'purchase_completed', { product: product, provider: 'play' });
          }
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
