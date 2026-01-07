use crate::db::DbState;
use crate::error::ApiError;
use crate::models::SearchResultDto;
use crate::repositories::settings_repository;
use crate::services::search_service;
use log::{error, info};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

/// 搜索提示词记录（包含本地和 SVN prompts）
#[tauri::command]
pub fn search_prompt_entries(
    keyword: String,
    projectId: Option<i64>,
    taskId: Option<i64>,
    limit: Option<i64>,
    app: AppHandle,
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
    let mut results = Vec::new();

    // 1. 搜索本地数据库
    let local_results = search_service::search_prompts(&conn, &keyword, projectId, taskId, limit)
        .map_err(|e| {
            error!("搜索本地 prompts 错误: {:?}", e);
            e
        })?;

    results.extend(local_results);

    // 2. 搜索 SVN prompts（如果启用）
    match settings_repository::get_svn_config(&conn) {
        Ok(svn_config) => {
            if svn_config.enabled {
                // 获取 SVN 本地副本路径
                let app_data_dir = app.path().app_data_dir().map_err(|e| {
                    error!("获取应用数据目录失败: {}", e);
                    ApiError {
                        code: "PATH_ERROR".to_string(),
                        message: format!("获取应用数据目录失败: {}", e),
                    }
                })?;

                let svn_local_path: PathBuf = app_data_dir.join("svn_data");

                if svn_local_path.exists() {
                    let remaining_limit = (limit as usize).saturating_sub(results.len()) as i64;
                    if remaining_limit > 0 {
                        match search_service::search_svn_prompts(&svn_local_path, &keyword, remaining_limit) {
                            Ok(svn_results) => {
                                info!("找到 {} 个 SVN prompts", svn_results.len());
                                results.extend(svn_results);
                            }
                            Err(e) => {
                                error!("搜索 SVN prompts 错误: {:?}", e);
                                // SVN 搜索失败不影响整体结果
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            error!("获取 SVN 配置失败: {:?}", e);
            // 获取配置失败不影响本地搜索结果
        }
    }

    // 3. 按创建时间倒序排序
    results.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // 4. 限制总数量
    results.truncate(limit as usize);

    Ok(results)
}
