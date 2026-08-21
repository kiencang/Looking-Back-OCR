export class HtmlEnhancer {
  /**
   * Enhances raw HTML produced by marked with sophisticated typography and Tailwind utility classes.
   */
  static enhanceTypography(html: string): string {
    if (!html) return '';

    return html
      .replace(/<h1\b(.*?)>/g, '<h1 class="ocr-h1 text-3xl font-extrabold font-sans tracking-tight mt-8 mb-4 border-b pb-2 break-words"$1>')
      .replace(/<h2\b(.*?)>/g, '<h2 class="ocr-h2 text-2xl font-bold font-sans tracking-tight mt-6 mb-3 border-b pb-1.5 break-words"$1>')
      .replace(/<h3\b(.*?)>/g, '<h3 class="ocr-h3 text-xl font-semibold font-sans mt-4 mb-2 break-words"$1>')
      .replace(/<h4\b(.*?)>/g, '<h4 class="ocr-h4 text-lg font-semibold font-sans mt-4 mb-2 break-words"$1>')
      .replace(/<p\b(.*?)>/g, '<p class="ocr-p mb-4 text-justify leading-relaxed text-base break-words"$1>')
      .replace(/<blockquote\b(.*?)>/g, '<blockquote class="ocr-blockquote border-l-4 pl-4 py-1.5 my-4 italic rounded-r-lg break-words"$1>')
      .replace(/<ul\b(.*?)>/g, '<ul class="ocr-ul list-disc list-inside space-y-1.5 my-4 pl-2 break-words"$1>')
      .replace(/<ol\b(.*?)>/g, '<ol class="ocr-ol list-decimal list-inside space-y-1.5 my-4 pl-2 break-words"$1>')
      .replace(/<table\b(.*?)>/g, '<div class="overflow-x-auto my-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="ocr-table w-full text-left text-sm table-auto border-collapse break-words"$1>')
      .replace(/<\/table>/g, '</table></div>')
      .replace(/<thead\b(.*?)>/g, '<thead class="ocr-thead border-b border-slate-200 dark:border-slate-800 font-semibold text-xs tracking-wider uppercase bg-slate-50/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"$1>')
      .replace(/<th\b(.*?)>/g, '<th class="font-semibold px-4 py-3 align-middle"$1>')
      .replace(/<tbody\b(.*?)>/g, '<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"$1>')
      .replace(/<td\b(.*?)>/g, '<td class="ocr-td px-4 py-3 align-middle transition-colors"$1>')
      .replace(/<pre\b(.*?)>/g, '<pre class="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto mb-4 border border-white/5"$1>')
      .replace(/(?<!<pre[^>]*>)<code\b(.*?)>/g, '<code class="ocr-code-inline px-1.5 py-0.5 font-mono text-xs rounded border break-words"$1>')
      .replace(/<a\b(.*?)>/g, '<a class="text-indigo-500 hover:text-indigo-400 underline break-words font-medium transition-colors cursor-pointer" rel="noopener noreferrer" target="_blank"$1>')
      .replace(/<img\b(.*?)>/g, '<img class="ocr-preview-img object-contain rounded-xl border border-slate-200/60 dark:border-slate-800 cursor-zoom-in my-3 hover:scale-[1.01] transition-transform" onclick="window.zoomPdfImage && window.zoomPdfImage(this.src)" referrerpolicy="no-referrer"$1>');
  }

  /**
   * Transforms OCR page break comments into interactive UI dividers.
   */
  static transformPageBreakDividers(text: string): string {
    if (!text) return '';

    let transformed = text.replace(/<!--\s*PAGE(?:_BREAK)?:\s*(\d+)\s*-->/gi, (_match, pageNum) => {
      return `\n\n<div id="page-anchor-${pageNum}" data-page="${pageNum}" class="ocr-page-break-container my-6 flex items-center gap-3 w-full select-none not-prose">
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
  <button type="button" class="ocr-page-pill transition-all cursor-pointer shadow-xs border hover:scale-105 active:scale-95 shrink-0" onclick="window.jumpToPdfPage && window.jumpToPdfPage(${pageNum})" title="Nhấp để cuộn đến trang ${pageNum} trên bản PDF scan">
    <span class="ocr-page-num">Trang ${pageNum}</span>
    <span class="ocr-page-label">· Bản gốc</span>
  </button>
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
</div>\n\n`;
    });

    transformed = transformed.replace(/<!--\s*PAGE_BREAK\s*-->/gi, () => {
      return `\n\n<div class="ocr-page-break-container my-6 flex items-center gap-3 w-full select-none not-prose">
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
  <span class="ocr-page-pill shadow-xs border shrink-0">
    <span class="ocr-page-num">Qua trang mới</span>
  </span>
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
</div>\n\n`;
    });

    return transformed;
  }
}
