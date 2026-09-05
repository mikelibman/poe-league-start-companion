import { useState } from "react";
import { VendorSelector } from "../../core/VendorSelector";
import { useVendorSelection } from "../../core/VendorSelectionContext";
import { useReferenceData } from "../../core/ReferenceDataContext";
import {
  PLACEHOLDER_VENDORS,
  deriveVendorsFromReferenceData,
} from "../../core/vendorData";
import { GemsTab } from "./GemsTab";
import { GearTab } from "./GearTab";

type Tab = "gems" | "gear";

export function RegexBuilderModule() {
  const [tab, setTab] = useState<Tab>("gems");
  const { selectedVendorId, setSelectedVendorId } = useVendorSelection();
  const { data } = useReferenceData();

  const vendors = data
    ? deriveVendorsFromReferenceData(data)
    : PLACEHOLDER_VENDORS;

  return (
    <section>
      <h1>Regex Builder</h1>

      <VendorSelector
        vendors={vendors}
        selectedVendorId={selectedVendorId}
        onSelect={setSelectedVendorId}
      />

      <div className="row-buttons">
        <button onClick={() => setTab("gems")} disabled={tab === "gems"}>
          Gems
        </button>
        <button onClick={() => setTab("gear")} disabled={tab === "gear"}>
          Gear
        </button>
      </div>

      {tab === "gems" && <GemsTab />}
      {tab === "gear" && <GearTab />}
    </section>
  );
}
