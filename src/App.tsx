import "./modules";
import { HashRouter } from "react-router-dom";
import { SettingsProvider } from "./core/SettingsContext";
import { VendorSelectionProvider } from "./core/VendorSelectionContext";
import { ReferenceDataProvider } from "./core/ReferenceDataContext";
import { TimerProvider } from "./modules/timer/TimerContext";
import { AppShell } from "./core/AppShell";
import "./App.css";

function App() {
  return (
    <SettingsProvider>
      <ReferenceDataProvider>
        <VendorSelectionProvider>
          <TimerProvider>
            <HashRouter>
              <AppShell />
            </HashRouter>
          </TimerProvider>
        </VendorSelectionProvider>
      </ReferenceDataProvider>
    </SettingsProvider>
  );
}

export default App;
