// 前端数据类型定义，与后端保持一致

/** 项目 */
export interface ProjectDto {
    id: number;
    name: string;
    sort_order: number;
    created_at: string;
    updated_at?: string | null;
}

/** 任务 */
export interface TaskDto {
    id: number;
    project_id: number;
    name: string;
    description?: string | null;
    sort_order: number;
    created_at: string;
    updated_at?: string | null;
}

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
    /** 内容格式 ('plain' | 'markdown') */
    format?: string | null;
    /** 视图模式 ('edit' | 'preview' | 'live') */
    view_mode?: string | null;
}

/** 搜索结果来源 */
export type SearchSource = "local" | "svn";

/** 搜索结果 DTO */
export interface SearchResultDto {
    // 来源标识
    source: SearchSource;

    // 本地数据库字段（仅 local 来源有效）
    project_id?: number;
    task_id?: number;
    prompt_id?: number;

    // 通用字段
    project_name: string;
    task_name: string;
    snippet: string;
    created_at: string;

    // SVN 特有字段（仅 svn 来源有效）
    folder_path?: string;
    file_path?: string;
    prompt_title?: string;
}

/** API 错误 */
export interface ApiError {
    code: string;
    message: string;
}

/** SVN 配置 */
export interface SvnConfig {
    enabled: boolean;
    repository_url: string;
    local_path?: string | null;
}

/** SVN 文件夹 */
export interface SvnFolder {
    name: string;
    path: string;
    full_path: string;
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
    /** 是否为 Markdown 格式（0=纯文本，1=Markdown，undefined=默认0） */
    is_markdown?: number | null;
}
