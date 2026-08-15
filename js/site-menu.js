// 全ページ共通のヘッダーを組み立てる。
// <header class="site-header" data-site-header></header> があれば中身を差し込む。
// メニュー項目の追加はこの LINKS だけを編集すれば全ページに反映される。
(function () {
  const LINKS = [
    { href: '/ja', label: 'トップ' },
    { href: '/ja#form-area', label: '無料診断' },
    { href: '/ja#about', label: 'Libertas Jyotishとは' },
    { href: '/ja/pdf-purchase', label: '完全鑑定書（買い切り）' },
    { href: '/ja/calendar', label: '年間運勢カレンダー', note: '準備中' },
    { divider: true },
    { href: '/ja/mypage', label: '会員マイページ' },
    { href: '/ja/legal', label: '特定商取引法・利用規約' }
  ];

  function currentPath() {
    return window.location.pathname.replace(/\/$/, '') || '/ja';
  }

  function render(header) {
    const path = currentPath();

    const logo = document.createElement('a');
    logo.className = 'lj-logo';
    logo.href = '/ja';
    logo.innerHTML = '<img src="/img/libertas-logo.png" alt="Libertas Jyotish"><span>Libertas Jyotish</span>';

    const right = document.createElement('div');
    right.className = 'lj-header-right';

    const member = document.createElement('a');
    member.className = 'lj-btn-member';
    member.href = '/ja/mypage';
    member.textContent = '会員マイページ';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'lj-menu-toggle';
    toggle.setAttribute('aria-label', 'メニュー');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'lj-menu');
    toggle.innerHTML = '<span></span><span></span><span></span>';

    right.appendChild(member);
    right.appendChild(toggle);

    const menu = document.createElement('nav');
    menu.id = 'lj-menu';
    menu.className = 'lj-menu';
    menu.hidden = true;
    menu.setAttribute('aria-label', 'サイトメニュー');

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
        note.textContent = `（${item.note}）`;
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
