import { useState } from "react";
import { useGemPlan } from "./GemPlanContext";
import { useReferenceData } from "../../core/ReferenceDataContext";
import { POE_CLASSES, type PoeClass } from "../../core/poeClasses";
import { parsePobCode } from "./pobImport";
import type { GemPlan, GemSource } from "./types";

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
          <p>
            Class: <strong>{activePlan.characterClass}</strong> — quest and
            vendor gem options below are filtered to what's actually
            available to this class.
          </p>

          <QuickAdd
            planId={activePlan.id}
            characterClass={activePlan.characterClass}
            onAdd={addEntry}
          />
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
  plans: GemPlan[];
  activePlanId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, characterClass: PoeClass) => void;
  onDelete: (id: string) => void;
}) {
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanClass, setNewPlanClass] = useState<PoeClass>(POE_CLASSES[0]);

  function handleCreate() {
    if (!newPlanName.trim()) return;
    onCreate(newPlanName.trim(), newPlanClass);
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
            {plan.name} ({plan.characterClass})
          </option>
        ))}
      </select>
      <input
        placeholder="New plan name"
        value={newPlanName}
        onChange={(e) => setNewPlanName(e.currentTarget.value)}
      />
      <select
        value={newPlanClass}
        onChange={(e) => setNewPlanClass(e.target.value as PoeClass)}
      >
        {POE_CLASSES.map((cls) => (
          <option key={cls} value={cls}>
            {cls}
          </option>
        ))}
      </select>
      <button onClick={handleCreate}>Create Plan</button>
      {activePlanId && (
        <button onClick={() => onDelete(activePlanId)}>Delete Plan</button>
      )}
    </div>
  );
}

function QuickAdd({
  planId,
  characterClass,
  onAdd,
}: {
  planId: string;
  characterClass: PoeClass;
  onAdd: (planId: string, entry: { gemName: string; act: number; source: GemSource }) => void;
}) {
  const { data } = useReferenceData();

  const [selectedQuestGem, setSelectedQuestGem] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedVendorGem, setSelectedVendorGem] = useState("");

  const [customGemName, setCustomGemName] = useState("");
  const [customAct, setCustomAct] = useState("1");
  const [customSourceType, setCustomSourceType] = useState<"quest" | "vendor" | "unspecified">(
    "unspecified",
  );
  const [customSourceLabel, setCustomSourceLabel] = useState("");

  const vendorEntry = data?.vendorStock.find((v) => v.vendorId === selectedVendorId);

  // Flatten quest rewards to one option per (quest, gem) pair for this
  // class — a quest offers a *choice* of gems, not the whole list at once.
  const questOptions =
    data?.questRewards.flatMap((quest) =>
      (quest.gemsByClass[characterClass] ?? []).map((gem) => ({
        key: `${quest.id}::${gem}`,
        act: quest.act,
        questId: quest.id,
        questName: quest.quest,
        gem,
      })),
    ) ?? [];

  function addFromQuest() {
    const option = questOptions.find((o) => o.key === selectedQuestGem);
    if (!option) return;
    onAdd(planId, {
      gemName: option.gem,
      act: option.act,
      source: { type: "quest", label: option.questName, questId: option.questId },
    });
    setSelectedQuestGem("");
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

      {questOptions.length > 0 && (
        <div className="row-buttons">
          <select
            value={selectedQuestGem}
            onChange={(e) => setSelectedQuestGem(e.target.value)}
          >
            <option value="">Quest reward…</option>
            {questOptions.map((option) => (
              <option key={option.key} value={option.key}>
                Act {option.act} — {option.questName}: {option.gem}
              </option>
            ))}
          </select>
          <button onClick={addFromQuest} disabled={!selectedQuestGem}>
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
            {vendorEntry?.gemsByClass[characterClass]?.map((gem) => (
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
