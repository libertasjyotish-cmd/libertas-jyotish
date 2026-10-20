// 購入前の本人確認（メール認証）と決済への遷移をまとめた共通ヘルパー。
// KOMOJU（日本）は会員権を購入時のメールで紐づけるため認証必須。
// Gumroad は決済画面でメールを取り、Webhook でそのメールに紐づけるので認証なしで直行する。
(function () {
  var VERIFIED_KEY = 'lj_email_verified';

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  // ページ読み込み時に Play 課金の可否を先に判定しておく（クリック時に同期で判断し、ポップアップブロックを避ける）。
  function preloadPlay() {
    var play = window.LJPlayBilling;
    if (!play || !play.supported()) return;
    play.available().then(function (ok) { window.LJCheckoutGuard._playChecked = ok ? 'play' : 'web'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preloadPlay); else preloadPlay();

  window.LJCheckoutGuard = {
    verifiedKey: VERIFIED_KEY,
    // 有効期限内の本人確認セッション（Play 購入の紐づけ /api/play-verify に必須）があるか
    hasSession: function () {
      var expiry = parseInt(String(localStorage.getItem('lj_session') || '').split(':')[0], 10);
      return Number.isFinite(expiry) && expiry > Date.now();
    },
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
      // Android アプリ内は Play 課金（ストア規約）。購入を会員に紐づけるため認証済みメールが必要。
      var play = window.LJPlayBilling;
      if (play && play.supported() && !window.LJCheckoutGuard._playChecked) {
        // ブラウザでも API の存在だけは申告されるため、実際に初期化できた時だけ Play 課金を使う。
        play.available().then(function (ok) {
          window.LJCheckoutGuard._playChecked = ok ? 'play' : 'web';
          window.LJCheckoutGuard.start(product, lang, hint);
        });
        return true;
      }
      var viaPlay = window.LJCheckoutGuard._playChecked === 'play';
      // Play 購入はセッションが無いと会員に紐づけられない（支払いだけ済んで反映されない）ので、先にログインし直してもらう
      if (viaPlay && !window.LJCheckoutGuard.hasSession()) email = '';
      if (!email && !viaPlay && !window.LJCheckout.requiresVerifiedEmail()) {
        email = hint || localStorage.getItem('lj_user_email') || '';
        window.open(window.LJCheckout.checkoutUrlFor(product, email), '_blank');
        return true;
      }
      if (email) {
        // 完了後はページを再読み込みして権限を反映する。
        if (viaPlay) {
          play.buy(product, email).then(function (data) {
            if (data && data.pending) alert((window.LJ_I18N && window.LJ_I18N.playPending) || 'Purchase received.');
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
