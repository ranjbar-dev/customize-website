# Site Customizer

A personal Manifest V3 Chrome extension that injects your own **CSS** and **JavaScript**
into websites by URL glob. JS runs in the page's **MAIN world** via `chrome.userScripts`,
so it can read the site's own globals and bypasses page CSP (works on `google.com`).
CSS is appended as a `<style>` at the end of `<head>`, so it overrides the site's styles.

Rules live in `chrome.storage.local`; the service worker is the single source of truth and
re-registers all userScripts whenever a rule changes.

## Build

```bash
npm install
npm run build      # -> dist/   (tsc typecheck + vite build)
npm run dev        # HMR dev build, also writes dist/
npm test           # unit tests (validation, URL matching, import/export)
```

## Install (unpacked)

1. `npm run build`
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top-right)
4. Click **Load unpacked** → select the **`dist/`** folder

## Enable "Allow user scripts" (required)

`chrome.userScripts` is gated behind a per-extension switch. Until it's on, injection
silently does nothing and the popup/options show a banner.

1. `chrome://extensions` → **Site Customizer** → **Details**
2. Turn on **Allow user scripts**
3. Reload any tab you want customized

> If you don't see the toggle, make sure **Developer mode** is on.

## Use

- **Popup** (toolbar icon): lists rules matching the current tab with quick enable/disable,
  plus **Create rule for this site** (prefills `*://<host>/*`).
- **Options** (popup → *Manage all rules*, or the extension's Details → *Extension options*):
  full CRUD with CodeMirror CSS/JS editors, match-pattern/glob validation, per-rule error
  badges, a storage-quota warning, and JSON **Export / Import** (merge or replace).

### Rule fields

| Field | Notes |
|---|---|
| `matches` | Chrome match patterns, one per line, e.g. `*://*.google.com/*` |
| `includeGlobs` / `excludeGlobs` | optional `*`/`?` globs to narrow or exclude |
| `css` | appended to end of `<head>` (CSP-proof) |
| `js` | runs at `runAt` in the chosen world |
| `runAt` | `document_start` / `document_end` / `document_idle` (default) |
| `jsWorld` | `MAIN` (page globals, bypasses CSP — default) or `ISOLATED` (DOM only) |

### Seeded example

On first install one rule is created: matches `*://*.google.com/*`, appends a visible blue
banner via CSS, and `console.log`s on every google subpage. SPA navigations on Google are
re-applied via `chrome.webNavigation.onHistoryStateUpdated`.

## Notes

- Your JS runs in the real page — its errors appear in the **page** console, not the
  extension console. That's expected; the extension does not trap page-script errors.
- No cloud sync, no Web Store. Local only.
