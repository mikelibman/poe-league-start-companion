import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useTimer } from "../modules/timer/TimerContext";

interface UpdaterContextValue {
  updateReady: boolean;
  updateVersion: string | null;
  runActive: boolean;
  applyUpdate: () => void;
}

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

// Checks for an update once on launch and, if found, downloads it silently
// in the background — downloading never interrupts anything. Installing
// (which requires a relaunch) only ever happens when the user clicks
// "Restart to update" themselves, and that control is disabled while a run
// is actively being timed, so an update can never interrupt a split (spec:
// Platform & Distribution, D25). There's no auto-apply-on-run-end either —
// this app has no explicit "run finished" event, only "a new run started",
// so silently applying on some inferred boundary would be guessing, not a
// guarantee. The user restarting on their own time is what actually holds.
export function UpdaterProvider({ children }: { children: ReactNode }) {
  const { status } = useTimer();
  const runActive = status === "active";

  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    check()
      .then(async (update) => {
        if (!update) return;
        await update.download();
        setPendingUpdate(update);
      })
      .catch(() => {
        // No update server reachable, or nothing published yet — not an
        // error worth surfacing to the user of a race-timing tool.
      });
  }, []);

  function applyUpdate() {
    if (!pendingUpdate || runActive) return;
    void pendingUpdate.install().then(() => relaunch());
  }

  return (
    <UpdaterContext.Provider
      value={{
        updateReady: pendingUpdate !== null,
        updateVersion: pendingUpdate?.version ?? null,
        runActive,
        applyUpdate,
      }}
    >
      {children}
    </UpdaterContext.Provider>
  );
}

export function useUpdater(): UpdaterContextValue {
  const ctx = useContext(UpdaterContext);
  if (!ctx) {
    throw new Error("useUpdater must be used within an UpdaterProvider");
  }
  return ctx;
}
