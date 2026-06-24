import { Rule } from "./types";
import { newId, updateRules } from "./storage";

export function emptyRule(prefillMatch?: string): Rule {
  const now = Date.now();
  return {
    id: newId(),
    name: "New rule",
    enabled: true,
    matches: prefillMatch ? [prefillMatch] : [],
    includeGlobs: [],
    excludeGlobs: [],
    css: "",
    js: "",
    runAt: "document_idle",
    jsWorld: "MAIN",
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateRule(r: Rule): Rule {
  const now = Date.now();
  return { ...r, id: newId(), name: `${r.name} (copy)`, createdAt: now, updatedAt: now };
}

/** Insert or replace a rule by id. */
export function saveRule(rule: Rule): Promise<Rule[]> {
  return updateRules((rs) =>
    rs.some((r) => r.id === rule.id)
      ? rs.map((r) => (r.id === rule.id ? rule : r))
      : [...rs, rule],
  );
}

export function deleteRule(id: string): Promise<Rule[]> {
  return updateRules((rs) => rs.filter((r) => r.id !== id));
}

export function toggleRule(id: string): Promise<Rule[]> {
  return updateRules((rs) =>
    rs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled, updatedAt: Date.now() } : r)),
  );
}
