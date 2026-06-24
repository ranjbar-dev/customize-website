import { getRules, setRules, onRulesChanged } from "./storage";
import { seedRule } from "./seed";
import { syncUserScripts, reapplyForUrl } from "./injection";

// Seed an example rule on first install, then register.
chrome.runtime.onInstalled.addListener(async () => {
  const rules = await getRules();
  if (rules.length === 0) {
    await setRules([seedRule()]);
    console.log("[Site Customizer] seeded example rule");
  }
  await syncUserScripts();
});

chrome.runtime.onStartup.addListener(() => void syncUserScripts());

// Stored rules are the single source of truth: re-sync on any change.
onRulesChanged(() => void syncUserScripts());

// SPA route changes (e.g. Google) don't reload the page — re-apply for the main frame.
chrome.webNavigation.onHistoryStateUpdated.addListener((d) => {
  if (d.frameId !== 0) return;
  void reapplyForUrl(d.tabId, d.url);
});

// Re-sync on every service-worker wake. This also covers the "Allow user scripts"
// toggle, which reloads the extension without firing a predictable event.
void syncUserScripts();
