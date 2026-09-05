import {
  PLACEHOLDER_VENDORS,
  deriveVendorsFromReferenceData,
} from "../../core/vendorData";
import { VendorSelector } from "../../core/VendorSelector";
import { useVendorSelection } from "../../core/VendorSelectionContext";
import { useReferenceData } from "../../core/ReferenceDataContext";

export function DashboardModule() {
  const { selectedVendorId, setSelectedVendorId } = useVendorSelection();
  const { data, source, cachedAtUnixSeconds, loading, error, refresh } =
    useReferenceData();

  const vendors = data
    ? deriveVendorsFromReferenceData(data)
    : PLACEHOLDER_VENDORS;

  return (
    <section>
      <h1>Dashboard</h1>
      <p>
        Timer, gem plan, and regex builder modules will register here as they
        ship (see the implementation issues in the repo).
      </p>

      <h2>Reference data</h2>
      {loading && <p>Loading reference data…</p>}
      {error && <p className="error-text">{error}</p>}
      {data && (
        <p>
          {data.questRewards.length} quest reward{data.questRewards.length === 1 ? "" : "s"},{" "}
          {data.vendorStock.length} vendor{data.vendorStock.length === 1 ? "" : "s"}, and{" "}
          {data.itemBases.length} item-base categor
          {data.itemBases.length === 1 ? "y" : "ies"} loaded from{" "}
          {source === "network" ? "the network" : "the local cache"}
          {cachedAtUnixSeconds
            ? ` (last fetched ${new Date(cachedAtUnixSeconds * 1000).toLocaleString()})`
            : ""}
          .
        </p>
      )}
      <button onClick={refresh}>Refresh</button>

      <h2>Vendor</h2>
      <VendorSelector
        vendors={vendors}
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
