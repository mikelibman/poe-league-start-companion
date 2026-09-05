import "./modules";
import { HashRouter } from "react-router-dom";
import { SettingsProvider } from "./core/SettingsContext";
import { VendorSelectionProvider } from "./core/VendorSelectionContext";
import { ReferenceDataProvider } from "./core/ReferenceDataContext";
import { TimerProvider } from "./modules/timer/TimerContext";
import { GemPlanProvider } from "./modules/gem-plan/GemPlanContext";
import { UpdaterProvider } from "./core/UpdaterContext";
import { AppShell } from "./core/AppShell";
import "./App.css";

function App() {
  return (
    <SettingsProvider>
      <ReferenceDataProvider>
        <VendorSelectionProvider>
          <TimerProvider>
            <GemPlanProvider>
              <UpdaterProvider>
                <HashRouter>
                  <AppShell />
                </HashRouter>
              </UpdaterProvider>
            </GemPlanProvider>
          </TimerProvider>
        </VendorSelectionProvider>
      </ReferenceDataProvider>
    </SettingsProvider>
  );
}

export default App;
