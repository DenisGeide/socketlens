use serde::Serialize;
use tauri::{AppHandle, State};

use crate::{
    app_state::AppState,
    errors::{CommandError, CommandResult},
    proxy::{ProxyStatus, StartProxyRequest},
    session::SessionRegistrySnapshot,
};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub status: &'static str,
    pub version: &'static str,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendStatus {
    pub health: HealthResponse,
    pub proxy: ProxyStatus,
    pub sessions: SessionRegistrySnapshot,
}

#[tauri::command]
pub fn health_check() -> CommandResult<HealthResponse> {
    Ok(HealthResponse {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[tauri::command]
pub async fn get_backend_status(state: State<'_, AppState>) -> CommandResult<BackendStatus> {
    Ok(BackendStatus {
        health: health_check()?,
        proxy: state.proxy().status().await.map_err(CommandError::from)?,
        sessions: state.sessions().snapshot().map_err(CommandError::from)?,
    })
}

#[tauri::command]
pub async fn get_proxy_status(state: State<'_, AppState>) -> CommandResult<ProxyStatus> {
    state.proxy().status().await.map_err(CommandError::from)
}

#[tauri::command]
pub async fn start_proxy(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    request: StartProxyRequest,
) -> CommandResult<ProxyStatus> {
    state
        .proxy()
        .start(app_handle, state.sessions(), request)
        .await
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn stop_proxy(state: State<'_, AppState>) -> CommandResult<ProxyStatus> {
    state.proxy().stop().await.map_err(CommandError::from)
}
