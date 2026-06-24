import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Site Customizer",
  description: "Inject custom CSS/JS into sites by URL glob, via chrome.userScripts.",
  version: "0.1.0",
  // userScripts: register MAIN-world JS that bypasses page CSP.
  // webNavigation: re-apply on SPA route changes (PRD §7.1).
  permissions: ["userScripts", "storage", "tabs", "scripting", "webNavigation"],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  action: {
    default_popup: "popup.html",
    default_title: "Site Customizer",
  },
  options_page: "options.html",
});
