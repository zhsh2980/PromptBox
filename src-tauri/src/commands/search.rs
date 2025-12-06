use crate::db::DbState;
use crate::error::ApiError;
use crate::models::SearchResultDto;
use crate::services::search_service;
use log::{error, info};
use tauri::State;

/// 搜索提示词记录
#[tauri::command]
pub fn search_prompt_entries(
    keyword: String,
    projectId: Option<i64>,
    taskId: Option<i64>,
    limit: Option<i64>,
    db: State<DbState>,
) -> Result<Vec<SearchResultDto>, ApiError> {
    info!("search_prompt_entries 调用: keyword={}, projectId={:?}, taskId={:?}", keyword, projectId, taskId);
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    let limit = limit.unwrap_or(50);

    search_service::search_prompts(&conn, &keyword, projectId, taskId, limit)
        .map_err(|e| {
            error!("search_prompt_entries 错误: {:?}", e);
            e.into()
        })
}
