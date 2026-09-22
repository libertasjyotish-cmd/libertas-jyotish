// 「今日の空」ウィジェット: /api/today の共通データから月相・ティティ・ナクシャトラと
// 南インド式トランジット図を SVG で描く。データが取れない場合は枠ごと非表示にする。
(function () {
  const root = document.getElementById('today-sky');
  if (!root) return;
  const lang = (window.LJ_I18N && window.LJ_I18N.lang) || document.documentElement.lang || 'ja';
  const ABBR = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };
  // 南インド式: 魚座を左上に固定し、時計回りに 12 星座を配置する
  const CELL = [[1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0]];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function moonSvg(elong) {
    const r = 44; const c = 50;
    const e = ((elong % 360) + 360) % 360;
    const rx = Math.abs(Math.cos(e * Math.PI / 180)) * r;
    const waxing = e < 180;
    let lit;
    if (e < 1 || e > 359) {
      lit = '';
    } else if (Math.abs(e - 180) < 1) {
      lit = `<circle cx="${c}" cy="${c}" r="${r}" fill="url(#lj-moon-lit)"/>`;
    } else {
      const outerSweep = waxing ? 1 : 0;
      const bulgeRight = (waxing && e < 90) || (!waxing && e < 270);
      const innerSweep = bulgeRight ? 0 : 1;
      lit = `<path d="M${c},${c - r} A${r},${r} 0 0 ${outerSweep} ${c},${c + r} A${rx.toFixed(2)},${r} 0 0 ${innerSweep} ${c},${c - r}Z" fill="url(#lj-moon-lit)"/>`;
    }
    return `<svg viewBox="0 0 100 100" role="img" aria-hidden="true">
<defs><radialGradient id="lj-moon-lit" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fff9e3"/><stop offset="1" stop-color="#e2c77a"/></radialGradient></defs>
<circle cx="${c}" cy="${c}" r="${r}" fill="#1c2a3a" stroke="rgba(232,199,102,0.35)" stroke-width="1"/>
${lit}
<circle cx="38" cy="40" r="5" fill="rgba(0,0,0,0.08)"/><circle cx="60" cy="58" r="7" fill="rgba(0,0,0,0.07)"/><circle cx="48" cy="70" r="3.5" fill="rgba(0,0,0,0.08)"/>
</svg>`;
  }

  function chartSvg(d) {
    const size = 72; const pad = 2;
    const bySign = {};
    d.planets.forEach((p) => { (bySign[p.sign] = bySign[p.sign] || []).push(p); });
    let out = `<svg viewBox="0 0 ${size * 4 + pad * 2} ${size * 4 + pad * 2}" role="img" aria-label="${esc(d.text.chart)}">`;
    for (let s = 0; s < 12; s++) {
      const [cx, cy] = CELL[s];
      const x = pad + cx * size; const y = pad + cy * size;
      const isMoon = s === d.moonSign.index;
      const good = d.moonNote.goodSigns.includes(s);
      const fill = isMoon ? 'rgba(232,199,102,0.22)' : good ? 'rgba(232,199,102,0.07)' : 'rgba(255,255,255,0.02)';
      out += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}" stroke="rgba(232,199,102,0.45)" stroke-width="1"/>`;
      out += `<text x="${x + 4}" y="${y + 11}" font-size="7.5" fill="rgba(243,233,210,0.6)">${esc(d.signs[s])}</text>`;
      const list = bySign[s] || [];
      list.forEach((p, i) => {
        const col = i % 3; const row = Math.floor(i / 3);
        const px = x + 8 + col * 21; const py = y + 30 + row * 18;
        const color = p.key === 'Moon' ? '#fff8e6' : p.entered ? '#ffd76a' : '#e8c766';
        const weight = p.entered || p.key === 'Moon' ? '700' : '400';
        out += `<text x="${px}" y="${py}" font-size="11" font-weight="${weight}" fill="${color}" font-family="Cinzel, serif">${ABBR[p.key]}${p.retro ? '<tspan font-size="7" dy="-4">R</tspan>' : ''}</text>`;
        if (p.entered) out += `<circle cx="${px + 7}" cy="${py + 5}" r="1.8" fill="#ffd76a"><animate attributeName="opacity" values="1;0.2;1" dur="2.4s" repeatCount="indefinite"/></circle>`;
      });
    }
    // 中央の空白 4 マスにロゴ的な装飾
    const c = pad + size * 2;
    out += `<circle cx="${c}" cy="${c}" r="${size * 0.55}" fill="none" stroke="rgba(232,199,102,0.25)" stroke-width="0.8"/>`;
    out += `<circle cx="${c}" cy="${c}" r="${size * 0.32}" fill="none" stroke="rgba(232,199,102,0.18)" stroke-width="0.6"/>`;
    out += `<text x="${c}" y="${c + 4}" text-anchor="middle" font-size="9" fill="rgba(232,199,102,0.7)" font-family="Cinzel, serif">${esc(d.vara.weekday)}</text>`;
    out += '</svg>';
    return out;
  }

  function render(d) {
    const legend = d.planets.map((p) => `<span><b>${ABBR[p.key]}</b> ${esc(p.name)}${p.retro ? ` (${esc(d.text.retro)})` : ''}${p.entered ? ` ✦ ${esc(d.text.entered)}` : ''}</span>`).join('');
    const time = new Date(d.at).toLocaleString(lang === 'ja' ? 'ja-JP' : lang, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    root.innerHTML = `
<div class="today-sky__head">
  <h2 class="today-sky__title">${esc(d.text.title)}</h2>
  <span class="today-sky__small">${esc(d.vara.weekday)} · ${esc(d.text.vara)}: ${esc(d.vara.lord)}</span>
  <p class="today-sky__sub">${esc(d.text.subtitle)}</p>
</div>
<div class="today-sky__grid">
  <div class="today-sky__panel">
    <div class="today-sky__moon">
      ${moonSvg(d.moonPhase.elongation)}
      <div>
        <div class="today-sky__label">${esc(d.text.tithi)}</div>
        <div class="today-sky__value">${esc(d.moonPhase.tithiName)}</div>
        <div class="today-sky__small">${esc(d.moonPhase.paksha)} · ${Math.round(d.moonPhase.illumination * 100)}%</div>
        <div class="today-sky__small">${esc(d.moonSign.text)}</div>
      </div>
    </div>
    <div class="today-sky__row">
      <div class="today-sky__label">${esc(d.text.nakshatra)}</div>
      <div class="today-sky__value">${esc(d.nakshatra.name)} <span class="today-sky__small">(${d.nakshatra.index}/27)</span></div>
      <div class="today-sky__small">${esc(d.text.deity)}: ${esc(d.nakshatra.deity)} · ${esc(d.text.symbol)}: ${esc(d.nakshatra.symbol)}</div>
    </div>
  </div>
  <div class="today-sky__panel today-sky__chart">
    <div class="today-sky__chart-title">${esc(d.text.chart)}</div>
    ${chartSvg(d)}
    <div class="today-sky__legend">${legend}</div>
  </div>
</div>
<p class="today-sky__note"><strong>${esc(d.moonNote.good)}</strong><br>${esc(d.moonNote.sensitive)}</p>
<p class="today-sky__meta"><span>${esc(d.text.updated.replace('{time}', time))}</span><span>${esc(d.text.source)}</span></p>
<p class="today-sky__basis">${esc(d.text.basis || '')}</p>`;
    root.hidden = false;
  }

  fetch(`/api/today?lang=${encodeURIComponent(lang)}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(render)
    .catch(() => { root.hidden = true; });
})();
