// SVN 服务层

use crate::error::AppError;
use crate::models::{SvnFolder, SvnPrompt, PromptFrontmatter};
use chrono::Utc;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;
use yaml_rust::YamlLoader;

// Windows 平台需要隐藏控制台窗口
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// 创建 SVN 命令（Windows 下隐藏窗口）
fn create_svn_command() -> Command {
    let mut cmd = Command::new("svn");

    #[cfg(target_os = "windows")]
    {
        // CREATE_NO_WINDOW = 0x08000000
        // 防止在 Windows 上显示控制台窗口
        cmd.creation_flags(0x08000000);
    }

    cmd
}

/// 执行 SVN 命令
fn execute_svn_command(args: &[&str]) -> Result<String, AppError> {
    let output = create_svn_command()
        .args(args)
        .output()
        .map_err(|e| {
            AppError::Unknown(format!(
                "SVN 命令执行失败: {}. 请确保已安装 SVN 客户端并添加到系统 PATH",
                e
            ))
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
        Err(AppError::Unknown(format!("SVN 错误: {}", error_msg)))
    }
}

/// 测试 SVN 是否可用
pub fn check_svn_available() -> Result<bool, AppError> {
    match create_svn_command().arg("--version").output() {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// 测试 SVN 仓库连接
pub fn test_repository_connection(url: &str) -> Result<bool, AppError> {
    match execute_svn_command(&["info", url]) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// 检出或更新 SVN 仓库
pub fn checkout_or_update_repository(url: &str, local_path: &Path) -> Result<(), AppError> {
    if local_path.exists() {
        // 本地路径存在，执行 update
        log::info!("更新 SVN 仓库: {}", local_path.display());
        execute_svn_command(&["update", local_path.to_str().unwrap()])?;
    } else {
        // 本地路径不存在，执行 checkout
        log::info!("检出 SVN 仓库: {} -> {}", url, local_path.display());

        // 确保父目录存在
        if let Some(parent) = local_path.parent() {
            fs::create_dir_all(parent)?;
        }

        execute_svn_command(&["checkout", url, local_path.to_str().unwrap()])?;
    }
    Ok(())
}

/// 获取文件的 SVN 最后修改时间
fn get_file_modified_time(file_path: &Path) -> Result<String, AppError> {
    let output = execute_svn_command(&["info", file_path.to_str().unwrap()])?;

    // 解析 SVN info 输出，查找 "Last Changed Date"
    for line in output.lines() {
        if line.starts_with("Last Changed Date:") {
            // 格式示例: "Last Changed Date: 2024-01-06 10:30:45 +0800 (Sat, 06 Jan 2024)"
            if let Some(date_str) = line.split(':').nth(1) {
                let date_str = date_str.trim().split('(').next().unwrap_or("").trim();
                return Ok(date_str.to_string());
            }
        }
    }

    // 如果无法从 SVN 获取，使用文件系统时间
    match fs::metadata(file_path) {
        Ok(metadata) => {
            if let Ok(modified) = metadata.modified() {
                let datetime: chrono::DateTime<Utc> = modified.into();
                return Ok(datetime.format("%Y-%m-%d %H:%M:%S").to_string());
            }
        }
        Err(_) => {}
    }

    Ok(Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
}

/// 解析提示词文件（YAML frontmatter + 内容）
fn parse_prompt_file(file_path: &Path, folder_path: &str) -> Result<SvnPrompt, AppError> {
    let content = fs::read_to_string(file_path)?;

    // 正则匹配 YAML frontmatter: ---\n...\n---\n
    let re = Regex::new(r"(?s)^---\s*\n(.*?)\n---\s*\n(.*)$").unwrap();

    let (frontmatter, body) = if let Some(caps) = re.captures(&content) {
        // 有 frontmatter
        let yaml_str = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let body = caps.get(2).map(|m| m.as_str()).unwrap_or("");

        // 解析 YAML
        let yaml_docs = YamlLoader::load_from_str(yaml_str).unwrap_or_default();
        let frontmatter = if yaml_docs.is_empty() {
            PromptFrontmatter::default()
        } else {
            let doc = &yaml_docs[0];
            PromptFrontmatter {
                title: doc["title"].as_str().map(|s| s.to_string()),
                tags: doc["tags"]
                    .as_vec()
                    .map(|v| {
                        v.iter()
                            .filter_map(|y| y.as_str().map(|s| s.to_string()))
                            .collect()
                    }),
                model: doc["model"].as_str().map(|s| s.to_string()),
            }
        };

        (frontmatter, body.to_string())
    } else {
        // 没有 frontmatter，整个文件作为内容
        (PromptFrontmatter::default(), content)
    };

    // 获取文件名作为默认标题
    let file_name = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("未命名")
        .to_string();

    let title = frontmatter.title.unwrap_or(file_name);
    let tags = frontmatter.tags.unwrap_or_default();

    // 获取修改时间
    let modified_at = get_file_modified_time(file_path)?;

    Ok(SvnPrompt {
        id: file_path.to_string_lossy().to_string(),
        folder_path: folder_path.to_string(),
        title,
        content: body.trim().to_string(),
        tags,
        model: frontmatter.model,
        modified_at,
        file_path: file_path.to_string_lossy().to_string(),
    })
}

/// 获取所有文件夹
pub fn get_folders(local_path: &Path) -> Result<Vec<SvnFolder>, AppError> {
    if !local_path.exists() {
        return Ok(Vec::new());
    }

    let mut folders = Vec::new();

    // 只遍历第一层目录
    for entry in fs::read_dir(local_path)? {
        let entry = entry?;
        let path = entry.path();

        // 跳过 .svn 目录
        if path.file_name().unwrap_or_default() == ".svn" {
            continue;
        }

        if path.is_dir() {
            let name = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("未命名")
                .to_string();

            let relative_path = path
                .strip_prefix(local_path)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();

            folders.push(SvnFolder {
                name,
                path: relative_path.clone(),
                full_path: path.to_string_lossy().to_string(),
            });
        }
    }

    // 按名称排序
    folders.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(folders)
}

/// 获取文件夹中的所有提示词文件
pub fn get_prompts_in_folder(folder_path: &Path, relative_folder_path: &str) -> Result<Vec<SvnPrompt>, AppError> {
    if !folder_path.exists() {
        return Ok(Vec::new());
    }

    let mut prompts = Vec::new();

    // 遍历文件夹中的所有文件（包括子文件夹）
    for entry in WalkDir::new(folder_path)
        .max_depth(10)  // 限制深度，避免过深
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();

        // 跳过 .svn 目录
        if path.to_string_lossy().contains(".svn") {
            continue;
        }

        // 只处理文件（.md, .txt, .yaml, .yml）
        if path.is_file() {
            if let Some(extension) = path.extension() {
                let ext = extension.to_string_lossy().to_lowercase();
                if ext == "md" || ext == "txt" || ext == "yaml" || ext == "yml" {
                    match parse_prompt_file(path, relative_folder_path) {
                        Ok(prompt) => prompts.push(prompt),
                        Err(e) => {
                            log::warn!("解析文件失败 {}: {}", path.display(), e);
                        }
                    }
                }
            }
        }
    }

    // 按标题排序
    prompts.sort_by(|a, b| a.title.cmp(&b.title));

    Ok(prompts)
}
