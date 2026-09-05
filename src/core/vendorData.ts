import type { ReferenceData } from "./referenceData";

export interface Vendor {
  id: string;
  name: string;
  act: number;
  gamblingCapable: boolean;
}

// Fallback only, used when reference data hasn't loaded yet and there's no
// local cache either (e.g. very first launch with no network) — treat none
// of this as authoritative game data.
export const PLACEHOLDER_VENDORS: Vendor[] = [
  { id: "a1-nessa", name: "Nessa", act: 1, gamblingCapable: false },
  { id: "a2-yeena", name: "Yeena", act: 2, gamblingCapable: false },
  { id: "a3-clarissa", name: "Clarissa", act: 3, gamblingCapable: false },
];

/** Builds the real vendor list from the fetched/cached reference data
 * (see Issue #3) — `gamblingVendors` and `vendorStock` share `vendorId`s,
 * which is how a vendor's gambling capability gets attached without a
 * separate lookup. */
export function deriveVendorsFromReferenceData(data: ReferenceData): Vendor[] {
  const gamblingIds = new Set(data.gamblingVendors);
  return data.vendorStock.map((entry) => ({
    id: entry.vendorId,
    name: entry.vendor,
    act: entry.act,
    gamblingCapable: gamblingIds.has(entry.vendorId),
  }));
}
