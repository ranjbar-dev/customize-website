import { useEffect, useState } from "react";
import { getRules, onRulesChanged } from "./storage";
import { Rule } from "./types";

/** Live list of rules, kept in sync with chrome.storage. */
export function useRules(): Rule[] {
  const [rules, setRules] = useState<Rule[]>([]);
  useEffect(() => {
    getRules().then(setRules);
    return onRulesChanged(setRules);
  }, []);
  return rules;
}

/** Per-rule registration errors written by the service worker (session storage). */
export function useRuleErrors(): Record<string, string> {
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    const read = () =>
      chrome.storage.session
        .get("ruleErrors")
        .then((g) => setErrors((g.ruleErrors as Record<string, string>) ?? {}));
    read();
    const listener = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === "session" && "ruleErrors" in changes) read();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);
  return errors;
}
