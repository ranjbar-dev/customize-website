import { describe, it, expect } from "vitest";
import { exportRules, parseImport, mergeRules } from "./io";
import { Rule } from "./types";

const rule = (over: Partial<Rule> = {}): Rule => ({
  id: "a",
  name: "Test",
  enabled: true,
  matches: ["*://*.google.com/*"],
  includeGlobs: [],
  excludeGlobs: [],
  css: "body{color:red}",
  js: "console.log(1)",
  runAt: "document_idle",
  jsWorld: "MAIN",
  createdAt: 1,
  updatedAt: 2,
  ...over,
});

describe("export/import round-trip", () => {
  it("preserves all fields", () => {
    const rules = [rule(), rule({ id: "b", jsWorld: "ISOLATED", runAt: "document_start" })];
    expect(parseImport(exportRules(rules))).toEqual(rules);
  });

  it("accepts a bare array too", () => {
    expect(parseImport(JSON.stringify([rule()]))).toEqual([rule()]);
  });

  it("rejects non-JSON and missing rules", () => {
    expect(() => parseImport("nope")).toThrow();
    expect(() => parseImport(JSON.stringify({ foo: 1 }))).toThrow();
    expect(() => parseImport(JSON.stringify([{ name: "x" }]))).toThrow(); // no matches
  });

  it("defaults bad enum/missing fields", () => {
    const [r] = parseImport(
      JSON.stringify([{ matches: ["*://x/*"], runAt: "weird", jsWorld: "?" }]),
    );
    expect(r.runAt).toBe("document_idle");
    expect(r.jsWorld).toBe("MAIN");
    expect(r.id).toBeTruthy();
  });
});

describe("mergeRules", () => {
  it("regenerates colliding ids", () => {
    const existing = [rule({ id: "a" })];
    const merged = mergeRules(existing, [rule({ id: "a", name: "dup" })]);
    expect(merged).toHaveLength(2);
    expect(merged[1].id).not.toBe("a");
  });
});
