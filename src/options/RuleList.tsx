import { Rule } from "../types";

export function RuleList({
  rules,
  errors,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  rules: Rule[];
  errors: Record<string, string>;
  onEdit: (r: Rule) => void;
  onToggle: (id: string) => void;
  onDuplicate: (r: Rule) => void;
  onDelete: (r: Rule) => void;
}) {
  if (rules.length === 0) {
    return <p className="muted">No rules yet. Click “New rule” to add one.</p>;
  }
  return (
    <ul className="rule-list">
      {rules.map((r) => (
        <li key={r.id} className="rule-item">
          <input
            type="checkbox"
            checked={r.enabled}
            onChange={() => onToggle(r.id)}
            title="Enable / disable"
          />
          <div className="rule-meta" onClick={() => onEdit(r)}>
            <div className="rule-name">
              {r.name}
              {errors[r.id] && (
                <span className="badge" title={errors[r.id]}>
                  ⚠ error
                </span>
              )}
            </div>
            <div className="rule-sub">{r.matches.join("  ·  ") || "(no patterns)"}</div>
          </div>
          <div className="rule-actions">
            <button onClick={() => onEdit(r)}>Edit</button>
            <button onClick={() => onDuplicate(r)}>Duplicate</button>
            <button className="danger" onClick={() => onDelete(r)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
