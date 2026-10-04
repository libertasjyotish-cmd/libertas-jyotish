// GA4（gtag.js）。流入元・ページ・言語と、購入／プレミアム登録の到達を計測する。
// 全ページが読む js/site-menu.js から読み込まれる。個人情報は送らない。
(function () {
  var MEASUREMENT_ID = 'G-8LC9CETFG6';
  var host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return;

  var lang = (window.LJ_I18N && window.LJ_I18N.lang) || document.documentElement.lang || 'ja';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('set', { content_language: lang });
  gtag('config', MEASUREMENT_ID);

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(s);

  // 他の共通スクリプト（checkout-links.js / play-billing.js）から呼ぶ送信口。
  window.LJTrack = function (name, params) {
    var payload = { content_language: lang };
    if (params) {
      for (var key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key) && params[key] != null) payload[key] = params[key];
      }
    }
    gtag('event', name, payload);
  };

  // 同じ完了画面を再読み込みしても二重に数えない。
  function once(key, send) {
    var mark = 'lj_ga_' + key;
    try {
      if (sessionStorage.getItem(mark)) return;
      sessionStorage.setItem(mark, '1');
    } catch (e) { /* プライベートモードでは重複を許容する */ }
    send();
  }

  // 決済後の戻り先URLから完了を判定する（KOMOJU・サイト直販の導線）。
  var query = new URLSearchParams(window.location.search);
  var path = window.location.pathname.replace(/\/+$/, '');
  var page = path.split('/').pop();

  if (query.get('c') === '1' && page === 'pdf-success') {
    once('purchase_pdf', function () {
      window.LJTrack('purchase_completed', { product: 'pdf', provider: 'komoju' });
    });
  } else if (query.get('c') === '1' && page === 'mypage') {
    once('premium', function () {
      window.LJTrack('premium_signup_completed', { product: 'premium', provider: 'komoju' });
    });
  } else if (query.get('ordered') === 'paid') {
    once('purchase_' + page, function () {
      window.LJTrack('purchase_completed', { product: page, provider: 'komoju' });
    });
  }
})();
