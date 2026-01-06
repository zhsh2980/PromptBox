import { useState, useEffect } from "react";
import { X, Download, Upload, FolderOpen, AlertTriangle, Copy, Check, FolderGit2 } from "lucide-react";
import { BackupApi, ProjectApi, SvnApi } from "../tauri-api";
import { useAppStore } from "../store";
import { save, open } from "@tauri-apps/plugin-dialog";
import type { SvnConfig } from "../types";

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    isDark?: boolean;
}

export function SettingsDialog({ isOpen, onClose, isDark = true }: SettingsDialogProps) {
    const [dbPath, setDbPath] = useState("");
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [svnConfig, setSvnConfigLocal] = useState<SvnConfig>({ enabled: false, repository_url: "" });
    const [svnTesting, setSvnTesting] = useState(false);
    const [svnTestResult, setSvnTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const { reset, setProjects, setSvnConfig: setSvnConfigStore } = useAppStore();

    // 主题样式
    const styles = {
        overlay: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
        dialog: isDark
            ? "bg-zinc-800 rounded-xl w-[500px] shadow-2xl select-text text-white"
            : "bg-white rounded-xl w-[500px] shadow-2xl select-text text-slate-900",
        header: isDark
            ? "flex items-center justify-between p-4 border-b border-zinc-700"
            : "flex items-center justify-between p-4 border-b border-slate-200",
        closeBtn: isDark
            ? "text-zinc-400 hover:text-white transition-colors"
            : "text-slate-400 hover:text-slate-900 transition-colors",
        sectionTitle: isDark
            ? "text-sm font-medium mb-2 text-zinc-300"
            : "text-sm font-medium mb-2 text-slate-600",
        pathBox: isDark
            ? "flex items-center gap-2 p-3 bg-zinc-900 rounded-lg group"
            : "flex items-center gap-2 p-3 bg-slate-100 rounded-lg group",
        pathText: isDark
            ? "text-sm text-zinc-400 flex-1 truncate cursor-text"
            : "text-sm text-slate-500 flex-1 truncate cursor-text",
        pathIcon: isDark ? "text-zinc-400" : "text-slate-400",
        copyBtn: isDark
            ? "p-1.5 hover:bg-zinc-700 rounded transition-colors"
            : "p-1.5 hover:bg-slate-200 rounded transition-colors",
        copyIcon: isDark ? "text-zinc-500" : "text-slate-400",
        hint: isDark ? "text-xs text-zinc-500 mt-1" : "text-xs text-slate-400 mt-1",
        exportBtn: "flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50",
        importBtn: isDark
            ? "flex items-center justify-center gap-2 p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-50"
            : "flex items-center justify-center gap-2 p-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors disabled:opacity-50",
        warning: isDark
            ? "flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg"
            : "flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg",
        warningText: isDark ? "text-xs text-yellow-500/80" : "text-xs text-yellow-700",
        footer: isDark
            ? "flex justify-end p-4 border-t border-zinc-700"
            : "flex justify-end p-4 border-t border-slate-200",
        closeFooterBtn: isDark
            ? "px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            : "px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors",
        successMsg: isDark
            ? "bg-green-900/20 border border-green-600/30 text-green-400"
            : "bg-green-50 border border-green-200 text-green-700",
        errorMsg: isDark
            ? "bg-red-900/20 border border-red-600/30 text-red-400"
            : "bg-red-50 border border-red-200 text-red-700",
    };

    useEffect(() => {
        if (isOpen) {
            loadDbPath();
            loadSvnConfig();
            setMessage(null);
            setProcessing(false);
            setSvnTestResult(null);
        }
    }, [isOpen]);

    async function loadDbPath() {
        try {
            const path = await BackupApi.getDatabasePath();
            setDbPath(path);
        } catch (e) {
            console.error("获取数据库路径失败:", e);
            setDbPath("无法获取路径");
        }
    }

    async function loadSvnConfig() {
        try {
            const config = await SvnApi.getConfig();
            setSvnConfigLocal(config);
        } catch (e) {
            console.error("加载 SVN 配置失败:", e);
        }
    }

    async function handleSvnEnabledChange(enabled: boolean) {
        const newConfig = { ...svnConfig, enabled };
        setSvnConfigLocal(newConfig);

        try {
            await SvnApi.updateConfig(newConfig);
            setSvnConfigStore(newConfig);
            setMessage({ type: "success", text: enabled ? "已启用共享Prompts" : "已禁用共享Prompts" });
        } catch (e: any) {
            console.error("更新 SVN 配置失败:", e);
            setMessage({ type: "error", text: `更新失败: ${e.message || e}` });
        }
    }

    async function handleSvnUrlChange(url: string) {
        setSvnConfigLocal({ ...svnConfig, repository_url: url });
        setSvnTestResult(null);
    }

    async function handleSvnUrlSave() {
        try {
            await SvnApi.updateConfig(svnConfig);
            setSvnConfigStore(svnConfig);
            setMessage({ type: "success", text: "SVN 仓库地址已保存" });
        } catch (e: any) {
            console.error("保存 SVN 配置失败:", e);
            setMessage({ type: "error", text: `保存失败: ${e.message || e}` });
        }
    }

    async function handleTestSvnConnection() {
        if (!svnConfig.repository_url) {
            setSvnTestResult({ success: false, message: "请先输入 SVN 仓库地址" });
            return;
        }

        setSvnTesting(true);
        setSvnTestResult(null);

        try {
            const isAvailable = await SvnApi.checkAvailable();
            if (!isAvailable) {
                setSvnTestResult({
                    success: false,
                    message: "SVN 客户端未安装或未添加到系统 PATH",
                });
                setSvnTesting(false);
                return;
            }

            const result = await SvnApi.testConnection(svnConfig.repository_url);
            setSvnTestResult({
                success: result,
                message: result ? "连接成功！" : "连接失败，请检查仓库地址是否正确",
            });
        } catch (e: any) {
            setSvnTestResult({
                success: false,
                message: `测试失败: ${e.message || e}`,
            });
        } finally {
            setSvnTesting(false);
        }
    }

    async function handleCopyPath() {
        try {
            await navigator.clipboard.writeText(dbPath);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error("复制失败:", e);
        }
    }

    async function handleExport() {
        setMessage(null);
        try {
            const filePath = await save({
                title: "选择导出位置",
                defaultPath: `promptlog_backup_${new Date().toISOString().split("T")[0]}.json`,
                filters: [{ name: "JSON 文件", extensions: ["json"] }],
            });

            if (filePath) {
                setProcessing(true);
                await BackupApi.exportData(filePath);
                setMessage({ type: "success", text: `数据已导出到: ${filePath}` });
                setProcessing(false);
            }
        } catch (e) {
            console.error("导出失败:", e);
            setMessage({ type: "error", text: `导出失败: ${e}` });
            setProcessing(false);
        }
    }

    async function handleImport() {
        setMessage(null);

        try {
            const result = await open({
                title: "选择要导入的备份文件",
                multiple: false,
                directory: false,
                filters: [{ name: "JSON 文件", extensions: ["json"] }],
            });

            if (!result) {
                return;
            }

            const filePath = typeof result === 'string' ? result : null;
            if (!filePath) {
                return;
            }

            const confirmed = confirm(
                `确定要导入文件吗？\n\n${filePath}\n\n警告：导入数据将覆盖当前所有数据！`
            );

            if (!confirmed) {
                return;
            }

            setProcessing(true);
            await BackupApi.importData(filePath);
            setMessage({ type: "success", text: "数据导入成功！正在刷新..." });

            reset();
            const projects = await ProjectApi.list();
            setProjects(projects);
            setProcessing(false);

            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (e) {
            console.error("导入失败:", e);
            setMessage({ type: "error", text: `导入失败: ${e}` });
            setProcessing(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.dialog}>
                {/* 头部 */}
                <div className={styles.header}>
                    <h2 className="text-lg font-semibold">设置</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-6">
                    {/* 数据库位置 */}
                    <div>
                        <h3 className={styles.sectionTitle}>数据库位置</h3>
                        <div className={styles.pathBox}>
                            <FolderOpen className={`w-4 h-4 ${styles.pathIcon} flex-shrink-0`} />
                            <span className={styles.pathText} title={dbPath}>
                                {dbPath || "加载中..."}
                            </span>
                            <button
                                onClick={handleCopyPath}
                                className={styles.copyBtn}
                                title="复制路径"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                    <Copy className={`w-4 h-4 ${styles.copyIcon}`} />
                                )}
                            </button>
                        </div>
                        <p className={styles.hint}>
                            数据存储在本地，可通过导出功能备份到其他位置
                        </p>
                    </div>

                    {/* 备份与恢复 */}
                    <div>
                        <h3 className={styles.sectionTitle}>备份与恢复</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleExport}
                                disabled={processing}
                                className={styles.exportBtn}
                            >
                                <Download className="w-4 h-4" />
                                <span>{processing ? "处理中..." : "导出数据"}</span>
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={processing}
                                className={styles.importBtn}
                            >
                                <Upload className="w-4 h-4" />
                                <span>{processing ? "处理中..." : "导入数据"}</span>
                            </button>
                        </div>
                        <p className={styles.hint}>
                            导出为 JSON 文件，可用于备份或迁移到其他设备
                        </p>
                    </div>

                    {/* SVN 共享 Prompts 配置 */}
                    <div>
                        <h3 className={styles.sectionTitle}>
                            <div className="flex items-center gap-2">
                                <FolderGit2 className="w-4 h-4" />
                                <span>共享Prompts (SVN)</span>
                            </div>
                        </h3>

                        {/* 启用开关 */}
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm">启用共享Prompts</label>
                            <button
                                onClick={() => handleSvnEnabledChange(!svnConfig.enabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    svnConfig.enabled ? "bg-blue-600" : isDark ? "bg-zinc-700" : "bg-gray-300"
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        svnConfig.enabled ? "translate-x-6" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>

                        {/* SVN 仓库地址 */}
                        {svnConfig.enabled && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                                        SVN 仓库地址
                                    </label>
                                    <input
                                        type="text"
                                        value={svnConfig.repository_url}
                                        onChange={(e) => handleSvnUrlChange(e.target.value)}
                                        onBlur={handleSvnUrlSave}
                                        placeholder="https://svn.example.com/prompts 或 file:///path/to/svn"
                                        className={`w-full px-3 py-2 rounded-lg text-sm ${
                                            isDark
                                                ? "bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500"
                                                : "bg-slate-100 border border-slate-300 text-slate-900 placeholder-slate-400"
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    />
                                </div>

                                <button
                                    onClick={handleTestSvnConnection}
                                    disabled={svnTesting || !svnConfig.repository_url}
                                    className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                                        isDark
                                            ? "bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
                                            : "bg-slate-200 hover:bg-slate-300 disabled:opacity-50"
                                    }`}
                                >
                                    {svnTesting ? "测试中..." : "测试连接"}
                                </button>

                                {/* 测试结果 */}
                                {svnTestResult && (
                                    <div
                                        className={`p-2 rounded-lg text-xs ${
                                            svnTestResult.success
                                                ? "bg-green-900/20 border border-green-600/30 text-green-400"
                                                : "bg-red-900/20 border border-red-600/30 text-red-400"
                                        }`}
                                    >
                                        {svnTestResult.message}
                                    </div>
                                )}

                                {/* 提示信息 */}
                                {!svnConfig.repository_url && (
                                    <div className="flex items-start gap-2 p-2 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-400">
                                            请配置 SVN 仓库地址以使用共享Prompts功能。仓库中应包含提示词文件（.md, .txt, .yaml）。
                                        </p>
                                    </div>
                                )}

                                <p className={styles.hint}>
                                    共享Prompts 会显示在侧边栏顶部，内容为只读模式。需要安装 SVN 客户端。
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 警告提示 */}
                    <div className={styles.warning}>
                        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className={styles.warningText}>
                            导入数据会覆盖当前所有数据，请谨慎操作。建议在导入前先导出当前数据作为备份。
                        </p>
                    </div>

                    {/* 消息提示 */}
                    {message && (
                        <div
                            className={`p-3 rounded-lg text-sm cursor-text ${message.type === "success" ? styles.successMsg : styles.errorMsg
                                }`}
                        >
                            {message.text}
                        </div>
                    )}
                </div>

                {/* 底部 */}
                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.closeFooterBtn}>
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
}
