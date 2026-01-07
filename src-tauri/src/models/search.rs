use serde::{Deserialize, Serialize};

/// 搜索结果来源
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SearchSource {
    Local,  // 本地数据库
    Svn,    // SVN共享Prompts
}

/// 搜索结果数据传输对象
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResultDto {
    // 来源标识
    pub source: SearchSource,

    // 本地数据库字段（仅 Local 来源有效）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_id: Option<i64>,

    // 通用字段
    pub project_name: String,
    pub task_name: String,
    pub snippet: String,
    pub created_at: String,

    // SVN 特有字段（仅 Svn 来源有效）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub folder_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_title: Option<String>,
}

