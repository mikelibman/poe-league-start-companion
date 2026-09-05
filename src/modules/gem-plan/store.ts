import { readStore, writeStore } from "../../core/store";
import type { GemPlan } from "./types";

const PLANS_STORE = "gem_plans";
const PROGRESS_STORE = "gem_plan_progress";

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
}

const DEFAULT_PROGRESS: GemPlanProgress = { boughtEntryIds: [] };

export async function loadProgress(): Promise<GemPlanProgress> {
  return readStore<GemPlanProgress>(PROGRESS_STORE, DEFAULT_PROGRESS);
}

export async function saveProgress(progress: GemPlanProgress): Promise<void> {
  await writeStore(PROGRESS_STORE, progress);
}
