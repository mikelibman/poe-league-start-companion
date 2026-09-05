import { PLACEHOLDER_VENDORS } from "../../core/vendorData";
import { VendorSelector } from "../../core/VendorSelector";
import { useVendorSelection } from "../../core/VendorSelectionContext";

export function DashboardModule() {
  const { selectedVendorId, setSelectedVendorId } = useVendorSelection();

  return (
    <section>
      <h1>Dashboard</h1>
      <p>
        Timer, gem plan, and regex builder modules will register here as they
        ship (see the implementation issues in the repo).
      </p>

      <h2>Vendor</h2>
      <VendorSelector
        vendors={PLACEHOLDER_VENDORS}
        selectedVendorId={selectedVendorId}
        onSelect={setSelectedVendorId}
      />
      <p>
        Shared selection state — the gem, gear, and gambling regex builders
        (Issues #5-7) will all read this same value instead of keeping their
        own vendor dropdowns.
      </p>
    </section>
  );
}
