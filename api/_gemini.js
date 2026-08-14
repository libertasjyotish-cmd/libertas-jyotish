// Gemini 呼び出しの共通処理（CommonJS）。診断API・鑑定書APIの双方から利用する。
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// キーで利用可能な generateContent 対応モデルを取得し、新しい flash 系を優先して並べる。
async function listGeminiModels(apiKey) {
  const preset = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  try {
    const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`, {}, 8000);
    if (!res.ok) {
      console.error(`Gemini ListModels failed with status ${res.status}`);
      return preset;
    }
    const data = await res.json();
    const names = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter((n) => n.startsWith('gemini') && !n.includes('thinking') && !n.includes('image') && !n.includes('tts'));

    if (!names.length) return preset;

    const score = (n) => (n.includes('flash') ? 0 : 1) + (n.includes('lite') ? 0.5 : 0) + (/\d/.test(n) ? 0 : 0.25);
    names.sort((a, b) => score(a) - score(b) || b.localeCompare(a));
    console.log('Gemini available models (top):', names.slice(0, 5).join(', '));
    return names.slice(0, 5);
  } catch (e) {
    console.error('Gemini ListModels error:', e);
    return preset;
  }
}

// 利用可能なモデルを順に試して JSON を1本生成する。失敗理由は秘密情報を含まない区分だけ返す。
async function generateWithGemini(apiKey, models, promptText, timeoutMs) {
  let reason = 'gemini_error';
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 思考（thinking）が既定で有効なモデルは応答が数十秒に伸びる。鑑定文の生成に長考は不要なので最小化する。
    // 設定名はモデル世代で異なり、未対応のキーを送ると 400 になるため、その場合は無指定で再試行する。
    const thinkingConfigs = [];
    if (/^gemini-3/.test(model)) thinkingConfigs.push({ thinkingConfig: { thinkingLevel: 'low' } });
    else if (/^gemini-2\.5/.test(model)) thinkingConfigs.push({ thinkingConfig: { thinkingBudget: 0 } });
    thinkingConfigs.push({});

    try {
      let res = null;
      for (const extraConfig of thinkingConfigs) {
        res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 1.0, ...extraConfig }
          })
        }, timeoutMs);
        if (res.status !== 400) break;
        console.warn(`Gemini model ${model} rejected generationConfig ${JSON.stringify(extraConfig)}, retrying without it.`);
      }

      if (!res.ok) {
        reason = `gemini_${res.status}`;
        console.error(`Gemini model ${model} failed with status ${res.status}`);
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        reason = 'gemini_empty_response';
        continue;
      }
      return { json: JSON.parse(rawText.trim()), model, reason: null };
    } catch (err) {
      reason = err?.name === 'AbortError' ? 'gemini_timeout' : 'gemini_error';
      console.error(`Gemini model ${model} error:`, err?.message);
    }
  }
  return { json: null, model: null, reason };
}

module.exports = { listGeminiModels, generateWithGemini };
