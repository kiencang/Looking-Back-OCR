import {
  Table,
  TableRow,
  TableCell,
  Paragraph,
  WidthType,
  BorderStyle,
  VerticalAlign,
  TextRun
} from 'docx';
import { createElementsFromText } from './docx-inline-formatter';

export class DocxTableBuilder {
  /**
   * Parses Markdown table lines and converts them into a native docx Table,
   * supporting embedded images and formatted text inside table cells.
   */
  static parseMarkdownTable(
    tableLines: string[],
    createCellParagraphs?: (text: string, maxImageWidth?: number) => Paragraph[]
  ): Table {
    const rowsData = tableLines.filter(line => {
      const clean = line.trim();
      if (/^[|:\-\s]+$/.test(clean)) return false;
      return true;
    });

    const parsedRows: TableRow[] = [];

    for (let rIndex = 0; rIndex < rowsData.length; rIndex++) {
      const line = rowsData[rIndex];
      const cols = line.split('|').map(s => s.trim());
      if (line.startsWith('|')) cols.shift();
      if (line.endsWith('|')) cols.pop();

      const cells = cols.map(colText => {
        let cellParagraphs: Paragraph[];
        if (createCellParagraphs) {
          // Table cell max image width (e.g. 240px) to fit nicely in columns
          cellParagraphs = createCellParagraphs(colText, 240);
        } else {
          cellParagraphs = [
            new Paragraph({
              children: createElementsFromText(colText),
              spacing: { before: 80, after: 80 },
            }),
          ];
        }

        if (cellParagraphs.length === 0) {
          cellParagraphs = [new Paragraph({ children: [] })];
        }

        return new TableCell({
          children: cellParagraphs,
          shading: rIndex === 0 ? { fill: 'F2F5F9' } : undefined, // Light elegant header shading
          verticalAlign: VerticalAlign.CENTER,
        });
      });

      parsedRows.push(new TableRow({ children: cells }));
    }

    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 8, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 8, color: 'D1D5DB' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
      },
      rows: parsedRows,
    });
  }

  /**
   * Generates a stylized Table block for Markdown fenced code blocks
   */
  static createCodeBlockTable(codeText: string): Table {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: codeText,
                      font: 'Consolas',
                      size: 19, // ~9.5pt
                      color: '374151',
                    }),
                  ],
                  spacing: { before: 120, after: 120 },
                }),
              ],
              shading: { fill: 'F3F4F6' },
            }),
          ],
        }),
      ],
    });
  }
}
