use crate::error::AppError;
use crate::models::ProjectDto;
use chrono::Utc;
use rusqlite::{params, Connection};

/// 获取所有项目
pub fn list_projects(conn: &Connection) -> Result<Vec<ProjectDto>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, created_at, updated_at FROM projects ORDER BY created_at DESC",
    )?;

    let projects = stmt
        .query_map([], |row| {
            Ok(ProjectDto {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(projects)
}

/// 创建项目
pub fn create_project(conn: &Connection, name: &str) -> Result<ProjectDto, AppError> {
    if name.trim().is_empty() {
        return Err(AppError::ValidationError("项目名称不能为空".to_string()));
    }

    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO projects (name, created_at) VALUES (?1, ?2)",
        params![name, now],
    )?;

    let id = conn.last_insert_rowid();

    Ok(ProjectDto {
        id,
        name: name.to_string(),
        created_at: now,
        updated_at: None,
    })
}

/// 更新项目
pub fn update_project(conn: &Connection, id: i64, name: &str) -> Result<(), AppError> {
    if name.trim().is_empty() {
        return Err(AppError::ValidationError("项目名称不能为空".to_string()));
    }

    let now = Utc::now().to_rfc3339();

    let affected = conn.execute(
        "UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3",
        params![name, now, id],
    )?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("项目 {} 不存在", id)));
    }

    Ok(())
}

/// 删除项目
pub fn delete_project(conn: &Connection, id: i64) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("项目 {} 不存在", id)));
    }

    Ok(())
}

/// 获取单个项目
pub fn get_project(conn: &Connection, id: i64) -> Result<ProjectDto, AppError> {
    let project = conn.query_row(
        "SELECT id, name, created_at, updated_at FROM projects WHERE id = ?1",
        params![id],
        |row| {
            Ok(ProjectDto {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        },
    )?;

    Ok(project)
}
