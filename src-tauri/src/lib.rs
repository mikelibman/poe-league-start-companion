mod modules;
mod storage;

use modules::core::{core_store_read, core_store_write};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![core_store_read, core_store_write])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
