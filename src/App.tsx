import "./modules";
import { HashRouter } from "react-router-dom";
import { SettingsProvider } from "./core/SettingsContext";
import { AppShell } from "./core/AppShell";
import "./App.css";

function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </SettingsProvider>
  );
}

export default App;
