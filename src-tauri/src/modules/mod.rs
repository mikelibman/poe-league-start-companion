// Each feature module (timer, gem plan, regex builders, ...) gets its own
// file here and namespaces its Tauri commands with its module id as a
// prefix (e.g. `core_store_read`, `timer_get_splits`). Tauri's command
// dispatch is a flat, compile-time table (`tauri::generate_handler!`), so
// the namespace lives in the function name rather than in real routing —
// `lib.rs` is the single place that assembles every module's commands into
// that table.

pub mod core;
