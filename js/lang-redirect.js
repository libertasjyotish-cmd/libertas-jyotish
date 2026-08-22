// 言語非依存のURL（例: / や /pdf-success）を、閲覧者の言語ディレクトリ（例: /ja/pdf-success）へ転送する。
// Gumroad の決済リンクの遷移先など、言語ごとにURLを分けられない箇所から利用する。
(function () {
  // 公開済みの言語ディレクトリのみを列挙する。
  // 新しい言語を公開したらここに追加すれば自動判定に載る。
  var AVAILABLE_LANGS = ['ja', 'en', 'es', 'pt', 'ar', 'id'];
  // どの判定でも決まらなかった場合の受け皿。
  var OTHER_LANG = 'en';
  // 国が取れたときの行き先。ここに無い国は OTHER_LANG。
  var COUNTRY_LANG = {
    JP: 'ja',
    ID: 'id',
    BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',
    ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es',
    GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es',
    CR: 'es', PA: 'es', UY: 'es', GQ: 'es',
    SA: 'ar', AE: 'ar', EG: 'ar', DZ: 'ar', MA: 'ar', IQ: 'ar', SD: 'ar', SY: 'ar',
    YE: 'ar', TN: 'ar', JO: 'ar', LY: 'ar', LB: 'ar', PS: 'ar', OM: 'ar', KW: 'ar',
    MR: 'ar', QA: 'ar', BH: 'ar', DJ: 'ar', SO: 'ar', KM: 'ar'
  };

  // /pdf-success → /pdf-success、/ → 空文字。cleanUrls のため拡張子は除去する。
  var page = window.location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  // 決済後の session_id など、クエリとハッシュは失わずに引き継ぐ。
  var suffix = window.location.search + window.location.hash;

  function go(lang) {
    window.location.replace('/' + lang + page + suffix);
  }

  // 国が取れないときの予備。ブラウザ言語 →（対応外なら）タイムゾーン。
  function fallbackLang() {
    var prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || navigator.userLanguage || '']);
    for (var i = 0; i < prefs.length; i++) {
      var pref = String(prefs[i]).toLowerCase();
      for (var j = 0; j < AVAILABLE_LANGS.length; j++) {
        if (pref === AVAILABLE_LANGS[j] || pref.indexOf(AVAILABLE_LANGS[j] + '-') === 0) return AVAILABLE_LANGS[j];
      }
    }
    var zone = '';
    try { zone = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase(); } catch (e) { zone = ''; }
    return zone === 'asia/tokyo' ? 'ja' : OTHER_LANG;
  }

  // 端末の言語設定は実際の所在地と食い違うことが多い（例: 日本の端末でChromeの第一言語が英語）。
  // そのためアクセス元の国を最優先し、取れなかったときだけ端末側の設定を見る。
  var done = false;
  function decide(country) {
    if (done) return;
    done = true;
    go((country && COUNTRY_LANG[country]) || fallbackLang());
  }

  // 応答が遅い場合に待たせ続けない。
  setTimeout(function () { decide(null); }, 1500);

  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/checkout-links', true);
    xhr.onload = function () {
      var country = null;
      try { country = (JSON.parse(xhr.responseText) || {}).country || null; } catch (e) { country = null; }
      decide(country);
    };
    xhr.onerror = function () { decide(null); };
    xhr.send();
  } catch (e) {
    decide(null);
  }
})();
