# PromptLog - 提示词记录软件

一款本地化、跨平台的 AI 提示词管理桌面应用，帮助你按项目/任务结构化管理和记录 AI 提示词。

## 技术栈

- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Tauri + Rust
- **数据库**: SQLite (本地存储)

## 环境要求

在运行项目之前，请确保已安装以下环境：

### 1. Node.js (v18+)
```bash
# 检查是否已安装
node -v

# 如未安装，推荐使用 nvm 安装
# macOS/Linux:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. Rust
```bash
# 检查是否已安装
rustc --version

# 如未安装
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 3. Tauri 依赖 (macOS)
```bash
# 安装 Xcode Command Line Tools
xcode-select --install
```

## 快速开始

### 1. 安装依赖
```bash
cd /Users/zhangshan/Documents/AIProject/PromptsLog/codes/promptlog

# 安装前端依赖
npm install
```

### 2. 开发模式运行
```bash
npm run tauri dev
```

这个命令会：
- 启动 Vite 开发服务器 (前端热更新)
- 编译 Rust 后端
- 打开应用窗口

**首次启动可能需要几分钟**（编译 Rust 依赖），之后的启动会快很多。

### 3. 刷新应用

在开发模式下，应用支持热更新：
- **前端代码修改**: 自动刷新（无需操作）
- **手动刷新**: 在应用窗口按 `Cmd + R` (macOS) 或 `Ctrl + R` (Windows)
- **重启应用**: 在终端按 `Ctrl + C` 停止，然后重新运行 `npm run tauri dev`

## 其他命令

### 构建生产版本
```bash
npm run tauri build
```
生成的安装包位于 `src-tauri/target/release/bundle/` 目录。

### 仅运行前端 (不启动 Tauri)
```bash
npm run dev
```
访问 http://localhost:1420 查看前端界面（无后端功能）

## 项目结构

```
promptlog/
├── src/                    # 前端源码
│   ├── App.tsx            # 主应用组件
│   ├── components/        # UI 组件
│   ├── store/             # Zustand 状态管理
│   ├── tauri-api/         # Tauri API 封装
│   └── types/             # TypeScript 类型定义
├── src-tauri/             # Rust 后端源码
│   ├── src/
│   │   ├── commands/      # Tauri 命令
│   │   ├── db/            # 数据库模块
│   │   ├── repositories/  # 数据库操作
│   │   └── services/      # 业务逻辑
│   └── Cargo.toml         # Rust 依赖配置
├── package.json           # 前端依赖配置
└── README.md              # 本文件
```

## 数据存储

所有数据存储在本地 SQLite 数据库：
- **macOS**: `~/Library/Application Support/com.zhangshan.promptlog/prompts.db`
- **Windows**: `%APPDATA%/com.zhangshan.promptlog/prompts.db`

日志文件位于同一目录下的 `error.log`。

## 常见问题

### Q: 启动时报错 "cargo not found"
A: 确保已安装 Rust 并执行 `source ~/.cargo/env`

### Q: 编译很慢
A: 首次编译需要下载和编译所有依赖，通常需要 5-10 分钟。后续编译会使用缓存，速度会快很多。

### Q: 应用无响应
A: 尝试在终端按 `Ctrl + C` 停止应用，然后重新运行 `npm run tauri dev`

## 发布新版本

项目配置了 GitHub Actions 自动构建，支持 macOS (Intel/ARM) 和 Windows 平台。

### 自动构建流程

1. **更新版本号**（三个文件需同步修改）：
   - `package.json` - `version` 字段
   - `src-tauri/tauri.conf.json` - `version` 字段
   - `src-tauri/Cargo.toml` - `version` 字段

2. **提交并创建版本标签**：
   ```bash
   git add .
   git commit -m "v1.0.1: 更新说明"
   git push
   
   # 创建版本标签触发自动构建
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. **等待构建完成**：
   - 在 GitHub 仓库的 **Actions** 页面查看构建进度
   - 构建成功后，会在 **Releases** 页面创建草稿

4. **发布 Release**：
   - 进入 **Releases** 页面
   - 编辑草稿，添加更新说明
   - 点击 **Publish release** 发布

### 手动触发构建

也可以不创建标签，手动触发构建：
1. 进入 GitHub 仓库 → **Actions** → **Release**
2. 点击 **Run workflow** → 选择分支 → **Run workflow**

### 构建产物

| 平台 | 文件 | 适用于 |
|-----|------|--------|
| macOS Intel | `*.x64.dmg` | Intel 芯片 Mac |
| macOS ARM | `*.aarch64.dmg` | Apple Silicon (M1/M2/M3) Mac |
| Windows | `*.msi` / `*.exe` | Windows 64-bit |

### macOS 安装提示

由于应用未经 Apple 签名，首次打开可能提示"无法验证开发者"。解决方法：

```bash
# 在终端执行（替换为实际安装路径）
xattr -cr /Applications/promptlog.app
```

---

**快捷键：**
- `Cmd/Ctrl + K` - 聚焦搜索框
- `Cmd/Ctrl + R` - 刷新应用
