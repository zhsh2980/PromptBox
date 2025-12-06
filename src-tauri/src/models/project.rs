use serde::{Deserialize, Serialize};

/// 项目数据传输对象
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectDto {
    pub id: i64,
    pub name: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}
