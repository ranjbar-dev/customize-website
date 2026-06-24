# PRD — CSS/JS Site Customizer (Chrome Extension)

## 1. Overview

A personal Chrome extension (Manifest V3) that lets the user inject custom **CSS** and **JavaScript** into websites based on glob/wildcard URL patterns. Rules are stored locally and re-applied automatically on every matching page load. The signature use case: append CSS to the end of `google.com` and run a JS script on every subpage of `google.com`.

- **Platform:** Chrome (Manifest V3), Chromium browsers.
- **Stack:** Vite + React 18 + TypeScript, bundled with `@crxjs/vite-plugin`.
- **Storage:** `chrome.storage.local` (MV3-safe; localStorage is unavailable in the service worker).
- **Distribution:** Unpacked / self-installed (developer mode). No Web Store.

## 2. Goals

1. Inject user-authored CSS into pages matching glob patterns.
2. Inject and execute user-authored JS in the page's **MAIN world** (can read/call the site's own JS), bypassing site CSP.
3. Manage rules (CRUD) via an options page and a per-tab popup.
4. Persist all rules locally; survive browser restarts.
5. Import/export rules as JSON for backup and machine-to-machine transfer.

## 3. Non-Goals

- No cloud sync, accounts, or marketplace of shared scripts.
- No Firefox/Safari port (architecture stays portable, but not targeted).
- No code sandboxing/security scanning — the user is trusted with their own scripts.
- No Chrome Web Store publishing in v1.

## 4. Core Technical Decisions

| Concern | Decision | Rationale |
|---|---|---|
| JS injection mechanism | **`chrome.userScripts` API** | Only MV3-supported way to register arbitrary code strings in `world: "MAIN"` that bypasses page CSP (sites like Google block `<script>` tag injection). |
| JS world | **MAIN** (per-rule toggle, defaults to MAIN) | User wants access to the site's own JS state. ISOLATED offered per-rule for safer DOM-only scripts. |
| CSS injection | Injected as a `<style>` node appended to end of `<head>`, via the userScript wrapper | CSP-proof, consistent path with JS, and end-of-head guarantees override priority ("add CSS to the end"). |
| Matching | Glob/wildcard via `matches` + `includeGlobs`/`excludeGlobs` | `*://*.google.com/*` = all subpages; `*google.com/search*` = narrower. |
| Storage | `chrome.storage.local` | Reliable in service worker; localStorage is not. |
| Re-registration | Service worker re-syncs `userScripts` registrations on any rule change | Single source of truth = stored rules. |
| Editors | CodeMirror 6 + lang-css + lang-javascript | Syntax highlighting + autocomplete. |

### Mandatory user action
`chrome.userScripts` requires the user to enable **"Allow user scripts"** on the extension card in `chrome://extensions`. This is a Chrome security requirement, not optional. The extension must detect when it is disabled and surface a clear banner with instructions.

## 5. Permissions

```json
{
  "permissions": ["userScripts", "storage", "tabs", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

- `userScripts` — register/execute user code.
- `storage` — persist rules.
- `tabs` — read active tab URL for the popup.
- `host_permissions: <all_urls>` — allow injection on any matched site.

## 6. Data Model

```ts
type RunAt = "document_start" | "document_end" | "document_idle";
type JsWorld = "MAIN" | "ISOLATED";

interface Rule {
  id: string;            // uuid
  name: string;          // human label
  enabled: boolean;      // master on/off
  matches: string[];     // match patterns, e.g. ["*://*.google.com/*"]
  includeGlobs: string[];// optional narrowing globs
  excludeGlobs: string[];// optional exclusion globs
  css: string;           // CSS source
  js: string;            // JS source
  runAt: RunAt;          // default "document_idle"
  jsWorld: JsWorld;      // default "MAIN"
  createdAt: number;
  updatedAt: number;
}

interface StorageShape {
  rules: Rule[];
  schemaVersion: number;
}
```

Stored under a single key (`rules`) in `chrome.storage.local`.

## 7. Components

### 7.1 Service Worker (background)
- On install / startup / `storage.onChanged`: read rules, call `chrome.userScripts.unregister()` then `chrome.userScripts.register()` to mirror the enabled rules.
- For each enabled rule, register:
  - A JS userScript (the rule's `js`) with the rule's `world` and `runAt`, scoped by `matches`/globs.
  - A CSS-injecting userScript: a small wrapper that creates a `<style>` element with the rule's `css` and appends it to `document.head` (runs at `document_idle`, ISOLATED is fine for this).
- Listen to `chrome.webNavigation.onHistoryStateUpdated` (SPA route changes, e.g. Google) to re-apply CSS/JS for SPA navigations where a full load does not occur. (Requires `webNavigation` permission — add it.)
- Detect `userScripts` availability; if the API throws (toggle off), set a flag the UI reads to show the banner.

### 7.2 Options Page (React)
- Rule list with enable toggles, edit, duplicate, delete.
- Rule editor: name, match patterns (chips), include/exclude globs, CSS editor (CodeMirror), JS editor (CodeMirror), runAt select, world toggle.
- Import / Export buttons (JSON file download / upload + merge-or-replace choice).
- "Allow user scripts" banner when the toggle is off.

### 7.3 Popup (React)
- List rules matching the current tab's URL with quick enable/disable.
- "Create rule for this site" → opens options editor prefilled with `*://<current-domain>/*`.
- Link to full options page.

## 8. Data Flow

1. User edits a rule in Options → write to `chrome.storage.local`.
2. `storage.onChanged` fires in the service worker → recomputes and re-registers `userScripts`.
3. User navigates to a matching page → Chrome injects the registered CSS/JS at the configured `runAt` in the configured world.
4. SPA navigation → `webNavigation` listener re-applies as needed.

## 9. Error Handling

- **userScripts toggle off:** banner in popup + options with step-by-step enable instructions; injection silently no-ops until enabled.
- **Invalid match pattern:** validate before save; block save with inline error.
- **Registration failure:** catch per-rule; mark the rule with an error badge in the UI, keep other rules working.
- **Bad user JS:** runs in the page; errors surface in the page console (documented as expected). The extension does not try to catch page-script errors.
- **Storage quota:** warn if total rules JSON approaches the local quota.

## 10. Testing

- Unit: match-pattern/glob validation, rule reducer, import/export round-trip.
- Manual matrix:
  - CSS appends to end of `google.com` and overrides site styles.
  - JS runs on every `*.google.com/*` subpage in MAIN world (can access page globals).
  - Enable/disable toggles take effect without reload-of-extension.
  - SPA navigation on Google re-applies the script.
  - Import/export preserves all fields.
  - Behavior when "Allow user scripts" is off → banner shown, no crash.

## 11. Milestones

1. **M1 — Skeleton:** Vite + CRXJS + React + TS scaffold, MV3 manifest, storage layer, empty options/popup.
2. **M2 — Injection core:** service worker registers userScripts from rules; CSS + MAIN-world JS working on Google.
3. **M3 — Rule manager UI:** CodeMirror editors, CRUD, validation, banner.
4. **M4 — Popup + SPA + import/export:** per-tab popup, webNavigation re-apply, JSON backup.
5. **M5 — Polish:** error badges, quota warning, docs/README.

## 12. Open Items (deferred)

- Optional `chrome.storage.sync` for cross-device sync (off by default; local is canonical).
- Per-rule run counter / last-run timestamp for debugging.