import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { readStore, writeStore } from "./store";

const SETTINGS_STORE = "settings";

interface SettingsState {
  disabledModules: string[];
}

const DEFAULT_SETTINGS: SettingsState = { disabledModules: [] };

interface SettingsContextValue {
  disabledModules: Set<string>;
  loaded: boolean;
  toggleModule: (id: string, enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    readStore(SETTINGS_STORE, DEFAULT_SETTINGS).then((loadedSettings) => {
      setSettings(loadedSettings);
      setLoaded(true);
    });
  }, []);

  function toggleModule(id: string, enabled: boolean) {
    setSettings((prev) => {
      const disabledModules = enabled
        ? prev.disabledModules.filter((moduleId) => moduleId !== id)
        : [...prev.disabledModules, id];
      const next = { ...prev, disabledModules };
      void writeStore(SETTINGS_STORE, next);
      return next;
    });
  }

  return (
    <SettingsContext.Provider
      value={{
        disabledModules: new Set(settings.disabledModules),
        loaded,
        toggleModule,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
