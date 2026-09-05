import { invoke } from "@tauri-apps/api/core";

// Mirrors reference-data/reference-data.json (see that file's README for
// the schema and its "starter data, not verified" status).

export interface QuestRewardEntry {
  id: string;
  act: number;
  quest: string;
  gem: string;
}

export interface VendorStockEntry {
  vendorId: string;
  act: number;
  vendor: string;
  gems: string[];
}

export interface ItemBaseCategory {
  category: string;
  bases: string[];
}

export interface ReferenceData {
  schemaVersion: number;
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
