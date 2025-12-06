import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

let toastId = 0;
const listeners: Set<(toast: Toast) => void> = new Set();

// 全局 toast 函数
export const toast = {
    success: (message: string) => {
        const t: Toast = { id: ++toastId, message, type: "success" };
        listeners.forEach((fn) => fn(t));
    },
    error: (message: string) => {
        const t: Toast = { id: ++toastId, message, type: "error" };
        listeners.forEach((fn) => fn(t));
    },
    warning: (message: string) => {
        const t: Toast = { id: ++toastId, message, type: "warning" };
        listeners.forEach((fn) => fn(t));
    },
};

export function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem("theme") !== "light";
    });

    // 监听主题变化
    useEffect(() => {
        const checkTheme = () => {
            setIsDark(localStorage.getItem("theme") !== "light");
        };

        // 监听 storage 事件
        window.addEventListener("storage", checkTheme);

        // 定期检查（以防同页面内修改）
        const interval = setInterval(checkTheme, 500);

        return () => {
            window.removeEventListener("storage", checkTheme);
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        const addToast = (t: Toast) => {
            setToasts((prev) => [...prev, t]);
            // 3秒后自动移除
            setTimeout(() => {
                setToasts((prev) => prev.filter((toast) => toast.id !== t.id));
            }, 3000);
        };

        listeners.add(addToast);
        return () => {
            listeners.delete(addToast);
        };
    }, []);

    const removeToast = (id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case "success":
                return <CheckCircle className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`} />;
            case "error":
                return <XCircle className={`w-5 h-5 ${isDark ? "text-red-400" : "text-red-600"}`} />;
            case "warning":
                return <AlertCircle className={`w-5 h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} />;
        }
    };

    const getBgColor = (type: ToastType) => {
        if (isDark) {
            switch (type) {
                case "success":
                    return "bg-green-900/90 border-green-700 text-white";
                case "error":
                    return "bg-red-900/90 border-red-700 text-white";
                case "warning":
                    return "bg-yellow-900/90 border-yellow-700 text-white";
            }
        } else {
            switch (type) {
                case "success":
                    return "bg-green-50 border-green-300 text-green-900";
                case "error":
                    return "bg-red-50 border-red-300 text-red-900";
                case "warning":
                    return "bg-yellow-50 border-yellow-300 text-yellow-900";
            }
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[280px] animate-slide-in ${getBgColor(
                        t.type
                    )}`}
                >
                    {getIcon(t.type)}
                    <span className="flex-1 text-sm">{t.message}</span>
                    <button
                        onClick={() => removeToast(t.id)}
                        className={isDark ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
