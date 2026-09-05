import type { PoeClass } from "../../core/poeClasses";

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

// A vendor gem's price is fixed — it doesn't scale with character level
// or purchase count — but varies gem-to-gem (one might cost a Scroll of
// Wisdom, another an Orb of Chance), and isn't reference data the app
// ships with. So it's entered manually once per gem (see
// GemPlanContext.setEntryCost, and the shared `knownGemCosts` lookup in
// store.ts) and locked in from then on — not a per-plan or per-entry
// value the user can edit afterward. Quest-reward gems are free and stay
// null.
export interface CurrencyCost {
  currencyType: string;
  amount: number;
}

export interface GemPlanEntry {
  id: string;
  gemName: string;
  act: number;
  source: GemSource;
  cost: CurrencyCost | null;
}

// A plan is a reusable template kept across league starts (spec: "one per
// build"); "bought" progress lives separately (see progress.ts) and resets
// each time a new run starts. Which gems a quest offers, and which gems a
// vendor sells, both genuinely depend on class in PoE — so a plan commits
// to one class up front, and the quick-add pickers filter reference data
// by it.
export interface GemPlan {
  id: string;
  name: string;
  characterClass: PoeClass;
  entries: GemPlanEntry[];
}
