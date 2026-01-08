// SVN 共享 Prompts 视图组件 (3层结构: Project -> Task -> Prompt)
// 左侧只显示2层（Project -> Task），点击Task后在中间列显示提示词
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, FolderGit2, RefreshCw, AlertCircle, Folder } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { SvnApi } from "../tauri-api";
import { toast } from "./Toast";
import type { SvnFolder } from "../types";

interface SvnProjectViewProps {
    isDark: boolean;
    styles: Record<string, string>;
}

export function SvnProjectView({ isDark: _isDark, styles }: SvnProjectViewProps) {
    const {
        svnConfig,
        svnFolders,
        svnTasksByProject,
        selectedSvnFolder,
        selectedSvnTask,
        svnLoading,
        svnError,
        expandedSvnFolders,
        setSvnConfig,
        setSvnFolders,
        setSvnTasksForProject,
        setSvnPromptsForTask,
        selectSvnFolder,
        selectSvnTask,
        setSvnLoading,
        setSvnError,
        toggleSvnFolder,
    } = useAppStore();

    const [refreshing, setRefreshing] = useState(false);

    // 加载 SVN 配置
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const config = await SvnApi.getConfig();
            setSvnConfig(config);

            // 如果启用且配置了仓库，自动加载项目
            if (config.enabled && config.repository_url) {
                await loadProjects();
            }
        } catch (error) {
            console.error("加载 SVN 配置失败:", error);
        }
    };

    const loadProjects = async () => {
        try {
            setSvnError(null);
            const projects = await SvnApi.getFolders();
            setSvnFolders(projects);
        } catch (error: any) {
            console.error("加载 SVN 项目失败:", error);
            setSvnError(error.message || "加载项目失败");
        }
    };

    const loadTasksForProject = async (project: SvnFolder) => {
        try {
            setSvnLoading(true);
            setSvnError(null);
            const tasks = await SvnApi.getTasksForProject(project.path);
            setSvnTasksForProject(project.path, tasks);
        } catch (error: any) {
            console.error("加载任务失败:", error);
            setSvnError(error.message || "加载任务失败");
        } finally {
            setSvnLoading(false);
        }
    };

    const loadPromptsForTask = async (task: SvnFolder) => {
        try {
            setSvnLoading(true);
            setSvnError(null);
            const prompts = await SvnApi.getPromptsForTask(task.path);
            setSvnPromptsForTask(task.path, prompts);
        } catch (error: any) {
            console.error("加载提示词失败:", error);
            setSvnError(error.message || "加载提示词失败");
        } finally {
            setSvnLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            setSvnError(null);
            await SvnApi.refreshData();
            await loadProjects();

            // 重新加载已展开项目的任务
            for (const projectPath of Array.from(expandedSvnFolders)) {
                const project = svnFolders.find((p) => p.path === projectPath);
                if (project) {
                    await loadTasksForProject(project);
                }
            }

            // 如果有选中的任务，重新加载其提示词
            if (selectedSvnTask) {
                const tasks = Object.values(svnTasksByProject).flat();
                const task = tasks.find((t) => t.path === selectedSvnTask);
                if (task) {
                    await loadPromptsForTask(task);
                }
            }

            toast.success("刷新成功");
        } catch (error: any) {
            console.error("刷新 SVN 数据失败:", error);
            setSvnError(error.message || "刷新失败");
            toast.error("刷新失败: " + (error.message || "未知错误"));
        } finally {
            setRefreshing(false);
        }
    };

    const handleProjectClick = (project: SvnFolder) => {
        toggleSvnFolder(project.path);

        // 如果正在展开且未加载过，则加载任务
        if (!expandedSvnFolders.has(project.path)) {
            loadTasksForProject(project);
            selectSvnFolder(project.path);
        }
    };

    const handleTaskClick = (task: SvnFolder) => {
        // 选中任务，并加载该任务的提示词（在中间列显示）
        selectSvnTask(task.path);
        loadPromptsForTask(task);
    };

    // 如果未启用，不显示
    if (!svnConfig?.enabled) {
        return null;
    }

    return (
        <div className="svn-project-view pb-2 mb-2">
            {/* 标题行 */}
            <div className="flex items-center justify-between p-2 mb-1">
                <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-sm">共享Prompts</span>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing || !svnConfig.repository_url}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                    title="刷新 SVN 数据"
                >
                    <RefreshCw
                        className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                </button>
            </div>

            {/* 错误提示 */}
            {svnError && (
                <div className="mx-2 mb-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700 dark:text-red-300">{svnError}</span>
                </div>
            )}

            {/* 未配置提示 */}
            {!svnConfig.repository_url && (
                <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    请在设置中配置 SVN 仓库地址
                </div>
            )}

            {/* 项目列表 */}
            {svnConfig.repository_url && svnFolders.length === 0 && !svnError && (
                <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    暂无项目
                </div>
            )}

            {svnFolders.map((project) => {
                const isProjectExpanded = expandedSvnFolders.has(project.path);
                const tasks = svnTasksByProject[project.path] || [];

                return (
                    <div key={project.path}>
                        {/* 项目项 (第一层) */}
                        <div
                            className={`
                                flex items-center gap-1 px-2 pl-4 py-2 cursor-pointer
                                transition-colors group relative
                                ${selectedSvnFolder === project.path ? styles.listItemActive : styles.listItem}
                            `}
                            onClick={() => handleProjectClick(project)}
                        >
                            <button
                                className={`p-0.5 rounded flex-shrink-0 ${styles.buttonHover}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleProjectClick(project);
                                }}
                            >
                                {isProjectExpanded ? (
                                    <ChevronDown className={`w-4 h-4 ${styles.iconMuted}`} />
                                ) : (
                                    <ChevronRight className={`w-4 h-4 ${styles.iconMuted}`} />
                                )}
                            </button>
                            <FolderGit2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="flex-1 text-sm truncate">{project.name}</span>
                        </div>

                        {/* 任务列表 (第二层) - 不展开，点击后在中间列显示提示词 */}
                        {isProjectExpanded && (
                            <div className="ml-4">
                                {svnLoading && tasks.length === 0 && (
                                    <div className={`px-2 py-1 text-xs ${styles.textMuted}`}>
                                        加载中...
                                    </div>
                                )}

                                {tasks.length === 0 && !svnLoading && (
                                    <div className={`px-2 py-1 text-xs ${styles.textMuted}`}>
                                        暂无任务
                                    </div>
                                )}

                                {tasks.map((task) => (
                                    <div
                                        key={task.path}
                                        className={`
                                            flex items-center gap-2 px-2 pl-6 py-1.5 cursor-pointer
                                            transition-colors group relative
                                            ${selectedSvnTask === task.path ? styles.listItemActive : styles.listItem}
                                        `}
                                        onClick={() => handleTaskClick(task)}
                                    >
                                        <Folder className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                                        <span className={`flex-1 text-sm truncate ${styles.textSecondary}`}>{task.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
