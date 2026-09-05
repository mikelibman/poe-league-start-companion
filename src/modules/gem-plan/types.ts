// Availability tagging (spec: "quest reward or vendor purchase") — an
// entry can be linked back to reference data (questId/vendorId, used by
// the Issue #6 regex builder to filter to what's currently buyable) or
// left as free-text for anything reference data doesn't cover yet.
// "unspecified" is the state a freshly PoB-imported gem starts in, since
// PoB has no notion of quest/vendor availability at all.
export type GemSource =
  | { type: "quest"; label: string; questId?: string }
  | { type: "vendor"; label: string; vendorId?: string }
  | { type: "unspecified" };

export interface GemPlanEntry {
  id: string;
  gemName: string;
  act: number;
  source: GemSource;
}

// A plan is a reusable template kept across league starts (spec: "one per
// build"); "bought" progress lives separately (see progress.ts) and resets
// each time a new run starts.
export interface GemPlan {
  id: string;
  name: string;
  entries: GemPlanEntry[];
}
