// Tauri API 封装 - 搜索相关
import { invoke } from "@tauri-apps/api/core";
import type { SearchResultDto } from "../types";

export interface SearchParams {
    keyword: string;
    projectId?: number;
    taskId?: number;
    limit?: number;
    [key: string]: unknown;
}

export const SearchApi = {
    /** 搜索提示词 */
    search: (params: SearchParams) =>
        invoke<SearchResultDto[]>("search_prompt_entries", params),
};
