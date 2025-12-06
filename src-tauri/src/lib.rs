// 模块声明
mod commands;
mod db;
mod error;
mod models;
mod repositories;
mod services;

use commands::*;
use db::setup_database;
use log::LevelFilter;
use simplelog::{CombinedLogger, Config, WriteLogger};
use std::fs::File;
use tauri::Manager;

/// 初始化日志系统
fn init_logging(app: &tauri::AppHandle) {
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        // 确保目录存在
        let _ = std::fs::create_dir_all(&app_data_dir);
        
        let log_path = app_data_dir.join("error.log");
        
        if let Ok(log_file) = File::create(&log_path) {
            let _ = CombinedLogger::init(vec![
                WriteLogger::new(LevelFilter::Debug, Config::default(), log_file),
            ]);
            log::info!("日志系统初始化成功，日志文件: {:?}", log_path);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 初始化日志
            init_logging(app.handle());
            
            // 初始化数据库
            let db_state = match setup_database(app.handle()) {
                Ok(state) => {
                    log::info!("数据库初始化成功");
                    state
                },
                Err(e) => {
                    log::error!("数据库初始化失败: {:?}", e);
                    panic!("数据库初始化失败: {:?}", e);
                }
            };
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 项目命令
            list_projects,
            create_project,
            update_project,
            delete_project,
            // 任务命令
            list_tasks,
            create_task,
            update_task,
            delete_task,
            // 提示词命令
            list_prompt_entries,
            create_prompt_entry,
            update_prompt_entry,
            delete_prompt_entry,
            // 搜索命令
            search_prompt_entries,
            // 设置命令
            get_database_path,
            // 备份命令
            export_data,
            import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
