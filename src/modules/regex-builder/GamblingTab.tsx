import { ItemBaseChecklistTab } from "./ItemBaseChecklistTab";
import { loadGamblingSelection, saveGamblingSelection } from "./store";

export function GamblingTab() {
  return (
    <ItemBaseChecklistTab
      load={loadGamblingSelection}
      save={saveGamblingSelection}
    />
  );
}
