import { useEffect, useRef, useState } from "react";
import { Rule } from "../types";
import { getRules, setRules as persistRules, getLocalUsage } from "../storage";
import { useRules, useRuleErrors } from "../useRules";
import { emptyRule, duplicateRule, saveRule, deleteRule, toggleRule } from "../rules";
import { exportRules, parseImport, mergeRules } from "../io";
import { UserScriptsBanner } from "../UserScriptsBanner";
import { RuleList } from "./RuleList";
import { RuleEditor } from "./RuleEditor";

export function Options() {
  const rules = useRules();
  const errors = useRuleErrors();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [pendingImport, setPendingImport] = useState<Rule[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; quota: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Deep-link from the popup: ?newSite=<host> or ?edit=<id>.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newSite = params.get("newSite");
    const editId = params.get("edit");
    if (newSite) setEditing(emptyRule(`*://${newSite}/*`));
    else if (editId) getRules().then((rs) => rs.find((r) => r.id === editId) && setEditing(rs.find((r) => r.id === editId)!));
  }, []);

  useEffect(() => {
    getLocalUsage().then(setQuota);
  }, [rules]);

  async function onSave(r: Rule) {
    await saveRule(r);
    setEditing(null);
  }

  async function onDelete(r: Rule) {
    if (confirm(`Delete rule “${r.name}”?`)) await deleteRule(r.id);
  }

  async function onFile(file: File) {
    try {
      setPendingImport(parseImport(await file.text()));
      setNotice(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Import failed.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function applyImport(mode: "merge" | "replace") {
    if (!pendingImport) return;
    const next = mode === "replace" ? pendingImport : mergeRules(await getRules(), pendingImport);
    await persistRules(next);
    setNotice(`Imported ${pendingImport.length} rule(s) (${mode}).`);
    setPendingImport(null);
  }

  function download() {
    const blob = new Blob([exportRules(rules)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "site-customizer-rules.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const quotaPct = quota ? quota.used / quota.quota : 0;

  return (
    <main className="page">
      <header className="topbar">
        <h1>Site Customizer</h1>
        {!editing && (
          <div className="toolbar">
            <button className="primary" onClick={() => setEditing(emptyRule())}>
              New rule
            </button>
            <button onClick={download} disabled={rules.length === 0}>
              Export
            </button>
            <button onClick={() => fileRef.current?.click()}>Import</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </div>
        )}
      </header>

      <UserScriptsBanner />

      {quotaPct > 0.8 && quota && (
        <div className="warn">
          Storage is {Math.round(quotaPct * 100)}% full ({(quota.used / 1024).toFixed(0)} KB of{" "}
          {(quota.quota / 1024 / 1024).toFixed(0)} MB). Consider trimming large scripts.
        </div>
      )}

      {notice && <div className="notice">{notice}</div>}

      {pendingImport && (
        <div className="notice">
          Import {pendingImport.length} rule(s):{" "}
          <button onClick={() => applyImport("merge")}>Merge</button>{" "}
          <button onClick={() => applyImport("replace")}>Replace all</button>{" "}
          <button onClick={() => setPendingImport(null)}>Cancel</button>
        </div>
      )}

      {editing ? (
        <RuleEditor rule={editing} onSave={onSave} onCancel={() => setEditing(null)} />
      ) : (
        <RuleList
          rules={rules}
          errors={errors}
          onEdit={setEditing}
          onToggle={toggleRule}
          onDuplicate={(r) => saveRule(duplicateRule(r))}
          onDelete={onDelete}
        />
      )}
    </main>
  );
}
