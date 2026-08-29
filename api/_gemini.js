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

// 応答が速いことを実測で確認できている世代を優先する。新しい世代ほど既定の思考時間が長く、
// 鑑定文1本に1分近くかかることがあるため、名前の新しさでは並べない。
const PREFERRED = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
const MODEL_CACHE_MS = 6 * 60 * 60 * 1000;
let modelCache = { at: 0, models: null };

// キーで利用可能な generateContent 対応モデルを取得し、応答の速い flash 系を優先して並べる。
// 実行のたびに問い合わせると数秒を失うので、同じインスタンス内では結果を使い回す。
async function listGeminiModels(apiKey) {
  if (modelCache.models && Date.now() - modelCache.at < MODEL_CACHE_MS) return modelCache.models;
  try {
    const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`, {}, 8000);
    if (!res.ok) {
      console.error(`Gemini ListModels failed with status ${res.status}`);
      return PREFERRED;
    }
    const data = await res.json();
    const names = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter((n) => n.startsWith('gemini') && !n.includes('thinking') && !n.includes('image') && !n.includes('tts'));

    if (!names.length) return PREFERRED;

    const score = (n) => (n.includes('flash') ? 0 : 1) + (n.includes('lite') ? 0.5 : 0) + (/\d/.test(n) ? 0 : 0.25);
    const rest = names.filter((n) => !PREFERRED.includes(n)).sort((a, b) => score(a) - score(b) || b.localeCompare(a));
    const models = [...PREFERRED.filter((n) => names.includes(n)), ...rest].slice(0, 5);
    console.log('Gemini available models (top):', models.join(', '));
    modelCache = { at: Date.now(), models };
    return models;
  } catch (e) {
    console.error('Gemini ListModels error:', e);
    return PREFERRED;
  }
}

// 利用可能なモデルを順に試して JSON を1本生成する。失敗理由は秘密情報を含まない区分だけ返す。
// レート制限（429）や過負荷（503）は同じモデルで待ってもすぐには明けないので、待たずに次のモデルへ移る。
// 全モデルを1周しても未生成で、かつ時間が余っているときだけ 2 周目を試す。
// deadline（エポックms）を渡すと、その時刻を超える再試行は打ち切る。実行時間の上限がある
// サーバーレス環境で、応答を返せないまま強制終了（504）になるのを防ぐため。
async function generateWithGemini(apiKey, models, promptText, timeoutMs, deadline) {
  let reason = 'gemini_error';
  const attempts = [...models, ...models];
  const MIN_ATTEMPT_MS = 8000;

  const dead = new Set();
  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i];
    if (dead.has(model)) continue;
    let attemptTimeoutMs = timeoutMs;
    if (deadline) {
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) {
        reason = reason === 'gemini_error' ? 'gemini_timeout' : reason;
        console.warn('Gemini generation aborted: not enough time left before the deadline.');
        break;
      }
      // 未試行のモデルが残っている間は時間を使い切らず、遅いモデルに見切りをつけて次へ進む。
      const untried = i < models.length - 1;
      attemptTimeoutMs = Math.min(timeoutMs, untried ? Math.max(MIN_ATTEMPT_MS, Math.floor(remaining / 2)) : remaining);
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 思考（thinking）が既定で有効なモデルは応答が数十秒に伸びる。鑑定文の生成に長考は不要なので最小化する。
    // 設定名はモデル世代で異なり、未対応のキーを送ると 400 になるため、その場合は無指定で再試行する。
    const thinkingConfigs = [];
    if (/^gemini-3/.test(model)) {
      thinkingConfigs.push({ thinkingConfig: { thinkingLevel: 'minimal' } });
      thinkingConfigs.push({ thinkingConfig: { thinkingLevel: 'low' } });
    } else if (/^gemini-2\.5/.test(model)) {
      thinkingConfigs.push({ thinkingConfig: { thinkingBudget: 0 } });
    }
    thinkingConfigs.push({});

    try {
      let res = null;
      let usedConfig = null;
      for (const extraConfig of thinkingConfigs) {
        usedConfig = extraConfig;
        res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 1.0, ...extraConfig }
          })
        }, attemptTimeoutMs);
        if (res.status !== 400) break;
        console.warn(`Gemini model ${model} rejected generationConfig ${JSON.stringify(extraConfig)}, retrying without it.`);
      }

      if (!res.ok) {
        reason = `gemini_${res.status}`;
        console.error(`Gemini model ${model} failed with status ${res.status}`);
        if (res.status === 404) dead.add(model);
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        reason = 'gemini_empty_response';
        continue;
      }
      return {
        json: JSON.parse(rawText.trim()),
        model,
        reason: null,
        meta: {
          thinking: usedConfig?.thinkingConfig ? JSON.stringify(usedConfig.thinkingConfig) : 'default',
          thought_tokens: data.usageMetadata?.thoughtsTokenCount ?? null,
          output_tokens: data.usageMetadata?.candidatesTokenCount ?? null,
          candidates: models
        }
      };
    } catch (err) {
      reason = err?.name === 'AbortError' ? 'gemini_timeout' : 'gemini_error';
      console.error(`Gemini model ${model} error:`, err?.message);
    }
  }
  return { json: null, model: null, reason };
}

module.exports = { listGeminiModels, generateWithGemini };
