import MDEditor, { ICommand } from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  readOnly?: boolean;  // 用于 SVN Prompts
  customCommands?: ICommand[];  // 自定义命令列表
  customExtraCommands?: ICommand[];  // 自定义额外命令列表
  defaultPreview?: 'edit' | 'live' | 'preview';  // 默认视图模式
}

export function MarkdownEditor({
  value,
  onChange,
  isDark,
  onBlur,
  onFocus,
  readOnly = false,
  customCommands,
  customExtraCommands,
  defaultPreview,
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
        height="100%"
        data-color-mode={isDark ? 'dark' : 'light'}
        textareaProps={{
          placeholder: '输入 Markdown 内容...',
        }}
        commands={customCommands}
        extraCommands={customExtraCommands}
        preview={defaultPreview}
      />
    </div>
  );
}
