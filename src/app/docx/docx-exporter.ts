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

    /**
     * Parses text that may contain one or more ![IMG-CHUNK...] placeholders
     * and produces an array of Paragraph objects (with text runs and image runs).
     */
    const createParagraphsWithImages = (
      text: string,
      maxImageWidth = 560,
      options?: {
        italics?: boolean;
        color?: string;
        alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
        indent?: { left: number };
        bullet?: { level: number };
        spacing?: { before?: number; after?: number };
      }
    ): Paragraph[] => {
      const imgRegex = /!\[(IMG[-_]CHUNK\d+[-_]\d+|IMG[-_]\d+)\]/gi;
      const paragraphs: Paragraph[] = [];

      if (!imgRegex.test(text)) {
        paragraphs.push(
          new Paragraph({
            children: createElementsFromText(text, options?.italics, options?.color),
            alignment: options?.alignment,
            indent: options?.indent,
            bullet: options?.bullet,
            spacing: options?.spacing || { after: 120 },
          })
        );
        return paragraphs;
      }

      imgRegex.lastIndex = 0;
      let lastStop = 0;
      let match: RegExpExecArray | null;

      while ((match = imgRegex.exec(text)) !== null) {
        const matchIndex = match.index;
        const key = match[1];

        if (matchIndex > lastStop) {
          const preText = text.substring(lastStop, matchIndex).trim();
          if (preText) {
            paragraphs.push(
              new Paragraph({
                children: createElementsFromText(preText, options?.italics, options?.color),
                alignment: options?.alignment,
                indent: options?.indent,
                bullet: options?.bullet,
                spacing: options?.spacing || { after: 120 },
              })
            );
          }
        }

        const imgObj = findImage(key);
        if (imgObj) {
          try {
            let displayWidth = imgObj.width || 400;
            let displayHeight = imgObj.height || 300;

            if (displayWidth > maxImageWidth) {
              const ratio = maxImageWidth / displayWidth;
              displayWidth = maxImageWidth;
              displayHeight = Math.floor(displayHeight * ratio);
            }

            const uint8Arr = convertDataUrlToUint8Array(imgObj.dataUrl);

            paragraphs.push(
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
                spacing: { before: 160, after: 160 },
              })
            );
          } catch {
            paragraphs.push(
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
          paragraphs.push(
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

      if (lastStop < text.length) {
        const postText = text.substring(lastStop).trim();
        if (postText) {
          paragraphs.push(
            new Paragraph({
              children: createElementsFromText(postText, options?.italics, options?.color),
              alignment: options?.alignment,
              indent: options?.indent,
              bullet: options?.bullet,
              spacing: options?.spacing || { after: 120 },
            })
          );
        }
      }

      return paragraphs;
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

      // Page Break Markers from OCR (<!-- PAGE_BREAK: X --> or <!-- PAGE_BREAK -->)
      if (/^<!--\s*PAGE(?:_BREAK)?(?::\s*\d+)?\s*-->$/i.test(trimmedLine)) {
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

      // Thematic Breaks / Section Dividers / Asterisms (* * *, ***, ---, - - -, ___)
      if (/^(?:\s*[*_-]){3,}\s*$/.test(trimmedLine)) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '*   *   *',
                color: '64748B',
                size: 22,
                bold: true,
                font: 'Segoe UI',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240 },
          })
        );
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
          children.push(
            DocxTableBuilder.parseMarkdownTable(tableLines, (cellText, maxW) =>
              createParagraphsWithImages(cellText, maxW, { spacing: { before: 80, after: 80 } })
            )
          );
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
        const quoteParas = createParagraphsWithImages(quoteText, 500, {
          italics: true,
          color: '4B5563',
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
        });
        children.push(...quoteParas);
        idx++;
        continue;
      }

      // Unordered Lists
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('+ ')) {
        const bulletText = trimmedLine.substring(2);
        const listParas = createParagraphsWithImages(bulletText, 500, {
          bullet: { level: 0 },
          spacing: { after: 100 },
        });
        children.push(...listParas);
        idx++;
        continue;
      }

      // Numbered Lists
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        const numStr = numberedMatch[1];
        const ordText = numberedMatch[2];
        const numParas = createParagraphsWithImages(ordText, 500, {
          indent: { left: 720 },
          spacing: { after: 100 },
        });
        // Attach number prefix to the first paragraph
        if (numParas.length > 0) {
          const firstPara = numParas[0];
          (firstPara as any).root = (firstPara as any).root || [];
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
        }
        idx++;
        continue;
      }

      // Standard Paragraph with potential images
      const paras = createParagraphsWithImages(trimmedLine, 560, {
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
      });
      children.push(...paras);

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
