use crate::db::DbState;
use crate::error::ApiError;
use crate::models::TaskDto;
use crate::repositories::task_repository;
use log::{error, info};
use tauri::State;

/// 获取项目下的任务
#[tauri::command]
pub fn list_tasks(projectId: i64, db: State<DbState>) -> Result<Vec<TaskDto>, ApiError> {
    info!("list_tasks 调用: projectId={}", projectId);
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    task_repository::list_tasks_by_project(&conn, projectId).map_err(|e| {
        error!("list_tasks 错误: {:?}", e);
        e.into()
    })
}

/// 创建任务
#[tauri::command]
pub fn create_task(
    projectId: i64,
    name: String,
    description: Option<String>,
    db: State<DbState>,
) -> Result<TaskDto, ApiError> {
    info!("create_task 调用: projectId={}, name={}, description={:?}", projectId, name, description);
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    task_repository::create_task(&conn, projectId, &name, description.as_deref())
        .map_err(|e| {
            error!("create_task 错误: {:?}", e);
            e.into()
        })
}

/// 更新任务
#[tauri::command]
pub fn update_task(
    id: i64,
    name: Option<String>,
    description: Option<String>,
    db: State<DbState>,
) -> Result<(), ApiError> {
    info!("update_task 调用: id={}, name={:?}, description={:?}", id, name, description);
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    task_repository::update_task(&conn, id, name.as_deref(), description.as_deref())
        .map_err(|e| {
            error!("update_task 错误: {:?}", e);
            e.into()
        })
}

/// 删除任务
#[tauri::command]
pub fn delete_task(id: i64, db: State<DbState>) -> Result<(), ApiError> {
    info!("delete_task 调用: id={}", id);
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    task_repository::delete_task(&conn, id).map_err(|e| {
        error!("delete_task 错误: {:?}", e);
        e.into()
    })
}
