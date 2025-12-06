// Tauri API 封装 - 提示词相关
import { invoke } from "@tauri-apps/api/core";
import type { PromptEntryDto } from "../types";

export interface ListPromptsParams {
    taskId: number;
    startTime?: string;
    endTime?: string;
    tags?: string[];
}

export interface CreatePromptParams {
    taskId: number;
    title?: string | null;
    content: string;
    tags?: string[] | null;
    model?: string | null;
}

export interface UpdatePromptParams {
    id: number;
    title?: string | null;
    content?: string;
    tags?: string[] | null;
    model?: string | null;
}

export const PromptApi = {
    /** 获取任务下的提示词记录 */
    list: (params: ListPromptsParams) =>
        invoke<PromptEntryDto[]>("list_prompt_entries", { ...params }),

    /** 创建提示词记录 */
    create: (params: CreatePromptParams) =>
        invoke<PromptEntryDto>("create_prompt_entry", { ...params }),

    /** 更新提示词记录 */
    update: (params: UpdatePromptParams) =>
        invoke<void>("update_prompt_entry", { ...params }),

    /** 删除提示词记录 */
    remove: (id: number) => invoke<void>("delete_prompt_entry", { id }),
};
