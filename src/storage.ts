import { Rule, STORAGE_KEY, SCHEMA_VERSION } from "./types";

const SCHEMA_KEY = "schemaVersion";

export async function getRules(): Promise<Rule[]> {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  const rules = got[STORAGE_KEY];
  return Array.isArray(rules) ? (rules as Rule[]) : [];
}

export async function setRules(rules: Rule[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEY]: rules,
    [SCHEMA_KEY]: SCHEMA_VERSION,
  });
}

/** Apply an update function to the current rules and persist the result. */
export async function updateRules(fn: (rules: Rule[]) => Rule[]): Promise<Rule[]> {
  const next = fn(await getRules());
  await setRules(next);
  return next;
}

/** Fire `cb` whenever the stored rules change (any context). Returns an unsubscribe. */
export function onRulesChanged(cb: (rules: Rule[]) => void): () => void {
  const listener = (
    changes: { [k: string]: chrome.storage.StorageChange },
    area: string,
  ) => {
    if (area !== "local" || !(STORAGE_KEY in changes)) return;
    const v = changes[STORAGE_KEY].newValue;
    cb(Array.isArray(v) ? (v as Rule[]) : []);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Bytes used by chrome.storage.local and the area quota (for the quota warning). */
export async function getLocalUsage(): Promise<{ used: number; quota: number }> {
  const used = await chrome.storage.local.getBytesInUse(null);
  const quota = chrome.storage.local.QUOTA_BYTES ?? 10485760;
  return { used, quota };
}
