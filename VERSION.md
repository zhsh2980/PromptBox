# 版本号管理说明

## 单一数据源（Single Source of Truth）

本项目的版本号统一在 **`src-tauri/Cargo.toml`** 中管理。

```toml
[package]
name = "promptlog"
version = "1.0.9"  # ← 唯一的版本号定义位置
```

## 版本号更新流程

当需要发布新版本时：

1. **只修改一个文件**：`src-tauri/Cargo.toml` 的 `version` 字段
2. **自动生效位置**：
   - Tauri 应用构建（自动从 Cargo.toml 读取）
   - 软件设置页面显示的版本号
   - NSIS 安装包文件名
   - macOS DMG 文件名
   - Windows Portable ZIP 文件名
   - GitHub Release 标签（手动触发时）

3. **无需修改的文件**：
   - ❌ `src-tauri/tauri.conf.json` - 已删除 version 字段
   - ❌ `src-tauri/tauri.conf.webview2.json` - 已删除 version 字段
   - ⚠️ `package.json` - 保留但仅用于前端包管理，与 Tauri 构建无关

## 技术实现

### Tauri 自动读取
Tauri 2.x 在 `tauri.conf.json` 中如果不指定 `version` 字段，会自动从 `Cargo.toml` 读取版本号。

### GitHub Actions 读取
workflow 文件使用以下命令从 Cargo.toml 读取版本号：

**Bash (Linux/macOS)**:
```bash
VERSION=$(grep '^version = ' src-tauri/Cargo.toml | head -n 1 | sed 's/version = "\(.*\)"/\1/')
```

**PowerShell (Windows)**:
```powershell
$version = (Get-Content "src-tauri/Cargo.toml" | Select-String '^version = "(.+)"').Matches.Groups[1].Value
```

## 示例：发布 v1.1.0

```bash
# 1. 修改版本号
# 编辑 src-tauri/Cargo.toml
# version = "1.1.0"

# 2. 提交更改
git add src-tauri/Cargo.toml
git commit -m "chore: bump version to 1.1.0"
git push origin main

# 3. 创建并推送 tag（自动触发 Release 构建）
git tag v1.1.0
git push origin v1.1.0

# 4. 等待 GitHub Actions 构建完成
# 访问 https://github.com/zhsh2980/PromptBox/releases
```

## 好处

✅ **避免版本不一致** - 只有一个地方定义版本号
✅ **减少维护成本** - 不需要同步多个文件
✅ **符合 Rust 生态** - Cargo.toml 是 Rust 项目的标准配置文件
✅ **遵循最佳实践** - Single Source of Truth 原则
