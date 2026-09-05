import { registerModule } from "../../core/moduleRegistry";
import { RegexBuilderModule } from "./RegexBuilderModule";

registerModule({
  id: "regex-builder",
  name: "Regex Builder",
  navPath: "/regex-builder",
  navLabel: "Regex Builder",
  element: <RegexBuilderModule />,
});
