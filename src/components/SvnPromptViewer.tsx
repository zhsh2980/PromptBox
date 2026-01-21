import { useState, useEffect } from 'react';
import { SvnPrompt } from '../types';
import { FormatSelector } from './FormatSelector';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { MarkdownEditor } from './MarkdownEditor';
import { Copy, Clock, Bot } from 'lucide-react';

interface SvnPromptViewerProps {
  prompt: SvnPrompt;
  isDark: boolean;
  styles: Record<string, string>;
  onCopy: (content: string) => void;
  showToast: (message: string) => void;
}

export function SvnPromptViewer({
  prompt,
  isDark,
  styles,
  onCopy,
  showToast
}: SvnPromptViewerProps) {
  // 从 is_markdown 字段获取默认格式
  const defaultFormat = prompt.is_markdown === 1 ? 'markdown' : 'plain';

  // 临时格式状态（不保存到数据库）
  const [tempFormat, setTempFormat] = useState<'plain' | 'markdown'>(defaultFormat);

  // 临时视图模式（仅 Markdown 格式时使用）
  const [tempViewMode, setTempViewMode] = useState<'edit' | 'preview' | 'live'>('preview');

  // 首次切换标记（用于显示 Toast）
  const [hasShownToast, setHasShownToast] = useState(false);

  // 当 Prompt 切换时，重置临时状态
  useEffect(() => {
    setTempFormat(defaultFormat);
    setTempViewMode('preview');
    setHasShownToast(false);
  }, [prompt.id, defaultFormat]);

  // 处理格式切换
  const handleFormatChange = (newFormat: 'plain' | 'markdown') => {
    setTempFormat(newFormat);

    // 首次切换时显示提示
    if (!hasShownToast) {
      showToast('已临时切换格式，刷新后恢复默认');
      setHasShownToast(true);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* 顶部：标题和操作按钮 */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs border border-blue-600/30 flex-shrink-0">
            🔒 共享 (只读)
          </span>
          <h1 className="text-xl font-semibold truncate">
            {prompt.title}
          </h1>
          <FormatSelector
            value={tempFormat}
            onChange={handleFormatChange}
            isTemporary={true}
            isDark={isDark}
          />
        </div>
        <button
          onClick={() => onCopy(prompt.content)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors text-white flex-shrink-0"
          title="复制内容"
        >
          <Copy className="w-4 h-4" />
          复制
        </button>
      </div>

      {/* 视图模式切换（仅 Markdown 格式） */}
      {tempFormat === 'markdown' && (
        <div className="flex-shrink-0">
          <ViewModeSwitcher
            value={tempViewMode}
            onChange={setTempViewMode}
            isDark={isDark}
          />
        </div>
      )}

      {/* 内容显示区 */}
      <div className="flex-1 min-h-0">
        {tempFormat === 'markdown' ? (
          <MarkdownEditor
            value={prompt.content}
            onChange={() => {}}  // 只读，不处理变化
            viewMode={tempViewMode}
            isDark={isDark}
            readOnly={true}
          />
        ) : (
          <div
            className={`w-full h-full p-4 border rounded-lg text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-auto ${styles.contentArea} ${
              isDark ? 'text-zinc-200' : 'text-slate-800'
            }`}
          >
            {prompt.content}
          </div>
        )}
      </div>

      {/* 底部元数据行 */}
      <div className="flex items-center gap-3 flex-wrap text-sm flex-shrink-0">
        {prompt.model && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg ${styles.contentArea}`}>
            <Bot className={`w-4 h-4 ${styles.iconMuted}`} />
            <span className={styles.textSecondary}>
              {prompt.model}
            </span>
          </div>
        )}
        {prompt.tags.map((tag) => (
          <span
            key={tag}
            className={`px-3 py-1.5 border rounded-lg ${styles.contentArea}`}
          >
            #{tag}
          </span>
        ))}
        {prompt.modified_at && (
          <div className={`ml-auto flex items-center gap-1.5 ${styles.textMuted}`}>
            <Clock className="w-4 h-4" />
            <span className="text-xs">{prompt.modified_at}</span>
          </div>
        )}
      </div>
    </div>
  );
}
