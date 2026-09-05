import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadPlans, savePlans, loadProgress, saveProgress } from "./store";
import { useTimer } from "../timer/TimerContext";
import type { GemPlan, GemPlanEntry } from "./types";
import type { PoeClass } from "../../core/poeClasses";

function questKey(planId: string, questId: string): string {
  return `${planId}::${questId}`;
}

interface GemPlanContextValue {
  plans: GemPlan[];
  activePlanId: string | null;
  activePlan: GemPlan | null;
  boughtEntryIds: Set<string>;
  loaded: boolean;
  setActivePlanId: (id: string | null) => void;
  createPlan: (name: string, characterClass: PoeClass) => void;
  deletePlan: (id: string) => void;
  setPlanClass: (planId: string, characterClass: PoeClass) => void;
  addEntry: (planId: string, entry: Omit<GemPlanEntry, "id">) => void;
  addEntries: (planId: string, entries: Omit<GemPlanEntry, "id">[]) => void;
  removeEntry: (planId: string, entryId: string) => void;
  moveEntry: (planId: string, entryId: string, direction: "up" | "down") => void;
  toggleBought: (entryId: string, bought: boolean) => void;
  isQuestTaken: (planId: string, questId: string) => boolean;
  /** Adds the given gems (direct reward and/or vendor-unlock picks) and
   * marks the quest resolved in one action — a quest that's been resolved
   * (taken or skipped) drops out of the picker either way. */
  takeQuestReward: (
    planId: string,
    questId: string,
    entries: Omit<GemPlanEntry, "id">[],
  ) => void;
  skipQuest: (planId: string, questId: string) => void;
}

const GemPlanContext = createContext<GemPlanContextValue | null>(null);

export function GemPlanProvider({ children }: { children: ReactNode }) {
  const { run } = useTimer();
  const [plans, setPlans] = useState<GemPlan[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);
  const [boughtEntryIds, setBoughtEntryIds] = useState<Set<string>>(new Set());
  const [takenQuestKeys, setTakenQuestKeys] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([loadPlans(), loadProgress()]).then(([plansData, progress]) => {
      setPlans(plansData.plans);
      setActivePlanIdState(plansData.activePlanId);
      setBoughtEntryIds(new Set(progress.boughtEntryIds));

      // Backfill: a plan saved before quest-taken tracking existed can
      // already have entries sourced from a quest — treat those quests as
      // already resolved rather than showing them as available again
      // (which would invite adding duplicates of gems already in the plan).
      const takenKeys = new Set(progress.takenQuestKeys ?? []);
      for (const plan of plansData.plans) {
        for (const entry of plan.entries) {
          if (entry.source.type === "quest" && entry.source.questId) {
            takenKeys.add(questKey(plan.id, entry.source.questId));
          }
        }
      }
      setTakenQuestKeys(takenKeys);
      if (takenKeys.size !== (progress.takenQuestKeys ?? []).length) {
        void saveProgress({
          boughtEntryIds: progress.boughtEntryIds,
          takenQuestKeys: [...takenKeys],
        });
      }

      setLoaded(true);
    });
  }, []);

  // "Bought" progress (and which quest rewards have been resolved) resets
  // automatically each time a new run begins (spec: Plan vs. progress) —
  // a new run is exactly what TimerContext's `run.startedAtMs` changing
  // represents, and a new league start means redoing every quest.
  const lastRunStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (!loaded || !run) return;
    if (lastRunStartRef.current === null) {
      lastRunStartRef.current = run.startedAtMs;
      return;
    }
    if (run.startedAtMs !== lastRunStartRef.current) {
      lastRunStartRef.current = run.startedAtMs;
      setBoughtEntryIds(new Set());
      setTakenQuestKeys(new Set());
      void saveProgress({ boughtEntryIds: [], takenQuestKeys: [] });
    }
  }, [run, loaded]);

  function persist(nextPlans: GemPlan[], nextActiveId: string | null) {
    setPlans(nextPlans);
    setActivePlanIdState(nextActiveId);
    void savePlans({ plans: nextPlans, activePlanId: nextActiveId });
  }

  function setActivePlanId(id: string | null) {
    persist(plans, id);
  }

  function createPlan(name: string, characterClass: PoeClass) {
    const plan: GemPlan = {
      id: crypto.randomUUID(),
      name,
      characterClass,
      entries: [],
    };
    persist([...plans, plan], plan.id);
  }

  function deletePlan(id: string) {
    const nextPlans = plans.filter((p) => p.id !== id);
    const nextActive =
      activePlanId === id ? (nextPlans[0]?.id ?? null) : activePlanId;
    persist(nextPlans, nextActive);
  }

  function updatePlan(planId: string, updater: (plan: GemPlan) => GemPlan) {
    persist(
      plans.map((p) => (p.id === planId ? updater(p) : p)),
      activePlanId,
    );
  }

  // Editable after creation too, not just fixed at plan-creation time —
  // also how a plan saved before this field existed gets one assigned.
  function setPlanClass(planId: string, characterClass: PoeClass) {
    updatePlan(planId, (plan) => ({ ...plan, characterClass }));
  }

  function addEntry(planId: string, entry: Omit<GemPlanEntry, "id">) {
    updatePlan(planId, (plan) => ({
      ...plan,
      entries: [...plan.entries, { ...entry, id: crypto.randomUUID() }],
    }));
  }

  function addEntries(planId: string, entries: Omit<GemPlanEntry, "id">[]) {
    updatePlan(planId, (plan) => ({
      ...plan,
      entries: [
        ...plan.entries,
        ...entries.map((entry) => ({ ...entry, id: crypto.randomUUID() })),
      ],
    }));
  }

  function removeEntry(planId: string, entryId: string) {
    updatePlan(planId, (plan) => ({
      ...plan,
      entries: plan.entries.filter((e) => e.id !== entryId),
    }));
  }

  // Buy-order/priority reordering — swaps with the neighboring entry.
  function moveEntry(planId: string, entryId: string, direction: "up" | "down") {
    updatePlan(planId, (plan) => {
      const index = plan.entries.findIndex((e) => e.id === entryId);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= plan.entries.length) {
        return plan;
      }
      const entries = [...plan.entries];
      [entries[index], entries[swapWith]] = [entries[swapWith], entries[index]];
      return { ...plan, entries };
    });
  }

  function toggleBought(entryId: string, bought: boolean) {
    setBoughtEntryIds((current) => {
      const next = new Set(current);
      if (bought) next.add(entryId);
      else next.delete(entryId);
      void saveProgress({
        boughtEntryIds: [...next],
        takenQuestKeys: [...takenQuestKeys],
      });
      return next;
    });
  }

  function isQuestTaken(planId: string, questId: string): boolean {
    return takenQuestKeys.has(questKey(planId, questId));
  }

  function markQuestTaken(planId: string, questId: string) {
    setTakenQuestKeys((current) => {
      const next = new Set(current);
      next.add(questKey(planId, questId));
      void saveProgress({
        boughtEntryIds: [...boughtEntryIds],
        takenQuestKeys: [...next],
      });
      return next;
    });
  }

  function takeQuestReward(
    planId: string,
    questId: string,
    entries: Omit<GemPlanEntry, "id">[],
  ) {
    if (entries.length > 0) addEntries(planId, entries);
    markQuestTaken(planId, questId);
  }

  function skipQuest(planId: string, questId: string) {
    markQuestTaken(planId, questId);
  }

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  return (
    <GemPlanContext.Provider
      value={{
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
        isQuestTaken,
        takeQuestReward,
        skipQuest,
      }}
    >
      {children}
    </GemPlanContext.Provider>
  );
}

export function useGemPlan(): GemPlanContextValue {
  const ctx = useContext(GemPlanContext);
  if (!ctx) {
    throw new Error("useGemPlan must be used within a GemPlanProvider");
  }
  return ctx;
}
