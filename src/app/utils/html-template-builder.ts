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

  const sansFonts = ['Be Vietnam Pro', 'Plus Jakarta Sans', 'Inter', 'Montserrat', 'Roboto'];
  const isHeadingMono = profile.headingFont === 'JetBrains Mono';
  const isHeadingSans = sansFonts.includes(profile.headingFont);
  const headingFontFamily = isHeadingMono
    ? `'${profile.headingFont}', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
    : isHeadingSans
    ? `'${profile.headingFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
    : `'${profile.headingFont}', Georgia, 'Times New Roman', Times, serif`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script>
    window.MathJax = {
      tex: { inlineMath: [['\\\\(', '\\\\)']], displayMath: [['\\\\[', '\\\\]']] },
      svg: { fontCache: 'global' }
    };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,700&family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Noto+Serif+TC:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    /* 1. Reset & Khung trang giấy độc lập (Zero-dependency) */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body { 
      margin: 0;
      padding: 16px;
      background-color: #f8fafc;
      color: #1e293b;
      font-family: '${profile.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: ${profile.bodyFontSize};
      line-height: ${profile.lineHeight};
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }
    .doc-card {
      max-width: 56rem;
      width: 100%;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid #f1f5f9;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      padding: 24px;
    }
    @media (min-width: 768px) {
      body { padding: 48px 24px; }
      .doc-card { padding: 56px 64px; }
    }

    /* 2. Thanh tiêu đề & Nút in */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .doc-title-meta {
      font-size: 0.75rem;
      color: #94a3b8;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .btn-print {
      padding: 6px 14px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }
    .btn-print:hover {
      background-color: #e2e8f0;
      border-color: #cbd5e1;
    }

    /* 3. Typography thuần (thay thế toàn diện cho Tailwind Typography plugin) */
    .doc-content {
      text-align: ${profile.textAlign === 'justify' ? 'justify' : 'left'};
      display: flex;
      flex-direction: column;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: ${headingFontFamily};
      color: #0f172a;
      font-weight: 700;
      line-height: 1.25;
      margin-top: 1.5em;
      margin-bottom: 0.6em;
    }
    h1 { font-size: ${profile.h1FontSize || '2.1em'}; font-weight: ${profile.h1FontWeight || '700'}; }
    h2 { font-size: ${profile.h2FontSize || '1.6em'}; font-weight: ${profile.h2FontWeight || '700'}; }
    h3 { font-size: ${profile.h3FontSize || '1.3em'}; font-weight: ${profile.h3FontWeight || '600'}; }
    h4 { font-size: 1.15em; font-weight: 600; }
    h5 { font-size: 1.05em; font-weight: 600; }
    h6 { font-size: 0.95em; font-weight: 600; }

    p {
      margin-top: 0;
      margin-bottom: ${profile.paragraphSpacing};
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 0.95em;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #0f172a;
    }
    blockquote {
      margin: 24px 0;
      padding: 8px 0 8px 20px;
      border-left: 4px solid #cbd5e1;
      font-style: italic;
      color: #475569;
    }
    ul, ol {
      padding-left: 28px;
      margin: 16px 0;
    }
    li {
      margin-bottom: 6px;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 32px 0;
    }
    code {
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
      font-size: 0.875em;
      background-color: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #0f172a;
    }
    pre {
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
      background-color: #0f172a;
      color: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    mark {
      background-color: #fef08a;
      padding: 0 4px;
      border-radius: 2px;
    }

    /* 4. Định dạng phân cột báo chí & Dòng chảy trang (Multi-column Flow) */
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

    /* 5. Định dạng thụt lề sách truyền thống (Book Indent Style) */
    .book-indent-style p {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      text-indent: 1.5em !important;
    }
    .book-indent-style h1 + p,
    .book-indent-style h2 + p,
    .book-indent-style h3 + p,
    .book-indent-style h4 + p,
    .book-indent-style hr + p,
    .book-indent-style img + p,
    .book-indent-style figure + p,
    .book-indent-style blockquote + p {
      text-indent: 0 !important;
    }

    /* 6. Chống cắt đôi phần tử quan trọng (Atomic Elements) */
    .break-inside-avoid, figure, table, blockquote, img, math, pre {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      -webkit-column-break-inside: avoid !important;
    }

    /* 7. Chú thích chân trang (Footnotes) & Liên kết */
    .footnotes {
      margin-top: 36px;
      border-top: 1px solid #e2e8f0;
      padding-top: 18px;
      font-size: 0.875rem;
      color: #64748b;
    }
    a {
      color: #2563eb;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    a:hover {
      color: #1d4ed8;
    }
    figure {
      margin: 28px auto !important;
      text-align: center !important;
      max-width: 100% !important;
    }
    figcaption {
      margin-top: 8px !important;
      font-size: 0.85em !important;
      color: #64748b !important;
      font-style: italic !important;
      text-align: center !important;
    }

    /* 8. Thanh phân cách trang & Viên thuốc số trang (Page Break Dividers & OCR Page Pills) */
    .ocr-page-break-container {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 12px !important;
      width: 100% !important;
      margin: 32px 0 !important;
      user-select: none !important;
    }
    .ocr-divider-line {
      flex: 1 1 0% !important;
      height: 1px !important;
      border: none !important;
      border-top: 1px dashed #cbd5e1 !important;
    }
    .ocr-page-pill {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      padding: 4px 14px !important;
      background-color: #f1f5f9 !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 9999px !important;
      color: #475569 !important;
      font-size: 11px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      font-weight: 500 !important;
      text-decoration: none !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      cursor: default !important;
    }
    .ocr-page-pill .ocr-page-num {
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #1e293b !important;
      display: inline-flex !important;
      align-items: center !important;
    }
    .ocr-page-pill .ocr-page-label {
      font-size: 10px !important;
      opacity: 0.65 !important;
      display: inline-flex !important;
      align-items: center !important;
    }

    /* 9. Chế độ in ấn sạch sẽ (Print Friendly) */
    @media print {
      .no-print, .ocr-page-break-container { display: none !important; }
      body { background-color: white !important; padding: 0 !important; }
      .doc-card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="doc-card">
    <div class="no-print doc-header">
      <div class="doc-title-meta">${title}${subtitleInfo}</div>
      <button onclick="window.print()" class="btn-print">In tài liệu / Lưu PDF</button>
    </div>
    <article class="doc-content">
      ${options.content}
    </article>
  </div>
</body>
</html>`;
}
