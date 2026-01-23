use serde::{Deserialize, Serialize};

/// 提示词记录数据传输对象
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptEntryDto {
    pub id: i64,
    pub task_id: i64,
    pub title: Option<String>,
    pub content: String,
    pub tags: Option<Vec<String>>,
    pub model: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
    /// 内容格式 ('plain' | 'markdown')
    pub format: Option<String>,
    /// 视图模式 ('edit' | 'preview' | 'live')
    pub view_mode: Option<String>,
}
