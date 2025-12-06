use serde::{Deserialize, Serialize};

/// 任务数据传输对象
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDto {
    pub id: i64,
    pub project_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
}
