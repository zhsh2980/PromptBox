// Tauri API 封装 - SVN 相关
import { invoke } from "@tauri-apps/api/core";
import type { SvnConfig, SvnFolder, SvnPrompt } from "../types";

export const SvnApi = {
    /** 获取 SVN 配置 */
    getConfig: () => invoke<SvnConfig>("get_svn_config"),

    /** 更新 SVN 配置 */
    updateConfig: (config: SvnConfig) => invoke<void>("update_svn_config", { config }),

    /** 检查 SVN 是否可用 */
    checkAvailable: () => invoke<boolean>("check_svn_available"),

    /** 测试 SVN 仓库连接 */
    testConnection: (url: string) => invoke<boolean>("test_svn_connection", { url }),

    /** 刷新 SVN 数据（检出或更新仓库） */
    refreshData: () => invoke<void>("refresh_svn_data"),

    /** 获取 SVN 项目文件夹列表（第一层目录） */
    getFolders: () => invoke<SvnFolder[]>("get_svn_folders"),

    /** 获取项目下的任务文件夹列表（第二层目录） */
    getTasksForProject: (projectPath: string) =>
        invoke<SvnFolder[]>("get_svn_tasks_for_project", { projectPath }),

    /** 获取指定任务文件夹中的提示词列表 */
    getPromptsForTask: (taskPath: string) =>
        invoke<SvnPrompt[]>("get_svn_prompts_for_task", { taskPath }),

    /** 获取指定文件夹中的提示词列表（用于搜索，向后兼容） */
    getPromptsForFolder: (folderPath: string) =>
        invoke<SvnPrompt[]>("get_svn_prompts_for_folder", { folderPath }),
};
