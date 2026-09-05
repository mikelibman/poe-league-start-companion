import type { ReactNode } from "react";

// A self-contained feature module: own route, own nav entry, own element
// tree. Modules register themselves (see moduleRegistry.ts) so the shell
// never needs to import feature code directly — a module can be added or
// removed by adding/removing one import in modules/index.ts.
export interface AppModule {
  id: string;
  name: string;
  navPath: string;
  navLabel: string;
  element: ReactNode;
  /** Core modules (Dashboard, Settings) that the user cannot disable. */
  alwaysEnabled?: boolean;
}
