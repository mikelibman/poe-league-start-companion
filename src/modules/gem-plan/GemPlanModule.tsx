import { useState } from "react";
import { useGemPlan } from "./GemPlanContext";
import { useReferenceData } from "../../core/ReferenceDataContext";
import { POE_CLASSES, type PoeClass } from "../../core/poeClasses";
import { parsePobCode } from "./pobImport";
import type { QuestRewardEntry } from "../../core/referenceData";
import type { GemPlan, GemPlanEntry, GemSource } from "./types";

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
    setPlanClass,
    addEntry,
    addEntries,
    removeEntry,
    moveEntry,
    toggleBought,
  } = useGemPlan();

  if (!loaded) {
    return <p>Loading gem plans…</p>;
  }

  // Defensive: a plan saved before this field existed won't have one yet.
  const planClass = activePlan?.characterClass;

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
          <div className="row-buttons">
            <span>Class:</span>
            <select
              value={planClass ?? ""}
              onChange={(e) =>
                setPlanClass(activePlan.id, e.target.value as PoeClass)
              }
            >
              <option value="" disabled>
                Select a class…
              </option>
              {POE_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
          {!planClass && (
            <p className="error-text">
              Pick a class above — quest and vendor gem options depend on it
              in PoE.
            </p>
          )}

          {planClass && (
            <QuickAdd
              planId={activePlan.id}
              characterClass={planClass}
              onAdd={addEntry}
            />
          )}
          <PobImport planId={activePlan.id} onImport={addEntries} />

          <h2>Gems (buy order)</h2>
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
                {activePlan.entries.map((entry, i) => (
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
                      <div className="row-buttons">
                        <button
                          onClick={() => moveEntry(activePlan.id, entry.id, "up")}
                          disabled={i === 0}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveEntry(activePlan.id, entry.id, "down")}
                          disabled={i === activePlan.entries.length - 1}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button onClick={() => removeEntry(activePlan.id, entry.id)}>
                          Remove
                        </button>
                      </div>
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

type QuickAddTab = number | "vendors";

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
  const acts = [...new Set((data?.questRewards ?? []).map((q) => q.act))].sort(
    (a, b) => a - b,
  );
  const [tab, setTab] = useState<QuickAddTab>(acts[0] ?? "vendors");

  return (
    <div>
      <h2>Add gems</h2>

      <div className="row-buttons">
        {acts.map((act) => (
          <button key={act} onClick={() => setTab(act)} disabled={tab === act}>
            Act {act}
          </button>
        ))}
        <button onClick={() => setTab("vendors")} disabled={tab === "vendors"}>
          Vendors
        </button>
      </div>

      {typeof tab === "number" && (
        <ActQuestList
          act={tab}
          planId={planId}
          characterClass={characterClass}
        />
      )}
      {tab === "vendors" && (
        <VendorBrowse planId={planId} characterClass={characterClass} onAdd={onAdd} />
      )}

      <CustomAdd planId={planId} onAdd={onAdd} />
    </div>
  );
}

function ActQuestList({
  act,
  planId,
  characterClass,
}: {
  act: number;
  planId: string;
  characterClass: PoeClass;
}) {
  const { data } = useReferenceData();
  const { isQuestTaken } = useGemPlan();

  const quests = (data?.questRewards ?? [])
    .filter((q) => q.act === act)
    .filter((q) => !isQuestTaken(planId, q.id))
    .sort((a, b) => a.order - b.order);

  if (quests.length === 0) {
    return <p>No quests left to take in Act {act}.</p>;
  }

  return (
    <div>
      {quests.map((quest) => (
        <QuestCard
          key={quest.id}
          quest={quest}
          planId={planId}
          characterClass={characterClass}
        />
      ))}
    </div>
  );
}

function QuestCard({
  quest,
  planId,
  characterClass,
}: {
  quest: QuestRewardEntry;
  planId: string;
  characterClass: PoeClass;
}) {
  const { takeQuestReward, skipQuest } = useGemPlan();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const directGems = quest.gemsByClass[characterClass] ?? [];

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleTake() {
    const entries: Omit<GemPlanEntry, "id">[] = [];
    for (const gem of directGems) {
      if (selected.has(`direct::${gem}`)) {
        entries.push({
          gemName: gem,
          act: quest.act,
          source: { type: "quest", label: quest.quest, questId: quest.id },
        });
      }
    }
    for (const unlock of quest.vendorUnlocks) {
      for (const gem of unlock.gemsByClass[characterClass] ?? []) {
        if (selected.has(`vendor::${unlock.vendorId}::${gem}`)) {
          entries.push({
            gemName: gem,
            act: quest.act,
            source: { type: "vendor", label: unlock.vendor, vendorId: unlock.vendorId },
          });
        }
      }
    }
    takeQuestReward(planId, quest.id, entries);
    setSelected(new Set());
  }

  return (
    <div className="quest-card">
      <h3>{quest.quest}</h3>

      {directGems.length > 0 && (
        <>
          <p>Reward gem(s) — pick any you're taking:</p>
          <ul className="module-toggle-list">
            {directGems.map((gem) => (
              <li key={gem}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(`direct::${gem}`)}
                    onChange={() => toggle(`direct::${gem}`)}
                  />
                  {gem}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {quest.vendorUnlocks.map((unlock) => {
        const gems = unlock.gemsByClass[characterClass] ?? [];
        if (gems.length === 0) return null;
        return (
          <details key={unlock.vendorId}>
            <summary>
              Also unlocks at {unlock.vendor} ({gems.length} gem
              {gems.length === 1 ? "" : "s"})
            </summary>
            <ul className="module-toggle-list">
              {gems.map((gem) => (
                <li key={gem}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.has(`vendor::${unlock.vendorId}::${gem}`)}
                      onChange={() => toggle(`vendor::${unlock.vendorId}::${gem}`)}
                    />
                    {gem}
                  </label>
                </li>
              ))}
            </ul>
          </details>
        );
      })}

      <div className="row-buttons">
        <button onClick={handleTake} disabled={selected.size === 0}>
          Add selected &amp; mark done
        </button>
        <button onClick={() => skipQuest(planId, quest.id)}>
          Skip (nothing wanted)
        </button>
      </div>
    </div>
  );
}

function VendorBrowse({
  planId,
  characterClass,
  onAdd,
}: {
  planId: string;
  characterClass: PoeClass;
  onAdd: (planId: string, entry: { gemName: string; act: number; source: GemSource }) => void;
}) {
  const { data } = useReferenceData();
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedVendorGem, setSelectedVendorGem] = useState("");

  const vendorEntry = data?.vendorStock.find((v) => v.vendorId === selectedVendorId);

  function addFromVendor() {
    if (!vendorEntry || !selectedVendorGem) return;
    onAdd(planId, {
      gemName: selectedVendorGem,
      act: vendorEntry.act,
      source: { type: "vendor", label: vendorEntry.vendor, vendorId: vendorEntry.vendorId },
    });
    setSelectedVendorGem("");
  }

  if (!data || data.vendorStock.length === 0) {
    return <p>No vendor data loaded yet.</p>;
  }

  return (
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
  );
}

function CustomAdd({
  planId,
  onAdd,
}: {
  planId: string;
  onAdd: (planId: string, entry: { gemName: string; act: number; source: GemSource }) => void;
}) {
  const [customGemName, setCustomGemName] = useState("");
  const [customAct, setCustomAct] = useState("1");
  const [customSourceType, setCustomSourceType] = useState<"quest" | "vendor" | "unspecified">(
    "unspecified",
  );
  const [customSourceLabel, setCustomSourceLabel] = useState("");

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
