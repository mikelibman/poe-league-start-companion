import { NavLink, Route, Routes } from "react-router-dom";
import { getModules } from "./moduleRegistry";
import { useSettings } from "./SettingsContext";
import { useUpdater } from "./UpdaterContext";

export function AppShell() {
  const { disabledModules, loaded } = useSettings();
  const modules = getModules().filter(
    (module) => module.alwaysEnabled || !disabledModules.has(module.id),
  );

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-title">PoE League Start Companion</div>
        <ul>
          {modules.map((module) => (
            <li key={module.id}>
              <NavLink to={module.navPath} end={module.navPath === "/"}>
                {module.navLabel}
              </NavLink>
            </li>
          ))}
        </ul>
        <UpdateBanner />
      </nav>
      <main className="app-content">
        {loaded ? (
          <Routes>
            {modules.map((module) => (
              <Route
                key={module.id}
                path={module.navPath}
                element={module.element}
              />
            ))}
          </Routes>
        ) : (
          <p>Loading…</p>
        )}
      </main>
    </div>
  );
}

function UpdateBanner() {
  const { updateReady, updateVersion, runActive, applyUpdate } = useUpdater();

  if (!updateReady) return null;

  return (
    <div className="update-banner">
      <p>Update {updateVersion} ready.</p>
      <button
        onClick={applyUpdate}
        disabled={runActive}
        title={
          runActive
            ? "Won't restart mid-run — finish or start a new run first"
            : undefined
        }
      >
        Restart to update
      </button>
    </div>
  );
}
