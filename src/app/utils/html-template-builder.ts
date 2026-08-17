import { DocumentStyleProfile, DEFAULT_STYLE_PROFILE } from '../header';

export interface HtmlTemplateOptions {
  title: string;
  content: string;
  profile?: DocumentStyleProfile;
  subtitle?: string;
}

export function generateHtmlDocument(options: HtmlTemplateOptions): string {
  const profile = options.profile || DEFAULT_STYLE_PROFILE;
  const title = options.title || 'Tai Lieu';
  const subtitleInfo = options.subtitle ? ` (${options.subtitle})` : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  <script>
    window.MathJax = {
      tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
      svg: { fontCache: 'global' }
    };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Noto+Serif+TC:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: '${profile.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${profile.bodyFontSize};
      line-height: ${profile.lineHeight};
      color: #1e293b;
      background-color: #f8fafc;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${profile.headingFont}', Georgia, serif;
    }
    .multi-column-flow, [style*="column-count"], [style*="columns:"], [class*="columns-"] {
      column-fill: balance !important;
      -webkit-column-fill: balance !important;
      hyphens: auto !important;
      -webkit-hyphens: auto !important;
    }
    .multi-column-flow p, [style*="column-count"] p, [style*="columns:"] p, [class*="columns-"] p {
      orphans: 1 !important;
      widows: 1 !important;
      break-inside: auto !important;
      -webkit-column-break-inside: auto !important;
      margin-top: 0 !important;
      margin-bottom: 1lh !important;
    }
    .book-indent-style p {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      text-indent: 1.5em !important;
    }
    .book-indent-style h1 + p, .book-indent-style h2 + p, .book-indent-style h3 + p, .book-indent-style img + p {
      text-indent: 0 !important;
    }
    .break-inside-avoid, figure, table, blockquote, img, math, pre {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      -webkit-column-break-inside: avoid !important;
    }
    @media print {
      .no-print { display: none !important; }
      body { background-color: white !important; padding: 0 !important; }
      .print-shadow-none { box-shadow: none !important; border: none !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 p-4 md:p-12 min-h-screen flex items-start justify-center">
  <div class="max-w-4xl w-full mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-16 print-shadow-none">
    <div class="no-print flex justify-between items-center mb-8 border-b pb-4 border-slate-100">
      <div class="text-xs text-slate-400 font-mono">${title}${subtitleInfo}</div>
      <button onclick="window.print()" class="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">In tài liệu / Lưu PDF</button>
    </div>
    <article class="prose max-w-none ${profile.textAlign === 'justify' ? 'text-justify' : 'text-left'} flex flex-col">
      ${options.content}
    </article>
  </div>
</body>
</html>`;
}
