// 生まれ宿（ナクシャトラ）のシェア用カード（1080×1920）をブラウザで描き、スマホは共有画面、PCは画像保存にする。
// 台紙は img/share/scroll-frame.webp（scripts/share-frame.html）、文字は data/share-card/<lang>.json（scripts/build-share-cards.mjs）。
window.LJShareCard = (function () {
  const W = 1080;
  const GOLD = '#8B6B1B';
  const cache = {};
  const loadImg = (src) => new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = src; });
  const loadData = (lang) => cache[lang] || (cache[lang] = fetch(`/data/share-card/${lang}.json`).then((r) => { if (!r.ok) throw new Error('share data'); return r.json(); }));

  function fit(ctx, text, size, weight, family, maxW) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; } while (ctx.measureText(text).width > maxW && (s -= 2) > 16);
    return s;
  }

  // 改行指定（\n）があればそれを使い、なければ幅で折り返す（空白のない言語は1文字ずつ）
  function wrap(ctx, text, maxW) {
    const out = [];
    text.split('\n').forEach((para) => {
      const spaced = /\s/.test(para.trim());
      const units = spaced ? para.split(/\s+/) : Array.from(para);
      let line = '';
      units.forEach((u) => {
        const next = line ? (spaced ? `${line} ${u}` : line + u) : u;
        if (line && ctx.measureText(next).width > maxW) { out.push(line); line = u; } else line = next;
      });
      if (line) out.push(line);
    });
    return out;
  }

  async function render(opts) {
    const { slug, lang, strings } = opts;
    const family = getComputedStyle(document.body).fontFamily || 'serif';
    const [frame, med, data] = await Promise.all([loadImg('/img/share/scroll-frame.webp'), loadImg(`/img/nakshatra/${slug}.webp`), loadData(lang)]);
    const item = data[slug];
    if (!item) throw new Error('unknown nakshatra');
    // Web フォントは文字の範囲ごとに分かれて届くので、描く文字を渡して読み込ませる
    const glyphs = [strings.label, strings.index, strings.lord, strings.cta, item.name, item.lord, item.range, item.trait].join('');
    try { await Promise.race([Promise.all([document.fonts.load(`700 96px ${family}`, glyphs), document.fonts.load(`400 36px ${family}`, glyphs), document.fonts.load("600 34px 'Cinzel'", 'LIBERTAS-JYOTISH.COM')]), new Promise((r) => setTimeout(r, 4000))]); } catch (e) {}

    const c = document.createElement('canvas');
    c.width = W; c.height = 1920;
    const ctx = c.getContext('2d');
    ctx.drawImage(frame, 0, 0, W, 1920);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (lang === 'ar') ctx.direction = 'rtl';
    const text = (t, y, size, color, weight = 400, maxW = 760) => {
      fit(ctx, t, size, weight, family, maxW);
      ctx.fillStyle = color;
      ctx.fillText(t, W / 2, y);
    };

    text(strings.label, 345, 36, '#5a4632');

    ctx.save();
    ctx.shadowColor = 'rgba(90,52,18,.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    const scale = Math.min(580 / med.naturalWidth, 600 / med.naturalHeight);
    const mw = med.naturalWidth * scale, mh = med.naturalHeight * scale;
    ctx.drawImage(med, (W - mw) / 2, 405 + (600 - mh) / 2, mw, mh);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = '#fff8e0'; ctx.shadowOffsetY = 1;
    text(item.name, 1035, 96, '#3a2a1c', 700);
    ctx.restore();
    text(strings.index.replace('{n}', item.no), 1165, 38, GOLD, 600);

    const r = 7.5, gap = 8, total = 27 * 15 + 26 * gap;
    for (let i = 0; i < 27; i++) {
      const n = lang === 'ar' ? 26 - i : i;
      const x = (W - total) / 2 + i * (15 + gap) + r, y = 1236;
      ctx.beginPath();
      if (n === item.no - 1) {
        ctx.fillStyle = 'rgba(139,107,27,.25)'; ctx.arc(x, y, r * 1.35 + 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.fillStyle = GOLD; ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
      } else {
        ctx.fillStyle = 'rgba(139,107,27,.28)'; ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    text(`${strings.lord.replace('{lord}', item.lord)}　|　${item.range}`, 1275, 32, '#6b5b4a');

    let size = 44, lines;
    do { ctx.font = `400 ${size}px ${family}`; lines = wrap(ctx, item.trait, 700); } while (lines.length > 3 && (size -= 2) > 28);
    const lh = Math.round(size * 1.6), top = 1340, bottom = top + 24 + lines.length * lh + 24;
    ctx.strokeStyle = 'rgba(139,107,27,.5)'; ctx.lineWidth = 1.5;
    [top, bottom].forEach((y) => { ctx.beginPath(); ctx.moveTo(190, y); ctx.lineTo(W - 190, y); ctx.stroke(); });
    ctx.fillStyle = '#2C221E';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, top + 24 + i * lh + (lh - size) / 2));

    const ctaY = Math.max(1555, bottom + 40);
    text(strings.cta, ctaY, 36, '#5a4632');
    ctx.font = "600 34px 'Cinzel', serif";
    ctx.fillStyle = GOLD;
    ctx.fillText('LIBERTAS-JYOTISH.COM', W / 2, ctaY + 52);

    return { canvas: c, item };
  }

  const SITE = 'https://www.libertas-jyotish.com';
  const shareUrl = (opts, source) => `${SITE}/${opts.lang}/guide/nakshatra-${opts.slug}?utm_source=${source}&utm_medium=social`;
  const track = (opts, method) => { if (window.LJTrack) window.LJTrack('share_card', { nakshatra: opts.slug, method, content_language: opts.lang }); };

  // 画像を渡せるのはスマホの共有画面だけ（Instagram・TikTok はここから）。渡せないブラウザでは保存する
  async function share(opts, btn, note) {
    const label = btn ? btn.textContent : '';
    // Instagram・TikTok の画像投稿ではリンクを押せないので、ストーリーズのリンクスタンプ用にコピーしておく
    let copied = Promise.resolve(false);
    if (note && navigator.clipboard && navigator.clipboard.writeText) copied = navigator.clipboard.writeText(shareUrl(opts, 'share_card')).then(() => true, () => false);
    if (btn) { btn.disabled = true; if (opts.strings.making) btn.textContent = opts.strings.making; btn.style.opacity = '.7'; }
    try {
      const { canvas, item } = await render(opts);
      const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
      const file = new File([blob], `nakshatra-${opts.slug}.png`, { type: 'image/png' });
      const url = shareUrl(opts, 'share_card');
      const message = opts.strings.text.replace('{nak}', item.name);
      let method = 'download';
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        method = 'share';
        try { await navigator.share({ files: [file], text: `${message} ${opts.strings.tags || ''} ${url}` }); } catch (e) { if (e && e.name === 'AbortError') method = 'cancel'; else throw e; }
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      track(opts, method);
      if (note && opts.strings.copied && await copied) { note.textContent = opts.strings.copied; note.hidden = false; }
    } catch (e) {
      if (btn && opts.strings.error) alert(opts.strings.error);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label; btn.style.opacity = ''; }
    }
  }

  // 文とリンクを入れた投稿画面。画像はリンク先（宿の解説ページ）のプレビュー画像として出る
  function intent(target, opts, name) {
    const url = shareUrl(opts, `share_${target}`);
    const text = `${opts.strings.text.replace('{nak}', name)} ${opts.strings.tags || ''}`.trim();
    const q = encodeURIComponent;
    return {
      x: `https://x.com/intent/post?text=${q(text)}&url=${q(url)}`,
      threads: `https://www.threads.net/intent/post?text=${q(`${text} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${q(url)}`,
      line: `https://social-plugins.line.me/lineit/share?url=${q(url)}&text=${q(text)}`
    }[target];
  }

  const PILL = 'display:inline-block; padding:8px 16px; border-radius:999px; border:1px solid rgba(139,107,27,.5); background:#fffaf0; color:#5a4020; font:inherit; font-size:.9em; font-weight:700; text-decoration:none; cursor:pointer;';
  const TARGETS = [['x', 'X'], ['threads', 'Threads'], ['facebook', 'Facebook'], ['line', 'LINE']];

  // el: ボタンを入れる要素。押すとシェア先（X・Threads・Facebook・LINE・画像）を開く
  function attach(el, opts) {
    if (!el || !/^[a-z-]+$/.test(opts.slug || '') || !/^[a-z]{2}$/.test(opts.lang || '')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'share-card-btn';
    btn.textContent = opts.strings.button;
    btn.setAttribute('aria-expanded', 'false');
    btn.style.cssText = 'display:block; margin:10px auto 14px; padding:10px 22px; border-radius:999px; border:1px solid rgba(139,107,27,.6); background:linear-gradient(#fffaf0,#f1e2bf); color:#5a4020; font:inherit; font-weight:700; cursor:pointer; box-shadow:0 2px 6px rgba(90,52,18,.18);';

    const panel = document.createElement('div');
    panel.className = 'share-card-targets';
    panel.hidden = true;
    panel.style.cssText = 'margin:-4px auto 16px; text-align:center;';
    if (opts.strings.choose) {
      const p = document.createElement('p');
      p.textContent = opts.strings.choose;
      p.style.cssText = 'margin:0 0 8px; font-size:.85em; color:#6b5b4a;';
      panel.appendChild(p);
    }
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; flex-wrap:wrap; justify-content:center; gap:8px;';
    panel.appendChild(row);

    // リンクは押した瞬間に開く必要があるので（ポップアップ扱いを避ける）、宿の名前を先に読み込んで href を作っておく
    loadData(opts.lang).then((data) => {
      const item = data[opts.slug];
      if (!item) return;
      TARGETS.forEach(([target, name]) => {
        const a = document.createElement('a');
        a.href = intent(target, opts, item.name);
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = name;
        a.style.cssText = PILL;
        a.addEventListener('click', () => track(opts, target));
        row.appendChild(a);
      });
      const img = document.createElement('button');
      img.type = 'button';
      img.textContent = opts.strings.image || opts.strings.button;
      img.style.cssText = PILL;
      const note = document.createElement('p');
      note.hidden = true;
      note.setAttribute('role', 'status');
      note.style.cssText = 'margin:8px 0 0; font-size:.85em; color:#6b5b4a;';
      img.addEventListener('click', () => share(opts, img, note));
      row.appendChild(img);
      panel.appendChild(note);
    }).catch(() => {});

    btn.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', String(!panel.hidden));
    });
    el.replaceChildren(btn, panel);
    el.hidden = false;
  }

  return { render, share, attach };
})();
