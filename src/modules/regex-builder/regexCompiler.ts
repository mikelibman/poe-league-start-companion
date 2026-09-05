// Shared by all three regex tools (spec: "one compile/output pipeline").
// PoE's vendor/stash search box treats the query as a substring-alternation
// regex, so joining candidate names with "|" is the whole trick — the only
// real work is per-token escaping and enforcing the ~250-char field limit.

export const CHAR_LIMIT = 250;

export function escapeRegexToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface CompiledRegex {
  regex: string;
  includedCount: number;
  droppedCount: number;
  overLimit: boolean;
}

/** Joins tokens with "|", escaping regex metacharacters per token. Primary
 * defense against the char limit is filtering the candidate list down
 * *before* this runs (act/vendor/bought-status, curated presets) — this is
 * only the fallback: if it's still too long, trailing tokens are dropped
 * and the caller is told how many, rather than silently truncating output
 * mid-token (spec: "warns and truncates as a fallback"). */
export function compileRegex(
  tokens: string[],
  limit: number = CHAR_LIMIT,
): CompiledRegex {
  const escaped = tokens.map(escapeRegexToken).filter((t) => t.length > 0);
  let regex = "";
  let includedCount = 0;

  for (const token of escaped) {
    const candidate = regex.length === 0 ? token : `${regex}|${token}`;
    if (candidate.length > limit) break;
    regex = candidate;
    includedCount += 1;
  }

  return {
    regex,
    includedCount,
    droppedCount: escaped.length - includedCount,
    overLimit: escaped.length > includedCount,
  };
}
