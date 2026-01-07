// SVN 数据模型

use serde::{Deserialize, Serialize};

/// SVN 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvnConfig {
    /// 是否启用 SVN 功能
    pub enabled: bool,
    /// SVN 仓库地址
    pub repository_url: String,
    /// 本地检出路径（由系统自动管理）
    pub local_path: Option<String>,
}

impl Default for SvnConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            repository_url: String::new(),
            local_path: None,
        }
    }
}

/// SVN 文件夹（对应左侧的二级列表）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvnFolder {
    /// 文件夹名称
    pub name: String,
    /// 相对于仓库根目录的路径
    pub path: String,
    /// 完整的文件系统路径
    pub full_path: String,
}

/// SVN 提示词（对应具体的提示词文件）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvnPrompt {
    /// 唯一标识（使用文件路径）
    pub id: String,
    /// 所属文件夹路径
    pub folder_path: String,
    /// 标题
    pub title: String,
    /// 内容
    pub content: String,
    /// 标签
    pub tags: Vec<String>,
    /// AI 模型
    pub model: Option<String>,
    /// 最后修改时间（从 SVN 获取）
    pub modified_at: String,
    /// 文件完整路径
    pub file_path: String,
}

/// 提示词文件的 YAML Frontmatter 结构
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PromptFrontmatter {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub model: Option<String>,
}
