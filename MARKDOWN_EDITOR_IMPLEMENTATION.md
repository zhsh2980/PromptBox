# Markdown 编辑器实施文档

## 📋 项目概述

为 PromptBox 添加 Markdown 编辑和预览功能，支持：
- **本地 Prompts**：用户可选择纯文本或 Markdown 格式，格式和视图模式永久保存到数据库
- **SVN Prompts**：根据 frontmatter 的 `isMarkDown` 字段决定默认格式，允许临时切换（不保存）

---

## 🎯 核心需求

### 功能需求
1. ✅ 用户可为每个本地 Prompt 选择格式（纯文本 / Markdown），永久保存
2. ✅ Markdown 模式支持三种视图：编辑 / 预览 / 分屏
3. ✅ 纯文本模式不显示视图切换按钮
4. ✅ SVN Prompts 根据 `isMarkDown` 字段显示，允许临时切换格式（刷新恢复）
5. ✅ 预览时自动转换单换行符，保留空行
6. ✅ 格式切换时立即保存并显示 Toast 提示

### 技术选型
- **Markdown 编辑器**：`@uiw/react-md-editor` (4.6 kB gzipped)
- **格式存储**：数据库字段 `format: TEXT DEFAULT 'plain'`
- **视图模式存储**：数据库字段 `view_mode: TEXT DEFAULT 'edit'`

---

## 🗄️ 数据库设计

### 1. 本地 Prompts 表修改

```sql
-- 添加两个新字段
ALTER TABLE prompts ADD COLUMN format TEXT DEFAULT 'plain';
ALTER TABLE prompts ADD COLUMN view_mode TEXT DEFAULT 'edit';

-- 为现有数据设置默认值
UPDATE prompts SET format = 'plain' WHERE format IS NULL;
UPDATE prompts SET view_mode = 'edit' WHERE view_mode IS NULL;
```

**字段说明：**
- `format`: 内容格式（'plain' | 'markdown'）
- `view_mode`: Markdown 模式下的视图偏好（'edit' | 'preview' | 'live'）

**⚠️ 注意：** SVN Prompts 不需要额外的偏好表，临时切换只用组件状态。

---

## 📦 前端类型定义

### 1. 修改 `src/types/index.ts`

```typescript
/** 提示词记录 */
export interface PromptEntryDto {
    id: number;
    task_id: number;
    title?: string | null;
    content: string;
    tags?: string[] | null;
    model?: string | null;
    created_at: string;
    updated_at?: string | null;

    // 新增字段
    format?: 'plain' | 'markdown';         // 内容格式
    view_mode?: 'edit' | 'preview' | 'live';  // 视图模式
}

/** SVN 提示词 */
export interface SvnPrompt {
    id: string;
    folder_path: string;
    title: string;
    content: string;
    tags: string[];
    model?: string | null;
    modified_at: string;
    file_path: string;

    // 新增字段
    is_markdown?: number;  // 0=纯文本，1=Markdown，undefined=默认0
}
```

---

## 🔧 后端实现

### 1. 数据模型修改

**文件：** `src-tauri/src/models/svn.rs`

```rust
/// 提示词文件的 YAML Frontmatter 结构
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PromptFrontmatter {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub model: Option<String>,

    // 新增字段
    #[serde(default, rename = "isMarkDown")]
    pub is_markdown: Option<i32>,  // 0 或 1
}

/// SVN 提示词
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvnPrompt {
    pub id: String,
    pub folder_path: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub model: Option<String>,
    pub modified_at: String,
    pub file_path: String,

    // 新增字段
    pub is_markdown: Option<i32>,  // 0 或 1，None 表示未设置
}
```

**⚠️ 注意：**
- 使用 `#[serde(rename = "isMarkDown")]` 匹配 YAML 中的 `isMarkDown` 字段
- 使用 `Option<i32>` 处理字段可能不存在的情况

---

### 2. 解析逻辑修改

**文件：** `src-tauri/src/services/svn_service.rs`

**修改 `parse_prompt_file` 函数（第158-218行）：**

```rust
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

            // 解析 isMarkDown 字段（兼容多种格式）
            let is_markdown = match &doc["isMarkDown"] {
                yaml_rust::Yaml::Integer(i) => Some(*i as i32),
                yaml_rust::Yaml::String(s) => {
                    // 兼容字符串格式 "1" 或 "0"
                    match s.as_str() {
                        "1" | "true" => Some(1),
                        "0" | "false" => Some(0),
                        _ => None,
                    }
                }
                yaml_rust::Yaml::Boolean(b) => Some(if *b { 1 } else { 0 }),
                _ => None,
            };

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
                is_markdown,  // 新增
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
        is_markdown: frontmatter.is_markdown,  // 新增
    })
}
```

---

### 3. 本地 Prompts 数据库操作

**需要修改的 Tauri 命令（确保保存和读取新字段）：**

1. **创建 Prompt**：包含 `format` 和 `view_mode` 字段
2. **更新 Prompt**：支持更新 `format` 和 `view_mode` 字段
3. **读取 Prompt**：返回 `format` 和 `view_mode` 字段

**⚠️ 具体实现根据你现有的数据库操作代码调整。**

---

## 🎨 前端实现

### 1. 安装依赖

```bash
npm install @uiw/react-md-editor
```

---

### 2. 工具函数

**文件：** `src/utils/markdown.ts`（新建）

```typescript
/**
 * 预览时自动转换单换行符为 Markdown 硬换行
 * 保留空行（连续换行符）
 */
export function preprocessForPreview(content: string): string {
  // 只转换单个换行符，不转换空行
  // 正则说明：
  // ([^\n]) - 匹配非换行符的字符
  // \n      - 单个换行符
  // ([^\n]) - 后面也是非换行符
  return content.replace(/([^\n])\n([^\n])/g, '$1  \n$2');
}
```

---

### 3. 组件开发

#### 3.1 FormatSelector 组件

**文件：** `src/components/FormatSelector.tsx`（新建）

```typescript
import React, { useState, useRef, useEffect } from 'react';

interface FormatSelectorProps {
  value: 'plain' | 'markdown';
  onChange: (format: 'plain' | 'markdown') => void;
  isTemporary?: boolean;  // 是否是临时切换（用于 SVN Prompts）
  isDark: boolean;
}

export function FormatSelector({
  value,
  onChange,
  isTemporary = false,
  isDark
}: FormatSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (format: 'plain' | 'markdown') => {
    onChange(format);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-sm border rounded transition-colors ${
          isDark
            ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
        }`}
      >
        <span>{value === 'markdown' ? '📝' : '📄'}</span>
        <span>{value === 'markdown' ? 'Markdown' : '纯文本'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1 left-0 w-40 border rounded-lg shadow-lg z-50 ${
            isDark
              ? 'bg-zinc-800 border-zinc-700'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* 临时切换提示 */}
          {isTemporary && (
            <div className={`px-3 py-2 text-xs border-b ${
              isDark
                ? 'text-zinc-500 border-zinc-700'
                : 'text-slate-500 border-slate-200'
            }`}>
              💡 临时切换，刷新后恢复
            </div>
          )}

          {/* 选项列表 */}
          <div className="py-1">
            <button
              onClick={() => handleSelect('markdown')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                value === 'markdown'
                  ? isDark
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'bg-blue-50 text-blue-600'
                  : isDark
                  ? 'text-zinc-300 hover:bg-zinc-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">📝</span>
              <span className="flex-1 text-left">Markdown</span>
              {value === 'markdown' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={() => handleSelect('plain')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                value === 'plain'
                  ? isDark
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'bg-blue-50 text-blue-600'
                  : isDark
                  ? 'text-zinc-300 hover:bg-zinc-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">📄</span>
              <span className="flex-1 text-left">纯文本</span>
              {value === 'plain' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

#### 3.2 ViewModeSwitcher 组件

**文件：** `src/components/ViewModeSwitcher.tsx`（新建）

```typescript
import React from 'react';

interface ViewModeSwitcherProps {
  value: 'edit' | 'preview' | 'live';
  onChange: (mode: 'edit' | 'preview' | 'live') => void;
  isDark: boolean;
}

export function ViewModeSwitcher({ value, onChange, isDark }: ViewModeSwitcherProps) {
  const modes = [
    { value: 'edit' as const, label: '📝 编辑', title: '编辑模式' },
    { value: 'preview' as const, label: '👁️ 预览', title: '预览模式' },
    { value: 'live' as const, label: '⚡ 分屏', title: '分屏模式' },
  ];

  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-lg ${
      isDark ? 'bg-zinc-800' : 'bg-slate-100'
    }`}>
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          title={mode.title}
          className={`px-2.5 py-1 text-sm rounded transition-colors ${
            value === mode.value
              ? isDark
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white'
              : isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
```

---

#### 3.3 MarkdownEditor 组件

**文件：** `src/components/MarkdownEditor.tsx`（新建）

```typescript
import React, { useMemo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { preprocessForPreview } from '../utils/markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  viewMode: 'edit' | 'preview' | 'live';
  isDark: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  readOnly?: boolean;  // 用于 SVN Prompts
}

export function MarkdownEditor({
  value,
  onChange,
  viewMode,
  isDark,
  onBlur,
  onFocus,
  readOnly = false,
}: MarkdownEditorProps) {
  // 预览时预处理内容（只转换换行符，不修改原始值）
  const processedValue = useMemo(() => {
    if (viewMode === 'preview' || viewMode === 'live') {
      return preprocessForPreview(value);
    }
    return value;
  }, [value, viewMode]);

  // 根据视图模式决定 preview 属性
  const previewMode = useMemo(() => {
    if (readOnly) {
      return 'preview';  // 只读模式强制预览
    }

    if (viewMode === 'edit') return 'edit';
    if (viewMode === 'preview') return 'preview';
    return 'live';  // 分屏模式
  }, [viewMode, readOnly]);

  return (
    <div
      className="w-full h-full markdown-editor-container"
      onBlur={onBlur}
      onFocus={onFocus}
    >
      <MDEditor
        value={viewMode === 'edit' ? value : processedValue}
        onChange={(val) => !readOnly && onChange(val || '')}
        preview={previewMode}
        hideToolbar={readOnly}  // 只读模式隐藏工具栏
        height="100%"
        data-color-mode={isDark ? 'dark' : 'light'}
        textareaProps={{
          placeholder: '输入 Markdown 内容...',
        }}
      />
    </div>
  );
}
```

---

#### 3.4 SvnPromptViewer 组件

**文件：** `src/components/SvnPromptViewer.tsx`（新建）

```typescript
import React, { useState, useEffect } from 'react';
import { SvnPrompt } from '../types';
import { FormatSelector } from './FormatSelector';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { MarkdownEditor } from './MarkdownEditor';
import { Copy, Clock, Bot } from 'lucide-react';

interface SvnPromptViewerProps {
  prompt: SvnPrompt;
  isDark: boolean;
  styles: Record<string, string>;
  onCopy: (content: string) => void;
}

export function SvnPromptViewer({
  prompt,
  isDark,
  styles,
  onCopy
}: SvnPromptViewerProps) {
  // 从 isMarkDown 字段获取默认格式
  const defaultFormat = prompt.is_markdown === 1 ? 'markdown' : 'plain';

  // 临时格式状态（不保存到数据库）
  const [tempFormat, setTempFormat] = useState<'plain' | 'markdown'>(defaultFormat);

  // 临时视图模式（仅 Markdown 格式时使用）
  const [tempViewMode, setTempViewMode] = useState<'edit' | 'preview' | 'live'>('preview');

  // 首次切换标记（用于显示 Toast）
  const [hasShownToast, setHasShownToast] = useState(false);

  // 当 Prompt 切换时，重置临时状态
  useEffect(() => {
    setTempFormat(defaultFormat);
    setTempViewMode('preview');
    setHasShownToast(false);
  }, [prompt.id, defaultFormat]);

  // 处理格式切换
  const handleFormatChange = (newFormat: 'plain' | 'markdown') => {
    setTempFormat(newFormat);

    // 首次切换时显示提示
    if (!hasShownToast) {
      // TODO: 调用项目中的 showToast 函数
      // showToast('已临时切换格式，刷新后恢复默认');
      setHasShownToast(true);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* 顶部：标题和操作按钮 */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs border border-blue-600/30 flex-shrink-0">
            🔒 共享 (只读)
          </span>
          <h1 className="text-xl font-semibold truncate">
            {prompt.title}
          </h1>
          <FormatSelector
            value={tempFormat}
            onChange={handleFormatChange}
            isTemporary={true}
            isDark={isDark}
          />
        </div>
        <button
          onClick={() => onCopy(prompt.content)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors text-white flex-shrink-0"
          title="复制内容"
        >
          <Copy className="w-4 h-4" />
          复制
        </button>
      </div>

      {/* 视图模式切换（仅 Markdown 格式） */}
      {tempFormat === 'markdown' && (
        <div className="flex-shrink-0">
          <ViewModeSwitcher
            value={tempViewMode}
            onChange={setTempViewMode}
            isDark={isDark}
          />
        </div>
      )}

      {/* 内容显示区 */}
      <div className="flex-1 min-h-0">
        {tempFormat === 'markdown' ? (
          <MarkdownEditor
            value={prompt.content}
            onChange={() => {}}  // 只读，不处理变化
            viewMode={tempViewMode}
            isDark={isDark}
            readOnly={true}
          />
        ) : (
          <div
            className={`w-full h-full p-4 border rounded-lg text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-auto ${styles.contentArea} ${
              isDark ? 'text-zinc-200' : 'text-slate-800'
            }`}
          >
            {prompt.content}
          </div>
        )}
      </div>

      {/* 底部元数据行 */}
      <div className="flex items-center gap-3 flex-wrap text-sm flex-shrink-0">
        {prompt.model && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg ${styles.contentArea}`}>
            <Bot className={`w-4 h-4 ${styles.iconMuted}`} />
            <span className={styles.textSecondary}>
              {prompt.model}
            </span>
          </div>
        )}
        {prompt.tags.map((tag) => (
          <span
            key={tag}
            className={`px-3 py-1.5 border rounded-lg ${styles.contentArea}`}
          >
            #{tag}
          </span>
        ))}
        {prompt.modified_at && (
          <div className={`ml-auto flex items-center gap-1.5 ${styles.textMuted}`}>
            <Clock className="w-4 h-4" />
            <span className="text-xs">{prompt.modified_at}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 4. 集成到 App.tsx

**关键修改位置：**

#### 4.1 SVN Prompts 渲染（第 1005-1063 行）

**替换为：**

```typescript
// 显示 SVN 提示词（只读模式）
if (selectedSvnPromptObj) {
  return (
    <SvnPromptViewer
      prompt={selectedSvnPromptObj}
      isDark={isDark}
      styles={styles}
      onCopy={handleCopyPrompt}
    />
  );
}
```

#### 4.2 本地 Prompts 渲染（第 1067-1179 行）

**核心逻辑：**

```typescript
// 显示数据库提示词（可编辑）
return selectedPrompt ? (
  <div className="w-full flex flex-col h-full gap-4">
    {/* 顶部：标题、格式选择器、视图切换器、复制按钮 */}
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-1">
        <input
          type="text"
          value={editingPromptId === selectedPrompt.id ? editingPromptTitle : (selectedPrompt.title || "")}
          onChange={(e) => setEditingPromptTitle(e.target.value)}
          onFocus={...}
          onBlur={...}
          placeholder="输入标题..."
          className="flex-1 text-xl font-semibold ..."
        />
        <FormatSelector
          value={selectedPrompt.format || 'plain'}
          onChange={handleFormatChange}
          isDark={isDark}
        />
      </div>
      <button onClick={...} className="...">
        <Copy className="w-4 h-4" />
        复制
      </button>
    </div>

    {/* 视图模式切换器（仅 Markdown 格式） */}
    {selectedPrompt.format === 'markdown' && (
      <ViewModeSwitcher
        value={selectedPrompt.view_mode || 'edit'}
        onChange={handleViewModeChange}
        isDark={isDark}
      />
    )}

    {/* 内容编辑区 */}
    {selectedPrompt.format === 'markdown' ? (
      <MarkdownEditor
        value={editingPromptId === selectedPrompt.id
          ? editingPromptContent
          : selectedPrompt.content}
        onChange={setEditingPromptContent}
        viewMode={selectedPrompt.view_mode || 'edit'}
        isDark={isDark}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    ) : (
      <textarea
        value={...}
        onChange={...}
        onFocus={...}
        onBlur={...}
        placeholder="输入提示词内容..."
        className="..."
      />
    )}

    {/* 底部元数据 */}
    <div className="...">
      {/* 标签输入等 */}
    </div>
  </div>
) : null;
```

---

### 5. 状态管理和 API 调用

**需要添加的处理函数：**

```typescript
// 处理格式切换（本地 Prompts）
const handleFormatChange = async (newFormat: 'plain' | 'markdown') => {
  if (!selectedPrompt) return;

  // 1. 如果有未保存的内容，立即保存
  if (editingPromptId === selectedPrompt.id) {
    await handleUpdatePrompt(selectedPrompt.id);
  }

  // 2. 更新格式字段到数据库
  try {
    await invoke('update_prompt_format', {
      promptId: selectedPrompt.id,
      format: newFormat,
    });

    // 3. 更新本地状态
    setSelectedPrompt({
      ...selectedPrompt,
      format: newFormat,
    });

    // 4. 显示 Toast 提示
    showToast(
      newFormat === 'markdown'
        ? '已切换到 Markdown 模式'
        : '已切换到纯文本模式'
    );
  } catch (error) {
    console.error('格式切换失败:', error);
    showToast('格式切换失败');
  }
};

// 处理视图模式切换（本地 Prompts）
const handleViewModeChange = async (newViewMode: 'edit' | 'preview' | 'live') => {
  if (!selectedPrompt) return;

  try {
    await invoke('update_prompt_view_mode', {
      promptId: selectedPrompt.id,
      viewMode: newViewMode,
    });

    // 更新本地状态
    setSelectedPrompt({
      ...selectedPrompt,
      view_mode: newViewMode,
    });

    // 不显示 Toast（切换频繁，避免干扰）
  } catch (error) {
    console.error('视图模式切换失败:', error);
  }
};
```

---

## 🎨 样式适配

**文件：** `src/index.css`

```css
/* Markdown 编辑器主题适配 */
.markdown-editor-container {
  /* 确保编辑器填满容器 */
  display: flex;
  flex-direction: column;
}

.w-md-editor {
  flex: 1;
  min-height: 0;
}

/* 暗色主题适配 */
[data-color-mode="dark"] .wmde-markdown {
  background-color: rgb(39 39 42) !important;
  color: rgb(228 228 231) !important;
}

[data-color-mode="dark"] .w-md-editor-toolbar {
  background-color: rgb(39 39 42) !important;
  border-bottom-color: rgb(63 63 70) !important;
}

[data-color-mode="dark"] .w-md-editor-preview {
  background-color: rgb(39 39 42) !important;
}

/* 浅色主题适配 */
[data-color-mode="light"] .wmde-markdown {
  background-color: rgb(255 255 255) !important;
  color: rgb(15 23 42) !important;
}

[data-color-mode="light"] .w-md-editor-toolbar {
  background-color: rgb(248 250 252) !important;
  border-bottom-color: rgb(226 232 240) !important;
}

[data-color-mode="light"] .w-md-editor-preview {
  background-color: rgb(255 255 255) !important;
}
```

---

## 📝 实施步骤

### 阶段 1：后端基础（1-2 小时）

**任务清单：**
- [ ] 修改数据库 Schema（添加 `format` 和 `view_mode` 字段）
- [ ] 修改 `src-tauri/src/models/svn.rs`（添加 `is_markdown` 字段）
- [ ] 修改 `src-tauri/src/services/svn_service.rs`（解析 `isMarkDown` 字段）
- [ ] 添加/修改 Tauri 命令（`update_prompt_format`, `update_prompt_view_mode`）
- [ ] 测试后端接口

**验证：**
- 能成功保存和读取 `format` 和 `view_mode` 字段
- SVN Prompts 能正确解析 `isMarkDown` 字段

---

### 阶段 2：前端工具函数和类型（30 分钟）

**任务清单：**
- [ ] 修改 `src/types/index.ts`（添加新字段）
- [ ] 创建 `src/utils/markdown.ts`（换行预处理函数）
- [ ] 安装依赖：`npm install @uiw/react-md-editor`

---

### 阶段 3：组件开发（2-3 小时）

**任务清单：**
- [ ] 创建 `FormatSelector.tsx`
- [ ] 创建 `ViewModeSwitcher.tsx`
- [ ] 创建 `MarkdownEditor.tsx`
- [ ] 创建 `SvnPromptViewer.tsx`

**开发顺序：**
1. FormatSelector（独立测试）
2. ViewModeSwitcher（独立测试）
3. MarkdownEditor（依赖前两者）
4. SvnPromptViewer（整合所有组件）

---

### 阶段 4：集成到 App.tsx（2-3 小时）

**任务清单：**
- [ ] 导入新组件
- [ ] 修改 SVN Prompts 渲染逻辑（使用 `SvnPromptViewer`）
- [ ] 修改本地 Prompts 渲染逻辑（添加格式选择和视图切换）
- [ ] 实现 `handleFormatChange` 函数
- [ ] 实现 `handleViewModeChange` 函数
- [ ] 确保保存逻辑包含新字段

---

### 阶段 5：样式适配（1 小时）

**任务清单：**
- [ ] 在 `src/index.css` 中添加 Markdown 编辑器样式
- [ ] 测试暗色/浅色主题切换
- [ ] 调整编辑器高度和布局

---

### 阶段 6：测试（1-2 小时）

**测试清单：**

#### 功能测试
- [ ] 新建 Prompt（默认纯文本）
- [ ] 纯文本 ↔ Markdown 切换
- [ ] Markdown 三种视图切换
- [ ] 预览时换行符正确显示
- [ ] 格式切换时自动保存
- [ ] 刷新后格式和视图模式保持
- [ ] SVN Prompts 根据 `isMarkDown` 显示
- [ ] SVN Prompts 临时切换格式
- [ ] SVN Prompts 刷新后恢复默认

#### 边界测试
- [ ] 空内容
- [ ] 超长内容（>10000字）
- [ ] SVN 文件没有 `isMarkDown` 字段
- [ ] SVN 文件 `isMarkDown` 值异常（2, "yes", true 等）
- [ ] frontmatter 格式错误

#### 主题测试
- [ ] 暗色模式所有组件正常
- [ ] 浅色模式所有组件正常
- [ ] 主题切换时 MDEditor 跟随

---

### 阶段 7：优化和收尾（1 小时）

**任务清单：**
- [ ] 代码审查和重构
- [ ] 添加必要的注释
- [ ] 清理调试代码
- [ ] 更新 README（如果需要）

---

## ⏱️ 总体时间估算

| 阶段 | 预计时间 | 累计时间 |
|------|----------|----------|
| 阶段 1：后端基础 | 1-2 小时 | 2 小时 |
| 阶段 2：前端类型和工具 | 30 分钟 | 2.5 小时 |
| 阶段 3：组件开发 | 2-3 小时 | 5.5 小时 |
| 阶段 4：集成到 App.tsx | 2-3 小时 | 8.5 小时 |
| 阶段 5：样式适配 | 1 小时 | 9.5 小时 |
| 阶段 6：测试 | 1-2 小时 | 11.5 小时 |
| 阶段 7：优化收尾 | 1 小时 | 12.5 小时 |

**总计：约 12-13 小时**

**核心功能实现：约 8-9 小时**

---

## ⚠️ 关键注意事项

### 1. SVN Prompts frontmatter 格式

**标准格式：**
```yaml
---
title: "React代码评审"
tags: ["评审", "React"]
isMarkDown: 1
---
正文内容...
```

**关键点：**
- `isMarkDown` 字段可选（不存在时默认 0）
- 兼容多种值格式：`1`, `"1"`, `true`, `"true"`
- 正文不包含 frontmatter 分隔符 `---`

---

### 2. 换行符处理

**核心逻辑：**
- 只在渲染预览时转换换行符
- 不修改原始内容（`value` 保持不变）
- 保留空行（连续换行符不转换）

**示例：**
```
原始：第一行\n第二行\n\n新段落
预览：第一行  \n第二行  \n\n新段落
      ↑ 加两个空格    ↑ 空行保留
```

---

### 3. 临时切换 vs 永久保存

| 类型 | 格式切换 | 视图模式 | 存储位置 | 刷新行为 |
|------|----------|----------|----------|----------|
| 本地 Prompts | 永久保存 | 永久保存 | 数据库 | 保持 |
| SVN Prompts | 临时切换 | 临时切换 | 组件状态 | 恢复默认 |

---

### 4. 默认值

- **新建 Prompt**：`format = 'plain'`, `view_mode = 'edit'`
- **SVN Prompts**：`isMarkDown` 不存在 → 当作 0
- **视图模式**：Markdown 模式默认 `'preview'`（SVN）或 `'edit'`（本地）

---

## 🎯 验收标准

### 功能验收
- [ ] 用户可以为每个本地 Prompt 选择格式
- [ ] Markdown 模式下可以切换三种视图
- [ ] 纯文本模式下不显示视图切换按钮
- [ ] 格式和视图模式在刷新后保持（本地 Prompts）
- [ ] SVN Prompts 根据 `isMarkDown` 显示
- [ ] SVN Prompts 可以临时切换格式，刷新后恢复
- [ ] 预览时单换行符正确显示，空行保留

### 用户体验验收
- [ ] 格式切换时显示 Toast 提示（本地 Prompts）
- [ ] 首次临时切换时显示 Toast 提示（SVN Prompts）
- [ ] 格式切换时自动保存内容
- [ ] 视图切换流畅，无闪烁
- [ ] 暗色/浅色主题支持完整

### 性能验收
- [ ] 编辑 5000 字内容不卡顿
- [ ] 切换视图模式 < 100ms
- [ ] 内存占用正常（增长 < 20%）

---

## 📚 技术参考

- [@uiw/react-md-editor 官方文档](https://uiwjs.github.io/react-md-editor/)
- [@uiw/react-md-editor GitHub](https://github.com/uiwjs/react-md-editor)
- [Markdown 规范（CommonMark）](https://commonmark.org/)
- [Tauri 命令文档](https://tauri.app/v1/guides/features/command/)
- [yaml-rust 文档](https://docs.rs/yaml-rust/)

---

## 🐛 常见问题和解决方案

### 1. frontmatter 解析失败

**问题：** SVN 文件 frontmatter 格式不正确

**解决：** 在 `parse_prompt_file` 中添加容错处理，解析失败时默认为纯文本

---

### 2. 换行符在预览中消失

**问题：** Markdown 渲染忽略单换行符

**解决：** 使用 `preprocessForPreview` 函数自动添加硬换行（两个空格）

---

### 3. 临时切换状态未恢复

**问题：** 切换 SVN Prompts 后，临时格式状态未重置

**解决：** 在 `useEffect` 中监听 `prompt.id`，切换时重置状态

---

### 4. 主题切换不生效

**问题：** MDEditor 主题未跟随应用主题

**解决：** 使用 `data-color-mode` 属性并添加 CSS 覆盖

---

## 📞 支持和联系

如有问题，请：
1. 查看本文档的"常见问题和解决方案"章节
2. 检查浏览器控制台和 Rust 日志
3. 参考 @uiw/react-md-editor 官方文档

---

**文档版本：** 1.0
**最后更新：** 2026-01-21
**作者：** Claude Code Assistant
