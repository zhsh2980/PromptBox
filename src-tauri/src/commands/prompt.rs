use crate::db::DbState;
use crate::error::ApiError;
use crate::models::PromptEntryDto;
use crate::repositories::prompt_repository;
use log::{error, info};
use tauri::State;

/// 获取任务下的提示词记录
#[tauri::command]
pub fn list_prompt_entries(
    taskId: i64,
    startTime: Option<String>,
    endTime: Option<String>,
    tags: Option<Vec<String>>,
    db: State<DbState>,
) -> Result<Vec<PromptEntryDto>, ApiError> {
    info!("list_prompt_entries 调用: taskId={}", taskId);
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    prompt_repository::list_prompts_by_task(
        &conn,
        taskId,
        startTime.as_deref(),
        endTime.as_deref(),
        tags.as_deref(),
    )
    .map_err(|e| {
        error!("list_prompt_entries 错误: {:?}", e);
        e.into()
    })
}

/// 创建提示词记录
#[tauri::command]
pub fn create_prompt_entry(
    taskId: i64,
    title: Option<String>,
    content: String,
    tags: Option<Vec<String>>,
    model: Option<String>,
    db: State<DbState>,
) -> Result<PromptEntryDto, ApiError> {
    info!("create_prompt_entry 调用: taskId={}, title={:?}, content长度={}", taskId, title, content.len());
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    prompt_repository::create_prompt(
        &conn,
        taskId,
        title.as_deref(),
        &content,
        tags.as_deref(),
        model.as_deref(),
    )
    .map_err(|e| {
        error!("create_prompt_entry 错误: {:?}", e);
        e.into()
    })
}

/// 更新提示词记录
#[tauri::command]
pub fn update_prompt_entry(
    id: i64,
    title: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
    model: Option<String>,
    db: State<DbState>,
) -> Result<(), ApiError> {
    info!("update_prompt_entry 调用: id={}", id);
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    prompt_repository::update_prompt(
        &conn,
        id,
        title.as_deref(),
        content.as_deref(),
        tags.as_deref(),
        model.as_deref(),
    )
    .map_err(|e| {
        error!("update_prompt_entry 错误: {:?}", e);
        e.into()
    })
}

/// 删除提示词记录
#[tauri::command]
pub fn delete_prompt_entry(id: i64, db: State<DbState>) -> Result<(), ApiError> {
    info!("delete_prompt_entry 调用: id={}", id);
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    prompt_repository::delete_prompt(&conn, id).map_err(|e| {
        error!("delete_prompt_entry 错误: {:?}", e);
        e.into()
    })
}
