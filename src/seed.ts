import { Rule } from "./types";
import { newId } from "./storage";

/** The example rule from the PRD: visible CSS + console.log JS on every google subpage. */
export function seedRule(): Rule {
  const now = Date.now();
  return {
    id: newId(),
    name: "Google demo (CSS banner + console log)",
    enabled: true,
    matches: ["*://*.google.com/*"],
    includeGlobs: [],
    excludeGlobs: [],
    css: [
      "/* Appended to the end of <head>, so it overrides site styles. */",
      "body::before {",
      '  content: "🛠️ Site Customizer active";',
      "  position: fixed;",
      "  top: 0;",
      "  left: 0;",
      "  right: 0;",
      "  z-index: 2147483647;",
      "  background: #1a73e8;",
      "  color: #fff;",
      "  font: 600 13px/24px system-ui, sans-serif;",
      "  text-align: center;",
      "}",
    ].join("\n"),
    js: [
      "// Runs in MAIN world on every *.google.com/* page.",
      'console.log("[Site Customizer] hello from", location.href);',
    ].join("\n"),
    runAt: "document_idle",
    jsWorld: "MAIN",
    createdAt: now,
    updatedAt: now,
  };
}
