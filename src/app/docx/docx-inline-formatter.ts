/* eslint-disable @typescript-eslint/no-explicit-any */
import { TextRun } from 'docx';
import { tokenizeInline, cleanLatexMath, parseMathML } from './docx-math-parser';

export interface InlineTextOptions {
  italics?: boolean;
  color?: string;
  font?: string;
  size?: number;
}

export function createElementsFromText(
  text: string,
  italics?: boolean,
  color?: string,
  defaultFont = 'Calibri',
  defaultSize = 22
): any[] {
  const tokens = tokenizeInline(text);
  return tokens.map(token => {
    if (token.math) {
      if (token.text.trim().startsWith('<math')) {
        return parseMathML(token.text);
      }
      const unicodeMath = cleanLatexMath(token.text);
      return new TextRun({
        text: ' ' + unicodeMath + ' ',
        italics: true,
        font: 'Cambria',
        size: 22,
        color: '0F172A', // Dark Slate Academic Color
      });
    }

    let textVal = token.text;
    // Strip escaping backslashes like \$ -> $, \* -> *, etc.
    textVal = textVal.replace(/\\([$*#_>`])/g, '$1');

    return new TextRun({
      text: textVal,
      bold: token.bold || undefined,
      italics: italics || token.italic || undefined,
      font: token.code ? 'Consolas' : defaultFont,
      size: token.code ? 19 : defaultSize,
      color: color || (token.code ? 'A855F7' : undefined),
    });
  });
}
