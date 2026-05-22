use serde::Serialize;

pub type CommandResult<T> = Result<T, CommandError>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: ErrorCode,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    InvalidInput,
    ProxyAlreadyRunning,
    ProxyBindFailed,
    ProxyNotRunning,
    ProxyRuntime,
    StateUnavailable,
}

#[derive(Debug)]
pub enum AppError {
    InvalidInput(String),
    ProxyAlreadyRunning,
    ProxyBindFailed(String),
    ProxyNotRunning,
    ProxyRuntime(String),
    StateUnavailable(String),
}

impl From<AppError> for CommandError {
    fn from(error: AppError) -> Self {
        match error {
            AppError::InvalidInput(message) => Self {
                code: ErrorCode::InvalidInput,
                message,
            },
            AppError::ProxyAlreadyRunning => Self {
                code: ErrorCode::ProxyAlreadyRunning,
                message: "Proxy mode is already running.".to_string(),
            },
            AppError::ProxyBindFailed(message) => Self {
                code: ErrorCode::ProxyBindFailed,
                message,
            },
            AppError::ProxyNotRunning => Self {
                code: ErrorCode::ProxyNotRunning,
                message: "Proxy mode is not running.".to_string(),
            },
            AppError::ProxyRuntime(message) => Self {
                code: ErrorCode::ProxyRuntime,
                message,
            },
            AppError::StateUnavailable(message) => Self {
                code: ErrorCode::StateUnavailable,
                message,
            },
        }
    }
}
