import type { Vendor } from "./vendorData";

// Shared by all three regex builders (spec: "one vendor-selection dropdown"):
// the manual dropdown here is the only source of "which vendor screen is
// open", since Client.txt can't tell us that. Takes its vendor list as a
// prop so it doesn't care whether the data is the Issue #3 placeholder or
// the real hosted reference feed.
interface VendorSelectorProps {
  vendors: Vendor[];
  selectedVendorId: string | null;
  onSelect: (vendorId: string | null) => void;
}

export function VendorSelector({
  vendors,
  selectedVendorId,
  onSelect,
}: VendorSelectorProps) {
  return (
    <select
      value={selectedVendorId ?? ""}
      onChange={(e) => onSelect(e.target.value || null)}
    >
      <option value="">Select a vendor…</option>
      {vendors.map((vendor) => (
        <option key={vendor.id} value={vendor.id}>
          Act {vendor.act} — {vendor.name}
          {vendor.gamblingCapable ? " (gambling)" : ""}
        </option>
      ))}
    </select>
  );
}
