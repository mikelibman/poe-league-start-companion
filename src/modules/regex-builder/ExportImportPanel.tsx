import { useState } from "react";
import type { RegexBuilderExport } from "./types";

export function ExportImportPanel({
  data,
  onImport,
}: {
  data: RegexBuilderExport;
  onImport: (data: RegexBuilderExport) => void;
}) {
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  function handleImport() {
    try {
      const parsed: unknown = JSON.parse(importText);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray((parsed as RegexBuilderExport).selectedBases) ||
        !Array.isArray((parsed as RegexBuilderExport).customEntries)
      ) {
        throw new Error(
          "expected JSON shaped like { selectedBases: string[], customEntries: string[] }",
        );
      }
      const imported = parsed as RegexBuilderExport;
      onImport({
        selectedBases: imported.selectedBases,
        customEntries: imported.customEntries,
      });
      setImportError(null);
      setImportText("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <details>
      <summary>Export / Import</summary>
      <p>Export (copy this to back up or share your selection):</p>
      <textarea
        readOnly
        rows={3}
        className="regex-output"
        value={JSON.stringify(data)}
      />
      <p>Import (paste previously exported JSON):</p>
      <textarea
        rows={3}
        className="regex-output"
        value={importText}
        onChange={(e) => setImportText(e.currentTarget.value)}
      />
      <div className="row-buttons">
        <button onClick={handleImport} disabled={!importText.trim()}>
          Import
        </button>
      </div>
      {importError && <p className="error-text">{importError}</p>}
    </details>
  );
}
