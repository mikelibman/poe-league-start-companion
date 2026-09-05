export interface Vendor {
  id: string;
  name: string;
  act: number;
  gamblingCapable: boolean;
}

// Placeholder sample data only, just enough to exercise the VendorSelector
// component and shared selection state. Issue #3 (remote reference data)
// replaces this with the real hosted vendor list — treat none of this as
// authoritative game data.
export const PLACEHOLDER_VENDORS: Vendor[] = [
  { id: "act1-nessa", name: "Nessa", act: 1, gamblingCapable: false },
  { id: "act2-greust", name: "Greust", act: 2, gamblingCapable: false },
  {
    id: "act3-petarus-vanja",
    name: "Petarus & Vanja",
    act: 3,
    gamblingCapable: true,
  },
];
