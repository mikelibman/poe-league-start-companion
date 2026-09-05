// Core module: the local JSON store used by every other module. Namespaced
// `core_*` per the module-registry convention (see `modules/mod.rs`).

use super::app_data_dir;
use crate::storage;
use serde_json::Value;
use tauri::AppHandle;

#[tauri::command]
pub fn core_store_read(app: AppHandle, store: String) -> Result<Value, String> {
    let data_dir = app_data_dir(&app)?;
    storage::read_store(&data_dir, &store).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn core_store_write(app: AppHandle, store: String, data: Value) -> Result<(), String> {
    let data_dir = app_data_dir(&app)?;
    storage::write_store(&data_dir, &store, &data).map_err(|e| e.to_string())
}
