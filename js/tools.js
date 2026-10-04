// 単機能ツール（月星座・ナクシャトラ・ダシャー）のフォーム送信と結果表示。
// 計算は /api/chart-basics（鑑定書と同じ Prokerala 層）に任せ、ここでは表示項目だけを選ぶ。
(function () {
  var config = window.LJ_TOOLS;
  var form = document.getElementById('tool-form');
  if (!config || !form) return;

  var lang = (window.LJ_I18N && window.LJ_I18N.lang) || document.documentElement.lang || 'ja';
  var tool = String(config.tool || '').replace(/^tools\//, '');
  var submit = document.getElementById('tool-submit');
  var status = document.getElementById('tool-status');
  var result = document.getElementById('tool-result');
  var values = document.getElementById('tool-values');
  var geoNote = document.getElementById('tool-geo');
  var guideNote = document.getElementById('tool-guide');

  function track(name, params) {
    if (typeof window.LJTrack === 'function') {
      var payload = { tool: tool };
      if (params) {
        for (var key in params) {
          if (Object.prototype.hasOwnProperty.call(params, key)) payload[key] = params[key];
        }
      }
      window.LJTrack(name, payload);
    }
  }

  function fill(text, vars) {
    return String(text).replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
    });
  }

  function showStatus(message, isError) {
    status.textContent = message;
    status.hidden = !message;
    if (isError) status.classList.add('is-error');
    else status.classList.remove('is-error');
  }

  function addRow(label, value, period) {
    if (!value) return;
    var row = document.createElement('div');
    var dt = document.createElement('dt');
    dt.textContent = label;
    var dd = document.createElement('dd');
    dd.textContent = value;
    if (period) {
      var span = document.createElement('span');
      span.className = 'tool-period';
      span.textContent = period;
      dd.appendChild(span);
    }
    row.appendChild(dt);
    row.appendChild(dd);
    values.appendChild(row);
  }

  function periodText(entry) {
    if (!entry || !entry.start || !entry.end) return '';
    return fill(config.period, { start: entry.start, end: entry.end });
  }

  // ツールごとに、そのページの検索意図に対応する項目だけを出す。
  function renderValues(data) {
    var labels = config.labels;
    if (tool === 'moon-sign') {
      addRow(labels.moonSign, data.moonSign);
      addRow(labels.sunSign, data.sunSign);
      addRow(labels.lagna, data.lagna);
    } else if (tool === 'nakshatra') {
      addRow(labels.nakshatra, data.nakshatra);
      if (data.nakshatraPada) addRow(labels.pada, fill(config.padaValue, { pada: data.nakshatraPada }));
      if (data.nakshatraLord) addRow(labels.nakshatraLord, data.nakshatraLord.name);
      addRow(labels.moonSign, data.moonSign);
    } else {
      if (data.dasha) addRow(labels.dasha, data.dasha.name, periodText(data.dasha));
      if (data.nextDasha) addRow(labels.nextDasha, data.nextDasha.name, periodText(data.nextDasha));
      addRow(labels.moonSign, data.moonSign);
    }
  }

  // 結果から、対応する解説ページ（27ナクシャトラ／9惑星期）へ送る。
  function renderGuide(data) {
    var slug = null;
    var name = '';
    if (tool === 'nakshatra' && data.nakshatraSlug) {
      slug = 'nakshatra-' + data.nakshatraSlug;
      name = data.nakshatra;
    } else if (tool === 'dasha' && data.dasha && data.dasha.slug) {
      slug = 'dasha-' + data.dasha.slug;
      name = data.dasha.name;
    }
    if (!slug) {
      guideNote.hidden = true;
      return;
    }
    var link = document.createElement('a');
    link.href = '/' + lang + '/guide/' + slug;
    link.textContent = fill(config.guideLink, { name: name });
    link.addEventListener('click', function () {
      track('tool_guide_click', { guide: slug });
    });
    guideNote.textContent = '';
    guideNote.appendChild(link);
    guideNote.hidden = false;
  }

  function errorMessage(statusCode, code) {
    if (statusCode === 422 || code === 'place_not_found') return config.errors.placeNotFound;
    if (code === 'invalid_date') return config.errors.date;
    if (code === 'invalid_place') return config.errors.place;
    return config.errors.generic;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var dob = form.elements.date.value;
    var tob = form.elements.time.value;
    var place = form.elements.place.value.trim();

    if (!dob) return showStatus(config.errors.date, true);
    if (!place) return showStatus(config.errors.place, true);

    submit.disabled = true;
    showStatus(config.submitting, false);
    track('tool_submit', { time_provided: tob ? 1 : 0 });

    fetch('/api/chart-basics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dob: dob, tob: tob, place: place, lang: lang })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).then(function (res) {
      if (!res.ok) {
        showStatus(errorMessage(res.status, res.data && res.data.error), true);
        track('tool_error', { reason: (res.data && res.data.error) || String(res.status) });
        return;
      }
      values.textContent = '';
      renderValues(res.data);
      renderGuide(res.data);
      if (res.data.geo && res.data.geo.notice) {
        geoNote.textContent = res.data.geo.notice;
        geoNote.hidden = false;
      } else {
        geoNote.hidden = true;
      }
      showStatus('', false);
      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      track('tool_result', { time_provided: res.data.timeProvided ? 1 : 0 });
    }).catch(function () {
      showStatus(config.errors.generic, true);
      track('tool_error', { reason: 'network' });
    }).then(function () {
      submit.disabled = false;
    });
  });

  var ctas = document.querySelectorAll('[data-tool-cta]');
  for (var i = 0; i < ctas.length; i += 1) {
    (function (el) {
      el.addEventListener('click', function () {
        track('tool_cta_click', { target: el.getAttribute('data-tool-cta') });
      });
    }(ctas[i]));
  }

  track('tool_view');
}());
