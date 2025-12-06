// Tauri API 封装 - 备份相关
import { invoke } from "@tauri-apps/api/core";

export const BackupApi = {
    /** 获取数据库路径 */
    getDatabasePath: () => invoke<string>("get_database_path"),

    /** 导出数据 */
    exportData: (targetPath: string) =>
        invoke<void>("export_data", { targetPath }),

    /** 导入数据 */
    importData: (sourcePath: string) =>
        invoke<void>("import_data", { sourcePath }),
};
