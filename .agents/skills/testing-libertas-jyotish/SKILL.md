---
name: testing-libertas-jyotish
description: How to test the Libertas Jyotish static site + Vercel /api functions end-to-end in a browser, including the multilingual (ja/en/es/pt/ar/id) pages, Arabic RTL layout, country-tier pricing and Stripe purchase flows, without making real payments.
---

# Testing Libertas Jyotish

## Where to test
- Production: `https://www.libertas-jyotish.com`. Most changes are static HTML generated from `templates/` + `locales/<lang>.json`, so production is usually the fastest and most faithful target — no local server needed.
- Local `python3 -m http.server` does **not** reproduce Vercel `cleanUrls: true`, so extensionless paths (`/ja/pdf-purchase`) 404 locally. Verify navigation hops on production instead.
- `/api/*` endpoints need secrets that are not available locally. To exercise `/result` locally you must stub `window.fetch` in a temp copy of the page (delete the temp file afterwards; never commit it).

## Browser setup
- Always use a **Chrome Incognito** window. The normal profile on the test VM carries stale localStorage that marks the user as "already purchased / premium", which hides purchase forms and preview blocks.
- Maximize before recording: `wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`.
- `sw.js` caches aggressively (`CACHE_NAME = libertas-jyotish-vNN`). Hard reload (Ctrl+Shift+R) on the first visit per language after a deploy.
- Mobile widths: DevTools device emulation (F12 then Ctrl+Shift+M) at 390px works reliably. Press Ctrl+Shift+M then F12 again to return to desktop.

## Filling the birth form
`date` / `time` / `datetime-local` inputs corrupt the year if you type the whole string at once (e.g. `151990-01-15T09:00`). Reliable sequence:
click the field → `ctrl+a` → `Delete` → `Left` ×3–5 to reach the first segment → type segments separately (`01`, `15`, `1990`, then `0900AM`). Verify the DOM value before submitting.

A free reading can be run end-to-end from any language top page with a reserved test address such as `lj.test.<lang>@example.com` (example.com is non-deliverable, so no third party is emailed). The reading typically returns in ~15s and redirects to `/<lang>/result`.

## Pricing / Stripe
- `/api/checkout-links` derives tier from `x-vercel-ip-country`. A US-egress VM is **T1** (premium ¥750 / ≈$4.90, PDF ¥7,480 / ≈$47–49). Vercel overwrites inbound `x-vercel-*` headers, so header spoofing cannot change the country.
- **To exercise T2/T3 and the JPY/no-approx branch, mock the API response with Playwright.** Attach to the already-running Chrome (`p.chromium.connect_over_cdp("http://localhost:29229")`; launching a fresh browser fails, no binary). Critically, register the route on the **context, before creating the page**:
  ```python
  ctx = browser.new_context(no_viewport=True)
  ctx.route("**/api/checkout-links*", lambda r: r.fulfill(status=200,
           content_type="application/json", body=json.dumps(mock)))
  page = ctx.new_page()          # page.route() AFTER new_page() does NOT intercept here
  ```
  With `page.route()` the real US/T1 payload silently leaks through and the test looks like it passed. Use a fresh context per tier so `sessionStorage.lj_checkout_links` does not bleed.
  Generate mock bodies with a Node script that replicates `resolveTier`/`approxFor`/`roundApprox` in `api/checkout-links.js` against `data/price-tiers.json` + `data/currency-rates.json` (use absolute repo paths in `require()`). Real tier representatives: **US=T1, GB=T2, IN=T3** — note BR/MX are T3, not T2. JP is the `approx: null` edge case.
- When asserting `ar` price strings, **fold Arabic-Indic digits to Latin** before comparing: Node's ICU emits `٤٫٧٠` for the `ar` locale while Chrome renders `4.70`, producing false failures.
  ```python
  for i, d in enumerate("٠١٢٣٤٥٦٧٨٩"): s = s.replace(d, str(i))
  s = s.replace("\u066b", ".").replace("\u066c", ",")   # also strip \u200f and NBSP
  ```
- Price DOM hooks (same line numbers in all 6 languages, generated from `templates/`): `index.html` two `p.paid-member-price[data-price-label="premium"]`; `mypage.html` `#premium-gatekeeper p[data-price-label="premium"]` (**visible to anonymous users — no login needed**); `pdf-purchase.html` `div#price-label`; CTA `#btn-proceed-checkout` / `.btn-upgrade-premium`.
- Tier Payment Link suffixes: premium T1 `…CP24003`, T2 `…uH24000`, T3 `…yL24002`; pdf T1 `…U724004`, T2 `…P124001`, T3 `…mz24005`. The T2 links are also the client-side fallback when the API fails, so a T1/T3 test that yields a T2 link means the mock/tier lookup broke.
- Japanese pages show fixed yen labels; every other language shows an `Intl.NumberFormat` approximation ("About $4.70 / month …").
- Stripe shows the USD converted amount by default; the PDF (one-off) page also shows a JPY currency toggle exposing the exact source amount (¥7,480 / ¥4,980 / ¥2,980 per tier) — the subscription page only shows the converted amount.
- On the Stripe page, `page.wait_for_load_state("networkidle")` often times out (Stripe keeps sockets open). Wrap it in try/except and just wait a fixed few seconds before screenshotting.
- Safety: verify the URL, product name, amount and `prefilled_email` only. Never enter card data, never click Pay/Subscribe, never cancel a subscription.

## Arabic / RTL checks (`/ar`)
`ar/*.html` declares `<html lang="ar" dir="rtl">` and loads `/css/rtl.css`. Expected:
- body/headings/table cells right-aligned; heading accent rule flipped from `border-left` to `border-right`
- hamburger `.lj-menu` moved from top-right to top-left (`right:auto; left:12px`), dropdown must stay on-screen
- `input[type=date|time|email]` and `.code-input` forced `direction: ltr`
- table headers must sit over their own (mirrored) columns
Regression-check `/ja` and `/en` after any rtl.css change: they must stay LTR with the accent rule on the left and the hamburger on the right.

## Known issue to re-check
The member page daily reading (`/<lang>/mypage`, "Today's moon sign outlook") is served from an API that appears **not to be language-aware**: on `/ar/mypage` and `/en/mypage` the sign names and horoscope body come back in Japanese (山羊座 / 蟹座 / ヴィシャーカー) while only the static labels are localized. `/<lang>/result` from the free reading *is* correctly localized, so the two endpoints differ. Re-verify this on any i18n change — if it is still Japanese, it is a live defect, not a caching artifact.

## Devin Secrets Needed
none — all testing is unauthenticated production browsing; no credentials required.
