// 無料診断・マイページのナクシャトラ説明。解説ページ（/<lang>/guide/nakshatra-<slug>）の
// 「内面的な傾向」の節と神話を data/nakshatra-intro/<lang>.json（build-guide が生成）からそのまま表示する。
window.LJNakIntro = {
  fill() {
    document.querySelectorAll('[data-nak-intro]:not([data-filled])').forEach(async (el) => {
      const { nakIntro: slug, lang, linkText, mythTitle } = el.dataset;
      if (!/^[a-z-]+$/.test(slug || '') || !/^[a-z]{2}$/.test(lang || '')) return;
      el.dataset.filled = '1';
      try {
        const res = await fetch(`/data/nakshatra-intro/${lang}.json`);
        const intro = res.ok ? (await res.json())[slug] : null;
        if (!intro) return;
        const heading = document.createElement('p');
        heading.style.cssText = 'font-weight:700; color:var(--color-gold-dark); margin:4px 0 6px;';
        heading.textContent = intro.heading;
        const body = document.createElement('p');
        body.style.cssText = 'color:#4a3e36; line-height:1.7; text-align:justify; margin:0 0 8px;';
        body.textContent = intro.body;
        const link = document.createElement('a');
        link.href = `/${lang}/guide/nakshatra-${slug}`;
        link.textContent = linkText || '';
        link.style.cssText = 'font-size:0.9rem;';
        const parts = [heading, body];
        if (intro.myth) {
          const mythHeading = document.createElement('p');
          mythHeading.style.cssText = heading.style.cssText + ' margin-top:14px;';
          mythHeading.textContent = mythTitle || '';
          const myth = document.createElement('p');
          myth.style.cssText = body.style.cssText;
          myth.textContent = intro.myth;
          parts.push(mythHeading, myth);
        }
        el.replaceChildren(...parts, link);
        el.hidden = false;
      } catch (e) {}
    });
  }
};
