import { useEffect, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { SearchApi } from "../tauri-api";
import type { SearchResultDto } from "../types";

interface GlobalSearchProps {
    onSelectResult: (result: SearchResultDto) => void;
    isDark?: boolean;
}

// 高亮关键词组件
function HighlightText({ text, keyword, isDark }: { text: string; keyword: string; isDark: boolean }) {
    if (!keyword.trim()) return <>{text}</>;

    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className={`px-0.5 rounded ${isDark ? "bg-yellow-500/30 text-yellow-200" : "bg-yellow-300 text-yellow-900"}`}>
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

export function GlobalSearch({ onSelectResult, isDark = true }: GlobalSearchProps) {
    const [keyword, setKeyword] = useState("");
    const [results, setResults] = useState<SearchResultDto[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSearch = useCallback(async () => {
        if (!keyword.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const data = await SearchApi.search({ keyword, limit: 20 });
            setResults(data);
            setIsOpen(true);
        } catch (e) {
            console.error("搜索失败:", e);
        }
        setLoading(false);
    }, [keyword]);

    // 防抖搜索
    useEffect(() => {
        const timer = setTimeout(() => {
            if (keyword.trim()) {
                handleSearch();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [keyword]);

    const handleClose = () => {
        setIsOpen(false);
        setKeyword("");
        setResults([]);
    };

    const handleSelectResult = (result: SearchResultDto) => {
        onSelectResult(result);
        handleClose();
    };

    // 键盘快捷键 Ctrl/Cmd + K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                const input = document.querySelector<HTMLInputElement>('[data-search-input]');
                input?.focus();
            }
            if (e.key === "Escape" && isOpen) {
                handleClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    // 主题样式
    const styles = {
        input: isDark
            ? "bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400"
            : "bg-white border-slate-300 text-slate-900 placeholder-slate-400",
        icon: isDark ? "text-zinc-400" : "text-slate-400",
        iconHover: isDark ? "hover:text-white" : "hover:text-slate-900",
        panel: isDark
            ? "bg-zinc-800 border-zinc-600"
            : "bg-white border-slate-200 shadow-lg",
        panelBorder: isDark ? "border-zinc-700" : "border-slate-200",
        panelText: isDark ? "text-zinc-400" : "text-slate-500",
        resultHover: isDark ? "hover:bg-zinc-700" : "hover:bg-slate-100",
        resultText: isDark ? "text-zinc-300" : "text-slate-700",
    };

    return (
        <div className="relative">
            {/* 搜索输入框 */}
            <div className="relative flex items-center">
                <Search className={`absolute left-3 w-4 h-4 ${styles.icon}`} />
                <input
                    type="text"
                    data-search-input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索提示词"
                    className={`flex-1 min-w-32 max-w-72 pl-10 pr-8 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors ${styles.input}`}
                />
                {keyword && (
                    <button
                        onClick={handleClose}
                        className={`absolute right-2 ${styles.icon} ${styles.iconHover}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* 搜索结果面板 */}
            {isOpen && results.length > 0 && (
                <div className={`absolute top-full left-0 w-[400px] mt-2 border rounded-lg shadow-xl max-h-96 overflow-y-auto z-50 ${styles.panel}`}>
                    <div className={`p-2 border-b text-xs ${styles.panelBorder} ${styles.panelText}`}>
                        找到 {results.length} 条结果
                    </div>
                    {results.map((result, index) => (
                        <div
                            key={`${result.prompt_id}-${index}`}
                            onClick={() => handleSelectResult(result)}
                            className={`p-3 cursor-pointer border-b last:border-b-0 ${styles.panelBorder} ${styles.resultHover}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${isDark ? "bg-blue-600/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                                    {result.project_name}
                                </span>
                                <span className={`text-xs ${styles.panelText}`}>→</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${isDark ? "bg-green-600/20 text-green-400" : "bg-green-100 text-green-700"}`}>
                                    {result.task_name}
                                </span>
                            </div>
                            <p className={`text-sm line-clamp-2 ${styles.resultText}`}>
                                <HighlightText text={result.snippet} keyword={keyword} isDark={isDark} />
                            </p>
                            <span className={`text-xs mt-1 block ${styles.panelText}`}>
                                {new Date(result.created_at).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* 无结果提示 */}
            {isOpen && keyword && results.length === 0 && !loading && (
                <div className={`absolute top-full left-0 w-[400px] mt-2 border rounded-lg shadow-xl p-4 text-center text-sm z-50 ${styles.panel} ${styles.panelText}`}>
                    未找到匹配的提示词
                </div>
            )}

            {/* 加载中 */}
            {loading && (
                <div className={`absolute top-full left-0 w-[400px] mt-2 border rounded-lg shadow-xl p-4 text-center text-sm z-50 ${styles.panel} ${styles.panelText}`}>
                    <div className="flex items-center justify-center gap-2">
                        <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDark ? "border-zinc-500 border-t-blue-500" : "border-slate-300 border-t-blue-500"}`} />
                        搜索中...
                    </div>
                </div>
            )}

            {/* 点击外部关闭 */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={handleClose}
                />
            )}
        </div>
    );
}
