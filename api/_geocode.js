// 出生地の緯度経度変換。特定できない場所を既定値（東京）で押し通すと鑑定の根拠が崩れるため、
// 入力どおり → 広域（州・国）→ 特定不能（null）の順に段階的に落とす。
const NOMINATIM_UA = 'LibertasJyotishApp/2.0 (info@libertas-jyotish.com)';

// 座標が概算になった場合の注意書き。影響を受けるのはラグナ（アセンダント）とハウスのみ。
const APPROX_NOTICE = {
  ja: (place) => `出生地を特定できなかったため、${place} の代表地点で計算しています。ラグナ（アセンダント）とハウスは概算です。市区町村まで入力すると精度が上がります。`,
  en: (place) => `We could not pinpoint the birth place, so the calculation uses a representative location in ${place}. The ascendant and houses are approximate. Entering a city improves accuracy.`,
  es: (place) => `No pudimos localizar el lugar de nacimiento, así que el cálculo usa un punto representativo de ${place}. El ascendente y las casas son aproximados. Indicar la ciudad mejora la precisión.`,
  pt: (place) => `Não foi possível localizar o local de nascimento, então o cálculo usa um ponto representativo de ${place}. O ascendente e as casas são aproximados. Informar a cidade melhora a precisão.`,
  ar: (place) => `تعذّر تحديد مكان الميلاد بدقة، لذا يستخدم الحساب موقعًا تمثيليًا في ${place}. الطالع والبيوت تقريبية، وإدخال المدينة يحسّن الدقة.`,
  id: (place) => `Tempat lahir tidak dapat dipastikan, sehingga perhitungan memakai titik representatif di ${place}. Ascendant dan rumah bersifat perkiraan. Mengisi kota akan meningkatkan akurasi.`
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function lookupPlace(query, lang) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': NOMINATIM_UA,
      // 入力は閲覧言語の表記になるため、その言語と英語で地名を拾えるようにする。
      'Accept-Language': lang === 'en' ? 'en' : `${lang || 'ja'},en`
    }
  });
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, displayName: String(data[0].display_name || query) };
}

// 見つからなければ先頭（詳細側）の語から順に落として、州・国レベルまで緩める。
function buildCandidates(raw) {
  const parts = raw.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
  const candidates = [raw];
  for (let i = 1; i < parts.length; i++) candidates.push(parts.slice(i).join(', '));
  if (parts.length > 1) candidates.push(parts[parts.length - 1]);
  return candidates;
}

// 戻り値: { lat, lon, precision: 'exact' | 'approximate', notice } / 特定できなければ null
async function geocodeBirthPlace(city, lang) {
  const raw = String(city || '').trim();
  if (!raw) return null;

  const candidates = buildCandidates(raw);
  for (let i = 0; i < candidates.length; i++) {
    try {
      const hit = await lookupPlace(candidates[i], lang);
      if (!hit) continue;
      const notice = APPROX_NOTICE[lang] || APPROX_NOTICE.en;
      return {
        lat: hit.lat,
        lon: hit.lon,
        precision: i === 0 ? 'exact' : 'approximate',
        notice: i === 0 ? null : notice(hit.displayName)
      };
    } catch (err) {
      console.error('Geocoding lookup failed:', err && err.message);
    }
  }
  return null;
}

module.exports = { geocodeBirthPlace };
