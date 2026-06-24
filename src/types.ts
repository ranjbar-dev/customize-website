export type RunAt = "document_start" | "document_end" | "document_idle";
export type JsWorld = "MAIN" | "ISOLATED";

export interface Rule {
  id: string; // uuid
  name: string; // human label
  enabled: boolean; // master on/off
  matches: string[]; // match patterns, e.g. ["*://*.google.com/*"]
  includeGlobs: string[]; // optional narrowing globs
  excludeGlobs: string[]; // optional exclusion globs
  css: string; // CSS source
  js: string; // JS source
  runAt: RunAt; // default "document_idle"
  jsWorld: JsWorld; // default "MAIN"
  createdAt: number;
  updatedAt: number;
}

export interface StorageShape {
  rules: Rule[];
  schemaVersion: number;
}

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = "rules";
