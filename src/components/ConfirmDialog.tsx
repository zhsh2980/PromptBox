import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    kind?: "warning" | "info" | "danger";
    onConfirm: () => void;
    onCancel: () => void;
    isDark?: boolean;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "确定",
    cancelText = "取消",
    kind = "warning",
    onConfirm,
    onCancel,
    isDark = true,
}: ConfirmDialogProps) {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    // 打开时聚焦确认按钮
    useEffect(() => {
        if (isOpen) {
            confirmButtonRef.current?.focus();
        }
    }, [isOpen]);

    // ESC 关闭
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onCancel();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const iconColors = {
        warning: "text-yellow-500",
        info: "text-blue-500",
        danger: "text-red-500",
    };

    const confirmButtonColors = {
        warning: "bg-yellow-600 hover:bg-yellow-500",
        info: "bg-blue-600 hover:bg-blue-500",
        danger: "bg-red-600 hover:bg-red-500",
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onCancel}
            />

            {/* 对话框 */}
            <div
                className={`relative w-[360px] rounded-lg shadow-2xl ${isDark ? "bg-zinc-800 border border-zinc-700" : "bg-white border border-slate-200"
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 标题栏 */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-zinc-700" : "border-slate-200"}`}>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-5 h-5 ${iconColors[kind]}`} />
                        <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className={`p-1 rounded transition-colors ${isDark ? "hover:bg-zinc-700 text-zinc-400" : "hover:bg-slate-100 text-slate-500"}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="px-4 py-4">
                    <p className={`text-sm ${isDark ? "text-zinc-300" : "text-slate-600"}`}>
                        {message}
                    </p>
                </div>

                {/* 按钮 */}
                <div className={`flex justify-end gap-2 px-4 py-3 border-t ${isDark ? "border-zinc-700" : "border-slate-200"}`}>
                    <button
                        onClick={onCancel}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${isDark
                            ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors text-white ${confirmButtonColors[kind]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
