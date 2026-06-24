import { useState } from "react";
import { Rule, RunAt, JsWorld } from "../types";
import { validateMatchPattern } from "../matching";
import { CodeEditor } from "./CodeEditor";

// ponytail: patterns/globs are one-per-line textareas instead of a chip widget —
// fully functional + validated; swap for chips if the UX ever needs it.
const toLines = (a: string[]) => a.join("\n");
const fromLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export function RuleEditor({
  rule,
  onSave,
  onCancel,
}: {
  rule: Rule;
  onSave: (r: Rule) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Rule>(rule);
  const [matchesText, setMatchesText] = useState(toLines(rule.matches));
  const [includeText, setIncludeText] = useState(toLines(rule.includeGlobs));
  const [excludeText, setExcludeText] = useState(toLines(rule.excludeGlobs));
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Rule>) => setDraft((d) => ({ ...d, ...patch }));

  function save() {
    const matches = fromLines(matchesText);
    if (matches.length === 0) {
      setError("Add at least one match pattern, e.g. *://*.google.com/*");
      return;
    }
    for (const m of matches) {
      const e = validateMatchPattern(m);
      if (e) {
        setError(`Invalid pattern “${m}”: ${e}`);
        return;
      }
    }
    setError(null);
    onSave({
      ...draft,
      name: draft.name.trim() || "Untitled rule",
      matches,
      includeGlobs: fromLines(includeText),
      excludeGlobs: fromLines(excludeText),
      updatedAt: Date.now(),
    });
  }

  return (
    <div className="editor">
      <label className="field">
        <span>Name</span>
        <input value={draft.name} onChange={(e) => set({ name: e.target.value })} />
      </label>

      <label className="field-row">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        <span>Enabled</span>
      </label>

      <label className="field">
        <span>Match patterns (one per line)</span>
        <textarea
          rows={2}
          spellCheck={false}
          placeholder="*://*.google.com/*"
          value={matchesText}
          onChange={(e) => setMatchesText(e.target.value)}
        />
      </label>

      <div className="cols">
        <label className="field">
          <span>Include globs (optional)</span>
          <textarea
            rows={2}
            spellCheck={false}
            value={includeText}
            onChange={(e) => setIncludeText(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Exclude globs (optional)</span>
          <textarea
            rows={2}
            spellCheck={false}
            value={excludeText}
            onChange={(e) => setExcludeText(e.target.value)}
          />
        </label>
      </div>

      <div className="cols">
        <label className="field">
          <span>Run at</span>
          <select
            value={draft.runAt}
            onChange={(e) => set({ runAt: e.target.value as RunAt })}
          >
            <option value="document_start">document_start</option>
            <option value="document_end">document_end</option>
            <option value="document_idle">document_idle</option>
          </select>
        </label>
        <label className="field">
          <span>JS world</span>
          <select
            value={draft.jsWorld}
            onChange={(e) => set({ jsWorld: e.target.value as JsWorld })}
          >
            <option value="MAIN">MAIN (page globals, bypasses CSP)</option>
            <option value="ISOLATED">ISOLATED (DOM only, safer)</option>
          </select>
        </label>
      </div>

      <div className="field">
        <span>CSS</span>
        <CodeEditor language="css" value={draft.css} onChange={(v) => set({ css: v })} />
      </div>

      <div className="field">
        <span>JavaScript</span>
        <CodeEditor language="js" value={draft.js} onChange={(v) => set({ js: v })} />
      </div>

      {error && <div className="error">{error}</div>}

      <div className="actions">
        <button className="primary" onClick={save}>
          Save
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
