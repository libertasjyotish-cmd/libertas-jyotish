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
    labels: { premium: '月額 500円（税込）', pdf: '買い切り 4,980円（税込）' }
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
    labelFor: function (product) {
      return (resolved.labels && resolved.labels[product]) || FALLBACK.labels[product];
    }
  };
})();
