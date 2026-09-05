import { registerModule } from "../../core/moduleRegistry";
import { DashboardModule } from "./DashboardModule";

registerModule({
  id: "dashboard",
  name: "Dashboard",
  navPath: "/",
  navLabel: "Dashboard",
  element: <DashboardModule />,
  alwaysEnabled: true,
});
