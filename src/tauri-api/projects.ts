// Tauri API 封装 - 项目相关
import { invoke } from "@tauri-apps/api/core";
import type { ProjectDto } from "../types";

export const ProjectApi = {
    /** 获取所有项目 */
    list: () => invoke<ProjectDto[]>("list_projects"),

    /** 创建项目 */
    create: (name: string) => invoke<ProjectDto>("create_project", { name }),

    /** 更新项目 */
    update: (id: number, name: string) => invoke<void>("update_project", { id, name }),

    /** 删除项目 */
    remove: (id: number) => invoke<void>("delete_project", { id }),
};
