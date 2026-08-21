import katex from 'katex';

export class MathCompiler {
  /**
   * Compiles LaTeX formulas ($...$, $$...$$, \(...\), \[...\]) into standard MathML tags.
   */
  static compileLatexToMathML(markdown: string): string {
    if (!markdown) return '';

    let compiled = markdown;

    // 1. Process block math: \[ formula \] and $$ formula $$
    const blockRegexes = [
      { regex: /\\\[([\s\S]+?)\\\]/g, open: '\\[', close: '\\]' },
      { regex: /\$\$([\s\S]+?)\$\$/g, open: '$$', close: '$$' }
    ];

    for (const item of blockRegexes) {
      compiled = compiled.replace(item.regex, (_match, formula) => {
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
          return `<span class="math-fallback-block font-mono text-indigo-400 block my-2 text-center select-all">${item.open} ${formula.trim()} ${item.close}</span>`;
        }
      });
    }

    // 2. Process inline math: \( formula \) and $ formula $
    const inlineRegexes = [
      { regex: /\\\(([\s\S]+?)\\\)/g, open: '\\(', close: '\\)' },
      { regex: /(?<!\\)\$((?!\s)[^$\n]+?(?<!\\))\$/g, open: '$', close: '$' }
    ];

    for (const item of inlineRegexes) {
      compiled = compiled.replace(item.regex, (_match, formula) => {
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
          return `<code class="math-fallback-inline text-indigo-400 bg-slate-950/40 px-1 rounded select-all">${item.open}${formula.trim()}${item.close}</code>`;
        }
      });
    }

    return compiled;
  }
}
