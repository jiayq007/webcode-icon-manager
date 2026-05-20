mod commands;

use commands::icon_commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            icon_scan_projects,
            icon_replace_icon,
            icon_cargo_clean,
            icon_load_settings,
            icon_save_settings,
            icon_build_project,
            icon_debug_project,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {});
}
