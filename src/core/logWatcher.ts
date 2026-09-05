import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Typed wrapper over the Rust log watcher (src-tauri/src/modules/log_watcher.rs).
// This is the app's only automatic data source — it tails Client.txt and
// never touches PoE's process memory.

export interface ZoneEnteredEvent {
  zone: string;
  rawTimestamp: string;
}

export async function detectLogPath(): Promise<string | null> {
  return invoke<string | null>("logwatcher_detect_path");
}

export async function getLogPath(): Promise<string | null> {
  return invoke<string | null>("logwatcher_get_path");
}

export async function setLogPath(path: string): Promise<void> {
  await invoke("logwatcher_set_path", { path });
}

export async function startLogWatcher(path: string): Promise<void> {
  await invoke("logwatcher_start", { path });
}

export async function stopLogWatcher(): Promise<void> {
  await invoke("logwatcher_stop");
}

export function onZoneEntered(
  callback: (event: ZoneEnteredEvent) => void,
): Promise<UnlistenFn> {
  return listen<ZoneEnteredEvent>("log-watcher://zone-entered", (e) =>
    callback(e.payload),
  );
}

export function onLogError(
  callback: (message: string) => void,
): Promise<UnlistenFn> {
  return listen<string>("log-watcher://error", (e) => callback(e.payload));
}
