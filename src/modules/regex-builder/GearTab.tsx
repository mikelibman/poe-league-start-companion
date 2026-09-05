import { ItemBaseChecklistTab } from "./ItemBaseChecklistTab";
import { loadGearSelection, saveGearSelection } from "./store";

export function GearTab() {
  return (
    <ItemBaseChecklistTab load={loadGearSelection} save={saveGearSelection} />
  );
}
