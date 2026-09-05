import { invoke } from "@tauri-apps/api/core";

// Typed wrapper over the Rust-side named JSON store (src-tauri/src/storage.rs).
// Each module should use its own store name to keep data namespaced, e.g.
// readStore("timer", defaultTimerState).

export async function readStore<T>(store: string, fallback: T): Promise<T> {
  const value = await invoke<T | null>("core_store_read", { store });
  return value ?? fallback;
}

export async function writeStore<T>(store: string, data: T): Promise<void> {
  await invoke("core_store_write", { store, data });
}
