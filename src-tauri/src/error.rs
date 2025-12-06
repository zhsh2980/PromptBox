use serde::Serialize;
use thiserror::Error;

/// 内部应用错误类型
#[derive(Debug, Error)]
pub enum AppError {
    #[error("数据库错误: {0}")]
    DbError(#[from] rusqlite::Error),
    
    #[error("IO 错误: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("未找到: {0}")]
    NotFound(String),
    
    #[error("验证错误: {0}")]
    ValidationError(String),
    
    #[error("JSON 错误: {0}")]
    JsonError(#[from] serde_json::Error),
    
    #[error("未知错误: {0}")]
    Unknown(String),
}

/// 对外 API 错误类型
#[derive(Debug, Clone, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

impl From<AppError> for ApiError {
    fn from(err: AppError) -> Self {
        match err {
            AppError::DbError(e) => ApiError {
                code: "DB_ERROR".to_string(),
                message: format!("数据库操作失败: {}", e),
            },
            AppError::IoError(e) => ApiError {
                code: "IO_ERROR".to_string(),
                message: format!("文件读写失败: {}", e),
            },
            AppError::NotFound(msg) => ApiError {
                code: "NOT_FOUND".to_string(),
                message: msg,
            },
            AppError::ValidationError(msg) => ApiError {
                code: "VALIDATION_ERROR".to_string(),
                message: msg,
            },
            AppError::JsonError(e) => ApiError {
                code: "JSON_ERROR".to_string(),
                message: format!("JSON 处理失败: {}", e),
            },
            AppError::Unknown(msg) => ApiError {
                code: "UNKNOWN".to_string(),
                message: msg,
            },
        }
    }
}

/// 为 ApiError 实现 IntoResponse，使其可以作为 Tauri command 的返回值
impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}
