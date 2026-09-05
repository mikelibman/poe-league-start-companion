import { registerModule } from "../../core/moduleRegistry";
import { GemPlanModule } from "./GemPlanModule";

registerModule({
  id: "gem-plan",
  name: "Gem Plan",
  navPath: "/gem-plan",
  navLabel: "Gem Plan",
  element: <GemPlanModule />,
});
