import { useEffect, useState } from "react";
import { useReferenceData } from "../../core/ReferenceDataContext";
import { RegexOutput } from "./RegexOutput";
import { ExportImportPanel } from "./ExportImportPanel";
import type { RegexBuilderExport } from "./types";

function formatCategoryLabel(id: string): string {
  return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ItemBaseChecklistTabProps {
  load: () => Promise<RegexBuilderExport>;
  save: (data: RegexBuilderExport) => Promise<void>;
  emptyMessage?: string;
}

// Shared by the Gear tab and the Gambling tab: a curated, toggleable
// checklist by category (spec: "following the pattern used by poe.re")
// plus free-text custom entries. `load`/`save` let each tab keep its own
// persisted selection.
export function ItemBaseChecklistTab({
  load,
  save,
  emptyMessage,
}: ItemBaseChecklistTabProps) {
  const { data } = useReferenceData();
  const [selectedBases, setSelectedBases] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState("");
  const [customEntries, setCustomEntries] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load().then((saved) => {
      setSelectedBases(new Set(saved.selectedBases));
      setCustomEntries(saved.customEntries);
      setLoaded(true);
    });
    // Runs once per tab mount; `load` is stable across renders in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void save({ selectedBases: [...selectedBases], customEntries });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBases, customEntries, loaded]);

  function toggleBase(base: string, checked: boolean) {
    setSelectedBases((current) => {
      const next = new Set(current);
      if (checked) next.add(base);
      else next.delete(base);
      return next;
    });
  }

  function addCustom() {
    if (!customText.trim()) return;
    setCustomEntries((current) => [...current, customText.trim()]);
    setCustomText("");
  }

  function removeCustom(entry: string) {
    setCustomEntries((current) => current.filter((e) => e !== entry));
  }

  function handleImport(imported: RegexBuilderExport) {
    setSelectedBases(new Set(imported.selectedBases));
    setCustomEntries(imported.customEntries);
  }

  if (!loaded) return <p>Loading…</p>;

  const tokens = [...selectedBases, ...customEntries];

  return (
    <div>
      {!data || data.itemBases.length === 0 ? (
        <p>{emptyMessage ?? "No item-base presets loaded yet."}</p>
      ) : (
        data.itemBases.map((category) => (
          <div key={category.category}>
            <h3>{formatCategoryLabel(category.category)}</h3>
            <ul className="module-toggle-list">
              {category.bases.map((base) => (
                <li key={base}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedBases.has(base)}
                      onChange={(e) => toggleBase(base, e.currentTarget.checked)}
                    />
                    {base}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <h3>Custom entries</h3>
      <div className="row-buttons">
        <input
          value={customText}
          onChange={(e) => setCustomText(e.currentTarget.value)}
          placeholder="Custom search term"
        />
        <button onClick={addCustom}>Add</button>
      </div>
      {customEntries.length > 0 && (
        <ul className="module-toggle-list">
          {customEntries.map((entry) => (
            <li key={entry}>
              {entry} <button onClick={() => removeCustom(entry)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      <RegexOutput tokens={tokens} />
      <ExportImportPanel
        data={{ selectedBases: [...selectedBases], customEntries }}
        onImport={handleImport}
      />
    </div>
  );
}
