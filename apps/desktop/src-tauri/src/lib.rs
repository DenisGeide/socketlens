mod app_state;
mod commands;
mod errors;
mod proxy;
mod session;

use app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_result = tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_backend_status,
            commands::get_proxy_status,
            commands::health_check,
            commands::start_proxy,
            commands::stop_proxy
        ])
        .run(tauri::generate_context!());

    if let Err(error) = app_result {
        eprintln!("error while running SocketLens: {error}");
    }
}
