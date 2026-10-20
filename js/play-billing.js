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
        if (data && data.pending) return data;
        if (!res.ok || !data || !data.ok) throw new Error(((data && data.error) || 'verify_failed') + (data && data.reason ? ' (' + data.reason + ')' : ''));
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

  function orderJson(res) {
    return res.json().catch(function () { return null; }).then(function (j) {
      if (!res.ok || !j) { var e = new Error((j && j.error) || 'order_failed'); e.code = j && j.error; throw e; }
      return j;
    });
  }

  // Play 課金が使えない環境（ブラウザの PWA、Play 課金未対応の端末）は通常のウェブ決済（KOMOJU／Gumroad）へ。
  function webOrder(data) {
    return fetch('/api/report-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(orderJson)
      .then(function (j) {
        if (!j.url) { var e = new Error('order_failed'); e.code = j.error; throw e; }
        return { ok: true, uploadUrl: j.url };
      });
  }

  // Play の支払いシートは「クリック直後」に開かないと拒否される（ユーザー操作の有効期限）ため、
  // 台帳への注文作成（数秒かかる）を待たずに PaymentRequest.show() を先に呼び、注文の完了を details の Promise で待たせる。
  function playOrder(data) {
    var body = Object.assign({}, data, { provider: 'play' });
    if (window.LJTrack) window.LJTrack('begin_checkout', { product: data.product, provider: 'play' });
    var orderError = null;
    var orderPromise = fetch('/api/report-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(orderJson)
      .then(function (order) {
        if (order.provider !== 'play') { var e = new Error('order_failed'); e.code = order.error; throw e; }
        return order;
      });
    var request = new PaymentRequest(
      [{ supportedMethods: METHOD, data: { sku: SKUS[data.product] } }],
      { total: { label: 'Total', amount: { currency: 'JPY', value: '0' } } }
    );
    var details = orderPromise.then(function () {
      return { total: { label: 'Total', amount: { currency: 'JPY', value: '0' } } };
    }, function (err) {
      orderError = err;
      request.abort().catch(function () {});
      throw err;
    });
    return request.show(details).then(function (response) {
      return orderPromise.then(function (order) {
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
    }, function (err) {
      if (orderError) throw orderError;
      // 支払いシートが開けなかった／閉じられた。無反応に見えないよう、ページ側で表示できる形にする。
      var msg = 'play_' + ((err && err.name) || 'failed') + (err && err.message ? ': ' + String(err.message).slice(0, 120) : '');
      return service().then(function (s) {
        return s ? s.getDetails([SKUS[data.product]]) : [];
      }).catch(function () { return null; }).then(function (items) {
        var tag = items === null ? 'sku=unknown' : (items && items[0] ? 'sku=ok ' + (items[0].price ? items[0].price.value + items[0].price.currency : '') : 'sku=not_found');
        var e = new Error(msg + ' [' + tag + ']');
        e.code = e.message;
        e.name = (err && err.name) || 'Error';
        if (window.LJTrack) window.LJTrack('checkout_error', { product: data.product, provider: 'play', reason: e.code });
        throw e;
      });
    });
  }

  window.LJPlayBilling = {
    supported: supported,
    // 個別鑑定書: 台帳に注文を作る → Play で支払う → サーバーで検証・確定。解決値は /api/play-verify の応答。
    reportCheckout: function (data) {
      return service().then(function (s) {
        if (!s) return webOrder(data);
        return playOrder(data).catch(function (err) {
          if (err && (err.name === 'NotSupportedError' || err.name === 'SecurityError')) return webOrder(data);
          if (err && err.name === 'AbortError') err.name = 'PlayAbortError';
          throw err;
        });
      });
    },
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
    // 端末の Play アカウントにある、会員権に紐づける購入（プレミアム・生涯鑑定書）。注文台帳が要る個別鑑定書は除く。
    lastErrors: [],
    pending: function () {
      return service().then(function (s) {
        if (!s || !s.listPurchases) return [];
        return s.listPurchases().then(function (purchases) {
          return (purchases || []).filter(function (p) { return p.itemId === SKUS.premium || p.itemId === SKUS.pdf; });
        });
      }).catch(function () { return []; });
    },
    // 端末で既に購入済み（再インストール・紐づけ失敗等）のものをサーバーに再登録する。
    restore: function (email) {
      window.LJPlayBilling.lastErrors = [];
      return window.LJPlayBilling.pending().then(function (purchases) {
          var jobs = (purchases || []).map(function (p) {
            var product = p.itemId === SKUS.pdf ? 'pdf' : 'premium';
            return verify(product, p.purchaseToken, email).catch(function (e) {
              window.LJPlayBilling.lastErrors.push(String((e && e.message) || e));
              return null;
            });
          });
          return Promise.all(jobs).then(function (r) { return r.filter(Boolean); });
      }).catch(function () { return []; });
    },
    // 定期購入の管理（解約）は Play ストア側で行う
    manageUrl: function () {
      return 'https://play.google.com/store/account/subscriptions?sku=' + SKUS.premium +
        '&package=com.libertas_jyotish.app';
    }
  };
})();
