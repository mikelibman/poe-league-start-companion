import { useState } from "react";
import { useGemPlan } from "./GemPlanContext";
import { useReferenceData } from "../../core/ReferenceDataContext";
import { parsePobCode } from "./pobImport";
import type { GemSource } from "./types";

function sourceLabel(source: GemSource): string {
  switch (source.type) {
    case "quest":
      return `Quest: ${source.label}`;
    case "vendor":
      return `Vendor: ${source.label}`;
    case "unspecified":
      return "Unspecified — needs tagging";
  }
}

export function GemPlanModule() {
  const {
    plans,
    activePlanId,
    activePlan,
    boughtEntryIds,
    loaded,
    setActivePlanId,
    createPlan,
    deletePlan,
    addEntry,
    addEntries,
    removeEntry,
    toggleBought,
  } = useGemPlan();

  if (!loaded) {
    return <p>Loading gem plans…</p>;
  }

  return (
    <section>
      <h1>Gem Plan</h1>

      <PlanSelector
        plans={plans}
        activePlanId={activePlanId}
        onSelect={setActivePlanId}
        onCreate={createPlan}
        onDelete={deletePlan}
      />

      {activePlan ? (
        <>
          <QuickAdd planId={activePlan.id} onAdd={addEntry} />
          <PobImport planId={activePlan.id} onImport={addEntries} />

          <h2>Gems</h2>
          {activePlan.entries.length === 0 ? (
            <p>No gems in this plan yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Bought</th>
                  <th>Gem</th>
                  <th>Act</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activePlan.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={boughtEntryIds.has(entry.id)}
                        onChange={(e) =>
                          toggleBought(entry.id, e.currentTarget.checked)
                        }
                      />
                    </td>
                    <td>{entry.gemName}</td>
                    <td>{entry.act}</td>
                    <td>{sourceLabel(entry.source)}</td>
                    <td>
                      <button onClick={() => removeEntry(activePlan.id, entry.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <p>Create a plan above to start adding gems.</p>
      )}
    </section>
  );
}

function PlanSelector({
  plans,
  activePlanId,
  onSelect,
  onCreate,
  onDelete,
}: {
  plans: { id: string; name: string }[];
  activePlanId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [newPlanName, setNewPlanName] = useState("");

  function handleCreate() {
    if (!newPlanName.trim()) return;
    onCreate(newPlanName.trim());
    setNewPlanName("");
  }

  return (
    <div className="row-buttons">
      <select
        value={activePlanId ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        <option value="">Select a plan…</option>
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name}
          </option>
        ))}
      </select>
      <input
        placeholder="New plan name"
        value={newPlanName}
        onChange={(e) => setNewPlanName(e.currentTarget.value)}
      />
      <button onClick={handleCreate}>Create Plan</button>
      {activePlanId && (
        <button onClick={() => onDelete(activePlanId)}>Delete Plan</button>
      )}
    </div>
  );
}

function QuickAdd({
  planId,
  onAdd,
}: {
  planId: string;
  onAdd: (planId: string, entry: { gemName: string; act: number; source: GemSource }) => void;
}) {
  const { data } = useReferenceData();

  const [selectedQuestId, setSelectedQuestId] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedVendorGem, setSelectedVendorGem] = useState("");

  const [customGemName, setCustomGemName] = useState("");
  const [customAct, setCustomAct] = useState("1");
  const [customSourceType, setCustomSourceType] = useState<"quest" | "vendor" | "unspecified">(
    "unspecified",
  );
  const [customSourceLabel, setCustomSourceLabel] = useState("");

  const vendorEntry = data?.vendorStock.find((v) => v.vendorId === selectedVendorId);

  function addFromQuest() {
    const quest = data?.questRewards.find((q) => q.id === selectedQuestId);
    if (!quest) return;
    onAdd(planId, {
      gemName: quest.gem,
      act: quest.act,
      source: { type: "quest", label: quest.quest, questId: quest.id },
    });
    setSelectedQuestId("");
  }

  function addFromVendor() {
    if (!vendorEntry || !selectedVendorGem) return;
    onAdd(planId, {
      gemName: selectedVendorGem,
      act: vendorEntry.act,
      source: { type: "vendor", label: vendorEntry.vendor, vendorId: vendorEntry.vendorId },
    });
    setSelectedVendorGem("");
  }

  function addCustom() {
    if (!customGemName.trim()) return;
    const source: GemSource =
      customSourceType === "unspecified"
        ? { type: "unspecified" }
        : { type: customSourceType, label: customSourceLabel.trim() };
    onAdd(planId, {
      gemName: customGemName.trim(),
      act: Number(customAct) || 1,
      source,
    });
    setCustomGemName("");
    setCustomSourceLabel("");
  }

  return (
    <div>
      <h2>Add gems</h2>

      {data && data.questRewards.length > 0 && (
        <div className="row-buttons">
          <select
            value={selectedQuestId}
            onChange={(e) => setSelectedQuestId(e.target.value)}
          >
            <option value="">Quest reward…</option>
            {data.questRewards.map((quest) => (
              <option key={quest.id} value={quest.id}>
                Act {quest.act} — {quest.quest}: {quest.gem}
              </option>
            ))}
          </select>
          <button onClick={addFromQuest} disabled={!selectedQuestId}>
            Add
          </button>
        </div>
      )}

      {data && data.vendorStock.length > 0 && (
        <div className="row-buttons">
          <select
            value={selectedVendorId}
            onChange={(e) => {
              setSelectedVendorId(e.target.value);
              setSelectedVendorGem("");
            }}
          >
            <option value="">Vendor…</option>
            {data.vendorStock.map((vendor) => (
              <option key={vendor.vendorId} value={vendor.vendorId}>
                Act {vendor.act} — {vendor.vendor}
              </option>
            ))}
          </select>
          <select
            value={selectedVendorGem}
            onChange={(e) => setSelectedVendorGem(e.target.value)}
            disabled={!vendorEntry}
          >
            <option value="">Gem…</option>
            {vendorEntry?.gems.map((gem) => (
              <option key={gem} value={gem}>
                {gem}
              </option>
            ))}
          </select>
          <button onClick={addFromVendor} disabled={!vendorEntry || !selectedVendorGem}>
            Add
          </button>
        </div>
      )}

      <div className="row-buttons">
        <input
          placeholder="Gem name"
          value={customGemName}
          onChange={(e) => setCustomGemName(e.currentTarget.value)}
        />
        <input
          className="act-input"
          placeholder="Act"
          value={customAct}
          onChange={(e) => setCustomAct(e.currentTarget.value)}
        />
        <select
          value={customSourceType}
          onChange={(e) =>
            setCustomSourceType(e.target.value as "quest" | "vendor" | "unspecified")
          }
        >
          <option value="unspecified">Unspecified</option>
          <option value="quest">Quest</option>
          <option value="vendor">Vendor</option>
        </select>
        {customSourceType !== "unspecified" && (
          <input
            placeholder={customSourceType === "quest" ? "Quest name" : "Vendor name"}
            value={customSourceLabel}
            onChange={(e) => setCustomSourceLabel(e.currentTarget.value)}
          />
        )}
        <button onClick={addCustom}>Add custom</button>
      </div>
    </div>
  );
}

function PobImport({
  planId,
  onImport,
}: {
  planId: string;
  onImport: (
    planId: string,
    entries: { gemName: string; act: number; source: GemSource }[],
  ) => void;
}) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleImport() {
    setStatus(null);
    setIsError(false);
    try {
      const result = await parsePobCode(code);
      onImport(
        planId,
        result.gemNames.map((gemName) => ({
          gemName,
          act: 1,
          source: { type: "unspecified" as const },
        })),
      );
      setStatus(
        `Imported ${result.gemNames.length} gem${result.gemNames.length === 1 ? "" : "s"} — tag their act/source above.`,
      );
      setCode("");
    } catch (e) {
      setIsError(true);
      setStatus(String(e));
    }
  }

  return (
    <div>
      <h2>Import from Path of Building</h2>
      <p>
        Paste an export code (not verified against a real PoB build in this
        environment — please sanity-check the result).
      </p>
      <textarea
        rows={3}
        style={{ width: "100%", maxWidth: "40em" }}
        value={code}
        onChange={(e) => setCode(e.currentTarget.value)}
        placeholder="Paste Path of Building export code…"
      />
      <div className="row-buttons">
        <button onClick={handleImport} disabled={!code.trim()}>
          Import
        </button>
      </div>
      {status && <p className={isError ? "error-text" : undefined}>{status}</p>}
    </div>
  );
}
