// 共通メニュー（js/site-menu.js）に載せる単機能ツール。build-i18n.mjs と build-guide.mjs で共有する。
// 言語は段階的に増やす。増やすときは TOOLS_MENU_LANGS に足すだけでよい。
export const TOOLS_MENU_LANGS = new Set(['ja']);

export const TOOLS_MENU = [
  { page: 'tools/moon-sign', labelKey: 'tools.moonSign.h1' },
  { page: 'tools/nakshatra', labelKey: 'tools.nakshatra.h1' },
  { page: 'tools/dasha', labelKey: 'tools.dasha.h1' }
];

// site-menu.js が読む window.LJ_I18N.tools の中身。対象外の言語では null を返す。
export function toolsMenu(lang, lookup) {
  if (!TOOLS_MENU_LANGS.has(lang)) return null;
  return {
    groupLabel: lookup('tools.common.menuGroup'),
    items: TOOLS_MENU.map((tool) => ({ href: `/${lang}/${tool.page}`, label: lookup(tool.labelKey) }))
  };
}
