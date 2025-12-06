use crate::db::DbState;
use crate::error::ApiError;
use crate::models::ProjectDto;
use crate::repositories::project_repository;
use tauri::State;

/// 获取所有项目
#[tauri::command]
pub fn list_projects(db: State<DbState>) -> Result<Vec<ProjectDto>, ApiError> {
    let conn = db.0.lock().map_err(|e| ApiError {
        code: "LOCK_ERROR".to_string(),
        message: format!("获取数据库锁失败: {}", e),
    })?;

    project_repository::list_projects(&conn).map_err(Into::into)
}

/// 创建项目
#[tauri::command]
pub fn create_project(name: String, db: State<DbState>) -> Result<ProjectDto, ApiError> {
    let conn = db.0.lock().map_err(|e| ApiError {
        code: "LOCK_ERROR".to_string(),
        message: format!("获取数据库锁失败: {}", e),
    })?;

    project_repository::create_project(&conn, &name).map_err(Into::into)
}

/// 更新项目
#[tauri::command]
pub fn update_project(id: i64, name: String, db: State<DbState>) -> Result<(), ApiError> {
    let conn = db.0.lock().map_err(|e| ApiError {
        code: "LOCK_ERROR".to_string(),
        message: format!("获取数据库锁失败: {}", e),
    })?;

    project_repository::update_project(&conn, id, &name).map_err(Into::into)
}

/// 删除项目
#[tauri::command]
pub fn delete_project(id: i64, db: State<DbState>) -> Result<(), ApiError> {
    let conn = db.0.lock().map_err(|e| ApiError {
        code: "LOCK_ERROR".to_string(),
        message: format!("获取数据库锁失败: {}", e),
    })?;

    project_repository::delete_project(&conn, id).map_err(Into::into)
}
