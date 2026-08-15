// 訪問者の国に応じた Stripe 決済リンクを取得する共通ヘルパー。
// 取得できるまで／失敗した場合は既定（T2）のリンクを使い、購入導線が止まらないようにする。
// クリック時にポップアップがブロックされないよう、参照は同期的に返す。
(function () {
  var FALLBACK = {
    tier: 'T2',
    links: {
      premium: 'https://buy.stripe.com/dRmaEZ0I73Bx6g8auH24000',
      pdf: 'https://buy.stripe.com/3cI14paiHegb480fP124001'
    },
    labels: { premium: '月額 500円（税込）', pdf: '買い切り 4,980円（税込）' },
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
    // product は 'premium' か 'pdf'
    linkFor: function (product) {
      return resolved.links[product] || FALLBACK.links[product];
    },
    // 日本語ページは API の確定ラベル（円）。他言語は訪問国の通貨での概算額を返し、
    // 通貨が判定できない場合は金額を出さず、決済画面で提示される旨だけを返す。
    labelFor: function (product) {
      var i18n = window.LJ_I18N;
      var lang = i18n && i18n.lang;
      if (!lang || lang === 'ja') return (resolved.labels && resolved.labels[product]) || FALLBACK.labels[product];

      var price = i18n.price || {};
      var approx = resolved.approx;
      if (!approx || !approx[product]) return price.checkoutOnly || '';

      var formatted;
      try {
        formatted = new Intl.NumberFormat(lang, {
          style: 'currency',
          currency: approx.currency,
          maximumFractionDigits: approx[product] < 10 ? 2 : 0
        }).format(approx[product]);
      } catch (e) {
        formatted = approx[product] + ' ' + approx.currency;
      }
      return (price[product + 'Approx'] || '{price}').replace('{price}', formatted);
    },
    // 動的に差し込んだ要素にも価格ラベルを反映させる
    paint: function () { paintLabels(); }
  };

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
