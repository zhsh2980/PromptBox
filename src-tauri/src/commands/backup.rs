use crate::db::DbState;
use crate::error::ApiError;
use crate::services::backup_service;
use log::{error, info};
use tauri::State;

/// 导出数据
#[tauri::command]
pub fn export_data(targetPath: String, db: State<DbState>) -> Result<(), ApiError> {
    info!("export_data 调用: targetPath={}", targetPath);
    
    let conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    backup_service::export_to_file(&conn, &targetPath).map_err(|e| {
        error!("export_data 错误: {:?}", e);
        e.into()
    })
}

/// 导入数据
#[tauri::command]
pub fn import_data(sourcePath: String, db: State<DbState>) -> Result<(), ApiError> {
    info!("import_data 调用: sourcePath={}", sourcePath);
    
    let mut conn = db.0.lock().map_err(|e| {
        error!("获取数据库锁失败: {}", e);
        ApiError {
            code: "LOCK_ERROR".to_string(),
            message: format!("获取数据库锁失败: {}", e),
        }
    })?;

    backup_service::import_from_file(&mut conn, &sourcePath).map_err(|e| {
        error!("import_data 错误: {:?}", e);
        e.into()
    })
}
