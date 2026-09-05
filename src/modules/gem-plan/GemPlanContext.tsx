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

interface GemPlanContextValue {
  plans: GemPlan[];
  activePlanId: string | null;
  activePlan: GemPlan | null;
  boughtEntryIds: Set<string>;
  loaded: boolean;
  setActivePlanId: (id: string | null) => void;
  createPlan: (name: string, characterClass: PoeClass) => void;
  deletePlan: (id: string) => void;
  addEntry: (planId: string, entry: Omit<GemPlanEntry, "id">) => void;
  addEntries: (planId: string, entries: Omit<GemPlanEntry, "id">[]) => void;
  removeEntry: (planId: string, entryId: string) => void;
  toggleBought: (entryId: string, bought: boolean) => void;
}

const GemPlanContext = createContext<GemPlanContextValue | null>(null);

export function GemPlanProvider({ children }: { children: ReactNode }) {
  const { run } = useTimer();
  const [plans, setPlans] = useState<GemPlan[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);
  const [boughtEntryIds, setBoughtEntryIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([loadPlans(), loadProgress()]).then(([plansData, progress]) => {
      setPlans(plansData.plans);
      setActivePlanIdState(plansData.activePlanId);
      setBoughtEntryIds(new Set(progress.boughtEntryIds));
      setLoaded(true);
    });
  }, []);

  // "Bought" progress resets automatically each time a new run begins
  // (spec: Plan vs. progress) — a new run is exactly what TimerContext's
  // `run.startedAtMs` changing represents.
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
      void saveProgress({ boughtEntryIds: [] });
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

  function toggleBought(entryId: string, bought: boolean) {
    setBoughtEntryIds((current) => {
      const next = new Set(current);
      if (bought) next.add(entryId);
      else next.delete(entryId);
      void saveProgress({ boughtEntryIds: [...next] });
      return next;
    });
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
        addEntry,
        addEntries,
        removeEntry,
        toggleBought,
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
