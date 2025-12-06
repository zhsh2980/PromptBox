// 前端数据类型定义，与后端保持一致

/** 项目 */
export interface ProjectDto {
    id: number;
    name: string;
    created_at: string;
    updated_at?: string | null;
}

/** 任务 */
export interface TaskDto {
    id: number;
    project_id: number;
    name: string;
    description?: string | null;
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
}

/** 搜索结果 */
export interface SearchResultDto {
    project_id: number;
    task_id: number;
    prompt_id: number;
    project_name: string;
    task_name: string;
    snippet: string;
    created_at: string;
}

/** API 错误 */
export interface ApiError {
    code: string;
    message: string;
}
