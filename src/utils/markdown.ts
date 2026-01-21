/**
 * 预览时自动转换单换行符为 Markdown 硬换行
 * 保留空行（连续换行符）
 */
export function preprocessForPreview(content: string): string {
  // 只转换单个换行符,不转换空行
  // 正则说明:
  // ([^\n]) - 匹配非换行符的字符
  // \n      - 单个换行符
  // ([^\n]) - 后面也是非换行符
  return content.replace(/([^\n])\n([^\n])/g, '$1  \n$2');
}
