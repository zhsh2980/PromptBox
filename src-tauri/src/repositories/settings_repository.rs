// 配置数据持久化层

use rusqlite::{params, Connection, Result};
use crate::models::SvnConfig;

/// 获取配置项
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query(params![key])?;

    if let Some(row) = rows.next()? {
        let value: String = row.get(0)?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

/// 设置配置项
pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))",
        params![key, value],
    )?;
    Ok(())
}

/// 获取 SVN 配置
pub fn get_svn_config(conn: &Connection) -> Result<SvnConfig> {
    let enabled = get_setting(conn, "svn_enabled")?
        .unwrap_or_else(|| "false".to_string())
        .parse::<bool>()
        .unwrap_or(false);

    let repository_url = get_setting(conn, "svn_repository_url")?
        .unwrap_or_default();

    let local_path = get_setting(conn, "svn_local_path")?;

    Ok(SvnConfig {
        enabled,
        repository_url,
        local_path,
    })
}

/// 保存 SVN 配置
pub fn save_svn_config(conn: &Connection, config: &SvnConfig) -> Result<()> {
    set_setting(conn, "svn_enabled", &config.enabled.to_string())?;
    set_setting(conn, "svn_repository_url", &config.repository_url)?;

    if let Some(ref local_path) = config.local_path {
        set_setting(conn, "svn_local_path", local_path)?;
    }

    Ok(())
}
