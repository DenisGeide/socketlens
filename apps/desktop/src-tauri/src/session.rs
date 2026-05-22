use std::{
    sync::{
        atomic::{AtomicU64, Ordering},
        RwLock,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use serde::Serialize;

use crate::errors::AppError;

#[derive(Debug)]
pub struct SessionRegistry {
    counters: RwLock<SessionCounters>,
    next_id: AtomicU64,
}

#[derive(Debug, Default)]
struct SessionCounters {
    active_sessions: u64,
    total_sessions: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRegistrySnapshot {
    pub active_sessions: u64,
    pub total_sessions: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxySessionStartedEvent {
    pub connection_id: String,
    pub local_proxy_url: String,
    pub peer_address: String,
    pub session_id: String,
    pub started_at: u64,
    pub target_url: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxySessionClosedEvent {
    pub close_reason: Option<String>,
    pub connection_id: String,
    pub ended_at: u64,
    pub session_id: String,
    pub status: ProxySessionCloseStatus,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProxySessionCloseStatus {
    Closed,
    Error,
}

impl Default for SessionRegistry {
    fn default() -> Self {
        Self {
            counters: RwLock::new(SessionCounters::default()),
            next_id: AtomicU64::new(1),
        }
    }
}

impl SessionRegistry {
    pub fn snapshot(&self) -> Result<SessionRegistrySnapshot, AppError> {
        let counters = self
            .counters
            .read()
            .map_err(|_| AppError::StateUnavailable("Native session registry is unavailable.".to_string()))?;

        Ok(SessionRegistrySnapshot {
            active_sessions: counters.active_sessions,
            total_sessions: counters.total_sessions,
        })
    }

    pub fn start_proxy_session(
        &self,
        target_url: &str,
        local_proxy_url: &str,
        peer_address: &str,
    ) -> Result<ProxySessionStartedEvent, AppError> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let mut counters = self
            .counters
            .write()
            .map_err(|_| AppError::StateUnavailable("Native session registry is unavailable.".to_string()))?;

        counters.active_sessions += 1;
        counters.total_sessions += 1;

        Ok(ProxySessionStartedEvent {
            connection_id: format!("proxy-connection-{id}"),
            local_proxy_url: local_proxy_url.to_string(),
            peer_address: peer_address.to_string(),
            session_id: format!("proxy-session-{id}"),
            started_at: unix_timestamp_ms(),
            target_url: target_url.to_string(),
        })
    }

    pub fn close_proxy_session(
        &self,
        connection_id: String,
        session_id: String,
        status: ProxySessionCloseStatus,
        close_reason: Option<String>,
    ) -> Result<ProxySessionClosedEvent, AppError> {
        let mut counters = self
            .counters
            .write()
            .map_err(|_| AppError::StateUnavailable("Native session registry is unavailable.".to_string()))?;

        counters.active_sessions = counters.active_sessions.saturating_sub(1);

        Ok(ProxySessionClosedEvent {
            close_reason,
            connection_id,
            ended_at: unix_timestamp_ms(),
            session_id,
            status,
        })
    }
}

pub fn unix_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default()
}
