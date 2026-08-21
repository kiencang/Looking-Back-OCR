import { PdfPageData } from '../pdf-processor';
import { marked } from 'marked';
import { MathCompiler } from './math-compiler';
import { HtmlEnhancer } from './html-enhancer';
import { PageContinuationHandler } from './page-continuation-handler';

export class MarkdownRenderer {
  /**
   * Compiles LaTeX formulas ($...$ or $$...$$) into standard MathML tags.
   */
  static compileLatexToMathML(markdown: string): string {
    return MathCompiler.compileLatexToMathML(markdown);
  }

  /**
   * Safe Markdown-to-HTML parser with LaTeX protection and interactive preview components.
   */
  static renderMarkdownToHtml(markdown: string, _pdfPages?: PdfPageData[]): string {
    void _pdfPages;
    if (!markdown) return '';

    // 1. Compile LaTeX math to MathML first
    const compiledMarkdown = MathCompiler.compileLatexToMathML(markdown);

    // 2. Protect Page Break Markers and transform them to interactive dividers
    const preprocessedMarkdownWithPages = HtmlEnhancer.transformPageBreakDividers(compiledMarkdown);

    // 3. Protect intentional code blocks (triple backticks)
    const codeBlocks: string[] = [];
    let codeBlockIndex = 0;
    const fencedCodeRegex = /```[\s\S]*?```/g;
    let preprocessed = preprocessedMarkdownWithPages.replace(fencedCodeRegex, (match) => {
      const placeholder = `CODEBLOCKPLACEHOLDERID${codeBlockIndex}END`;
      codeBlocks.push(match);
      codeBlockIndex++;
      return placeholder;
    });

    // 4. Disable indented code blocks for Vietnamese OCR / text layout
    preprocessed = preprocessed.replace(/^(?: {4}|\t)(?!\s*$)/gm, '');

    // 5. Protect LaTeX math formulas and MathML tags from being modified by marked parser
    const mathBlocks: string[] = [];
    let mathPlaceholderIndex = 0;

    const mathRegexes = [
      /\\\[([\s\S]+?)\\\]/g,
      /\$\$([\s\S]+?)\$\$/g,
      /\\\(([\s\S]+?)\\\)/g,
      /(?<!\\)\$((?!\s)[^$\n]+?(?<!\\))\$/g,
      /<math[\s\S]*?<\/math>/gi
    ];

    for (const regex of mathRegexes) {
      preprocessed = preprocessed.replace(regex, (match) => {
        const placeholder = `MATHPLACEHOLDERID${mathPlaceholderIndex}END`;
        mathBlocks.push(match);
        mathPlaceholderIndex++;
        return placeholder;
      });
    }

    // 6. Restore protected intentional code blocks before marked
    for (let i = 0; i < codeBlockIndex; i++) {
      const placeholder = `CODEBLOCKPLACEHOLDERID${i}END`;
      preprocessed = preprocessed.replace(placeholder, codeBlocks[i]);
    }

    // 7. Run marked parser
    let html = '';
    try {
      html = marked.parse(preprocessed, { breaks: true, gfm: true, async: false }) as string;
    } catch (e) {
      console.warn('marked error', e);
      html = `<pre>${preprocessedMarkdownWithPages}</pre>`;
    }

    // 8. Restore protected math blocks
    for (let i = 0; i < mathPlaceholderIndex; i++) {
      const placeholder = `MATHPLACEHOLDERID${i}END`;
      html = html.split(placeholder).join(mathBlocks[i]);
    }

    // 9. Enhance typography and prose styling
    const enhancedHtml = HtmlEnhancer.enhanceTypography(html);

    // 10. Handle sentence continuations across page breaks
    return PageContinuationHandler.handleSentenceContinuations(enhancedHtml);
  }

  /**
   * Safe HTML content compiler for layout-preserving preview rendering.
   */
  static renderHtmlContent(htmlContent: string, _pdfPages?: PdfPageData[]): string {
    void _pdfPages;
    if (!htmlContent) return '';

    // 1. Compile LaTeX math formulas if any to MathML
    const compiled = MathCompiler.compileLatexToMathML(htmlContent);

    // 2. Interactive Page Break Markers for dual-pane comparison
    const transformedDividers = HtmlEnhancer.transformPageBreakDividers(compiled);

    return PageContinuationHandler.handleSentenceContinuations(transformedDividers);
  }

  /**
   * Automatically adds ellipsis indicators ("...") for paragraph continuations across page breaks.
   */
  static handleSentenceContinuations(html: string): string {
    return PageContinuationHandler.handleSentenceContinuations(html);
  }
}
