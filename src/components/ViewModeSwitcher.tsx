import React from 'react';

interface ViewModeSwitcherProps {
  value: 'edit' | 'preview' | 'live';
  onChange: (mode: 'edit' | 'preview' | 'live') => void;
  isDark: boolean;
}

export function ViewModeSwitcher({ value, onChange, isDark }: ViewModeSwitcherProps) {
  const modes = [
    { value: 'edit' as const, label: '📝 编辑', title: '编辑模式' },
    { value: 'preview' as const, label: '👁️ 预览', title: '预览模式' },
    { value: 'live' as const, label: '⚡ 分屏', title: '分屏模式' },
  ];

  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-lg ${
      isDark ? 'bg-zinc-800' : 'bg-slate-100'
    }`}>
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          title={mode.title}
          className={`px-2.5 py-1 text-sm rounded transition-colors ${
            value === mode.value
              ? isDark
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white'
              : isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
