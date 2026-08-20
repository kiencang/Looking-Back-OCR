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
          // Discard wrapping <span class="katex"> to return pure <math> XML structure for native .docx
          const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/i);
          const cleanMathML = mathMatch ? mathMatch[0] : mathml;
          
          // Remove annotation tags to completely prevent double-rendering in word processors
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
          // Discard wrapping <span class="katex"> to return pure <math> XML structure for native .docx
          const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/i);
          const cleanMathML = mathMatch ? mathMatch[0] : mathml;
          
          // Remove annotation tags to completely prevent double-rendering in word processors
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

    const getImageObj = (key: string) => {
      let img = allImages.find(i => i.labeledKey === key || i.labeledKey?.toLowerCase() === key.toLowerCase());
      if (!img) {
        const indexStr = key.replace(/\D/g, '');
        const indexVal = parseInt(indexStr, 10) - 1;
        img = allImages[indexVal];
      }
      return img;
    };

    // Replace image tags with standard compact markdown image syntax: ![key](dataUrl)
    const imageRegex = /!\[(IMG[-_]CHUNK\d+[-_]\d+|IMG[-_]\d+)\](?:\((.*?)\))?/gi;
    const processedMarkdown = preprocessedMarkdownWithPages.replace(imageRegex, (match, key) => {
      const img = getImageObj(key);
      if (img) {
        return `![${key}](${img.dataUrl})`;
      }
      return `![${key}](data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><rect width="100" height="40" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="%2394a3b8">${key}</text></svg>)`;
    });

    // 1. Protect intentional code blocks (triple backticks)
    const codeBlocks: string[] = [];
    let codeBlockIndex = 0;
    const fencedCodeRegex = /```[\s\S]*?```/g;
    let preprocessed = processedMarkdown.replace(fencedCodeRegex, (match) => {
      const placeholder = `CODEBLOCKPLACEHOLDERID${codeBlockIndex}END`;
      codeBlocks.push(match);
      codeBlockIndex++;
      return placeholder;
    });

    // 2. Disable indented code blocks for Vietnamese OCR / text layout
    // (Strip leading 4-space indent from lines that are regular text/lists/footnotes so marked does not turn them into <pre><code>)
    preprocessed = preprocessed.replace(/^(?: {4}|\t)(?!\s*$)/gm, '');

    // Protect LaTeX math formulas and MathML tags from being modified by marked parser
    const mathBlocks: string[] = [];
    let mathPlaceholderIndex = 0;

    // Use regex to locate display math (\[...\] and $$...$$), inline math (\(...\) and $...$), and MathML (<math>...</math>)
    const displayMathRegex1 = /\\\[([\s\S]+?)\\\]/g;
    const displayMathRegex2 = /\$\$([\s\S]+?)\$\$/g;
    const inlineMathRegex1 = /\\\(([\s\S]+?)\\\)/g;
    const inlineMathRegex2 = /(?<!\\)\$((?!\s)[^$\n]+?(?<!\\))\$/g;
    const mathmlRegex = /<math[\s\S]*?<\/math>/gi;

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

    // Restore protected intentional code blocks before marked
    for (let i = 0; i < codeBlockIndex; i++) {
      const placeholder = `CODEBLOCKPLACEHOLDERID${i}END`;
      preprocessed = preprocessed.replace(placeholder, codeBlocks[i]);
    }

    let html = '';
    try {
      html = marked.parse(preprocessed, { breaks: true, gfm: true, async: false }) as string;
    } catch(e) {
      console.warn("marked error", e);
      html = `<pre>${processedMarkdown}</pre>`;
    }

    // Restore protected math blocks
    for (let i = 0; i < mathPlaceholderIndex; i++) {
      const placeholder = `MATHPLACEHOLDERID${i}END`;
      html = html.split(placeholder).join(mathBlocks[i]);
    }

    // Enhance typography and prose styling with clean Tailwind classes safely (using \b word boundaries to prevent <p> matching <pre>)
    let rendered = html;
    rendered = rendered.replace(/<h1\b(.*?)>/g, '<h1 class="ocr-h1 text-3xl font-extrabold font-sans tracking-tight mt-8 mb-4 border-b pb-2 break-words"$1>')
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

    return this.handleSentenceContinuations(rendered);
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

    return this.handleSentenceContinuations(compiled);
  }

  /**
   * Automatically adds ellipsis indicators ("...") for paragraph continuations across page breaks.
   * - Appends "..." to the end of a page's last paragraph if it's an incomplete sentence.
   * - Prepends "... " to the beginning of the next page's first paragraph if it starts with a lowercase letter.
   */
  static handleSentenceContinuations(html: string): string {
    if (!html) return html;

    // Helper to check if a character is a lowercase letter
    const isLowercase = (char: string): boolean => {
      if (!char) return false;
      return char === char.toLowerCase() && char !== char.toUpperCase();
    };

    // Regex to match the page break containers that separate pages
    const pageBreakContainerRegex = /<div id="page-anchor-\d+"[^>]*class="[^"]*ocr-page-break-container[\s\S]*?<\/div>|<div class="ocr-page-break-container[\s\S]*?<\/div>/gi;

    // Split the html into segments of text, keeping the page break dividers intact
    let lastIndex = 0;
    let match;
    const parts: { isDivider: boolean, text: string }[] = [];

    while ((match = pageBreakContainerRegex.exec(html)) !== null) {
      const dividerStart = match.index;
      const dividerEnd = pageBreakContainerRegex.lastIndex;
      
      // Extract the page text segment preceding the divider
      const pageText = html.substring(lastIndex, dividerStart);
      parts.push({ isDivider: false, text: pageText });
      
      // Extract the divider itself
      const dividerText = html.substring(dividerStart, dividerEnd);
      parts.push({ isDivider: true, text: dividerText });
      
      lastIndex = dividerEnd;
    }
    
    // Add the remaining text after the final page break divider
    const remainingText = html.substring(lastIndex);
    parts.push({ isDivider: false, text: remainingText });

    // We only want to process non-divider segments
    let segmentIndex = 0;
    const nonDividerCount = parts.filter(p => !p.isDivider).length;

    const processedParts = parts.map((part) => {
      if (part.isDivider) {
        return part.text;
      }
      
      let segmentHtml = part.text;
      const currentSegmentIdx = segmentIndex;
      segmentIndex++;

      // 1. First Paragraph Continuation Check (for pages that follow a page break)
      if (currentSegmentIdx > 0) {
        const firstPRegex = /<p([^>]*)>([\s\S]*?)<\/p>/i;
        const firstPMatch = firstPRegex.exec(segmentHtml);
        
        if (firstPMatch) {
          const firstMatchIndex = firstPMatch.index;
          const firstMatchAttributes = firstPMatch[1];
          const firstMatchText = firstPMatch[2];
          const firstMatchFull = firstPMatch[0];

          // Clean tags inside paragraph text to analyze raw starting character
          const pureText = firstMatchText.replace(/<[^>]*>/g, '').trim();
          if (pureText.length > 0) {
            const firstChar = pureText[0];
            if (isLowercase(firstChar)) {
              // Prepend "... " to indicate continuation from the previous page
              const newParagraph = `<p${firstMatchAttributes}>... ${firstMatchText}</p>`;
              const before = segmentHtml.substring(0, firstMatchIndex);
              const after = segmentHtml.substring(firstMatchIndex + firstMatchFull.length);
              segmentHtml = before + newParagraph + after;
            }
          }
        }
      }

      // 2. Last Paragraph Continuation Check (for pages that precede a page break)
      if (currentSegmentIdx < nonDividerCount - 1) {
        const pRegex = /<p([^>]*)>([\s\S]*?)<\/p>/gi;
        let pMatch;
        let lastMatchIndex = -1;
        let lastMatchText = '';
        let lastMatchAttributes = '';
        let lastMatchFull = '';

        // Find the last paragraph in this specific page segment
        while ((pMatch = pRegex.exec(segmentHtml)) !== null) {
          lastMatchIndex = pMatch.index;
          lastMatchAttributes = pMatch[1];
          lastMatchText = pMatch[2];
          lastMatchFull = pMatch[0];
        }

        if (lastMatchIndex !== -1 && lastMatchText) {
          // Strip tags to get clean plain text content
          const pureText = lastMatchText.replace(/<[^>]*>/g, '').trim();

          if (pureText.length > 0) {
            const lastChar = pureText[pureText.length - 1];
            // Punctuation marks that represent complete sentences or quotes
            const sentenceEndings = ['.', '?', '!', ':', '”', '"', ';', '…', '’', ')', ']', '»'];
            const endsInPunctuation = sentenceEndings.includes(lastChar);

            if (!endsInPunctuation) {
              // Append "..." to indicate continuation to the next page
              const newParagraph = `<p${lastMatchAttributes}>${lastMatchText}...</p>`;
              const before = segmentHtml.substring(0, lastMatchIndex);
              const after = segmentHtml.substring(lastMatchIndex + lastMatchFull.length);
              segmentHtml = before + newParagraph + after;
            }
          }
        }
      }

      return segmentHtml;
    });

    return processedParts.join('');
  }
}
