use crate::db::DbState;
use crate::error::ApiError;
use crate::models::{SvnConfig, SvnFolder, SvnPrompt};
use crate::repositories::settings_repository;
use crate::services::svn_service;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

/// 获取 SVN 配置
#[tauri::command]
pub fn get_svn_config(db: State<DbState>) -> Result<SvnConfig, ApiError> {
    let conn = db.0.lock().map_err(|e| ApiError {
        code: "LOCK_ERROR".to_string(),
        message: format!("获取数据库锁失败: {}", e),
    })?;

    settings_repository::get_svn_config(&conn).map_err(Into::into)
}

/// 更新 SVN 配置
#[tauri::command]
pub fn update_svn_config(config: SvnConfig, db: State<DbState>, app: AppHandle) -> Result<(), ApiError> {
    let conn = db.0.lock().map_err(|e| ApiError {
        code: "LOCK_ERROR".to_string(),
        message: format!("获取数据库锁失败: {}", e),
    })?;

    // 如果启用了 SVN 且提供了仓库 URL，设置本地路径
    let mut final_config = config.clone();
    if final_config.enabled && !final_config.repository_url.is_empty() {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| ApiError {
                code: "PATH_ERROR".to_string(),
                message: format!("无法获取应用数据目录: {}", e),
            })?;

        let svn_cache_dir = app_data_dir.join("svn_cache");
        final_config.local_path = Some(svn_cache_dir.to_string_lossy().to_string());
    }

    settings_repository::save_svn_config(&conn, &final_config).map_err(Into::into)
}

/// 测试 SVN 是否可用
#[tauri::command]
pub fn check_svn_available() -> Result<bool, ApiError> {
    svn_service::check_svn_available().map_err(Into::into)
}

/// 测试 SVN 仓库连接
#[tauri::command]
pub fn test_svn_connection(url: String) -> Result<bool, ApiError> {
    svn_service::test_repository_connection(&url).map_err(Into::into)
}

/// 刷新 SVN 数据（检出或更新仓库）
#[tauri::command]
pub fn refresh_svn_data(db: State<DbState>) -> Result<(), ApiError> {
    let conn = db.0.lock().map_err(|e| ApiError {
        code: "LOCK_ERROR".to_string(),
        message: format!("获取数据库锁失败: {}", e),
    })?;

    let config = settings_repository::get_svn_config(&conn).map_err(|e| ApiError {
        code: "DB_ERROR".to_string(),
        message: format!("获取 SVN 配置失败: {}", e),
    })?;

    if !config.enabled {
        return Err(ApiError {
            code: "SVN_DISABLED".to_string(),
            message: "SVN 功能未启用".to_string(),
        });
    }

    if config.repository_url.is_empty() {
        return Err(ApiError {
            code: "SVN_NOT_CONFIGURED".to_string(),
            message: "SVN 仓库地址未配置".to_string(),
        });
    }

    let local_path = config.local_path.ok_or_else(|| ApiError {
        code: "SVN_PATH_ERROR".to_string(),
        message: "SVN 本地路径未设置".to_string(),
    })?;

    let local_path_buf = PathBuf::from(&local_path);
    svn_service::checkout_or_update_repository(&config.repository_url, &local_path_buf)
        .map_err(Into::into)
}

/// 获取 SVN 文件夹列表
#[tauri::command]
pub fn get_svn_folders(db: State<DbState>) -> Result<Vec<SvnFolder>, ApiError> {
    let conn = db.0.lock().map_err(|e| ApiError {
        code: "LOCK_ERROR".to_string(),
        message: format!("获取数据库锁失败: {}", e),
    })?;

    let config = settings_repository::get_svn_config(&conn).map_err(|e| ApiError {
        code: "DB_ERROR".to_string(),
        message: format!("获取 SVN 配置失败: {}", e),
    })?;

    if !config.enabled {
        return Ok(Vec::new());
    }

    let local_path = config.local_path.ok_or_else(|| ApiError {
        code: "SVN_PATH_ERROR".to_string(),
        message: "SVN 本地路径未设置".to_string(),
    })?;

    let local_path_buf = PathBuf::from(&local_path);
    svn_service::get_folders(&local_path_buf).map_err(Into::into)
}

/// 获取指定文件夹中的提示词列表
#[tauri::command]
pub fn get_svn_prompts_for_folder(folder_path: String, db: State<DbState>) -> Result<Vec<SvnPrompt>, ApiError> {
    let conn = db.0.lock().map_err(|e| ApiError {
        code: "LOCK_ERROR".to_string(),
        message: format!("获取数据库锁失败: {}", e),
    })?;

    let config = settings_repository::get_svn_config(&conn).map_err(|e| ApiError {
        code: "DB_ERROR".to_string(),
        message: format!("获取 SVN 配置失败: {}", e),
    })?;

    if !config.enabled {
        return Ok(Vec::new());
    }

    let local_path = config.local_path.ok_or_else(|| ApiError {
        code: "SVN_PATH_ERROR".to_string(),
        message: "SVN 本地路径未设置".to_string(),
    })?;

    // 构建完整的文件夹路径
    let full_folder_path = PathBuf::from(&local_path).join(&folder_path);

    svn_service::get_prompts_in_folder(&full_folder_path, &folder_path).map_err(Into::into)
}
