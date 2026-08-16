// 言語非依存のURL（例: /pdf-success）を、閲覧者の言語ディレクトリ（例: /ja/pdf-success）へ転送する。
// Stripe の決済リンクの遷移先など、言語ごとにURLを分けられない箇所から利用する。
(function () {
  // 公開済みの言語ディレクトリのみを列挙する。
  // 新しい言語（/en/, /es/, /pt/, /ar/, /id/）を公開したらここに追加すれば自動判定に載る。
  var AVAILABLE_LANGS = ['ja', 'en', 'es', 'pt', 'ar', 'id'];
  var FALLBACK_LANG = 'ja';
  // 対応していない言語（例: fr）の場合の受け皿。日本からの閲覧だけは日本語にする。
  var OTHER_LANG = 'en';

  // ブラウザの言語設定を優先順位の高いものから順に見る（ja-JP のような地域付きも拾う）。
  var prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || navigator.userLanguage || FALLBACK_LANG]);
  var targetLang = '';
  for (var i = 0; i < prefs.length && !targetLang; i++) {
    var pref = String(prefs[i]).toLowerCase();
    for (var j = 0; j < AVAILABLE_LANGS.length; j++) {
      if (pref === AVAILABLE_LANGS[j] || pref.indexOf(AVAILABLE_LANGS[j] + '-') === 0) {
        targetLang = AVAILABLE_LANGS[j];
        break;
      }
    }
  }
  if (!targetLang) {
    var zone = '';
    try { zone = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase(); } catch (e) { zone = ''; }
    targetLang = zone === 'asia/tokyo' ? FALLBACK_LANG : OTHER_LANG;
  }

  // /pdf-success → /pdf-success、/ → 空文字。cleanUrls のため拡張子は除去する。
  var page = window.location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  // 決済後の session_id など、クエリとハッシュは失わずに引き継ぐ。
  var suffix = window.location.search + window.location.hash;

  window.location.replace('/' + targetLang + page + suffix);
})();
