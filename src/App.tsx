import "./modules";
import { HashRouter } from "react-router-dom";
import { SettingsProvider } from "./core/SettingsContext";
import { VendorSelectionProvider } from "./core/VendorSelectionContext";
import { ReferenceDataProvider } from "./core/ReferenceDataContext";
import { AppShell } from "./core/AppShell";
import "./App.css";

function App() {
  return (
    <SettingsProvider>
      <ReferenceDataProvider>
        <VendorSelectionProvider>
          <HashRouter>
            <AppShell />
          </HashRouter>
        </VendorSelectionProvider>
      </ReferenceDataProvider>
    </SettingsProvider>
  );
}

export default App;
