import { getRules } from "./storage";
import { ruleMatchesUrl } from "./matching";
import { isUserScriptsAvailable, buildScripts } from "./userscripts";

const ERRORS_KEY = "ruleErrors";

async function setRuleErrors(errors: Record<string, string>): Promise<void> {
  await chrome.storage.session.set({ [ERRORS_KEY]: errors });
}

export async function getRuleErrors(): Promise<Record<string, string>> {
  const got = await chrome.storage.session.get(ERRORS_KEY);
  return (got[ERRORS_KEY] as Record<string, string>) ?? {};
}

// ponytail: single in-flight sync with a "rerun" flag — avoids two unregister/register
// passes interleaving when storage changes fire in quick succession.
let syncing = false;
let pending = false;

export async function syncUserScripts(): Promise<void> {
  if (!isUserScriptsAvailable()) return;
  if (syncing) {
    pending = true;
    return;
  }
  syncing = true;
  try {
    do {
      pending = false;
      await doSync();
    } while (pending);
  } finally {
    syncing = false;
  }
}

async function doSync(): Promise<void> {
  const rules = await getRules();

  try {
    await chrome.userScripts.unregister();
  } catch {
    // Nothing registered yet — fine.
  }

  // Register per-rule so one bad rule can't take down the others (PRD §9).
  const errors: Record<string, string> = {};
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const scripts = buildScripts(rule);
    if (scripts.length === 0) continue;
    try {
      await chrome.userScripts.register(scripts as chrome.userScripts.RegisteredUserScript[]);
    } catch (e) {
      errors[rule.id] = e instanceof Error ? e.message : String(e);
    }
  }
  await setRuleErrors(errors);
}

/** Re-run matching rules' scripts on an SPA navigation (no full page load occurred). */
export async function reapplyForUrl(tabId: number, url: string): Promise<void> {
  if (!isUserScriptsAvailable()) return;
  const us = chrome.userScripts as unknown as {
    execute?: (opts: object) => Promise<unknown>;
  };
  if (typeof us.execute !== "function") return; // older Chrome: full nav already covered it.

  const rules = await getRules();
  for (const rule of rules) {
    if (!rule.enabled || !ruleMatchesUrl(rule, url)) continue;
    for (const s of buildScripts(rule)) {
      try {
        await us.execute({
          target: { tabId },
          js: s.js,
          world: s.world,
          injectImmediately: true,
        });
      } catch {
        // SPA re-apply is best-effort; the registered scripts still cover full loads.
      }
    }
  }
}
