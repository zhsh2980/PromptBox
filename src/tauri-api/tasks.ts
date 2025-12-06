// Tauri API 封装 - 任务相关
import { invoke } from "@tauri-apps/api/core";
import type { TaskDto } from "../types";

export const TaskApi = {
    /** 获取项目下的任务 */
    list: (projectId: number) => invoke<TaskDto[]>("list_tasks", { projectId }),

    /** 创建任务 */
    create: (projectId: number, name: string, description?: string | null) =>
        invoke<TaskDto>("create_task", { projectId, name, description }),

    /** 更新任务 */
    update: (id: number, name?: string, description?: string | null) =>
        invoke<void>("update_task", { id, name, description }),

    /** 删除任务 */
    remove: (id: number) => invoke<void>("delete_task", { id }),
};
