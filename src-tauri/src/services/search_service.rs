use crate::error::AppError;
use crate::models::SearchResultDto;
use rusqlite::Connection;

/// 搜索提示词记录
pub fn search_prompts(
    conn: &Connection,
    keyword: &str,
    project_id: Option<i64>,
    task_id: Option<i64>,
    limit: i64,
) -> Result<Vec<SearchResultDto>, AppError> {
    if keyword.trim().is_empty() {
        return Ok(vec![]);
    }

    let search_pattern = format!("%{}%", keyword);

    let mut sql = String::from(
        r#"
        SELECT 
            p.id as project_id,
            t.id as task_id,
            pe.id as prompt_id,
            p.name as project_name,
            t.name as task_name,
            pe.content,
            pe.title,
            pe.created_at
        FROM prompt_entries pe
        JOIN tasks t ON pe.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE (pe.title LIKE ? OR pe.content LIKE ?)
        "#,
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![
        Box::new(search_pattern.clone()),
        Box::new(search_pattern.clone()),
    ];

    if let Some(pid) = project_id {
        sql.push_str(" AND p.id = ?");
        params_vec.push(Box::new(pid));
    }
    if let Some(tid) = task_id {
        sql.push_str(" AND t.id = ?");
        params_vec.push(Box::new(tid));
    }

    sql.push_str(" ORDER BY pe.created_at DESC LIMIT ?");
    params_vec.push(Box::new(limit));

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let keyword_clone = keyword.to_string();
    let results: Vec<SearchResultDto> = stmt
        .query_map(params_refs.as_slice(), |row| {
            parse_search_row(row, &keyword_clone)
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(results)
}

fn parse_search_row(row: &rusqlite::Row, keyword: &str) -> rusqlite::Result<SearchResultDto> {
    let content: String = row.get(5)?;
    let title: Option<String> = row.get(6)?;
    let created_at: String = row.get(7)?;

    // 生成摘要：找到关键词附近的内容
    let snippet = generate_snippet(&content, &title, keyword);

    Ok(SearchResultDto {
        project_id: row.get(0)?,
        task_id: row.get(1)?,
        prompt_id: row.get(2)?,
        project_name: row.get(3)?,
        task_name: row.get(4)?,
        snippet,
        created_at,
    })
}

/// 生成搜索结果摘要
fn generate_snippet(content: &str, title: &Option<String>, keyword: &str) -> String {
    // 先检查标题
    if let Some(t) = title {
        if t.to_lowercase().contains(&keyword.to_lowercase()) {
            return format!("[标题] {}", t);
        }
    }

    // 在内容中查找关键词位置
    let content_lower = content.to_lowercase();
    let keyword_lower = keyword.to_lowercase();

    if let Some(pos) = content_lower.find(&keyword_lower) {
        // 提取关键词前后各 50 个字符
        let start = pos.saturating_sub(50);
        let end = (pos + keyword.len() + 50).min(content.len());

        // 确保不会在字符边界切断
        let snippet_start = content[..start]
            .char_indices()
            .last()
            .map(|(i, _)| i)
            .unwrap_or(0);
        let snippet_end = content[end..]
            .char_indices()
            .next()
            .map(|(i, _)| end + i)
            .unwrap_or(content.len());

        let mut snippet = content[snippet_start..snippet_end].to_string();

        if snippet_start > 0 {
            snippet = format!("...{}", snippet);
        }
        if snippet_end < content.len() {
            snippet = format!("{}...", snippet);
        }

        snippet
    } else {
        // 如果找不到，返回前 100 个字符
        let end = content.char_indices().nth(100).map(|(i, _)| i).unwrap_or(content.len());
        if end < content.len() {
            format!("{}...", &content[..end])
        } else {
            content.to_string()
        }
    }
}
