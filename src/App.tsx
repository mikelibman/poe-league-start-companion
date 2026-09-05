import "./modules";
import { HashRouter } from "react-router-dom";
import { SettingsProvider } from "./core/SettingsContext";
import { VendorSelectionProvider } from "./core/VendorSelectionContext";
import { AppShell } from "./core/AppShell";
import "./App.css";

function App() {
  return (
    <SettingsProvider>
      <VendorSelectionProvider>
        <HashRouter>
          <AppShell />
        </HashRouter>
      </VendorSelectionProvider>
    </SettingsProvider>
  );
}

export default App;
