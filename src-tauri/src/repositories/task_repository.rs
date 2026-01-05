use crate::error::AppError;
use crate::models::TaskDto;
use chrono::Utc;
use rusqlite::{params, Connection};

/// 获取项目下的所有任务
pub fn list_tasks_by_project(conn: &Connection, project_id: i64) -> Result<Vec<TaskDto>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, description, sort_order, created_at, updated_at 
         FROM tasks WHERE project_id = ?1 ORDER BY sort_order ASC",
    )?;

    let tasks = stmt
        .query_map(params![project_id], |row| {
            Ok(TaskDto {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(tasks)
}

/// 创建任务
pub fn create_task(
    conn: &Connection,
    project_id: i64,
    name: &str,
    description: Option<&str>,
) -> Result<TaskDto, AppError> {
    if name.trim().is_empty() {
        return Err(AppError::ValidationError("任务名称不能为空".to_string()));
    }

    let now = Utc::now().to_rfc3339();
    
    // 获取该项目下最大 sort_order 并加 1
    let max_sort_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM tasks WHERE project_id = ?1", 
            params![project_id], 
            |row| row.get(0)
        )
        .unwrap_or(0);
    let sort_order = max_sort_order + 1;

    conn.execute(
        "INSERT INTO tasks (project_id, name, description, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![project_id, name, description, sort_order, now],
    )?;

    let id = conn.last_insert_rowid();

    Ok(TaskDto {
        id,
        project_id,
        name: name.to_string(),
        description: description.map(|s| s.to_string()),
        sort_order,
        created_at: now,
        updated_at: None,
    })
}

/// 更新任务
pub fn update_task(
    conn: &Connection,
    id: i64,
    name: Option<&str>,
    description: Option<&str>,
) -> Result<(), AppError> {
    // 获取当前任务
    let current: TaskDto = conn.query_row(
        "SELECT id, project_id, name, description, sort_order, created_at, updated_at FROM tasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(TaskDto {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("任务 {} 不存在", id)))?;

    let new_name = name.unwrap_or(&current.name);
    let new_description = description.or(current.description.as_deref());

    if new_name.trim().is_empty() {
        return Err(AppError::ValidationError("任务名称不能为空".to_string()));
    }

    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE tasks SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
        params![new_name, new_description, now, id],
    )?;

    Ok(())
}

/// 删除任务
pub fn delete_task(conn: &Connection, id: i64) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("任务 {} 不存在", id)));
    }

    Ok(())
}

/// 获取单个任务
pub fn get_task(conn: &Connection, id: i64) -> Result<TaskDto, AppError> {
    let task = conn.query_row(
        "SELECT id, project_id, name, description, sort_order, created_at, updated_at FROM tasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(TaskDto {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("任务 {} 不存在", id)))?;

    Ok(task)
}

/// 重新排序任务
pub fn reorder_tasks(conn: &Connection, task_ids: Vec<i64>) -> Result<(), AppError> {
    for (index, id) in task_ids.iter().enumerate() {
        conn.execute(
            "UPDATE tasks SET sort_order = ?1 WHERE id = ?2",
            params![index as i64, id],
        )?;
    }
    Ok(())
}
