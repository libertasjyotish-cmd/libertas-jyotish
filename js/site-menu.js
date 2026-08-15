// 全ページ共通のヘッダーを組み立てる。
// <header class="site-header" data-site-header></header> があれば中身を差し込む。
// メニュー項目の追加はこの LINKS だけを編集すれば全ページに反映される。
// 文言は各ページが埋め込む window.LJ_I18N（locales/<lang>.json 由来）から取る。
(function () {
  const FALLBACK = {
    lang: 'ja',
    menu: {
      top: 'トップ', free: '無料診断', about: 'Libertas Jyotishとは',
      report: '完全鑑定書（買い切り）', calendar: '年間運勢カレンダー', calendarNote: '準備中',
      mypage: '会員マイページ', legal: '特定商取引法・利用規約',
      toggleLabel: 'メニュー', navLabel: 'サイトメニュー'
    }
  };
  const i18n = window.LJ_I18N || FALLBACK;
  const t = Object.assign({}, FALLBACK.menu, i18n.menu);
  const lang = i18n.lang || FALLBACK.lang;
  const home = '/' + lang;

  const LINKS = [
    { href: home, label: t.top },
    { href: home + '#form-area', label: t.free },
    { href: home + '#about', label: t.about },
    { href: home + '/pdf-purchase', label: t.report },
    { href: home + '/calendar', label: t.calendar, note: t.calendarNote },
    { divider: true },
    { href: home + '/mypage', label: t.mypage },
    { href: home + '/legal', label: t.legal }
  ];

  function currentPath() {
    return window.location.pathname.replace(/\/$/, '') || home;
  }

  function render(header) {
    const path = currentPath();

    const logo = document.createElement('a');
    logo.className = 'lj-logo';
    logo.href = home;
    logo.innerHTML = '<img src="/img/libertas-logo.png" alt="Libertas Jyotish"><span>Libertas Jyotish</span>';

    const right = document.createElement('div');
    right.className = 'lj-header-right';

    const member = document.createElement('a');
    member.className = 'lj-btn-member';
    member.href = home + '/mypage';
    member.textContent = t.mypage;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'lj-menu-toggle';
    toggle.setAttribute('aria-label', t.toggleLabel);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'lj-menu');
    toggle.innerHTML = '<span></span><span></span><span></span>';

    right.appendChild(member);
    right.appendChild(toggle);

    const menu = document.createElement('nav');
    menu.id = 'lj-menu';
    menu.className = 'lj-menu';
    menu.hidden = true;
    menu.setAttribute('aria-label', t.navLabel);

    for (const item of LINKS) {
      if (item.divider) {
        const hr = document.createElement('div');
        hr.className = 'lj-menu-divider';
        menu.appendChild(hr);
        continue;
      }
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      if (item.note) {
        const note = document.createElement('span');
        note.className = 'lj-menu-note';
        note.textContent = lang === 'ja' ? `（${item.note}）` : ` (${item.note})`;
        a.appendChild(note);
      }
      if (item.href.split('#')[0] === path) a.classList.add('is-current');
      menu.appendChild(a);
    }

    header.textContent = '';
    header.appendChild(logo);
    header.appendChild(right);
    document.body.appendChild(menu);

    function close() {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !menu.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  function init() {
    const header = document.querySelector('[data-site-header]');
    if (header) render(header);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
