// 訪問者の国に応じた Gumroad 決済リンクを取得する共通ヘルパー。
// 取得できるまで／失敗した場合は既定（T2）のリンクを使い、購入導線が止まらないようにする。
// クリック時にポップアップがブロックされないよう、参照は同期的に返す。
(function () {
  var FALLBACK = {
    tier: 'T2',
    links: {
      premium: 'https://libertajyoti.gumroad.com/l/plan-t2',
      pdf: 'https://libertajyoti.gumroad.com/l/report-t2'
    },
    labels: { premium: '月額 US$3.99（米ドル決済）', pdf: '買い切り US$39（米ドル決済）' },
    // 取得前・失敗時は国が分からない（日本かもしれない）ので購入を開かない（fail-closed）。
    available: { premium: false, pdf: false },
    currency: 'USD',
    amounts: { premium: 3.99, pdf: 39 },
    approx: null
  };
  var CACHE_KEY = 'lj_checkout_links';
  var resolved = FALLBACK;

  function apply(data) {
    if (data && data.links && data.links.premium) resolved = data;
    return resolved;
  }

  try {
    apply(JSON.parse(sessionStorage.getItem(CACHE_KEY)));
  } catch (e) { /* キャッシュ不正時は既定のまま */ }

  var ready = fetch('/api/checkout-links')
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (data && data.links && data.links.premium) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (e) { /* プライベートモード等では保存しない */ }
      }
      return apply(data);
    })
    .catch(function () { return resolved; });

  window.LJCheckout = {
    ready: ready,
    // その商品を今この訪問者に販売できるか（false なら「準備中」）。
    available: function (product) {
      var table = resolved.available || FALLBACK.available;
      return table[product] !== false;
    },
    unavailableMessage: function () {
      var i18n = window.LJ_I18N;
      return (i18n && i18n.price && i18n.price.unavailable) || '現在サイト内決済の準備中です。公開までお待ちください。';
    },
    // 'komoju' | 'gumroad' | null（販売停止中）
    provider: function () { return resolved.provider || null; },
    // 購入前にメール認証が要るか。KOMOJU（日本）は会員紐づけのため必須、Gumroad は決済側がメールを取るので不要。
    requiresVerifiedEmail: function () { return resolved.provider === 'komoju'; },
    linkFor: function (product) {
      return resolved.links[product] || FALLBACK.links[product];
    },
    // 購入者メールを引き渡し、商品ページを経由せず Gumroad の決済画面へ直行させる。
    // 会員権はこのメールアドレスで当サイトのアカウントに紐づける。
    // 日本（provider: komoju）は自サイトの /api/komoju-checkout 経由で KOMOJU の決済ページへ遷移する。
    checkoutUrlFor: function (product, email) {
      if (resolved.provider === 'komoju') {
        var lang = (window.LJ_I18N && window.LJ_I18N.lang) || 'ja';
        return '/api/komoju-checkout?product=' + encodeURIComponent(product) +
          '&lang=' + encodeURIComponent(lang) +
          (email ? '&email=' + encodeURIComponent(email) : '');
      }
      var url = window.LJCheckout.linkFor(product);
      var params = 'wanted=true';
      if (email) params += '&email=' + encodeURIComponent(email);
      return url + (url.indexOf('?') >= 0 ? '&' : '?') + params;
    },
    // 日本語ページは API の確定ラベル（円）。他言語は訪問国の通貨での概算額を返し、
    // 通貨が判定できない場合は金額を出さず、決済画面で提示される旨だけを返す。
    labelFor: function (product) {
      var i18n = window.LJ_I18N;
      var lang = i18n && i18n.lang;
      if (!lang || lang === 'ja') return (resolved.labels && resolved.labels[product]) || FALLBACK.labels[product];

      var price = i18n.price || {};
      var approx = resolved.approx;
      // 現地通貨の概算があればそれを、無ければ決済通貨（USD/JPY）の確定額を出す。
      if (approx && approx[product]) {
        return (price[product + 'Approx'] || '{price}').replace('{price}', formatMoney(lang, approx[product], approx.currency));
      }
      var amounts = resolved.amounts || FALLBACK.amounts;
      var currency = resolved.currency || FALLBACK.currency;
      if (!amounts || !amounts[product]) return price.checkoutOnly || '';
      return (price[product] || '{price}').replace('{price}', formatMoney(lang, amounts[product], currency));
    },
    // 動的に差し込んだ要素にも価格ラベルを反映させる
    paint: function () { paintLabels(); }
  };

  function formatMoney(lang, value, currency) {
    try {
      return new Intl.NumberFormat(lang, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: value < 10 ? 2 : 0
      }).format(value);
    } catch (e) {
      return value + ' ' + currency;
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
