import { readStore, writeStore } from "../../core/store";
import type { CurrencyCost, GemPlan } from "./types";

const PLANS_STORE = "gem_plans";
const PROGRESS_STORE = "gem_plan_progress";
const GEM_COSTS_STORE = "gem_costs";

interface GemPlansData {
  plans: GemPlan[];
  activePlanId: string | null;
}

const DEFAULT_PLANS_DATA: GemPlansData = { plans: [], activePlanId: null };

export async function loadPlans(): Promise<GemPlansData> {
  return readStore<GemPlansData>(PLANS_STORE, DEFAULT_PLANS_DATA);
}

export async function savePlans(data: GemPlansData): Promise<void> {
  await writeStore(PLANS_STORE, data);
}

export interface GemPlanProgress {
  boughtEntryIds: string[];
  /** `${planId}::${questId}` composite keys — which quest reward the buy
   * flow has resolved (taken, or explicitly skipped), same
   * plan-vs-progress split as boughtEntryIds: resets on a new run, since
   * a new league start means redoing every quest. */
  takenQuestKeys: string[];
}

const DEFAULT_PROGRESS: GemPlanProgress = { boughtEntryIds: [], takenQuestKeys: [] };

export async function loadProgress(): Promise<GemPlanProgress> {
  return readStore<GemPlanProgress>(PROGRESS_STORE, DEFAULT_PROGRESS);
}

export async function saveProgress(progress: GemPlanProgress): Promise<void> {
  await writeStore(PROGRESS_STORE, progress);
}

// The price of a specific gem from a vendor is fixed (doesn't scale with
// character level or how many you've bought) but does vary gem-to-gem —
// e.g. one might cost a Scroll of Wisdom, another an Orb of Chance. Since
// it's a property of the gem itself, learned once here, it auto-fills for
// every future plan that includes that gem instead of being re-entered
// per plan.
export type KnownGemCosts = Record<string, CurrencyCost>;

export async function loadGemCosts(): Promise<KnownGemCosts> {
  return readStore<KnownGemCosts>(GEM_COSTS_STORE, {});
}

export async function saveGemCosts(costs: KnownGemCosts): Promise<void> {
  await writeStore(GEM_COSTS_STORE, costs);
}
