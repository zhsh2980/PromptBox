use crate::error::AppError;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

/// 数据库连接状态管理
pub struct DbState(pub Mutex<Connection>);

/// 获取数据库文件路径
pub fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Unknown(format!("无法获取应用数据目录: {}", e)))?;

    // 确保目录存在
    std::fs::create_dir_all(&app_data_dir)?;

    Ok(app_data_dir.join("prompts.db"))
}

/// 建立数据库连接
pub fn establish_connection(db_path: &PathBuf) -> Result<Connection, AppError> {
    let conn = Connection::open(db_path)?;

    // 开启外键约束
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    Ok(conn)
}

/// 初始化数据库表结构
pub fn init_db(conn: &Connection) -> Result<(), AppError> {
    // 创建 projects 表
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            updated_at  TEXT
        );
        "#,
    )?;

    // 创建 tasks 表
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id  INTEGER NOT NULL,
            name        TEXT NOT NULL,
            description TEXT,
            created_at  TEXT NOT NULL,
            updated_at  TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id);
        "#,
    )?;

    // 创建 prompt_entries 表
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS prompt_entries (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id     INTEGER NOT NULL,
            title       TEXT,
            content     TEXT NOT NULL,
            tags        TEXT,
            model       TEXT,
            created_at  TEXT NOT NULL,
            updated_at  TEXT,
            FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_prompt_task_id ON prompt_entries (task_id);
        CREATE INDEX IF NOT EXISTS idx_prompt_created_at ON prompt_entries (created_at);
        "#,
    )?;

    Ok(())
}

/// 初始化数据库（在应用启动时调用）
pub fn setup_database(app: &tauri::AppHandle) -> Result<DbState, AppError> {
    let db_path = get_db_path(app)?;
    let conn = establish_connection(&db_path)?;
    init_db(&conn)?;
    Ok(DbState(Mutex::new(conn)))
}
