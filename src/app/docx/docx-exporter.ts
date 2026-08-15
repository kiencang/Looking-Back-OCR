/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  PageBreak
} from 'docx';
import { PdfPageData } from '../pdf-processor';
import { MarkdownRenderer } from '../markdown-renderer';
import { createElementsFromText } from './docx-inline-formatter';
import { DocxTableBuilder } from './docx-table-builder';

function convertDataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(';base64,');
  const base64 = parts[parts.length - 1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export class DocxExporter {
  /**
   * Generates a Native Word (.docx) package with embedded binary images,
   * styled paragraphs, beautiful bullet points, code highlights, and tables.
   */
  static async generateDocx(title: string, markdownContent: string, pdfPages: PdfPageData[]): Promise<Blob> {
    const compiledMarkdown = MarkdownRenderer.compileLatexToMathML(markdownContent);
    const allImages: any[] = [];
    pdfPages.forEach(page => {
      if (page.extractedImages) {
        allImages.push(...page.extractedImages);
      }
    });

    const findImage = (key: string) => {
      let img = allImages.find(i => i.labeledKey === key || i.labeledKey?.toLowerCase() === key.toLowerCase());
      if (!img) {
        const indexStr = key.replace(/\D/g, '');
        if (indexStr) {
          const indexVal = parseInt(indexStr, 10) - 1;
          img = allImages[indexVal];
        }
      }
      return img;
    };

    const children: any[] = [];

    const lines = compiledMarkdown.split('\n');
    let idx = 0;

    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    while (idx < lines.length) {
      const line = lines[idx];
      const trimmedLine = line.trim();

      // Code Block Scanner
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          const codeText = codeBlockContent.join('\n');
          children.push(DocxTableBuilder.createCodeBlockTable(codeText));
          inCodeBlock = false;
          codeBlockContent = [];
        } else {
          inCodeBlock = true;
        }
        idx++;
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        idx++;
        continue;
      }

      if (trimmedLine === '') {
        idx++;
        continue;
      }

      // Page Break Markers (<!-- PAGE_BREAK: X --> or <!-- PAGE_BREAK -->)
      if (/^<!--\s*PAGE(?:_BREAK)?(?::\s*\d+)?\s*-->$/i.test(trimmedLine) || trimmedLine === '---' || trimmedLine === '***') {
        // Only insert page break if we already have content (avoid blank initial page)
        if (children.length > 0) {
          children.push(
            new Paragraph({
              children: [new PageBreak()],
            })
          );
        }
        idx++;
        continue;
      }

      // Markdown Tables
      if (trimmedLine.startsWith('|')) {
        const tableLines: string[] = [];
        while (idx < lines.length && lines[idx].trim().startsWith('|')) {
          tableLines.push(lines[idx]);
          idx++;
        }
        try {
          children.push(DocxTableBuilder.parseMarkdownTable(tableLines));
        } catch {
          tableLines.forEach(l => {
            children.push(
              new Paragraph({
                children: [new TextRun(l)],
                spacing: { after: 120 },
              })
            );
          });
        }
        continue;
      }

      // Headings
      if (trimmedLine.startsWith('#')) {
        const levelMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
        if (levelMatch) {
          const depth = levelMatch[1].length;
          const text = levelMatch[2];
          let headingLevel: any = HeadingLevel.HEADING_1;
          let fontSize = 36;
          let color = '1F497D';

          if (depth === 1) {
            headingLevel = HeadingLevel.HEADING_1;
            fontSize = 40; // 20pt
            color = '1F497D';
          } else if (depth === 2) {
            headingLevel = HeadingLevel.HEADING_2;
            fontSize = 32; // 16pt
            color = '2E74B5';
          } else if (depth === 3) {
            headingLevel = HeadingLevel.HEADING_3;
            fontSize = 26; // 13pt
            color = '1F4E79';
          } else {
            headingLevel = HeadingLevel.HEADING_4;
            fontSize = 24; // 12pt
            color = '333333';
          }

          children.push(
            new Paragraph({
              heading: headingLevel,
              children: [
                new TextRun({
                  text: text,
                  bold: true,
                  size: fontSize,
                  color: color,
                  font: 'Segoe UI',
                }),
              ],
              spacing: { before: 240, after: 120 },
            })
          );
          idx++;
          continue;
        }
      }

      // Blockquotes
      if (trimmedLine.startsWith('>')) {
        const quoteText = trimmedLine.replace(/^>\s*/, '');
        children.push(
          new Paragraph({
            children: createElementsFromText(quoteText, true, '4B5563'),
            indent: { left: 720 },
            spacing: { before: 120, after: 120 },
          })
        );
        idx++;
        continue;
      }

      // Unordered Lists
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('+ ')) {
        const bulletText = trimmedLine.substring(2);
        children.push(
          new Paragraph({
            children: createElementsFromText(bulletText),
            bullet: { level: 0 },
            spacing: { after: 100 },
          })
        );
        idx++;
        continue;
      }

      // Numbered Lists
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        const numStr = numberedMatch[1];
        const ordText = numberedMatch[2];
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${numStr}. `,
                bold: true,
                font: 'Calibri',
                size: 22,
              }),
              ...createElementsFromText(ordText),
            ],
            indent: { left: 720 },
            spacing: { after: 100 },
          })
        );
        idx++;
        continue;
      }

      // Image Extraction within Paragraph
      const imgRegex = /!\[(IMG[-_]CHUNK\d+[-_]\d+|IMG[-_]\d+)\]/gi;
      const hasImage = imgRegex.test(trimmedLine);
      if (hasImage) {
        imgRegex.lastIndex = 0;
        let lastStop = 0;
        let match;

        while ((match = imgRegex.exec(trimmedLine)) !== null) {
          const matchIndex = match.index;
          const key = match[1];

          if (matchIndex > lastStop) {
            const preText = trimmedLine.substring(lastStop, matchIndex).trim();
            if (preText) {
              children.push(
                new Paragraph({
                  children: createElementsFromText(preText),
                  spacing: { after: 120 },
                })
              );
            }
          }

          const imgObj = findImage(key);
          if (imgObj) {
            try {
              const maxW = 560;
              let displayWidth = imgObj.width || 400;
              let displayHeight = imgObj.height || 300;

              if (displayWidth > maxW) {
                const ratio = maxW / displayWidth;
                displayWidth = maxW;
                displayHeight = Math.floor(displayHeight * ratio);
              }

              const uint8Arr = convertDataUrlToUint8Array(imgObj.dataUrl);

              children.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: uint8Arr,
                      transformation: {
                        width: displayWidth,
                        height: displayHeight,
                      },
                      type: 'png',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 240, after: 240 },
                })
              );
            } catch {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `[Lỗi hiển thị ảnh: ${key}]`,
                      color: 'EF4444',
                      italics: true,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 120, after: 120 },
                })
              );
            }
          } else {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[Đang tải ảnh: ${key}]`,
                    color: '6B7280',
                    italics: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120 },
              })
            );
          }

          lastStop = imgRegex.lastIndex;
        }

        if (lastStop < trimmedLine.length) {
          const postText = trimmedLine.substring(lastStop).trim();
          if (postText) {
            children.push(
              new Paragraph({
                children: createElementsFromText(postText),
                spacing: { after: 120 },
              })
            );
          }
        }

        idx++;
        continue;
      }

      // Default plain text line
      children.push(
        new Paragraph({
          children: createElementsFromText(trimmedLine),
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
        })
      );

      idx++;
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    return await Packer.toBlob(doc);
  }
}
