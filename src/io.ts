import { Rule, RunAt, JsWorld, SCHEMA_VERSION } from "./types";
import { newId } from "./storage";

const RUN_ATS: RunAt[] = ["document_start", "document_end", "document_idle"];
const WORLDS: JsWorld[] = ["MAIN", "ISOLATED"];

export function exportRules(rules: Rule[]): string {
  return JSON.stringify({ rules, schemaVersion: SCHEMA_VERSION }, null, 2);
}

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// Imported files are untrusted input — validate/coerce every field (PRD §9, coding-style).
function normalizeRule(r: unknown): Rule {
  if (!r || typeof r !== "object") throw new Error("A rule entry is not an object.");
  const o = r as Record<string, unknown>;
  const now = Date.now();
  const matches = strArray(o.matches);
  if (matches.length === 0) {
    throw new Error(`Rule “${String(o.name ?? o.id ?? "?")}” has no match patterns.`);
  }
  return {
    id: typeof o.id === "string" && o.id ? o.id : newId(),
    name: typeof o.name === "string" ? o.name : "Imported rule",
    enabled: o.enabled !== false,
    matches,
    includeGlobs: strArray(o.includeGlobs),
    excludeGlobs: strArray(o.excludeGlobs),
    css: typeof o.css === "string" ? o.css : "",
    js: typeof o.js === "string" ? o.js : "",
    runAt: RUN_ATS.includes(o.runAt as RunAt) ? (o.runAt as RunAt) : "document_idle",
    jsWorld: WORLDS.includes(o.jsWorld as JsWorld) ? (o.jsWorld as JsWorld) : "MAIN",
    createdAt: typeof o.createdAt === "number" ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : now,
  };
}

/** Parse an exported file (either {rules:[...]} or a bare array) into validated rules. */
export function parseImport(text: string): Rule[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  const arr = Array.isArray(data) ? data : (data as { rules?: unknown })?.rules;
  if (!Array.isArray(arr)) throw new Error("Expected a top-level array or a `rules` array.");
  return arr.map(normalizeRule);
}

/** Append imported rules, regenerating ids that collide with existing ones. */
export function mergeRules(existing: Rule[], imported: Rule[]): Rule[] {
  const ids = new Set(existing.map((r) => r.id));
  const add = imported.map((r) => (ids.has(r.id) ? { ...r, id: newId() } : r));
  return [...existing, ...add];
}
