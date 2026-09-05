import { useEffect, useState } from "react";
import { VendorSelector } from "../../core/VendorSelector";
import { useVendorSelection } from "../../core/VendorSelectionContext";
import { useReferenceData } from "../../core/ReferenceDataContext";
import {
  PLACEHOLDER_VENDORS,
  deriveVendorsFromReferenceData,
} from "../../core/vendorData";
import { GemsTab } from "./GemsTab";
import { GearTab } from "./GearTab";
import { GamblingTab } from "./GamblingTab";

type Tab = "gems" | "gear" | "gambling";

export function RegexBuilderModule() {
  const [tab, setTab] = useState<Tab>("gems");
  const { selectedVendorId, setSelectedVendorId } = useVendorSelection();
  const { data } = useReferenceData();

  const vendors = data
    ? deriveVendorsFromReferenceData(data)
    : PLACEHOLDER_VENDORS;
  const selectedVendor = vendors.find((v) => v.id === selectedVendorId) ?? null;
  const gamblingAvailable = selectedVendor?.gamblingCapable ?? false;

  // The gambling category is only reachable when the selected vendor is
  // gambling-capable — enforced through the same shared vendor dropdown
  // rather than a separate picker (spec). Bounce off the tab if the vendor
  // selection changes out from under it.
  useEffect(() => {
    if (tab === "gambling" && !gamblingAvailable) {
      setTab("gems");
    }
  }, [tab, gamblingAvailable]);

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
        <button
          onClick={() => setTab("gambling")}
          disabled={tab === "gambling" || !gamblingAvailable}
          title={
            gamblingAvailable
              ? undefined
              : "Select a gambling-capable vendor to enable this"
          }
        >
          Gambling
        </button>
      </div>

      {tab === "gems" && <GemsTab />}
      {tab === "gear" && <GearTab />}
      {tab === "gambling" && gamblingAvailable && <GamblingTab />}
    </section>
  );
}
