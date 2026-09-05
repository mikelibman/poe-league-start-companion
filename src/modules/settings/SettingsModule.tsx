import { getModules } from "../../core/moduleRegistry";
import { useSettings } from "../../core/SettingsContext";

export function SettingsModule() {
  const { disabledModules, toggleModule, loaded } = useSettings();
  const optionalModules = getModules().filter((module) => !module.alwaysEnabled);

  if (!loaded) {
    return <p>Loading settings…</p>;
  }

  return (
    <section>
      <h1>Settings</h1>
      <h2>Modules</h2>
      {optionalModules.length === 0 ? (
        <p>No optional modules installed yet.</p>
      ) : (
        <ul className="module-toggle-list">
          {optionalModules.map((module) => (
            <li key={module.id}>
              <label>
                <input
                  type="checkbox"
                  checked={!disabledModules.has(module.id)}
                  onChange={(e) => toggleModule(module.id, e.currentTarget.checked)}
                />
                {module.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
