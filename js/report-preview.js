// 鑑定書（年間運勢・仕事・カルマ・相性）の購入前無料プレビュー。日本語ページのみで読み込む。
// 申し込みフォームの入力で /api/report-preview を呼び、PDF と同じ紙面（表紙・見取り図・目次）で見せる。
(function () {
  var cta = document.getElementById('preview-cta');
  if (!cta) return;
  var product = cta.getAttribute('data-product');
  var lang = cta.getAttribute('data-lang') || 'ja';
  var form = document.getElementById('order-form');
  var box = document.getElementById('preview-box');
  var btn = document.getElementById('btn-preview');
  var FORM_KEY = 'lj_report_preview_form';
  var SUB = { yearly: '年間運勢鑑定書（今後 12 か月）', career: '仕事運・金運・天職 鑑定書', karma: 'カルマとダルマ ― 今世の天命', compat: '相性鑑定書' };
  var CAREER_LABELS = { essence: 'この出生図が語る働き方', selfMatch: 'あなたにとっての自己一致', callingType: '天職の型', gifts: '仕事で武器になる資質', moneyLine: '金運の見取り図', stance: '仕事とお金への基本姿勢' };
  var ERR = {
    fields: '生年月日・出生時刻（不明の場合はチェック）・出生地を入力してください。',
    email: 'メールアドレスを正しく入力してください。',
    daily_limit: '本日の無料プレビューの受付は終了しました。明日またお試しください。',
    email_limit: 'このメールアドレスでの本日の無料プレビューは上限に達しました。明日またお試しください。',
    unknown_birthplace: '出生地が見つかりませんでした。市区町村名まで入力してください。',
    other: 'ただいま混み合っています。少し時間をおいてお試しください。',
    network: '読み解きの途中で接続が切れました。もう一度ボタンを押してください。'
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function para(t) { return t ? String(t).split(/\n+/).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') : ''; }
  function list(arr) { return '<ul>' + arr.filter(Boolean).map(function (v) { return '<li>' + esc(v) + '</li>'; }).join('') + '</ul>'; }

  // pdf-report.html の genericValue と同じ描き方
  function value(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'string') return para(v);
    if (Array.isArray(v)) {
      if (!v.length) return '';
      if (typeof v[0] === 'string') return list(v);
      return v.map(function (item) {
        var head = item.month || item.name || item.planet || item.label || item.mark || item.feature || item.step || '';
        var sub = item.phase || item.theme || item.title || item.kind || item.where || '';
        var used = ['month', 'name', 'planet', 'label', 'mark', 'feature', 'step', 'phase', 'theme', 'title', 'kind', 'where', 'todo'];
        var body = Object.keys(item).filter(function (k) { return used.indexOf(k) < 0 && typeof item[k] === 'string' && item[k]; })
          .map(function (k) { return para(item[k]); }).join('');
        return '<div class="fact"><strong>' + esc(head) + '</strong>' + (sub ? '　' + esc(sub) : '') + '</div>' + body;
      }).join('');
    }
    if (typeof v === 'object') {
      var out = v.heading ? '<h3>' + esc(v.heading) + '</h3>' : '';
      if (v.lead) out += '<p class="lead-note">' + esc(v.lead) + '</p>';
      Object.keys(v).forEach(function (k) { if (k !== 'heading' && k !== 'lead') out += value(v[k]); });
      return out;
    }
    return para(String(v));
  }

  var GHOST = 'この配置が示すものと、その理由を、出生図の根拠とともにお伝えします。';
  function maskHtml(locked) {
    return '<div class="pv-mask">' + locked.map(function (label) {
      return '<h3>' + esc(label) + '</h3><p class="pv-ghost" aria-hidden="true">' + GHOST + '</p>';
    }).join('') + '<p class="pv-mask-note">この先は完全版でお読みいただけます</p></div>';
  }

  function summaryPage(s, locked) {
    var html = '<h2 class="chapter-title">' + esc(s.title || '') + '</h2>';
    if (s.catchphrase) html += '<div class="lead">' + esc(s.catchphrase) + '</div>';
    Object.keys(s).forEach(function (k) {
      if (k === 'title' || k === 'catchphrase') return;
      if (product === 'career' && CAREER_LABELS[k]) html += '<h3>' + esc(CAREER_LABELS[k]) + '</h3>';
      html += value(s[k]);
    });
    return '<section class="pv-page">' + html + (locked && locked.length ? maskHtml(locked) : '') + '</section>';
  }

  function personLine(p) {
    return esc(p.dob) + ' ' + esc(p.tob) + (p.city ? ' · ' + esc(p.city) : '') + '<br>ラグナ　' + esc(p.lagna) + '　／　月　' + esc(p.moon) + '　／　' + esc(p.nakshatra);
  }

  function coverPage(c) {
    var persons = c.persons || [];
    var owner = product === 'compat' && persons.length > 1
      ? '<strong>A</strong> ' + personLine(persons[0]) + '<br><br><strong>B</strong> ' + personLine(persons[1])
      : (c.period ? esc(c.period.start) + ' — ' + esc(c.period.end) + '<br>' : '') + (persons[0] ? personLine(persons[0]) : '');
    return '<section class="pv-page pv-cover"><div><img src="/img/libertas-logo.png" alt="Libertas Jyotish"></div>' +
      '<div><h2>Libertas Jyotish</h2><div class="sub">' + esc(SUB[product]) + '</div></div><div class="owner">' + owner + '</div></section>';
  }

  function tocPage(toc) {
    var items = toc.map(function (t, i) { return i === 0 ? '<li class="open">' + esc(t) + '<span>← 無料公開中</span></li>' : '<li>' + esc(t) + '</li>'; }).join('');
    return '<section class="pv-page"><h2 class="chapter-title">目次</h2><ul class="toc">' + items + '</ul>' +
      '<div class="preview-rest-lock"><button type="button" class="pc-btn" id="btn-preview-buy">続きを読む（完全版を申し込む）</button></div></section>';
  }

  function show(html) {
    box.innerHTML = html;
    box.style.display = 'block';
    var buy = document.getElementById('btn-preview-buy');
    if (buy) buy.addEventListener('click', function () { document.getElementById('btn-order').click(); });
  }

  function read() {
    var data = { product: product, lang: lang };
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    data.tob_unknown = document.getElementById('f-tob-unknown').checked;
    var news = document.getElementById('preview-news');
    data.newsletter = news ? news.checked : false;
    var cbB = document.getElementById('f-tob-unknown-b');
    if (cbB) data.tob_unknown_b = cbB.checked;
    return data;
  }

  function restore() {
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(FORM_KEY) || 'null'); } catch (e) { saved = null; }
    if (!saved || saved.product !== product) return;
    Object.keys(saved).forEach(function (k) {
      var el = form.elements[k];
      if (!el) return;
      if (el.length && el[0] && el[0].type === 'radio') { for (var i = 0; i < el.length; i++) el[i].checked = el[i].value === saved[k]; } else if (el.type !== 'checkbox') el.value = saved[k];
    });
    var news = document.getElementById('preview-news');
    if (news && typeof saved.newsletter === 'boolean') news.checked = saved.newsletter;
    [['f-tob-unknown', 'tob_unknown', 'f-tob'], ['f-tob-unknown-b', 'tob_unknown_b', 'f-tob-b']].forEach(function (x) {
      var cb = document.getElementById(x[0]);
      if (cb && saved[x[1]]) { cb.checked = true; document.getElementById(x[2]).disabled = true; }
    });
  }

  function hasSession() {
    var expiry = parseInt(String(localStorage.getItem('lj_session') || '').split(':')[0], 10);
    return Number.isFinite(expiry) && expiry > Date.now();
  }

  function toAuth(data) {
    sessionStorage.setItem(FORM_KEY, JSON.stringify(data));
    location.href = '/' + lang + '/mypage?next=report-preview&product=' + product + '&hint=' + encodeURIComponent(data.email);
  }

  function run() {
    var data = read();
    var err = document.getElementById('form-error');
    err.textContent = '';
    if (!data.email || data.email.indexOf('@') < 0) { err.textContent = ERR.email; return; }
    var missingB = product === 'compat' && (!data.dob_b || !data.place_b || (!data.tob_unknown_b && !data.tob_b));
    if (!data.dob || !data.place || (!data.tob_unknown && !data.tob) || missingB) { err.textContent = ERR.fields; return; }
    localStorage.setItem('lj_user_email', data.email);
    // セッションが別のアドレスのものなら API が 401 を返し、本人確認へ回す
    if (!hasSession()) { toAuth(data); return; }
    data.email = String(data.email).trim().toLowerCase();
    data.session = localStorage.getItem('lj_session') || '';
    btn.disabled = true;
    show('<p class="preview-status">あなたの出生図を読み解いています（1分ほどかかります）…</p>');
    fetch('/api/report-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.status === 401) { localStorage.removeItem('lj_session'); delete data.session; toAuth(data); return; }
        if (res.ok && res.j.summary) {
          sessionStorage.removeItem(FORM_KEY);
          show('<p class="pv-label">あなたの鑑定書（PDF）より、一部を無料公開</p><div class="pv-book">' +
            coverPage(res.j.cover || {}) + summaryPage(res.j.summary, res.j.locked) + tocPage(res.j.toc || []) + '</div>');
          cta.style.display = 'none';
          box.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        show('<p class="preview-status">' + esc(ERR[res.j.error] || (res.j.error ? ERR.other : ERR.network)) + '</p>');
      })
      .catch(function () { show('<p class="preview-status">' + esc(ERR.network) + '</p>'); })
      .then(function () { btn.disabled = false; });
  }

  if (new URLSearchParams(location.search).get('ordered')) return;
  cta.style.display = 'block';
  btn.addEventListener('click', run);
  if (new URLSearchParams(location.search).get('preview') === '1') {
    restore();
    if (hasSession()) run();
  }
})();
