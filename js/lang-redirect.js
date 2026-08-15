// 言語非依存のURL（例: /pdf-success）を、閲覧者の言語ディレクトリ（例: /ja/pdf-success）へ転送する。
// Stripe の決済リンクの遷移先など、言語ごとにURLを分けられない箇所から利用する。
(function () {
  // 公開済みの言語ディレクトリのみを列挙する。
  // 新しい言語（/en/, /es/, /pt/, /ar/, /id/）を公開したらここに追加すれば自動判定に載る。
  var AVAILABLE_LANGS = ['ja'];
  var FALLBACK_LANG = 'ja';

  var userLang = (navigator.language || navigator.userLanguage || FALLBACK_LANG).toLowerCase();
  var targetLang = FALLBACK_LANG;
  for (var i = 0; i < AVAILABLE_LANGS.length; i++) {
    if (userLang.indexOf(AVAILABLE_LANGS[i]) === 0) {
      targetLang = AVAILABLE_LANGS[i];
      break;
    }
  }

  // /pdf-success → /pdf-success、/ → 空文字。cleanUrls のため拡張子は除去する。
  var page = window.location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  // 決済後の session_id など、クエリとハッシュは失わずに引き継ぐ。
  var suffix = window.location.search + window.location.hash;

  window.location.replace('/' + targetLang + page + suffix);
})();
