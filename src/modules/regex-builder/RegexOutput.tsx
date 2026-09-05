import { compileRegex, CHAR_LIMIT } from "./regexCompiler";

export function RegexOutput({ tokens }: { tokens: string[] }) {
  const compiled = compileRegex(tokens);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(compiled.regex);
    } catch {
      // Clipboard access can fail (permissions/focus) — non-critical, the
      // text is still visible and selectable in the box below.
    }
  }

  return (
    <div>
      <textarea
        readOnly
        rows={2}
        className="regex-output"
        value={compiled.regex}
      />
      <p>
        {compiled.regex.length} / {CHAR_LIMIT} characters, {compiled.includedCount}{" "}
        item{compiled.includedCount === 1 ? "" : "s"}
        {compiled.overLimit && (
          <span className="error-text">
            {" "}
            — {compiled.droppedCount} item{compiled.droppedCount === 1 ? "" : "s"}{" "}
            dropped, over the character limit
          </span>
        )}
      </p>
      <button onClick={handleCopy} disabled={!compiled.regex}>
        Copy
      </button>
    </div>
  );
}
