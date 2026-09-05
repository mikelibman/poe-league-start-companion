import { registerModule } from "../../core/moduleRegistry";
import { SettingsModule } from "./SettingsModule";

registerModule({
  id: "settings",
  name: "Settings",
  navPath: "/settings",
  navLabel: "Settings",
  element: <SettingsModule />,
  alwaysEnabled: true,
});
