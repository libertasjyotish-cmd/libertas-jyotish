// 訪問者の国に応じた決済リンク・価格表示を解決する共通ヘルパー。
// 決済事業者は /api/checkout-links の provider で決まる（gumroad か fastspring）。
// 取得できるまで／失敗した場合は既定のリンクを使い、購入導線が止まらないようにする。
// クリック時にポップアップがブロックされないよう、参照は同期的に返す。
(function () {
  var FALLBACK = {
    provider: 'gumroad',
    tier: 'T2',
    links: {
      premium: 'https://libertajyoti.gumroad.com/l/plan-t2',
      pdf: 'https://libertajyoti.gumroad.com/l/report-t2'
    },
    labels: { premium: '月額 550円（米ドル決済）', pdf: '買い切り 5,980円（米ドル決済）' },
    approx: null
  };
  var CACHE_KEY = 'lj_checkout_links';
  var SBL_SRC = 'https://sbl.onfastspring.com/sbl/1.0.3/fastspring-builder.min.js';
  var resolved = FALLBACK;

  function apply(data) {
    if (data && data.provider === 'fastspring' && data.storefront) resolved = data;
    else if (data && data.links && data.links.premium) resolved = data;
    return resolved;
  }

  try {
    apply(JSON.parse(sessionStorage.getItem(CACHE_KEY)));
  } catch (e) { /* キャッシュ不正時は既定のまま */ }

  var ready = fetch('/api/checkout-links')
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (data && (data.provider === 'fastspring' ? data.storefront : data.links)) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (e) { /* プライベートモード等では保存しない */ }
      }
      return apply(data);
    })
    .catch(function () { return resolved; });

  // FastSpring の Store Builder Library。ポップアップ決済に必要。
  // 購入完了時に window.ljFastSpringOrderComplete が呼ばれる。
  function loadStoreBuilder() {
    if (window.ljFsblLoading) return window.ljFsblLoading;
    window.ljFsblLoading = new Promise(function (resolve, reject) {
      if (window.fastspring && window.fastspring.builder) return resolve();
      var script = document.createElement('script');
      script.id = 'fsc-api';
      script.type = 'text/javascript';
      script.src = SBL_SRC;
      script.setAttribute('data-storefront', resolved.storefront);
      script.setAttribute('data-popup-webhook', 'ljFastSpringOrderComplete');
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('sbl load failed')); };
      document.head.appendChild(script);
    });
    return window.ljFsblLoading;
  }

  // 購入完了後は課金状態を取り直すため、中立なパラメータ付きでマイページへ戻す。
  window.ljFastSpringOrderComplete = function () {
    var lang = (window.LJ_I18N && window.LJ_I18N.lang) || 'ja';
    window.location.href = '/' + lang + '/mypage?c=1';
  };

  function pathFor(product) {
    return (resolved.products && resolved.products[product]) || '';
  }

  window.LJCheckout = {
    ready: ready,
    provider: function () { return resolved.provider || 'gumroad'; },
    // 解約・支払い方法変更を行う購入者向け画面（FastSpring の Account Management）
    accountUrl: function () { return resolved.accountUrl || ''; },
    // product は 'premium'（月額）、'premium_annual'（年額）、'pdf'（買い切り）
    linkFor: function (product) {
      return (resolved.links && resolved.links[product]) || FALLBACK.links[product];
    },
    // 購入者メールを引き渡し、商品ページを経由せず Gumroad の決済画面へ直行させる。
    // 会員権はこのメールアドレスで当サイトのアカウントに紐づける。
    checkoutUrlFor: function (product, email) {
      var url = window.LJCheckout.linkFor(product);
      var params = 'wanted=true';
      if (email) params += '&email=' + encodeURIComponent(email);
      return url + (url.indexOf('?') >= 0 ? '&' : '?') + params;
    },
    // 決済へ進む。事業者ごとの導線の違いをここに閉じ込める。
    // FastSpring は本人確認済みのアドレスを決済画面へ引き継ぎ、購入と会員を紐づける。
    // options.newTab は Gumroad のみ有効（FastSpring はページ上のポップアップで開く）。
    openCheckout: function (product, email, options) {
      if (window.LJCheckout.provider() !== 'fastspring') {
        var url = window.LJCheckout.checkoutUrlFor(product, email);
        if (options && options.newTab) window.open(url, '_blank');
        else window.location.href = url;
        return Promise.resolve();
      }
      return loadStoreBuilder().then(function () {
        window.fastspring.builder.push({
          reset: true,
          products: [{ path: pathFor(product), quantity: 1 }],
          paymentContact: { email: email },
          tags: { lj_email: email },
          checkout: true
        });
      });
    },
    // 日本語ページは API の確定ラベル（円）。他言語は訪問国の通貨での概算額を返し、
    // 通貨が判定できない場合は金額を出さず、決済画面で提示される旨だけを返す。
    labelFor: function (product) {
      var i18n = window.LJ_I18N;
      var lang = i18n && i18n.lang;
      var price = (i18n && i18n.price) || {};

      // FastSpring は購入者の通貨で請求する。手入力した通貨だけ確定額を表示できる。
      if (window.LJCheckout.provider() === 'fastspring') {
        var amount = resolved.amounts && resolved.amounts[product];
        if (!resolved.currency || !amount) return price.checkoutOnly || '';
        return (price[product] || price[product + 'Approx'] || '{price}')
          .replace('{price}', formatMoney(amount, resolved.currency, lang));
      }

      if (!lang || lang === 'ja') return (resolved.labels && resolved.labels[product]) || FALLBACK.labels[product];

      var approx = resolved.approx;
      if (!approx || !approx[product]) return price.checkoutOnly || '';
      return (price[product + 'Approx'] || '{price}')
        .replace('{price}', formatMoney(approx[product], approx.currency, lang));
    },
    // 動的に差し込んだ要素にも価格ラベルを反映させる
    paint: function () { paintLabels(); }
  };

  function formatMoney(amount, currency, lang) {
    try {
      return new Intl.NumberFormat(lang || 'en', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: amount < 10 ? 2 : 0
      }).format(amount);
    } catch (e) {
      return amount + ' ' + currency;
    }
  }

  // data-price-label="premium" などの要素に価格ラベルを流し込む（解決後に上書きする）。
  function paintLabels() {
    var nodes = document.querySelectorAll('[data-price-label]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = window.LJCheckout.labelFor(nodes[i].getAttribute('data-price-label'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintLabels);
  } else {
    paintLabels();
  }
  ready.then(paintLabels);
})();
