import { invoke } from "@tauri-apps/api/core";
import type { PoeClass } from "./poeClasses";

// Mirrors reference-data/reference-data.json (see that file's README for
// the schema, sourcing, and coverage notes). Quest rewards and vendor
// stock are both class-aware — which gems a quest offers, and which gems
// a vendor sells, genuinely depend on character class in PoE.

export type GemsByClass = Record<PoeClass, string[]>;

export interface VendorUnlock {
  vendorId: string;
  vendor: string;
  gemsByClass: GemsByClass;
}

export interface QuestRewardEntry {
  id: string;
  act: number;
  /** Position in this act's completion sequence — see README for sourcing. */
  order: number;
  quest: string;
  /** Can be empty for every class — some quests only unlock vendor stock,
   * no direct reward (e.g. "The Root of the Problem"). */
  gemsByClass: GemsByClass;
  /** Vendor stock this quest unlocks, if any — completing a quest often
   * does this *and* grants a direct reward at the same time. */
  vendorUnlocks: VendorUnlock[];
}

export interface VendorStockEntry {
  vendorId: string;
  act: number;
  vendor: string;
  gemsByClass: GemsByClass;
}

export interface ItemBaseCategory {
  category: string;
  bases: string[];
}

export interface ReferenceData {
  schemaVersion: number;
  classes: PoeClass[];
  questRewards: QuestRewardEntry[];
  vendorStock: VendorStockEntry[];
  itemBases: ItemBaseCategory[];
  gamblingVendors: string[];
}

export interface ReferenceDataResult {
  data: ReferenceData;
  source: "network" | "cache";
  cachedAtUnixSeconds: number | null;
}

/** Fetches the hosted reference feed, falling back to the local cache if
 * the network is unreachable (spec D16 — used mid-race, sometimes offline). */
export async function loadReferenceData(): Promise<ReferenceDataResult> {
  return invoke<ReferenceDataResult>("refdata_load");
}
