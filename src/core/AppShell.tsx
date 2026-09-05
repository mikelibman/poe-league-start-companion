import { NavLink, Route, Routes } from "react-router-dom";
import { getModules } from "./moduleRegistry";
import { useSettings } from "./SettingsContext";

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
