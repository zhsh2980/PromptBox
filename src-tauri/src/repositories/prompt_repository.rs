use crate::error::AppError;
use crate::models::PromptEntryDto;
use chrono::Utc;
use rusqlite::{params, Connection};

/// 获取任务下的所有提示词记录
pub fn list_prompts_by_task(
    conn: &Connection,
    task_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
    tags: Option<&[String]>,
) -> Result<Vec<PromptEntryDto>, AppError> {
    let mut sql = String::from(
        "SELECT id, task_id, title, content, tags, model, created_at, updated_at 
         FROM prompt_entries WHERE task_id = ?",
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(task_id)];

    if let Some(start) = start_time {
        sql.push_str(" AND created_at >= ?");
        params_vec.push(Box::new(start.to_string()));
    }
    if let Some(end) = end_time {
        sql.push_str(" AND created_at <= ?");
        params_vec.push(Box::new(end.to_string()));
    }

    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let prompts: Vec<PromptEntryDto> = stmt
        .query_map(params_refs.as_slice(), |row| parse_prompt_row(row))?
        .collect::<Result<Vec<_>, _>>()?;

    // 如果有标签过滤，在内存中过滤
    let prompts = if let Some(filter_tags) = tags {
        prompts
            .into_iter()
            .filter(|p| {
                if let Some(prompt_tags) = &p.tags {
                    filter_tags.iter().any(|t| prompt_tags.contains(t))
                } else {
                    false
                }
            })
            .collect()
    } else {
        prompts
    };

    Ok(prompts)
}

fn parse_prompt_row(row: &rusqlite::Row) -> rusqlite::Result<PromptEntryDto> {
    let tags_json: Option<String> = row.get(4)?;
    let tags: Option<Vec<String>> = tags_json
        .and_then(|s| serde_json::from_str(&s).ok());

    Ok(PromptEntryDto {
        id: row.get(0)?,
        task_id: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        tags,
        model: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

/// 创建提示词记录
pub fn create_prompt(
    conn: &Connection,
    task_id: i64,
    title: Option<&str>,
    content: &str,
    tags: Option<&[String]>,
    model: Option<&str>,
) -> Result<PromptEntryDto, AppError> {
    // 允许空格内容作为新建时的占位符
    if content.is_empty() {
        return Err(AppError::ValidationError("提示词内容不能为空".to_string()));
    }

    let now = Utc::now().to_rfc3339();
    let tags_json = tags.map(|t| serde_json::to_string(t).unwrap_or_default());

    conn.execute(
        "INSERT INTO prompt_entries (task_id, title, content, tags, model, created_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![task_id, title, content, tags_json, model, now],
    )?;

    let id = conn.last_insert_rowid();

    Ok(PromptEntryDto {
        id,
        task_id,
        title: title.map(|s| s.to_string()),
        content: content.to_string(),
        tags: tags.map(|t| t.to_vec()),
        model: model.map(|s| s.to_string()),
        created_at: now,
        updated_at: None,
    })
}

/// 更新提示词记录
pub fn update_prompt(
    conn: &Connection,
    id: i64,
    title: Option<&str>,
    content: Option<&str>,
    tags: Option<&[String]>,
    model: Option<&str>,
) -> Result<(), AppError> {
    // 先获取现有记录
    let current = get_prompt(conn, id)?;

    let new_title = title.or(current.title.as_deref());
    let new_content = content.unwrap_or(&current.content);
    let new_tags = tags.map(|t| t.to_vec()).or(current.tags);
    let new_model = model.or(current.model.as_deref());

    // 允许空格内容作为占位符
    if new_content.is_empty() {
        return Err(AppError::ValidationError("提示词内容不能为空".to_string()));
    }

    let now = Utc::now().to_rfc3339();
    let tags_json = new_tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or_default());

    conn.execute(
        "UPDATE prompt_entries SET title = ?1, content = ?2, tags = ?3, model = ?4, updated_at = ?5 
         WHERE id = ?6",
        params![new_title, new_content, tags_json, new_model, now, id],
    )?;

    Ok(())
}

/// 删除提示词记录
pub fn delete_prompt(conn: &Connection, id: i64) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM prompt_entries WHERE id = ?1", params![id])?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("提示词记录 {} 不存在", id)));
    }

    Ok(())
}

/// 获取单个提示词记录
pub fn get_prompt(conn: &Connection, id: i64) -> Result<PromptEntryDto, AppError> {
    let prompt = conn.query_row(
        "SELECT id, task_id, title, content, tags, model, created_at, updated_at 
         FROM prompt_entries WHERE id = ?1",
        params![id],
        |row| parse_prompt_row(row),
    ).map_err(|_| AppError::NotFound(format!("提示词记录 {} 不存在", id)))?;

    Ok(prompt)
}
