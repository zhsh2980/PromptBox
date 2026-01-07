use crate::error::AppError;
use crate::models::{SearchResultDto, SearchSource};
use crate::services::svn_service;
use rusqlite::Connection;
use std::path::Path;

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
        source: SearchSource::Local,
        project_id: Some(row.get(0)?),
        task_id: Some(row.get(1)?),
        prompt_id: Some(row.get(2)?),
        project_name: row.get(3)?,
        task_name: row.get(4)?,
        snippet,
        created_at,
        folder_path: None,
        file_path: None,
        prompt_title: None,
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

    if let Some(byte_pos) = content_lower.find(&keyword_lower) {
        // 将字节位置转换为字符位置
        let char_pos = content[..byte_pos].chars().count();
        let total_chars = content.chars().count();
        
        // 计算安全的字符范围（前后各 50 个字符）
        let start_char = char_pos.saturating_sub(50);
        let end_char = (char_pos + keyword.chars().count() + 50).min(total_chars);
        
        // 使用字符迭代器安全地提取子串
        let snippet: String = content
            .chars()
            .skip(start_char)
            .take(end_char - start_char)
            .collect();
        
        let mut result = snippet;
        if start_char > 0 {
            result = format!("...{}", result);
        }
        if end_char < total_chars {
            result = format!("{}...", result);
        }
        
        result
    } else {
        // 如果找不到，返回前 100 个字符
        let snippet: String = content.chars().take(100).collect();
        if content.chars().count() > 100 {
            format!("{}...", snippet)
        } else {
            snippet
        }
    }
}

/// 搜索 SVN prompts
pub fn search_svn_prompts(
    svn_local_path: &Path,
    keyword: &str,
    limit: i64,
) -> Result<Vec<SearchResultDto>, AppError> {
    if keyword.trim().is_empty() {
        return Ok(vec![]);
    }

    if !svn_local_path.exists() {
        return Ok(vec![]);
    }

    let keyword_lower = keyword.to_lowercase();
    let mut results = Vec::new();

    // 获取所有文件夹
    let folders = svn_service::get_folders(svn_local_path)?;

    for folder in folders {
        // 获取文件夹中的所有prompts
        let folder_full_path = Path::new(&folder.full_path);
        let prompts = svn_service::get_prompts_in_folder(folder_full_path, &folder.path)?;

        for prompt in prompts {
            // 在标题和内容中搜索关键词
            let title_matches = prompt.title.to_lowercase().contains(&keyword_lower);
            let content_matches = prompt.content.to_lowercase().contains(&keyword_lower);

            if title_matches || content_matches {
                // 生成摘要
                let snippet = generate_snippet(&prompt.content, &Some(prompt.title.clone()), keyword);

                results.push(SearchResultDto {
                    source: SearchSource::Svn,
                    project_id: None,
                    task_id: None,
                    prompt_id: None,
                    project_name: "共享Prompts".to_string(),
                    task_name: folder.name.clone(),
                    snippet,
                    created_at: prompt.modified_at.clone(),
                    folder_path: Some(folder.path.clone()),
                    file_path: Some(prompt.file_path.clone()),
                    prompt_title: Some(prompt.title.clone()),
                });

                // 达到限制数量后停止
                if results.len() >= limit as usize {
                    return Ok(results);
                }
            }
        }
    }

    Ok(results)
}
