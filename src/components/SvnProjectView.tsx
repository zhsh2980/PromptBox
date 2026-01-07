// SVN 共享 Prompts 视图组件
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, FolderGit2, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { SvnApi } from "../tauri-api";
import type { SvnFolder, SvnPrompt } from "../types";

interface SvnProjectViewProps {
    isDark: boolean;
    styles: Record<string, string>;
}

export function SvnProjectView({ isDark: _isDark, styles }: SvnProjectViewProps) {
    const {
        svnConfig,
        svnFolders,
        svnPromptsByFolder,
        selectedSvnFolder,
        selectedSvnPrompt,
        svnLoading,
        svnError,
        expandedSvnFolders,
        setSvnConfig,
        setSvnFolders,
        setSvnPromptsForFolder,
        selectSvnFolder,
        selectSvnPrompt,
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

            // 如果启用且配置了仓库，自动加载文件夹
            if (config.enabled && config.repository_url) {
                await loadFolders();
            }
        } catch (error) {
            console.error("加载 SVN 配置失败:", error);
        }
    };

    const loadFolders = async () => {
        try {
            setSvnError(null);
            const folders = await SvnApi.getFolders();
            setSvnFolders(folders);
        } catch (error: any) {
            console.error("加载 SVN 文件夹失败:", error);
            setSvnError(error.message || "加载文件夹失败");
        }
    };

    const loadPromptsForFolder = async (folder: SvnFolder) => {
        try {
            setSvnLoading(true);
            setSvnError(null);
            const prompts = await SvnApi.getPromptsForFolder(folder.path);
            setSvnPromptsForFolder(folder.path, prompts);
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
            await loadFolders();

            // 重新加载已展开文件夹的提示词
            for (const folderPath of Array.from(expandedSvnFolders)) {
                const folder = svnFolders.find((f) => f.path === folderPath);
                if (folder) {
                    await loadPromptsForFolder(folder);
                }
            }
        } catch (error: any) {
            console.error("刷新 SVN 数据失败:", error);
            setSvnError(error.message || "刷新失败");
        } finally {
            setRefreshing(false);
        }
    };

    const handleFolderClick = (folder: SvnFolder) => {
        toggleSvnFolder(folder.path);

        // 如果正在展开且未加载过，则加载提示词
        if (!expandedSvnFolders.has(folder.path)) {
            loadPromptsForFolder(folder);
            selectSvnFolder(folder.path);
        }
    };

    const handlePromptClick = (prompt: SvnPrompt) => {
        selectSvnPrompt(prompt.id);
    };

    // 如果未启用，不显示
    if (!svnConfig?.enabled) {
        return null;
    }

    return (
        <div className="svn-project-view border-b pb-2 mb-2">
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

            {/* 文件夹列表 */}
            {svnConfig.repository_url && svnFolders.length === 0 && !svnError && (
                <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    暂无文件夹
                </div>
            )}

            {svnFolders.map((folder) => {
                const isExpanded = expandedSvnFolders.has(folder.path);
                const prompts = svnPromptsByFolder[folder.path] || [];

                return (
                    <div key={folder.path}>
                        {/* 文件夹项 */}
                        <div
                            className={`
                                flex items-center gap-1 px-2 py-2 cursor-pointer
                                transition-colors group relative
                                ${selectedSvnFolder === folder.path ? styles.listItemActive : styles.listItem}
                            `}
                            onClick={() => handleFolderClick(folder)}
                        >
                            <button
                                className={`p-0.5 rounded flex-shrink-0 ${styles.buttonHover}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleFolderClick(folder);
                                }}
                            >
                                {isExpanded ? (
                                    <ChevronDown className={`w-4 h-4 ${styles.iconMuted}`} />
                                ) : (
                                    <ChevronRight className={`w-4 h-4 ${styles.iconMuted}`} />
                                )}
                            </button>
                            <FolderGit2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="flex-1 text-sm truncate">{folder.name}</span>
                        </div>

                        {/* 提示词列表 */}
                        {isExpanded && (
                            <div className="ml-6">
                                {svnLoading && prompts.length === 0 && (
                                    <div className={`px-2 py-1 text-xs ${styles.textMuted}`}>
                                        加载中...
                                    </div>
                                )}

                                {prompts.map((prompt) => (
                                    <div
                                        key={prompt.id}
                                        className={`
                                            flex items-center gap-1 px-2 py-1.5 cursor-pointer
                                            transition-colors group relative
                                            ${selectedSvnPrompt === prompt.id ? styles.listItemActiveTask : styles.listItem}
                                        `}
                                        onClick={() => handlePromptClick(prompt)}
                                    >
                                        <FileText className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                        <span className={`flex-1 text-sm truncate ${styles.textSecondary}`}>{prompt.title}</span>
                                    </div>
                                ))}

                                {prompts.length === 0 && !svnLoading && (
                                    <div className={`px-2 py-1 text-xs ${styles.textMuted}`}>
                                        暂无提示词
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
