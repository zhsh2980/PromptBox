import { useMemo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { preprocessForPreview } from '../utils/markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  readOnly?: boolean;  // 用于 SVN Prompts
}

export function MarkdownEditor({
  value,
  onChange,
  isDark,
  onBlur,
  onFocus,
  readOnly = false,
}: MarkdownEditorProps) {
  return (
    <div
      className="w-full h-full markdown-editor-container"
      onBlur={onBlur}
      onFocus={onFocus}
    >
      <MDEditor
        value={value}
        onChange={(val) => !readOnly && onChange(val || '')}
        visibleDragbar={false}
        hideToolbar={readOnly}
        height="100%"
        data-color-mode={isDark ? 'dark' : 'light'}
        textareaProps={{
          placeholder: '输入 Markdown 内容...',
        }}
      />
    </div>
  );
}
