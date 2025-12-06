use crate::db::get_db_path;
use crate::error::ApiError;
use tauri::AppHandle;

/// 获取数据库路径
#[tauri::command]
pub fn get_database_path(app: AppHandle) -> Result<String, ApiError> {
    let path = get_db_path(&app).map_err(|e| ApiError {
        code: "PATH_ERROR".to_string(),
        message: format!("获取数据库路径失败: {}", e),
    })?;

    Ok(path.to_string_lossy().to_string())
}
