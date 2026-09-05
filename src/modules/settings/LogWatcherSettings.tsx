import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  detectLogPath,
  getLogPath,
  onLogError,
  onZoneEntered,
  setLogPath,
  startLogWatcher,
  stopLogWatcher,
} from "../../core/logWatcher";

type Status = "idle" | "watching" | "error";

export function LogWatcherSettings() {
  const [path, setPath] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [lastZone, setLastZone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getLogPath().then((stored) => {
      if (cancelled) return;
      setPath(stored);
      if (stored) {
        void startLogWatcher(stored);
        setStatus("watching");
      }
    });

    const zoneUnlisten = onZoneEntered((event) => {
      setLastZone(`${event.zone} (${event.rawTimestamp})`);
    });
    const errorUnlisten = onLogError((message) => {
      setStatus("error");
      setStatusDetail(message);
    });

    return () => {
      cancelled = true;
      void zoneUnlisten.then((unlisten) => unlisten());
      void errorUnlisten.then((unlisten) => unlisten());
    };
  }, []);

  async function applyPath(newPath: string) {
    await setLogPath(newPath);
    setPath(newPath);
    await stopLogWatcher();
    await startLogWatcher(newPath);
    setStatus("watching");
    setStatusDetail(null);
  }

  async function handleAutoDetect() {
    const detected = await detectLogPath();
    if (!detected) {
      setStatus("error");
      setStatusDetail(
        "Couldn't find Client.txt in any common install location. Use Browse instead.",
      );
      return;
    }
    await applyPath(detected);
  }

  async function handleBrowse() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Client.txt", extensions: ["txt"] }],
    });
    if (typeof selected === "string") {
      await applyPath(selected);
    }
  }

  return (
    <div>
      <h2>Log File</h2>
      <p>{path ?? "No Client.txt selected yet."}</p>
      <div className="row-buttons">
        <button onClick={handleAutoDetect}>Auto-detect</button>
        <button onClick={handleBrowse}>Browse…</button>
      </div>
      {status === "watching" && <p>Watching for zone changes.</p>}
      {status === "error" && <p className="error-text">{statusDetail}</p>}
      {lastZone && <p>Last zone entered: {lastZone}</p>}
    </div>
  );
}
