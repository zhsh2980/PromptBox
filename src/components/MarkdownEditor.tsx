import { useMemo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { preprocessForPreview } from '../utils/markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  viewMode: 'edit' | 'preview' | 'live';
  isDark: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  readOnly?: boolean;  // 用于 SVN Prompts
}

export function MarkdownEditor({
  value,
  onChange,
  viewMode,
  isDark,
  onBlur,
  onFocus,
  readOnly = false,
}: MarkdownEditorProps) {
  // 预览时预处理内容（只转换换行符，不修改原始值）
  const processedValue = useMemo(() => {
    if (viewMode === 'preview' || viewMode === 'live') {
      return preprocessForPreview(value);
    }
    return value;
  }, [value, viewMode]);

  // 根据视图模式决定 preview 属性
  const previewMode = useMemo(() => {
    if (readOnly) {
      return 'preview';  // 只读模式强制预览
    }

    if (viewMode === 'edit') return 'edit';
    if (viewMode === 'preview') return 'preview';
    return 'live';  // 分屏模式
  }, [viewMode, readOnly]);

  return (
    <div
      className="w-full h-full markdown-editor-container"
      onBlur={onBlur}
      onFocus={onFocus}
    >
      <MDEditor
        value={viewMode === 'edit' ? value : processedValue}
        onChange={(val) => !readOnly && onChange(val || '')}
        preview={previewMode}
        hideToolbar={readOnly}  // 只读模式隐藏工具栏
        height="100%"
        data-color-mode={isDark ? 'dark' : 'light'}
        textareaProps={{
          placeholder: '输入 Markdown 内容...',
        }}
      />
    </div>
  );
}
