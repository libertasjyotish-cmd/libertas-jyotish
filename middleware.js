// 言語なしの URL（/ や /mypage）をサーバー側で言語付き（/fr、/fr/mypage）へ 307 転送する。
// 優先順: 言語切替で保存した cookie → アクセス元の国 → Accept-Language → en。
const AVAILABLE_LANGS = ['ja', 'en', 'es', 'pt', 'ar', 'id', 'fr', 'de'];
const OTHER_LANG = 'en';
const COUNTRY_LANG = {
  JP: 'ja',
  ID: 'id',
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es',
  GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es',
  CR: 'es', PA: 'es', UY: 'es', GQ: 'es',
  SA: 'ar', AE: 'ar', EG: 'ar', DZ: 'ar', MA: 'ar', IQ: 'ar', SD: 'ar', SY: 'ar',
  YE: 'ar', TN: 'ar', JO: 'ar', LY: 'ar', LB: 'ar', PS: 'ar', OM: 'ar', KW: 'ar',
  MR: 'ar', QA: 'ar', BH: 'ar', DJ: 'ar', SO: 'ar', KM: 'ar',
  FR: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', ML: 'fr', BF: 'fr', NE: 'fr', TG: 'fr', BJ: 'fr', GA: 'fr', CG: 'fr', CD: 'fr', MG: 'fr', HT: 'fr', GN: 'fr',
  DE: 'de', AT: 'de', LI: 'de'
};

export const config = {
  matcher: [
    '/',
    '/(calendar|career|compat|contact|legal|mypage|palm-chart|palm-upload|pdf-purchase|pdf-report|pdf-success|products|reissue|reports|result|success|yearly)',
    '/tools/(moon-sign|nakshatra|dasha)'
  ]
};

function cookieLang(header) {
  const m = /(?:^|;\s*)lj_lang=([a-z]{2})/.exec(header || '');
  return m && AVAILABLE_LANGS.includes(m[1]) ? m[1] : null;
}

function acceptLang(header) {
  const prefs = String(header || '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => /^q=([\d.]+)$/.exec(p.trim())).find(Boolean);
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q[1]) : 1 };
    })
    .filter((p) => p.tag && p.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of prefs) {
    const base = tag.split('-')[0];
    if (AVAILABLE_LANGS.includes(base)) return base;
  }
  return null;
}

export default function middleware(request) {
  const url = new URL(request.url);
  const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  const lang =
    cookieLang(request.headers.get('cookie')) ||
    COUNTRY_LANG[country] ||
    acceptLang(request.headers.get('accept-language')) ||
    OTHER_LANG;
  const page = url.pathname.replace(/\/+$/, '');
  url.pathname = '/' + lang + page;
  return Response.redirect(url.toString(), 307);
}
