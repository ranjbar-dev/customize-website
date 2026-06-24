// Chrome match-pattern + glob validation.
// Match pattern grammar: <scheme>://<host><path>  (or the literal <all_urls>)
// https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns

const SCHEMES = ["*", "http", "https", "file", "ftp", "ws", "wss"];

/** Returns an error string, or null if the pattern is valid. */
export function validateMatchPattern(pattern: string): string | null {
  const p = pattern.trim();
  if (!p) return "Pattern is empty.";
  if (p === "<all_urls>") return null;

  const schemeSplit = p.indexOf("://");
  if (schemeSplit === -1) return "Missing '://' separator.";

  const scheme = p.slice(0, schemeSplit);
  if (!SCHEMES.includes(scheme)) {
    return `Unsupported scheme '${scheme}'.`;
  }

  const rest = p.slice(schemeSplit + 3);

  // file:// has no host.
  if (scheme === "file") {
    return rest.startsWith("/") ? null : "file:// path must start with '/'.";
  }

  const pathStart = rest.indexOf("/");
  if (pathStart === -1) return "Missing path; add '/' (use '/*' for everything).";

  const host = rest.slice(0, pathStart);
  if (!host) return "Missing host.";

  // host may be '*', '*.domain', or a literal host. '*' only as whole host or leading label.
  if (host !== "*") {
    const body = host.startsWith("*.") ? host.slice(2) : host;
    if (body.includes("*")) {
      return "'*' in host is only allowed as the whole host or a leading '*.'.";
    }
    if (!/^[a-z0-9.-]+$/i.test(body)) {
      return `Invalid host '${host}'.`;
    }
  }
  return null;
}

/** Glob validation is lenient (Chrome globs accept '*' and '?'); just reject empties. */
export function validateGlob(glob: string): string | null {
  return glob.trim() ? null : "Glob is empty.";
}

export interface RuleErrors {
  matches?: string[]; // one entry per match pattern (empty string = ok)
  includeGlobs?: string[];
  excludeGlobs?: string[];
  general?: string;
}

/** Validate the match/glob fields of a rule. Returns null if everything is valid. */
export function validateRulePatterns(rule: {
  matches: string[];
  includeGlobs: string[];
  excludeGlobs: string[];
}): RuleErrors | null {
  const nonEmptyMatches = rule.matches.filter((m) => m.trim());
  if (nonEmptyMatches.length === 0) {
    return { general: "At least one match pattern is required." };
  }

  const matches = rule.matches.map(validateMatchPattern).map((e) => e ?? "");
  const includeGlobs = rule.includeGlobs.map(validateGlob).map((e) => e ?? "");
  const excludeGlobs = rule.excludeGlobs.map(validateGlob).map((e) => e ?? "");

  const hasError = [...matches, ...includeGlobs, ...excludeGlobs].some(Boolean);
  return hasError ? { matches, includeGlobs, excludeGlobs } : null;
}

// ---- URL testing (used by the SPA re-apply and the popup's "rules on this tab") ----

const escAll = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Convert a Chrome match pattern to a RegExp, or null if it can't be parsed. */
function matchPatternToRegExp(pattern: string): RegExp | null {
  const p = pattern.trim();
  if (p === "<all_urls>") return /^(https?|file|ftp|wss?):\/\/.*$/i;

  const m = /^(\*|https?|file|ftp|wss?):\/\/([^/]*)(\/.*)$/.exec(p);
  if (!m) return null;
  const [, rawScheme, host, path] = m;
  const scheme = rawScheme === "*" ? "https?" : rawScheme;

  let hostRe: string;
  if (host === "*") hostRe = "[^/]+";
  else if (host === "") hostRe = ""; // file://
  else if (host.startsWith("*.")) hostRe = "(?:[^/]+\\.)?" + escAll(host.slice(2));
  else hostRe = escAll(host);

  // In match-pattern paths only '*' is a wildcard ('?' is literal).
  const pathRe = path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");

  return new RegExp(`^${scheme}://${hostRe}${pathRe}$`, "i");
}

/** Convert a glob ('*' and '?' wildcards) to an anchored RegExp. */
function globToRegExp(glob: string): RegExp {
  const body = glob
    .trim()
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${body}$`, "i");
}

/** Does `url` match this rule? matches OR-ed, includeGlobs required-if-present, excludeGlobs veto. */
export function ruleMatchesUrl(
  rule: { matches: string[]; includeGlobs: string[]; excludeGlobs: string[] },
  url: string,
): boolean {
  const matches = rule.matches.map((s) => s.trim()).filter(Boolean);
  const matched = matches.some((p) => {
    const re = matchPatternToRegExp(p);
    return re ? re.test(url) : false;
  });
  if (!matched) return false;

  const inc = rule.includeGlobs.map((s) => s.trim()).filter(Boolean);
  if (inc.length && !inc.some((g) => globToRegExp(g).test(url))) return false;

  const exc = rule.excludeGlobs.map((s) => s.trim()).filter(Boolean);
  if (exc.some((g) => globToRegExp(g).test(url))) return false;

  return true;
}
