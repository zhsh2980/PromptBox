use serde::{Deserialize, Serialize};

/// 搜索结果数据传输对象
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResultDto {
    pub project_id: i64,
    pub task_id: i64,
    pub prompt_id: i64,
    pub project_name: String,
    pub task_name: String,
    pub snippet: String,
    pub created_at: String,
}
