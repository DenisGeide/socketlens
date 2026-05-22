use std::{
    net::SocketAddr,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
};

use futures_util::{Sink, SinkExt, Stream, StreamExt};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::{broadcast, oneshot, Mutex},
    task::JoinHandle,
};
use tokio_tungstenite::{
    accept_async, connect_async,
    tungstenite::{self, Message},
};
use url::Url;

use crate::{
    errors::AppError,
    session::{
        unix_timestamp_ms, ProxySessionCloseStatus, ProxySessionClosedEvent, ProxySessionStartedEvent, SessionRegistry,
    },
};

pub const PROXY_LOG_EVENT: &str = "socketlens://proxy-log";
pub const PROXY_PACKET_EVENT: &str = "socketlens://proxy-packet";
pub const PROXY_SESSION_CLOSED_EVENT: &str = "socketlens://proxy-session-closed";
pub const PROXY_SESSION_STARTED_EVENT: &str = "socketlens://proxy-session-started";

static NEXT_PACKET_ID: AtomicU64 = AtomicU64::new(1);
const PROXY_STOPPED_REASON: &str = "Proxy stopped by SocketLens.";
const WEBSOCKET_STREAM_ENDED_REASON: &str = "WebSocket stream ended.";

#[derive(Default)]
pub struct ProxyManager {
    runtime: Mutex<ProxyRuntime>,
}

#[derive(Default)]
struct ProxyRuntime {
    active_connections: u64,
    connection_shutdown: Option<broadcast::Sender<()>>,
    generation: u64,
    is_running: bool,
    listen_url: Option<String>,
    shutdown: Option<oneshot::Sender<()>>,
    task: Option<JoinHandle<()>>,
    target_url: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProxyRequest {
    pub target_url: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyStatus {
    pub active_connections: u64,
    pub is_running: bool,
    pub listen_url: Option<String>,
    pub mode: ProxyMode,
    pub target_url: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProxyMode {
    NotConfigured,
    Proxy,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyPacketEvent {
    pub connection_id: String,
    pub direction: ProxyPacketDirection,
    pub id: String,
    pub payload: String,
    pub payload_kind: ProxyPacketPayloadKind,
    pub session_id: String,
    pub size_bytes: usize,
    pub timestamp: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProxyPacketDirection {
    Inbound,
    Outbound,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProxyPacketPayloadKind {
    Binary,
    Json,
    Text,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyLogEvent {
    pub connection_id: Option<String>,
    pub level: ProxyLogLevel,
    pub message: String,
    pub session_id: Option<String>,
    pub timestamp: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProxyLogLevel {
    Error,
    Info,
    Success,
    Warning,
}

impl ProxyManager {
    pub async fn status(&self) -> Result<ProxyStatus, AppError> {
        let runtime = self.runtime.lock().await;

        Ok(runtime.status())
    }

    pub async fn start(
        self: Arc<Self>,
        app_handle: AppHandle,
        sessions: Arc<SessionRegistry>,
        request: StartProxyRequest,
    ) -> Result<ProxyStatus, AppError> {
        let target_url = validate_websocket_url(&request.target_url, "target URL")?;
        let mut runtime = self.runtime.lock().await;

        if runtime.is_running {
            return Err(AppError::ProxyAlreadyRunning);
        }

        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|error| AppError::ProxyBindFailed(format!("Could not start local proxy: {error}")))?;
        let local_addr = listener
            .local_addr()
            .map_err(|error| AppError::ProxyBindFailed(format!("Could not read local proxy address: {error}")))?;
        let listen_url = format!("ws://{}", format_socket_addr(local_addr));
        let (shutdown_sender, shutdown_receiver) = oneshot::channel();
        let (connection_shutdown_sender, _) = broadcast::channel(64);
        runtime.generation = runtime.generation.saturating_add(1);
        let generation = runtime.generation;
        let manager = Arc::clone(&self);
        let task_listen_url = listen_url.clone();
        let task_target_url = target_url.clone();
        let task_connection_shutdown = connection_shutdown_sender.clone();
        let task = tokio::spawn(async move {
            run_proxy_listener(
                app_handle,
                manager,
                sessions,
                listener,
                task_listen_url,
                task_target_url,
                task_connection_shutdown,
                generation,
                shutdown_receiver,
            )
            .await;
        });

        runtime.active_connections = 0;
        runtime.connection_shutdown = Some(connection_shutdown_sender);
        runtime.is_running = true;
        runtime.listen_url = Some(listen_url);
        runtime.shutdown = Some(shutdown_sender);
        runtime.task = Some(task);
        runtime.target_url = Some(target_url);

        Ok(runtime.status())
    }

    pub async fn stop(&self) -> Result<ProxyStatus, AppError> {
        let (listener_shutdown, connection_shutdown, listener_task, status) = {
            let mut runtime = self.runtime.lock().await;

            if !runtime.is_running {
                return Err(AppError::ProxyNotRunning);
            }

            let listener_shutdown = runtime.shutdown.take();
            let connection_shutdown = runtime.connection_shutdown.take();
            let listener_task = runtime.task.take();

            runtime.active_connections = 0;
            runtime.is_running = false;
            runtime.listen_url = None;
            runtime.target_url = None;

            (listener_shutdown, connection_shutdown, listener_task, runtime.status())
        };

        if let Some(shutdown) = connection_shutdown {
            let _ = shutdown.send(());
        }

        if let Some(shutdown) = listener_shutdown {
            let _ = shutdown.send(());
        }

        if let Some(task) = listener_task {
            task.abort();
        }

        Ok(status)
    }

    async fn increment_active_connections(&self) {
        let mut runtime = self.runtime.lock().await;
        runtime.active_connections += 1;
    }

    async fn decrement_active_connections(&self) {
        let mut runtime = self.runtime.lock().await;
        runtime.active_connections = runtime.active_connections.saturating_sub(1);
    }

    async fn mark_stopped(&self, generation: u64) {
        let mut runtime = self.runtime.lock().await;

        if runtime.generation != generation {
            return;
        }

        runtime.active_connections = 0;
        runtime.connection_shutdown = None;
        runtime.is_running = false;
        runtime.listen_url = None;
        runtime.shutdown = None;
        runtime.task = None;
        runtime.target_url = None;
    }
}

impl ProxyRuntime {
    fn status(&self) -> ProxyStatus {
        ProxyStatus {
            active_connections: self.active_connections,
            is_running: self.is_running,
            listen_url: self.listen_url.clone(),
            mode: if self.is_running {
                ProxyMode::Proxy
            } else {
                ProxyMode::NotConfigured
            },
            target_url: self.target_url.clone(),
        }
    }
}

async fn run_proxy_listener(
    app_handle: AppHandle,
    manager: Arc<ProxyManager>,
    sessions: Arc<SessionRegistry>,
    listener: TcpListener,
    listen_url: String,
    target_url: String,
    connection_shutdown: broadcast::Sender<()>,
    generation: u64,
    mut shutdown: oneshot::Receiver<()>,
) {
    emit_proxy_log(
        &app_handle,
        ProxyLogLevel::Success,
        format!(
            "Proxy listening on {listen_url} and forwarding to {}.",
            redact_url_for_log(&target_url)
        ),
        None,
        None,
    );

    loop {
        tokio::select! {
            _ = &mut shutdown => {
                emit_proxy_log(&app_handle, ProxyLogLevel::Info, "Proxy listener stopped.".to_string(), None, None);
                break;
            }
            accepted = listener.accept() => {
                match accepted {
                    Ok((stream, peer_addr)) => {
                        let connection_app_handle = app_handle.clone();
                        let connection_manager = Arc::clone(&manager);
                        let connection_sessions = Arc::clone(&sessions);
                        let connection_listen_url = listen_url.clone();
                        let connection_target_url = target_url.clone();
                        let connection_shutdown = connection_shutdown.clone();

                        tokio::spawn(async move {
                            handle_proxy_connection(
                                connection_app_handle,
                                connection_manager,
                                connection_sessions,
                                stream,
                                peer_addr,
                                connection_listen_url,
                                connection_target_url,
                                connection_shutdown,
                            )
                            .await;
                        });
                    }
                    Err(error) => {
                        emit_proxy_log(
                            &app_handle,
                            ProxyLogLevel::Error,
                            format!("Proxy accept failed: {error}"),
                            None,
                            None,
                        );
                    }
                }
            }
        }
    }

    manager.mark_stopped(generation).await;
}

async fn handle_proxy_connection(
    app_handle: AppHandle,
    manager: Arc<ProxyManager>,
    sessions: Arc<SessionRegistry>,
    client_stream: TcpStream,
    peer_addr: SocketAddr,
    listen_url: String,
    target_url: String,
    shutdown: broadcast::Sender<()>,
) {
    manager.increment_active_connections().await;

    let session_event = match sessions.start_proxy_session(&target_url, &listen_url, &peer_addr.to_string()) {
        Ok(event) => event,
        Err(error) => {
            manager.decrement_active_connections().await;
            emit_proxy_log(
                &app_handle,
                ProxyLogLevel::Error,
                format!("Could not create proxy session: {error:?}"),
                None,
                None,
            );
            return;
        }
    };

    emit_event(&app_handle, PROXY_SESSION_STARTED_EVENT, &session_event);
    emit_proxy_log(
        &app_handle,
        ProxyLogLevel::Info,
        format!("Proxy client {} connected.", session_event.peer_address),
        Some(session_event.connection_id.clone()),
        Some(session_event.session_id.clone()),
    );

    let close_result = proxy_connection(&app_handle, &session_event, client_stream, &target_url, &shutdown).await;
    let (status, reason, level) = match close_result {
        Ok(reason) => {
            let level = if reason.as_deref() == Some(WEBSOCKET_STREAM_ENDED_REASON) {
                ProxyLogLevel::Warning
            } else {
                ProxyLogLevel::Info
            };

            (ProxySessionCloseStatus::Closed, reason, level)
        }
        Err(error) => (
            ProxySessionCloseStatus::Error,
            Some(format_proxy_error(&error)),
            ProxyLogLevel::Error,
        ),
    };
    let close_event = sessions.close_proxy_session(
        session_event.connection_id.clone(),
        session_event.session_id.clone(),
        status,
        reason.clone(),
    );

    match close_event {
        Ok(event) => {
            emit_event(&app_handle, PROXY_SESSION_CLOSED_EVENT, &event);
            emit_proxy_close_log(&app_handle, &event, level);
        }
        Err(error) => {
            emit_proxy_log(
                &app_handle,
                ProxyLogLevel::Error,
                format!("Could not close proxy session: {error:?}"),
                Some(session_event.connection_id),
                Some(session_event.session_id),
            );
        }
    }

    manager.decrement_active_connections().await;
}

async fn proxy_connection(
    app_handle: &AppHandle,
    session_event: &ProxySessionStartedEvent,
    client_stream: TcpStream,
    target_url: &str,
    shutdown: &broadcast::Sender<()>,
) -> Result<Option<String>, AppError> {
    let mut client_handshake_shutdown = shutdown.subscribe();
    let client_ws = tokio::select! {
        _ = client_handshake_shutdown.recv() => return Ok(Some(PROXY_STOPPED_REASON.to_string())),
        result = accept_async(client_stream) => result
            .map_err(|error| AppError::ProxyRuntime(format!("Client WebSocket handshake failed: {error}")))?,
    };
    let mut target_connect_shutdown = shutdown.subscribe();
    let (target_ws, _) = tokio::select! {
        _ = target_connect_shutdown.recv() => return Ok(Some(PROXY_STOPPED_REASON.to_string())),
        result = connect_async(target_url) => result
            .map_err(|error| AppError::ProxyRuntime(format!("Could not connect to target WebSocket: {error}")))?,
    };
    let (client_write, client_read) = client_ws.split();
    let (target_write, target_read) = target_ws.split();
    let client_to_target = forward_messages(
        app_handle.clone(),
        session_event.connection_id.clone(),
        session_event.session_id.clone(),
        ProxyPacketDirection::Outbound,
        client_read,
        target_write,
        shutdown.subscribe(),
    );
    let target_to_client = forward_messages(
        app_handle.clone(),
        session_event.connection_id.clone(),
        session_event.session_id.clone(),
        ProxyPacketDirection::Inbound,
        target_read,
        client_write,
        shutdown.subscribe(),
    );

    tokio::pin!(client_to_target);
    tokio::pin!(target_to_client);

    tokio::select! {
        result = &mut client_to_target => result,
        result = &mut target_to_client => result,
    }
}

async fn forward_messages<Reader, Writer>(
    app_handle: AppHandle,
    connection_id: String,
    session_id: String,
    direction: ProxyPacketDirection,
    mut reader: Reader,
    mut writer: Writer,
    mut shutdown: broadcast::Receiver<()>,
) -> Result<Option<String>, AppError>
where
    Reader: Stream<Item = Result<Message, tungstenite::Error>> + Unpin,
    Writer: Sink<Message, Error = tungstenite::Error> + Unpin,
{
    loop {
        let message_result = tokio::select! {
            _ = shutdown.recv() => {
                let _ = writer.send(Message::Close(None)).await;
                return Ok(Some(PROXY_STOPPED_REASON.to_string()));
            }
            message_result = reader.next() => message_result,
        };

        let Some(message_result) = message_result else {
            return Ok(Some(WEBSOCKET_STREAM_ENDED_REASON.to_string()));
        };
        let message = message_result.map_err(|error| AppError::ProxyRuntime(format!("WebSocket read failed: {error}")))?;

        capture_message(&app_handle, &connection_id, &session_id, &direction, &message);

        let close_reason = match &message {
            Message::Close(frame) => frame
                .as_ref()
                .map(|frame| format!("Close {} {}", frame.code, frame.reason))
                .or_else(|| Some("WebSocket close frame received.".to_string())),
            _ => None,
        };

        writer
            .send(message)
            .await
            .map_err(|error| AppError::ProxyRuntime(format!("WebSocket write failed: {error}")))?;

        if close_reason.is_some() {
            return Ok(close_reason);
        }
    }
}

fn capture_message(
    app_handle: &AppHandle,
    connection_id: &str,
    session_id: &str,
    direction: &ProxyPacketDirection,
    message: &Message,
) {
    let Some((payload, payload_kind, size_bytes)) = packet_payload(message) else {
        return;
    };
    let event = ProxyPacketEvent {
        connection_id: connection_id.to_string(),
        direction: direction.clone(),
        id: format!("proxy-packet-{}", NEXT_PACKET_ID.fetch_add(1, Ordering::Relaxed)),
        payload,
        payload_kind,
        session_id: session_id.to_string(),
        size_bytes,
        timestamp: unix_timestamp_ms(),
    };

    emit_event(app_handle, PROXY_PACKET_EVENT, &event);
}

fn packet_payload(message: &Message) -> Option<(String, ProxyPacketPayloadKind, usize)> {
    match message {
        Message::Text(text) => {
            let payload = text.as_str().to_string();
            let payload_kind = if serde_json::from_str::<serde_json::Value>(&payload).is_ok() {
                ProxyPacketPayloadKind::Json
            } else {
                ProxyPacketPayloadKind::Text
            };
            let size_bytes = payload.as_bytes().len();

            Some((payload, payload_kind, size_bytes))
        }
        Message::Binary(bytes) => {
            let size_bytes = bytes.len();
            let payload = format_binary_payload(bytes);

            Some((payload, ProxyPacketPayloadKind::Binary, size_bytes))
        }
        Message::Ping(bytes) => {
            let payload = format!(r#"{{"type":"ping","sizeBytes":{}}}"#, bytes.len());

            Some((payload, ProxyPacketPayloadKind::Json, bytes.len()))
        }
        Message::Pong(bytes) => {
            let payload = format!(r#"{{"type":"pong","sizeBytes":{}}}"#, bytes.len());

            Some((payload, ProxyPacketPayloadKind::Json, bytes.len()))
        }
        Message::Close(_) | Message::Frame(_) => None,
    }
}

fn format_binary_payload(bytes: &[u8]) -> String {
    const MAX_PREVIEW_BYTES: usize = 96;
    let preview = bytes
        .iter()
        .take(MAX_PREVIEW_BYTES)
        .map(|byte| format!("{:02x}", *byte))
        .collect::<Vec<_>>()
        .join(" ");
    let suffix = if bytes.len() > MAX_PREVIEW_BYTES {
        " ..."
    } else {
        ""
    };

    format!("[binary frame: {} bytes] hex: {preview}{suffix}", bytes.len())
}

fn emit_proxy_log(
    app_handle: &AppHandle,
    level: ProxyLogLevel,
    message: String,
    connection_id: Option<String>,
    session_id: Option<String>,
) {
    let event = ProxyLogEvent {
        connection_id,
        level,
        message,
        session_id,
        timestamp: unix_timestamp_ms(),
    };

    emit_event(app_handle, PROXY_LOG_EVENT, &event);
}

fn emit_proxy_close_log(app_handle: &AppHandle, event: &ProxySessionClosedEvent, level: ProxyLogLevel) {
    let reason = event
        .close_reason
        .as_ref()
        .map(|value| format!(" {value}"))
        .unwrap_or_default();

    emit_proxy_log(
        app_handle,
        level,
        format!("Proxy session closed.{reason}"),
        Some(event.connection_id.clone()),
        Some(event.session_id.clone()),
    );
}

fn emit_event<T: Clone + Serialize>(app_handle: &AppHandle, event: &str, payload: &T) {
    if let Err(error) = app_handle.emit(event, payload.clone()) {
        eprintln!("failed to emit {event}: {error}");
    }
}

fn validate_websocket_url(value: &str, label: &str) -> Result<String, AppError> {
    let trimmed_value = value.trim();

    if trimmed_value.is_empty() {
        return Err(AppError::InvalidInput(format!("Proxy {label} is required.")));
    }

    let url = Url::parse(trimmed_value)
        .map_err(|_| AppError::InvalidInput(format!("Proxy {label} must be a valid WebSocket URL.")))?;

    if url.scheme() != "ws" && url.scheme() != "wss" {
        return Err(AppError::InvalidInput(format!(
            "Proxy {label} must start with ws:// or wss://."
        )));
    }

    if url.host_str().is_none() {
        return Err(AppError::InvalidInput(format!("Proxy {label} must include a host.")));
    }

    if url.fragment().is_some() {
        return Err(AppError::InvalidInput(format!(
            "Proxy {label} cannot include a URL fragment."
        )));
    }

    Ok(trimmed_value.to_string())
}

fn redact_url_for_log(value: &str) -> String {
    let Ok(mut url) = Url::parse(value) else {
        return value.to_string();
    };
    let has_username = !url.username().is_empty();
    let has_password = url.password().is_some();
    let has_query = url.query().is_some();
    let _ = url.set_username(if has_username { "user" } else { "" });
    let _ = url.set_password(if has_password { Some("***") } else { None });
    url.set_query(None);
    url.set_fragment(None);

    let mut redacted = url.to_string();

    if has_query {
        redacted.push_str("?...");
    }

    redacted
}

fn format_socket_addr(addr: SocketAddr) -> String {
    match addr {
        SocketAddr::V4(addr) => addr.to_string(),
        SocketAddr::V6(addr) => format!("[{}]:{}", addr.ip(), addr.port()),
    }
}

fn format_proxy_error(error: &AppError) -> String {
    match error {
        AppError::InvalidInput(message)
        | AppError::ProxyBindFailed(message)
        | AppError::ProxyRuntime(message)
        | AppError::StateUnavailable(message) => message.clone(),
        AppError::ProxyAlreadyRunning => "Proxy mode is already running.".to_string(),
        AppError::ProxyNotRunning => "Proxy mode is not running.".to_string(),
    }
}
