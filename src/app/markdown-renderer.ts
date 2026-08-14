/* eslint-disable @typescript-eslint/no-explicit-any */
import { PdfPageData } from './pdf-processor';
import { marked } from 'marked';
import katex from 'katex';

export class MarkdownRenderer {
  /**
   * Compiles LaTeX formulas ($...$ or $$...$$) into standard MathML tags.
   */
  static compileLatexToMathML(markdown: string): string {
    if (!markdown) return '';

    let compiled = markdown;

    // 1. Process block math: \[ formula \] and $$ formula $$
    // We parse \[ ... \] first, then $$ ... $$
    const blockRegexes = [
      { regex: /\\\[([\s\S]+?)\\\]/g, open: '\\[', close: '\\]' },
      { regex: /\$\$([\s\S]+?)\$\$/g, open: '$$', close: '$$' } // Match standard $$
    ];

    for (const item of blockRegexes) {
      compiled = compiled.replace(item.regex, (match, formula) => {
        try {
          const mathml = katex.renderToString(formula.trim(), {
            displayMode: true,
            output: 'mathml',
            throwOnError: true
          });
          // Discard wrapping <span class="katex"> to return pure <math> XML structure for native .docx & EPUB
          const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/i);
          const cleanMathML = mathMatch ? mathMatch[0] : mathml;
          
          // Remove annotation tags to completely prevent double-rendering in simple/dumb EPUB readers
          return cleanMathML.replace(/<annotation encoding="application\/x-tex">[\s\S]*?<\/annotation>/g, '');
        } catch (err) {
          console.warn('KaTeX display math parse failed, falling back to clean display container:', err);
          // Clean fallback showing the actual formula with its matching delimiters
          return `<span class="math-fallback-block font-mono text-indigo-400 block my-2 text-center select-all">${item.open} ${formula.trim()} ${item.close}</span>`;
        }
      });
    }

    // 2. Process inline math: \( formula \) and $ formula $
    // We parse \( ... \) first, then $ ... $
    const inlineRegexes = [
      { regex: /\\\(([\s\S]+?)\\\)/g, open: '\\(', close: '\\)' },
      { regex: /(?<!\\)\$((?!\s)[^$\n]+?(?<!\\))\$/g, open: '$', close: '$' }
    ];

    for (const item of inlineRegexes) {
      compiled = compiled.replace(item.regex, (match, formula) => {
        try {
          const mathml = katex.renderToString(formula.trim(), {
            displayMode: false,
            output: 'mathml',
            throwOnError: true
          });
          // Discard wrapping <span class="katex"> to return pure <math> XML structure for native .docx & EPUB
          const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/i);
          const cleanMathML = mathMatch ? mathMatch[0] : mathml;
          
          // Remove annotation tags to completely prevent double-rendering in simple/dumb EPUB readers
          return cleanMathML.replace(/<annotation encoding="application\/x-tex">[\s\S]*?<\/annotation>/g, '');
        } catch (err) {
          console.warn('KaTeX inline math parse failed, falling back to clean inline display:', err);
          // Clean fallback showing the actual formula with its matching delimiters
          return `<code class="math-fallback-inline text-indigo-400 bg-slate-950/40 px-1 rounded select-all">${item.open}${formula.trim()}${item.close}</code>`;
        }
      });
    }

    return compiled;
  }

  /**
   * Safe, regex-based Markdown-to-HTML parser for preview rendering
   */
  static renderMarkdownToHtml(markdown: string, pdfPages: PdfPageData[]): string {
    if (!markdown) return '';

    // Compile LaTeX math to MathML first
    const compiledMarkdown = this.compileLatexToMathML(markdown);

    // 0. Protect Page Break Markers and transform them to interactive full-width ultra-slim horizontal dividers
    const pageBreakRegex = /<!--\s*PAGE(?:_BREAK)?:\s*(\d+)\s*-->/gi;
    let preprocessedMarkdownWithPages = compiledMarkdown.replace(pageBreakRegex, (match, pageNum) => {
      return `\n\n<div id="page-anchor-${pageNum}" data-page="${pageNum}" class="ocr-page-break-container my-6 flex items-center gap-3 w-full select-none not-prose">
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
  <button type="button" class="ocr-page-pill transition-all cursor-pointer shadow-xs border hover:scale-105 active:scale-95 shrink-0" onclick="window.jumpToPdfPage && window.jumpToPdfPage(${pageNum})" title="Nhấp để cuộn đến trang ${pageNum} trên bản PDF scan">
    <span class="ocr-page-num">Trang ${pageNum}</span>
    <span class="ocr-page-label">· Bản gốc</span>
  </button>
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
</div>\n\n`;
    });

    preprocessedMarkdownWithPages = preprocessedMarkdownWithPages.replace(/<!--\s*PAGE_BREAK\s*-->/gi, () => {
      return `\n\n<div class="ocr-page-break-container my-6 flex items-center gap-3 w-full select-none not-prose">
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
  <span class="ocr-page-pill shadow-xs border shrink-0">
    <span class="ocr-page-num">Qua trang mới</span>
  </span>
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
</div>\n\n`;
    });

    const allImages: any[] = [];
    pdfPages.forEach(page => {
      if (page.extractedImages) {
        allImages.push(...page.extractedImages);
      }
    });

    const imageRegex = /!\[(IMG[-_]CHUNK\d+[-_]\d+|IMG[-_]\d+)\]/gi;
    const processedMarkdown = preprocessedMarkdownWithPages.replace(imageRegex, (match, key) => {
      // Find image by exact labeledKey first (case insensitive)
      let img = allImages.find(i => i.labeledKey === key || i.labeledKey?.toLowerCase() === key.toLowerCase());
      if (!img) {
        // Fallback for legacy simple index
        const indexStr = key.replace(/\D/g, '');
        const indexVal = parseInt(indexStr, 10) - 1;
        img = allImages[indexVal];
      }
      if (img) {
        return `\n<div class="my-8 border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white p-3 max-w-2xl mx-auto-fluid no-print">
  <div class="relative bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center max-h-[30rem] p-3">
    <img src="${img.dataUrl}" alt="${key}" class="max-w-full max-h-full object-contain hover:scale-[1.01] transition-transform duration-300 cursor-zoom-in" onclick="window.zoomPdfImage && window.zoomPdfImage(this.src)" referrerpolicy="no-referrer" />
  </div>
</div>\n`;
      } else {
        return `\n<div class="pdf-image-placeholder my-6 border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50">
  <span class="text-xs text-slate-400 font-mono">Đang nạp ảnh ${key}...</span>
</div>\n`;
      }
    });

    // Protect LaTeX math formulas and MathML tags from being modified by marked parser
    const mathBlocks: string[] = [];
    let mathPlaceholderIndex = 0;

    // Use regex to locate display math (\[...\] and $$...$$), inline math (\(...\) and $...$), and MathML (<math>...</math>)
    const displayMathRegex1 = /\\\[([\s\S]+?)\\\]/g;
    const displayMathRegex2 = /\$\$([\s\S]+?)\$\$/g;
    const inlineMathRegex1 = /\\\(([\s\S]+?)\\\)/g;
    const inlineMathRegex2 = /(?<!\\)\$((?!\s)[^$\n]+?(?<!\\))\$/g;
    const mathmlRegex = /<math[\s\S]*?<\/math>/gi;

    let preprocessed = processedMarkdown;

    // Replace display math first
    preprocessed = preprocessed.replace(displayMathRegex1, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });
    preprocessed = preprocessed.replace(displayMathRegex2, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });

    // Replace inline math
    preprocessed = preprocessed.replace(inlineMathRegex1, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });
    preprocessed = preprocessed.replace(inlineMathRegex2, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });

    // Replace MathML tags
    preprocessed = preprocessed.replace(mathmlRegex, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });

    let html = '';
    try {
      html = marked.parse(preprocessed, { breaks: true, async: false }) as string;
    } catch(e) {
      console.warn("marked error", e);
      html = `<pre>${processedMarkdown}</pre>`;
    }

    // Restore protected math blocks
    for (let i = 0; i < mathPlaceholderIndex; i++) {
      const placeholder = `MATHPLACEHOLDERID${i}END`;
      // Use split/join to replace all occurrences globally, in case marked duplicate or we need global replace
      html = html.split(placeholder).join(mathBlocks[i]);
    }

    let rendered = html;
    rendered = rendered.replace(/<h1(.*?)>/g, '<h1 class="ocr-h1 text-3xl font-extrabold font-sans tracking-tight mt-8 mb-4 border-b pb-2 break-words"$1>')
                       .replace(/<h2(.*?)>/g, '<h2 class="ocr-h2 text-2xl font-bold font-sans tracking-tight mt-6 mb-3 border-b pb-1.5 break-words"$1>')
                       .replace(/<h3(.*?)>/g, '<h3 class="ocr-h3 text-xl font-semibold font-sans mt-4 mb-2 break-words"$1>')
                       .replace(/<h4(.*?)>/g, '<h4 class="ocr-h4 text-lg font-semibold font-sans mt-4 mb-2 break-words"$1>')
                       .replace(/<p(.*?)>/g, '<p class="ocr-p mb-4 text-justify leading-relaxed text-base break-words"$1>')
                       .replace(/<blockquote(.*?)>/g, '<blockquote class="ocr-blockquote border-l-4 pl-4 py-1.5 my-4 italic rounded-r-lg break-words"$1>')
                       .replace(/<ul(.*?)>/g, '<ul class="ocr-ul list-disc list-inside space-y-1.5 my-4 pl-2 break-words"$1>')
                       .replace(/<ol(.*?)>/g, '<ol class="ocr-ol list-decimal list-inside space-y-1.5 my-4 pl-2 break-words"$1>')
                       .replace(/<table(.*?)>/g, '<div class="overflow-x-auto my-6"><table class="ocr-table w-full text-left text-xs border rounded-xl overflow-hidden shadow-sm break-words"$1>')
                       .replace(/<\/table>/g, '</table></div>')
                       .replace(/<thead(.*?)>/g, '<thead class="ocr-thead border-b font-bold"$1>')
                       .replace(/<th(.*?)>/g, '<th class="font-bold p-3"$1>')
                       .replace(/<tbody(.*?)>/g, '<tbody class="divide-y border-b"$1>')
                       .replace(/<td(.*?)>/g, '<td class="ocr-td p-3 transition-colors"$1>')
                       .replace(/<pre(.*?)>/g, '<pre class="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto mb-4 border border-white/5"$1>')
                       .replace(/(?<!<pre[^>]*>)<code(.*?)>/g, '<code class="ocr-code-inline px-1.5 py-0.5 font-mono text-xs rounded border break-words"$1>')
                       .replace(/<a(.*?)>/g, '<a class="text-indigo-500 hover:text-indigo-400 underline break-words font-medium transition-colors cursor-pointer" rel="noopener noreferrer" target="_blank"$1>');

    return rendered;
  }

  /**
   * Safe HTML content compiler for layout-preserving preview rendering
   */
  static renderHtmlContent(htmlContent: string, pdfPages: PdfPageData[]): string {
    if (!htmlContent) return '';

    // 1. Compile LaTeX math formulas if any to MathML
    let compiled = this.compileLatexToMathML(htmlContent);

    // 2. Interactive Page Break Markers for dual-pane comparison
    const pageBreakRegex = /<!--\s*PAGE(?:_BREAK)?:\s*(\d+)\s*-->/gi;
    compiled = compiled.replace(pageBreakRegex, (match, pageNum) => {
      return `\n\n<div id="page-anchor-${pageNum}" data-page="${pageNum}" class="ocr-page-break-container my-6 flex items-center gap-3 w-full select-none not-prose">
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
  <button type="button" class="ocr-page-pill transition-all cursor-pointer shadow-xs border hover:scale-105 active:scale-95 shrink-0" onclick="window.jumpToPdfPage && window.jumpToPdfPage(${pageNum})" title="Nhấp để cuộn đến trang ${pageNum} trên bản PDF scan">
    <span class="ocr-page-num">Trang ${pageNum}</span>
    <span class="ocr-page-label">· Bản gốc</span>
  </button>
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
</div>\n\n`;
    });

    compiled = compiled.replace(/<!--\s*PAGE_BREAK\s*-->/gi, () => {
      return `\n\n<div class="ocr-page-break-container my-6 flex items-center gap-3 w-full select-none not-prose">
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
  <span class="ocr-page-pill shadow-xs border shrink-0">
    <span class="ocr-page-num">Qua trang mới</span>
  </span>
  <div class="flex-1 h-px border-t border-dashed ocr-divider-line"></div>
</div>\n\n`;
    });

    // 3. Image replacement
    const allImages: any[] = [];
    pdfPages.forEach(page => {
      if (page.extractedImages) {
        allImages.push(...page.extractedImages);
      }
    });

    const findImg = (key: string) => {
      const cleanKey = key.replace(/[![\]]/g, '').trim();
      let img = allImages.find(i => i.labeledKey === cleanKey || i.labeledKey?.toLowerCase() === cleanKey.toLowerCase());
      if (!img) {
        const indexStr = cleanKey.replace(/\D/g, '');
        if (indexStr) {
          const indexVal = parseInt(indexStr, 10) - 1;
          img = allImages[indexVal];
        }
      }
      return img;
    };

    // Replace src="![IMG-CHUNK...]" or src="IMG-CHUNK..."
    compiled = compiled.replace(/src=["'](?:!\[)?(IMG[-_]CHUNK\d+[-_]\d+|IMG[-_]\d+)(?:\])?["']/gi, (match, key) => {
      const img = findImg(key);
      if (img) {
        return `src="${img.dataUrl}" onclick="window.zoomPdfImage && window.zoomPdfImage(this.src)" class="cursor-zoom-in"`;
      }
      return match;
    });

    // Replace standalone ![IMG-CHUNK...] if Gemini generated it as markdown image inside HTML
    const mdImgRegex = /!\[(IMG[-_]CHUNK\d+[-_]\d+|IMG[-_]\d+)\]/gi;
    compiled = compiled.replace(mdImgRegex, (match, key) => {
      const img = findImg(key);
      if (img) {
        return `<figure style="margin: 20px 0; text-align: center;"><img src="${img.dataUrl}" alt="${key}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" onclick="window.zoomPdfImage && window.zoomPdfImage(this.src)" class="cursor-zoom-in" referrerpolicy="no-referrer" /></figure>`;
      }
      return `<div class="pdf-image-placeholder my-6 border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50"><span class="text-xs text-slate-400 font-mono">Đang nạp ảnh ${key}...</span></div>`;
    });

    return compiled;
  }

  /**
   * Safe Standard XML/XHTML compiler from HTML for strict eBook reader compatibility of EPUB formats
   */
  static htmlToXhtml(htmlContent: string): string {
    if (!htmlContent) return '';

    // Compile LaTeX math to MathML first
    let compiled = this.compileLatexToMathML(htmlContent);

    // Replace page breaks with clean EPUB page markers
    const pageBreakRegex = /<!--\s*PAGE(?:_BREAK)?:\s*(\d+)\s*-->/gi;
    compiled = compiled.replace(pageBreakRegex, (match, pageNum) => {
      return `\n<div class="page-marker" id="page-${pageNum}"><hr class="page-break" /><span class="page-number">[Trang ${pageNum}]</span></div>\n`;
    });
    compiled = compiled.replace(/<!--\s*PAGE_BREAK\s*-->/gi, () => {
      return `\n<hr class="page-break" />\n`;
    });

    // Replace image references with relative EPUB paths
    compiled = compiled.replace(/src=["'](?:!\[)?(IMG[-_]CHUNK\d+[-_]\d+|IMG[-_]\d+)(?:\])?["']/gi, (match, key) => {
      const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '');
      return `src="images/${safeKey}.png"`;
    });

    const mdImgRegex = /!\[(IMG[-_]CHUNK\d+[-_]\d+|IMG[-_]\d+)\]/gi;
    compiled = compiled.replace(mdImgRegex, (match, key) => {
      const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '');
      return `<img src="images/${safeKey}.png" alt="${key}" />`;
    });

    // Ensure standard EPUB XHTML compatibility for unclosed valid HTML tags:
    const rendered = compiled.replace(/<img(.*?)>/g, (match, p1) => {
      if (p1.endsWith('/')) return match;
      return `<img${p1} />`;
    }).replace(/<br(.*?)>/g, (match, p1) => {
      if (p1.endsWith('/')) return match;
      return `<br${p1} />`;
    }).replace(/<hr(.*?)>/g, (match, p1) => {
      if (p1.endsWith('/')) return match;
      return `<hr${p1} />`;
    });

    return rendered;
  }

  /**
   * Safe Standard XML/XHTML compiler for strict eBook reader compatibility of EPUB formats
   */
  static markdownToXhtml(markdown: string): string {
    if (!markdown) return '';

    // Compile LaTeX math to MathML first
    const compiledMarkdown = this.compileLatexToMathML(markdown);

    // Replace page breaks with clean EPUB page markers
    const pageBreakRegex = /<!--\s*PAGE(?:_BREAK)?:\s*(\d+)\s*-->/gi;
    let preprocessedXhtml = compiledMarkdown.replace(pageBreakRegex, (match, pageNum) => {
      return `\n<div class="page-marker" id="page-${pageNum}"><hr class="page-break" /><span class="page-number">[Trang ${pageNum}]</span></div>\n`;
    });
    preprocessedXhtml = preprocessedXhtml.replace(/<!--\s*PAGE_BREAK\s*-->/gi, () => {
      return `\n<hr class="page-break" />\n`;
    });

    const imageRegex = /!\[(IMG[-_]CHUNK\d+[-_]\d+|IMG[-_]\d+)\]/gi;
    const processedMarkdown = preprocessedXhtml.replace(imageRegex, (match, key) => {
      const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '');
      const imgFileName = `images/${safeKey}.png`;
      return `![${key}](${imgFileName})`;
    });

    // Protect LaTeX math formulas and MathML tags from being modified by marked parser
    const mathBlocks: string[] = [];
    let mathPlaceholderIndex = 0;

    const displayMathRegex1 = /\\\[([\s\S]+?)\\\]/g;
    const displayMathRegex2 = /\$\$([\s\S]+?)\$\$/g;
    const inlineMathRegex1 = /\\\(([\s\S]+?)\\\)/g;
    const inlineMathRegex2 = /(?<!\\)\$((?!\s)[^$\n]+?(?<!\\))\$/g;
    const mathmlRegex = /<math[\s\S]*?<\/math>/gi;

    let preprocessed = processedMarkdown;

    preprocessed = preprocessed.replace(displayMathRegex1, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });
    preprocessed = preprocessed.replace(displayMathRegex2, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });

    preprocessed = preprocessed.replace(inlineMathRegex1, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });
    preprocessed = preprocessed.replace(inlineMathRegex2, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });

    preprocessed = preprocessed.replace(mathmlRegex, (match) => {
      const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
      mathBlocks.push(match);
      mathPlaceholderIndex++;
      return placeholder;
    });

    let rendered = '';
    try {
      rendered = marked.parse(preprocessed, { breaks: true, async: false }) as string;
    } catch(e) {
      console.warn("marked error", e);
      rendered = preprocessed;
    }

    // Restore protected math blocks
    for (let i = 0; i < mathPlaceholderIndex; i++) {
      const placeholder = `MATHPLACEHOLDERID${i}END`;
      rendered = rendered.split(placeholder).join(mathBlocks[i]);
    }
    
    // Ensure standard EPUB XHTML compatibility for unclosed valid HTML tags:
    rendered = rendered.replace(/<img(.*?)>/g, (match, p1) => {
      if (p1.endsWith('/')) return match;
      return `<img${p1} />`;
    }).replace(/<br(.*?)>/g, (match, p1) => {
      if (p1.endsWith('/')) return match;
      return `<br${p1} />`;
    }).replace(/<hr(.*?)>/g, (match, p1) => {
      if (p1.endsWith('/')) return match;
      return `<hr${p1} />`;
    });

    return rendered;
  }
}
