mod modules;
mod storage;

use modules::core::{core_store_read, core_store_write};
use modules::log_watcher::{
    autostart, logwatcher_detect_path, logwatcher_get_path, logwatcher_set_path,
    logwatcher_start, logwatcher_stop, WatcherHandle,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WatcherHandle::default())
        .setup(|app| {
            autostart(app.handle(), app.state::<WatcherHandle>().inner());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            core_store_read,
            core_store_write,
            logwatcher_detect_path,
            logwatcher_get_path,
            logwatcher_set_path,
            logwatcher_start,
            logwatcher_stop,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
