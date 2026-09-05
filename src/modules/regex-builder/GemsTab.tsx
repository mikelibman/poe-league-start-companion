import { useMemo, useState } from "react";
import { useGemPlan } from "../gem-plan/GemPlanContext";
import { useVendorSelection } from "../../core/VendorSelectionContext";
import { RegexOutput } from "./RegexOutput";

// Pre-filtered to gems the active plan tags as sold by the selected vendor,
// minus anything already checked off bought — "keeps the regex short by
// construction, not just by truncation" (spec).
export function GemsTab() {
  const { activePlan, boughtEntryIds } = useGemPlan();
  const { selectedVendorId } = useVendorSelection();
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const candidates = useMemo(() => {
    if (!activePlan || !selectedVendorId) return [];
    return activePlan.entries.filter(
      (entry) =>
        entry.source.type === "vendor" &&
        entry.source.vendorId === selectedVendorId &&
        !boughtEntryIds.has(entry.id),
    );
  }, [activePlan, selectedVendorId, boughtEntryIds]);

  function toggle(id: string, included: boolean) {
    setExcludedIds((current) => {
      const next = new Set(current);
      if (included) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!activePlan) {
    return <p>Select a gem plan on the Gem Plan page first.</p>;
  }
  if (!selectedVendorId) {
    return <p>Select a vendor above to see gems available there.</p>;
  }

  const tokens = candidates
    .filter((entry) => !excludedIds.has(entry.id))
    .map((entry) => entry.gemName);

  return (
    <div>
      {candidates.length === 0 ? (
        <p>No unbought gems from this plan are sold by the selected vendor.</p>
      ) : (
        <ul className="module-toggle-list">
          {candidates.map((entry) => (
            <li key={entry.id}>
              <label>
                <input
                  type="checkbox"
                  checked={!excludedIds.has(entry.id)}
                  onChange={(e) => toggle(entry.id, e.currentTarget.checked)}
                />
                {entry.gemName} (Act {entry.act})
              </label>
            </li>
          ))}
        </ul>
      )}
      <RegexOutput tokens={tokens} />
    </div>
  );
}
