use crate::error::AppError;
use crate::models::{ProjectDto, PromptEntryDto, TaskDto};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;

/// 导出数据结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub version: i32,
    pub exported_at: String,
    pub projects: Vec<ExportProject>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportProject {
    pub name: String,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub tasks: Vec<ExportTask>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportTask {
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub prompts: Vec<ExportPrompt>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportPrompt {
    pub title: Option<String>,
    pub content: String,
    pub tags: Option<Vec<String>>,
    pub model: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
}

/// 导出数据到 JSON 文件
pub fn export_to_file(conn: &Connection, path: &str) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();

    // 获取所有项目
    let mut projects_stmt = conn.prepare(
        "SELECT id, name, created_at, updated_at FROM projects ORDER BY created_at",
    )?;

    let projects: Vec<(i64, ProjectDto)> = projects_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                ProjectDto {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    created_at: row.get(2)?,
                    updated_at: row.get(3)?,
                },
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut export_projects = Vec::new();

    for (project_id, project) in projects {
        // 获取项目下的任务
        let mut tasks_stmt = conn.prepare(
            "SELECT id, name, description, created_at, updated_at 
             FROM tasks WHERE project_id = ?1 ORDER BY created_at",
        )?;

        let tasks: Vec<(i64, TaskDto)> = tasks_stmt
            .query_map(params![project_id], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    TaskDto {
                        id: row.get(0)?,
                        project_id,
                        name: row.get(1)?,
                        description: row.get(2)?,
                        created_at: row.get(3)?,
                        updated_at: row.get(4)?,
                    },
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let mut export_tasks = Vec::new();

        for (task_id, task) in tasks {
            // 获取任务下的提示词
            let mut prompts_stmt = conn.prepare(
                "SELECT title, content, tags, model, created_at, updated_at 
                 FROM prompt_entries WHERE task_id = ?1 ORDER BY created_at",
            )?;

            let prompts: Vec<ExportPrompt> = prompts_stmt
                .query_map(params![task_id], |row| {
                    let tags_json: Option<String> = row.get(2)?;
                    let tags: Option<Vec<String>> =
                        tags_json.and_then(|s| serde_json::from_str(&s).ok());

                    Ok(ExportPrompt {
                        title: row.get(0)?,
                        content: row.get(1)?,
                        tags,
                        model: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            export_tasks.push(ExportTask {
                name: task.name,
                description: task.description,
                created_at: task.created_at,
                updated_at: task.updated_at,
                prompts,
            });
        }

        export_projects.push(ExportProject {
            name: project.name,
            created_at: project.created_at,
            updated_at: project.updated_at,
            tasks: export_tasks,
        });
    }

    let export_data = ExportData {
        version: 1,
        exported_at: now,
        projects: export_projects,
    };

    let json = serde_json::to_string_pretty(&export_data)?;
    fs::write(path, json)?;

    Ok(())
}

/// 从 JSON 文件导入数据（覆盖模式）
pub fn import_from_file(conn: &mut Connection, path: &str) -> Result<(), AppError> {
    let json = fs::read_to_string(path)?;
    let export_data: ExportData = serde_json::from_str(&json)?;

    // 开启事务
    let tx = conn.transaction()?;

    // 清空现有数据（按顺序删除，遵循外键约束）
    tx.execute_batch(
        r#"
        DELETE FROM prompt_entries;
        DELETE FROM tasks;
        DELETE FROM projects;
        "#,
    )?;

    // 导入项目
    for project in export_data.projects {
        tx.execute(
            "INSERT INTO projects (name, created_at, updated_at) VALUES (?1, ?2, ?3)",
            params![project.name, project.created_at, project.updated_at],
        )?;

        let project_id = tx.last_insert_rowid();

        // 导入任务
        for task in project.tasks {
            tx.execute(
                "INSERT INTO tasks (project_id, name, description, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![project_id, task.name, task.description, task.created_at, task.updated_at],
            )?;

            let task_id = tx.last_insert_rowid();

            // 导入提示词
            for prompt in task.prompts {
                let tags_json = prompt.tags.map(|t| serde_json::to_string(&t).unwrap_or_default());

                tx.execute(
                    "INSERT INTO prompt_entries (task_id, title, content, tags, model, created_at, updated_at) 
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![
                        task_id,
                        prompt.title,
                        prompt.content,
                        tags_json,
                        prompt.model,
                        prompt.created_at,
                        prompt.updated_at
                    ],
                )?;
            }
        }
    }

    // 提交事务
    tx.commit()?;

    Ok(())
}
