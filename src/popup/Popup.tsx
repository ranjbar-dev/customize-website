import { useEffect, useMemo, useState } from "react";
import { ruleMatchesUrl } from "../matching";
import { toggleRule } from "../rules";
import { useRules, useRuleErrors } from "../useRules";
import { UserScriptsBanner } from "../UserScriptsBanner";

export function Popup() {
  const rules = useRules();
  const errors = useRuleErrors();
  const [url, setUrl] = useState("");

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => setUrl(t?.url ?? ""));
  }, []);

  const host = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }, [url]);

  const matching = useMemo(
    () => rules.filter((r) => url && ruleMatchesUrl(r, url)),
    [rules, url],
  );

  function createForSite() {
    if (!host) return;
    chrome.tabs.create({
      url: chrome.runtime.getURL(`options.html?newSite=${encodeURIComponent(host)}`),
    });
  }

  function editRule(id: string) {
    chrome.tabs.create({
      url: chrome.runtime.getURL(`options.html?edit=${encodeURIComponent(id)}`),
    });
  }

  return (
    <main className="popup">
      <h2>Site Customizer</h2>
      <div className="host">{host || "no active site"}</div>

      <UserScriptsBanner />

      {host &&
        (matching.length === 0 ? (
          <p className="muted">No rules match this page.</p>
        ) : (
          <ul className="rule-list">
            {matching.map((r) => (
              <li key={r.id} className="rule-item">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => toggleRule(r.id)}
                  title="Enable / disable"
                />
                <div className="rule-meta" onClick={() => editRule(r.id)}>
                  <div className="rule-name">
                    {r.name}
                    {errors[r.id] && (
                      <span className="badge" title={errors[r.id]}>
                        ⚠
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ))}

      <div className="pop-actions">
        <button className="primary" onClick={createForSite} disabled={!host}>
          Create rule for {host || "this site"}
        </button>
        <button onClick={() => chrome.runtime.openOptionsPage()}>Manage all rules</button>
      </div>
    </main>
  );
}
