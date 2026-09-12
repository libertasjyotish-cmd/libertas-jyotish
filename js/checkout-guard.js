// 購入前に本人確認（メール認証）を必須にする共通ヘルパー。
// 会員権は購入時のメールアドレスで紐づくため、未確認のアドレスのまま決済させない。
(function () {
  var VERIFIED_KEY = 'lj_email_verified';

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  window.LJCheckoutGuard = {
    verifiedKey: VERIFIED_KEY,
    // 本人確認済みのメールアドレス。未確認なら空文字。
    verifiedEmail: function () {
      var email = localStorage.getItem('lj_user_email') || '';
      if (!email) return '';
      var verified = localStorage.getItem(VERIFIED_KEY) || '';
      var hasSession = !!localStorage.getItem('lj_session');
      if (hasSession || normalize(verified) === normalize(email)) return email;
      return '';
    },
    markVerified: function (email) {
      if (email) localStorage.setItem(VERIFIED_KEY, email);
    },
    // 決済へ進む。未確認ならマイページの認証へ送り、認証後に決済を続行させる。
    // product は 'premium' か 'pdf'。hint は認証画面に埋める入力済みのアドレス。
    start: function (product, lang, hint) {
      if (!window.LJCheckout.available(product)) {
        alert(window.LJCheckout.unavailableMessage());
        return false;
      }
      var email = window.LJCheckoutGuard.verifiedEmail();
      if (email) {
        // Android アプリ内は Play 課金（ストア規約）。完了後はページを再読み込みして権限を反映する。
        var play = window.LJPlayBilling;
        if (play && play.supported()) {
          play.buy(product, email).then(function () {
            window.location.reload();
          }).catch(function (err) {
            if (err && err.name === 'AbortError') return;
            alert((window.LJ_I18N && window.LJ_I18N.playError) || 'Purchase failed. Please try again.');
          });
          return true;
        }
        window.open(window.LJCheckout.checkoutUrlFor(product, email), '_blank');
        return true;
      }
      var url = '/' + lang + '/mypage?next=checkout&product=' + encodeURIComponent(product);
      if (hint) url += '&hint=' + encodeURIComponent(hint);
      window.location.href = url;
      return false;
    }
  };
})();
