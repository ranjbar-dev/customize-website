import { describe, it, expect } from "vitest";
import { validateMatchPattern, validateRulePatterns, ruleMatchesUrl } from "./matching";

describe("validateMatchPattern", () => {
  it("accepts valid patterns", () => {
    for (const p of [
      "*://*.google.com/*",
      "https://google.com/search*",
      "http://example.com/",
      "<all_urls>",
      "file:///home/user/notes.txt",
      "*://*/*",
    ]) {
      expect(validateMatchPattern(p), p).toBeNull();
    }
  });

  it("rejects invalid patterns", () => {
    for (const p of [
      "", // empty
      "google.com/*", // no scheme separator
      "gopher://example.com/*", // unsupported scheme
      "https://google.com", // missing path
      "*://goo*gle.com/*", // '*' mid-host
      "https:///*", // missing host
    ]) {
      expect(validateMatchPattern(p), p).not.toBeNull();
    }
  });
});

describe("validateRulePatterns", () => {
  it("requires at least one match pattern", () => {
    const err = validateRulePatterns({ matches: [], includeGlobs: [], excludeGlobs: [] });
    expect(err?.general).toBeTruthy();
  });

  it("passes a clean rule", () => {
    expect(
      validateRulePatterns({
        matches: ["*://*.google.com/*"],
        includeGlobs: [],
        excludeGlobs: [],
      }),
    ).toBeNull();
  });

  it("flags a bad pattern by index", () => {
    const err = validateRulePatterns({
      matches: ["*://*.google.com/*", "bad-pattern"],
      includeGlobs: [],
      excludeGlobs: [],
    });
    expect(err?.matches?.[0]).toBe("");
    expect(err?.matches?.[1]).toBeTruthy();
  });
});

describe("ruleMatchesUrl", () => {
  const r = (over: Partial<Parameters<typeof ruleMatchesUrl>[0]> = {}) => ({
    matches: ["*://*.google.com/*"],
    includeGlobs: [],
    excludeGlobs: [],
    ...over,
  });

  it("matches subdomains and the bare domain", () => {
    expect(ruleMatchesUrl(r(), "https://www.google.com/search?q=x")).toBe(true);
    expect(ruleMatchesUrl(r(), "https://google.com/")).toBe(true);
    expect(ruleMatchesUrl(r(), "http://a.b.google.com/maps")).toBe(true);
  });

  it("rejects non-matching hosts", () => {
    expect(ruleMatchesUrl(r(), "https://example.com/")).toBe(false);
    expect(ruleMatchesUrl(r(), "https://notgoogle.com/")).toBe(false);
  });

  it("applies include and exclude globs", () => {
    expect(ruleMatchesUrl(r({ includeGlobs: ["*/search*"] }), "https://google.com/search")).toBe(true);
    expect(ruleMatchesUrl(r({ includeGlobs: ["*/search*"] }), "https://google.com/maps")).toBe(false);
    expect(ruleMatchesUrl(r({ excludeGlobs: ["*/maps*"] }), "https://google.com/maps")).toBe(false);
  });
});
