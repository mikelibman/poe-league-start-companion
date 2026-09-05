// Each feature module (timer, gem plan, regex builders, ...) gets its own
// file here and namespaces its Tauri commands with its module id as a
// prefix (e.g. `core_store_read`, `logwatcher_start`). Tauri's command
// dispatch is a flat, compile-time table (`tauri::generate_handler!`), so
// the namespace lives in the function name rather than in real routing —
// `lib.rs` is the single place that assembles every module's commands into
// that table.

pub mod core;
pub mod log_locale;
pub mod log_watcher;

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("could not resolve app data dir: {e}"))
}
