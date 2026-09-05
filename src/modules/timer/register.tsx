import { registerModule } from "../../core/moduleRegistry";
import { TimerModule } from "./TimerModule";

registerModule({
  id: "timer",
  name: "Timer",
  navPath: "/timer",
  navLabel: "Timer",
  element: <TimerModule />,
});
