use std::sync::Arc;

use crate::{proxy::ProxyManager, session::SessionRegistry};

#[derive(Default)]
pub struct AppState {
    proxy: Arc<ProxyManager>,
    sessions: Arc<SessionRegistry>,
}

impl AppState {
    pub fn proxy(&self) -> Arc<ProxyManager> {
        Arc::clone(&self.proxy)
    }

    pub fn sessions(&self) -> Arc<SessionRegistry> {
        Arc::clone(&self.sessions)
    }
}
