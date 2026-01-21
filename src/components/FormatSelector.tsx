import React, { useState, useRef, useEffect } from 'react';

interface FormatSelectorProps {
  value: 'plain' | 'markdown';
  onChange: (format: 'plain' | 'markdown') => void;
  isTemporary?: boolean;  // 是否是临时切换（用于 SVN Prompts）
  isDark: boolean;
}

export function FormatSelector({
  value,
  onChange,
  isTemporary = false,
  isDark
}: FormatSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (format: 'plain' | 'markdown') => {
    onChange(format);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-sm border rounded transition-colors ${
          isDark
            ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
        }`}
      >
        <span>{value === 'markdown' ? '📝' : '📄'}</span>
        <span>{value === 'markdown' ? 'Markdown' : '纯文本'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1 left-0 w-40 border rounded-lg shadow-lg z-50 ${
            isDark
              ? 'bg-zinc-800 border-zinc-700'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* 临时切换提示 */}
          {isTemporary && (
            <div className={`px-3 py-2 text-xs border-b ${
              isDark
                ? 'text-zinc-500 border-zinc-700'
                : 'text-slate-500 border-slate-200'
            }`}>
              💡 临时切换，刷新后恢复
            </div>
          )}

          {/* 选项列表 */}
          <div className="py-1">
            <button
              onClick={() => handleSelect('markdown')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                value === 'markdown'
                  ? isDark
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'bg-blue-50 text-blue-600'
                  : isDark
                  ? 'text-zinc-300 hover:bg-zinc-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">📝</span>
              <span className="flex-1 text-left">Markdown</span>
              {value === 'markdown' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={() => handleSelect('plain')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                value === 'plain'
                  ? isDark
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'bg-blue-50 text-blue-600'
                  : isDark
                  ? 'text-zinc-300 hover:bg-zinc-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">📄</span>
              <span className="flex-1 text-left">纯文本</span>
              {value === 'plain' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
