import { Rule, JsWorld } from "./types";

/** True if the user has enabled "Allow user scripts". Accessing the API throws when off. */
export function isUserScriptsAvailable(): boolean {
  try {
    return !!chrome.userScripts;
  } catch {
    return false;
  }
}

// userScripts uses "USER_SCRIPT" for the isolated world; the PRD's data model calls it "ISOLATED".
function worldFor(w: JsWorld): "MAIN" | "USER_SCRIPT" {
  return w === "MAIN" ? "MAIN" : "USER_SCRIPT";
}

/** Idempotent code that appends the rule's CSS as a <style> at the end of <head>. */
function cssWrapperCode(rule: Rule): string {
  // JSON.stringify makes safe JS string literals out of arbitrary CSS / the id.
  return `(() => {
  const id = ${JSON.stringify(rule.id)};
  const prev = document.querySelector('style[data-site-customizer="' + id + '"]');
  if (prev) prev.remove();
  const el = document.createElement('style');
  el.setAttribute('data-site-customizer', id);
  el.textContent = ${JSON.stringify(rule.css)};
  (document.head || document.documentElement).appendChild(el);
})();`;
}

export interface BuiltScript {
  id: string;
  matches: string[];
  includeGlobs?: string[];
  excludeGlobs?: string[];
  js: { code: string }[];
  world: "MAIN" | "USER_SCRIPT";
  runAt: "document_start" | "document_end" | "document_idle";
}

/** Turn one rule into its userScripts registrations (JS in the rule's world + CSS wrapper). */
export function buildScripts(rule: Rule): BuiltScript[] {
  const matches = rule.matches.map((s) => s.trim()).filter(Boolean);
  if (matches.length === 0) return [];

  const includeGlobs = rule.includeGlobs.map((s) => s.trim()).filter(Boolean);
  const excludeGlobs = rule.excludeGlobs.map((s) => s.trim()).filter(Boolean);
  const common = {
    matches,
    ...(includeGlobs.length ? { includeGlobs } : {}),
    ...(excludeGlobs.length ? { excludeGlobs } : {}),
  };

  const out: BuiltScript[] = [];
  if (rule.js.trim()) {
    out.push({
      id: `${rule.id}-js`,
      ...common,
      js: [{ code: rule.js }],
      world: worldFor(rule.jsWorld),
      runAt: rule.runAt,
    });
  }
  if (rule.css.trim()) {
    // CSS injection runs in USER_SCRIPT world at idle; appending a <style> is CSP-proof there.
    out.push({
      id: `${rule.id}-css`,
      ...common,
      js: [{ code: cssWrapperCode(rule) }],
      world: "USER_SCRIPT",
      runAt: "document_idle",
    });
  }
  return out;
}
