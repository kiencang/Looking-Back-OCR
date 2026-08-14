/* eslint-disable @typescript-eslint/no-explicit-any */
import { PdfPageData } from './pdf-processor';
import { MarkdownRenderer } from './markdown-renderer';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  BorderStyle,
  WidthType,
  VerticalAlign,
  PageBreak,
  Math as DocxMath,
  MathRun,
  MathFraction,
  MathSuperScript,
  MathSubScript,
  MathSubSuperScript,
  MathRadical,
  MathSum,
  MathIntegral,
  MathRoundBrackets,
  MathCurlyBrackets,
  MathSquareBrackets,
  MathAngledBrackets,
  XmlComponent,
  BuilderElement,
  createMathBase
} from 'docx';

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

interface InlineToken {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  math: boolean;
}

function isAlphanumeric(char: string | undefined): boolean {
  if (!char) return false;
  return /[\p{L}\p{N}]/u.test(char);
}

function parseRecursive(
  s: string,
  bold: boolean,
  italic: boolean,
  code: boolean,
  math = false
): InlineToken[] {
  if (!s) return [];

  if (math) {
    return [{ text: s, bold, italic, code, math: true }];
  }

  if (code) {
    return [{ text: s, bold, italic, code, math: false }];
  }

  let bestMatch: {
    tag: string;
    start: number;
    end: number;
    inner: string;
    nextBold: boolean;
    nextItalic: boolean;
    nextCode: boolean;
    nextMath: boolean;
  } | null = null;

  for (let i = 0; i < s.length; i++) {
    const char = s[i];

    const isWhitespace = (ch: string | undefined) => !ch || ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

    // 0. MathML blocks: <math ...>...</math>
    if (s.toLowerCase().startsWith('<math', i)) {
      const endTag = '</math>';
      const closerIdx = s.toLowerCase().indexOf(endTag, i);
      if (closerIdx !== -1) {
        const fullMathContent = s.substring(i, closerIdx + endTag.length);
        bestMatch = {
          tag: '<math>',
          start: i,
          end: closerIdx + endTag.length - 1,
          inner: fullMathContent,
          nextBold: bold,
          nextItalic: italic,
          nextCode: code,
          nextMath: true
        };
        break;
      }
    }

    // 0. Display Math: $$formula$$
    if (s.startsWith('$$', i)) {
      const closerIdx = s.indexOf('$$', i + 2);
      if (closerIdx !== -1) {
        bestMatch = {
          tag: '$$',
          start: i,
          end: closerIdx + 1,
          inner: s.substring(i + 2, closerIdx),
          nextBold: bold,
          nextItalic: italic,
          nextCode: code,
          nextMath: true
        };
        break;
      }
    }

    // 0.5. Inline Math: $formula$
    if (char === '$' && !s.startsWith('$$', i)) {
      // Ignore escaped \$
      if (i > 0 && s[i - 1] === '\\') {
        // Skip
      } else {
        const closerIdx = s.indexOf('$', i + 1);
        if (closerIdx !== -1) {
          bestMatch = {
            tag: '$',
            start: i,
            end: closerIdx,
            inner: s.substring(i + 1, closerIdx),
            nextBold: bold,
            nextItalic: italic,
            nextCode: code,
            nextMath: true
          };
          break;
        }
      }
    }

    // 1. Inline code: `text`
    if (char === '`') {
      const openerValid = !isWhitespace(s[i + 1]);
      if (openerValid) {
        const closerIdx = s.indexOf('`', i + 1);
        if (closerIdx !== -1) {
          const closerValid = !isWhitespace(s[closerIdx - 1]);
          if (closerValid) {
            bestMatch = {
              tag: '`',
              start: i,
              end: closerIdx,
              inner: s.substring(i + 1, closerIdx),
              nextBold: bold,
              nextItalic: italic,
              nextCode: true,
              nextMath: false
            };
            break;
          }
        }
      }
    }

    // 2. Bold-Italic: ***text***
    if (s.startsWith('***', i)) {
      const openerValid = !isWhitespace(s[i + 3]);
      if (openerValid) {
        let closerIdx = -1;
        for (let k = i + 3; k <= s.length - 3; k++) {
          if (s.startsWith('***', k)) {
            closerIdx = k;
            break;
          }
        }
        if (closerIdx !== -1) {
          const closerValid = !isWhitespace(s[closerIdx - 1]);
          if (closerValid) {
            bestMatch = {
              tag: '***',
              start: i,
              end: closerIdx + 2,
              inner: s.substring(i + 3, closerIdx),
              nextBold: true,
              nextItalic: true,
              nextCode: code,
              nextMath: false
            };
            break;
          }
        }
      }
    }

    // 3. Bold: **text**
    if (s.startsWith('**', i)) {
      const openerValid = !isWhitespace(s[i + 2]);
      if (openerValid) {
        let closerIdx = -1;
        for (let k = i + 2; k <= s.length - 2; k++) {
          if (s.startsWith('**', k) && !s.startsWith('***', k)) {
            closerIdx = k;
            break;
          }
        }
        if (closerIdx !== -1) {
          const closerValid = !isWhitespace(s[closerIdx - 1]);
          if (closerValid) {
            bestMatch = {
              tag: '**',
              start: i,
              end: closerIdx + 1,
              inner: s.substring(i + 2, closerIdx),
              nextBold: true,
              nextItalic: italic,
              nextCode: code,
              nextMath: false
            };
            break;
          }
        }
      }
    }

    // 4. Bold Underscore: __text__
    if (s.startsWith('__', i)) {
      const openerValid = !isWhitespace(s[i + 2]) && !isAlphanumeric(s[i - 1]);
      if (openerValid) {
        let closerIdx = -1;
        for (let k = i + 2; k <= s.length - 2; k++) {
          if (s.startsWith('__', k)) {
            const closerValid = !isWhitespace(s[k - 1]) && !isAlphanumeric(s[k + 2]);
            if (closerValid) {
              closerIdx = k;
              break;
            }
          }
        }
        if (closerIdx !== -1) {
          bestMatch = {
            tag: '__',
            start: i,
            end: closerIdx + 1,
            inner: s.substring(i + 2, closerIdx),
            nextBold: true,
            nextItalic: italic,
            nextCode: code,
            nextMath: false
          };
          break;
        }
      }
    }

    // 5. Italic: *text*
    if (char === '*' && !s.startsWith('**', i) && !s.startsWith('***', i)) {
      const openerValid = !isWhitespace(s[i + 1]);
      if (openerValid) {
        let closerIdx = -1;
        for (let k = i + 1; k < s.length; k++) {
          if (s[k] === '*' && !s.startsWith('**', k) && !s.startsWith('***', k - 1)) {
            const closerValid = !isWhitespace(s[k - 1]);
            if (closerValid) {
              closerIdx = k;
              break;
            }
          }
        }
        if (closerIdx !== -1) {
          bestMatch = {
            tag: '*',
            start: i,
            end: closerIdx,
            inner: s.substring(i + 1, closerIdx),
            nextBold: bold,
            nextItalic: true,
            nextCode: code,
            nextMath: false
          };
          break;
        }
      }
    }

    // 6. Italic Underscore: _text_
    if (char === '_' && !s.startsWith('__', i)) {
      const openerValid = !isWhitespace(s[i + 1]) && !isAlphanumeric(s[i - 1]);
      if (openerValid) {
        let closerIdx = -1;
        for (let k = i + 1; k < s.length; k++) {
          if (s[k] === '_' && !s.startsWith('__', k)) {
            const closerValid = !isWhitespace(s[k - 1]) && !isAlphanumeric(s[k + 1]);
            if (closerValid) {
              closerIdx = k;
              break;
            }
          }
        }
        if (closerIdx !== -1) {
          bestMatch = {
            tag: '_',
            start: i,
            end: closerIdx,
            inner: s.substring(i + 1, closerIdx),
            nextBold: bold,
            nextItalic: true,
            nextCode: code,
            nextMath: false
          };
          break;
        }
      }
    }
  }

  if (bestMatch) {
    const beforeText = s.substring(0, bestMatch.start);
    const afterText = s.substring(bestMatch.end + 1);

    const tokens: InlineToken[] = [];
    if (beforeText) {
      tokens.push(...parseRecursive(beforeText, bold, italic, code, false));
    }

    tokens.push(...parseRecursive(bestMatch.inner, bestMatch.nextBold, bestMatch.nextItalic, bestMatch.nextCode, bestMatch.nextMath));

    if (afterText) {
      tokens.push(...parseRecursive(afterText, bold, italic, code, false));
    }

    return tokens;
  }

  return [{ text: s, bold, italic, code, math: false }];
}

export function tokenizeInline(text: string): InlineToken[] {
  return parseRecursive(text, false, false, false, false);
}

function cleanLatexMath(latex: string): string {
  let result = latex;

  // 1. Text wrapping inside LaTeX: \text{something} -> something
  result = result.replace(/\\text\s*\{([^}]+)\}/g, '$1');

  // 2. Blackboard bold math sets
  result = result.replace(/\\mathbb\s*\{\s*N\s*\}/g, 'ℕ');
  result = result.replace(/\\mathbb\s*\{\s*Z\s*\}/g, 'ℤ');
  result = result.replace(/\\mathbb\s*\{\s*R\s*\}/g, 'ℝ');
  result = result.replace(/\\mathbb\s*\{\s*Q\s*\}/g, 'ℚ');
  result = result.replace(/\\mathbb\s*\{\s*C\s*\}/g, 'ℂ');
  result = result.replace(/\\mathbb\s+N\b/g, 'ℕ');
  result = result.replace(/\\mathbb\s+Z\b/g, 'ℤ');
  result = result.replace(/\\mathbb\s+R\b/g, 'ℝ');
  result = result.replace(/\\mathbb\s+Q\b/g, 'ℚ');
  result = result.replace(/\\mathbb\s+C\b/g, 'ℂ');

  // 3. Common mathematical symbols
  result = result.replace(/\\in\b/g, '∈');
  result = result.replace(/\\notin\b/g, '∉');
  result = result.replace(/\\varnothing\b/g, '∅');
  result = result.replace(/\\emptyset\b/g, '∅');
  result = result.replace(/\\empty\b/g, '∅');
  result = result.replace(/\\leq\b/g, '≤');
  result = result.replace(/\\geq\b/g, '≥');
  result = result.replace(/\\le\b/g, '≤');
  result = result.replace(/\\ge\b/g, '≥');
  result = result.replace(/\\neq\b/g, '≠');
  result = result.replace(/\\ne\b/g, '≠');
  result = result.replace(/\\approx\b/g, '≈');
  result = result.replace(/\\pm\b/g, '±');
  result = result.replace(/\\times\b/g, '×');
  result = result.replace(/\\cdot\b/g, '•');
  result = result.replace(/\\div\b/g, '÷');
  result = result.replace(/\\infty\b/g, '∞');
  result = result.replace(/\\alpha\b/g, 'α');
  result = result.replace(/\\beta\b/g, 'β');
  result = result.replace(/\\theta\b/g, 'θ');
  result = result.replace(/\\pi\b/g, 'π');

  // 4. Square roots: \sqrt{x} -> √x or \sqrt{2} -> √2
  result = result.replace(/\\sqrt\s*\{([^}]+)\}/g, '√$1');
  result = result.replace(/\\sqrt\s*([0-9a-zA-Z]+)/g, '√$1');

  // 5. Unpack superscript / subscript symbols to unicode superscript / subscript characters
  const superscriptMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', 
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ'
  };
  const subscriptMap: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', 
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'n': 'ₙ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'x': 'ₓ', 'y': 'ʸ'
  };

  // Convert simple superscripts: e.g. x^2 -> x²
  result = result.replace(/\^\{([^}]+)\}/g, (match, p1) => {
    return p1.split('').map((char: string) => superscriptMap[char] || '^' + char).join('');
  });
  result = result.replace(/\^([0-9a-ixy+-])/g, (match, p1) => {
    return superscriptMap[p1] || '^' + p1;
  });

  // Convert simple subscripts: e.g. a_n -> aₙ
  result = result.replace(/_\{([^}]+)\}/g, (match, p1) => {
    return p1.split('').map((char: string) => subscriptMap[char] || '_' + char).join('');
  });
  result = result.replace(/_([0-9a-ixy+-])/g, (match, p1) => {
    return subscriptMap[p1] || '_' + p1;
  });

  // 6. Clean escaped curly braces: e.g., \{ -> {, \} -> }
  result = result.replace(/\\\{/g, '{');
  result = result.replace(/\\\}/g, '}');

  // Remove other backslashes
  result = result.replace(/\\/g, ''); 

  return result.trim();
}

class MathCustomDelimiters extends XmlComponent {
  constructor(options: { children: any[], open: string, close: string }) {
    super("m:d");
    
    // Create custom beginning character element
    const begChr = new BuilderElement({
      name: "m:begChr",
      attributes: {
        character: {
          key: "m:val",
          value: options.open
        }
      }
    });

    // Create custom ending character element
    const endChr = new BuilderElement({
      name: "m:endChr",
      attributes: {
        character: {
          key: "m:val",
          value: options.close
        }
      }
    });

    // Create delimiter properties wrapping these characters
    const dPr = new BuilderElement({
      name: "m:dPr",
      children: [begChr, endChr]
    });

    this.root.push(dPr);
    this.root.push(createMathBase({ children: options.children }));
  }
}

function convertNodeToMathComponent(node: Node): any[] {
  if (node.nodeType === 3) { // TEXT_NODE
    const t = node.textContent?.trim() || '';
    if (t) {
      return [new MathRun(t)];
    }
    return [];
  }

  if (node.nodeType !== 1) { // Not an ELEMENT_NODE
    return [];
  }

  const tagName = (node as Element).tagName?.toLowerCase();
  
  const getChildElements = (n: Node): Element[] => 
    Array.from(n.childNodes).filter(c => c.nodeType === 1) as Element[];

  if (tagName === 'mi' || tagName === 'mn' || tagName === 'mo' || tagName === 'mtext') {
    const text = node.textContent || '';
    if (text === '\u2062' || text === '\u2061') { // Skip invisible operators
      return [];
    }
    return [new MathRun(text)];
  }

  if (tagName === 'mrow') {
    return Array.from(node.childNodes).flatMap(child => convertNodeToMathComponent(child));
  }

  if (tagName === 'mfrac') {
    const children = getChildElements(node);
    const numComponents = children[0] ? Array.from(children[0].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    const denComponents = children[1] ? Array.from(children[1].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    return [new MathFraction({ numerator: numComponents, denominator: denComponents })];
  }

  if (tagName === 'msub') {
    const children = getChildElements(node);
    const baseComponents = children[0] ? Array.from(children[0].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    const subComponents = children[1] ? Array.from(children[1].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    return [new MathSubScript({ children: baseComponents, subScript: subComponents })];
  }

  if (tagName === 'msup') {
    const children = getChildElements(node);
    const baseComponents = children[0] ? Array.from(children[0].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    const supComponents = children[1] ? Array.from(children[1].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    return [new MathSuperScript({ children: baseComponents, superScript: supComponents })];
  }

  if (tagName === 'msubsup') {
    const children = getChildElements(node);
    const baseComponents = children[0] ? Array.from(children[0].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    const subComponents = children[1] ? Array.from(children[1].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    const supComponents = children[2] ? Array.from(children[2].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    return [new MathSubSuperScript({ children: baseComponents, subScript: subComponents, superScript: supComponents })];
  }

  if (tagName === 'msqrt') {
    const innerComponents = Array.from(node.childNodes).flatMap(child => convertNodeToMathComponent(child));
    return [new MathRadical({ children: innerComponents })];
  }

  if (tagName === 'mroot') {
    const children = getChildElements(node);
    const baseComponents = children[0] ? Array.from(children[0].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    const degComponents = children[1] ? Array.from(children[1].childNodes).flatMap(child => convertNodeToMathComponent(child)) : [];
    return [new MathRadical({ children: baseComponents, degree: degComponents })];
  }

  if (tagName === 'mover' || tagName === 'munder' || tagName === 'munderover') {
    const children = getChildElements(node);
    const baseNode = children[0];
    const underNode = tagName === 'mover' ? undefined : children[1];
    const overNode = tagName === 'mover' ? children[1] : children[2];
    
    const baseText = baseNode?.textContent || '';
    const isSum = baseText.includes('∑') || baseText.toLowerCase().includes('sum') || baseText.includes('\u2211');
    const isIntegral = baseText.includes('∫') || baseText.toLowerCase().includes('int') || baseText.includes('\u222b');
    
    const baseComponents = baseNode ? Array.from(baseNode.childNodes).flatMap(c => convertNodeToMathComponent(c)) : [];
    const subComponents = underNode ? Array.from(underNode.childNodes).flatMap(c => convertNodeToMathComponent(c)) : [];
    const supComponents = overNode ? Array.from(overNode.childNodes).flatMap(c => convertNodeToMathComponent(c)) : [];
    
    if (isSum) {
      return [new MathSum({
        children: baseComponents,
        subScript: subComponents.length ? subComponents : undefined,
        superScript: supComponents.length ? supComponents : undefined
      })];
    }
    
    if (isIntegral) {
      return [new MathIntegral({
        children: baseComponents,
        subScript: subComponents.length ? subComponents : undefined,
        superScript: supComponents.length ? supComponents : undefined
      })];
    }
    
    if (overNode && underNode) {
      return [new MathSubSuperScript({ children: baseComponents, subScript: subComponents, superScript: supComponents })];
    } else if (overNode) {
      return [new MathSuperScript({ children: baseComponents, superScript: supComponents })];
    } else if (underNode) {
      return [new MathSubScript({ children: baseComponents, subScript: subComponents })];
    }
    return baseComponents;
  }

  if (tagName === 'mfenced') {
    const openAttr = (node as Element).getAttribute?.('open') || '(';
    const closeAttr = (node as Element).getAttribute?.('close') || ')';
    const innerComponents = Array.from(node.childNodes).flatMap(c => convertNodeToMathComponent(c));
    
    if (openAttr === '{' && closeAttr === '}') {
      return [new MathCurlyBrackets({ children: innerComponents })];
    } else if (openAttr === '[' && closeAttr === ']') {
      return [new MathSquareBrackets({ children: innerComponents })];
    } else if (openAttr === '<' && closeAttr === '>') {
      return [new MathAngledBrackets({ children: innerComponents })];
    } else if (openAttr === '(' && closeAttr === ')') {
      return [new MathRoundBrackets({ children: innerComponents })];
    } else {
      // Dùng khối delimiter tùy chỉnh cho các dấu đặc biệt như giá trị tuyệt đối |a| hay chuẩn ||x||, vv.
      return [new MathCustomDelimiters({ children: innerComponents, open: openAttr, close: closeAttr })];
    }
  }

  if (tagName === 'mtable') {
    const rows = getChildElements(node).filter(n => n.tagName?.toLowerCase() === 'mtr');
    const allComponents: any[] = [];
    
    rows.forEach((rowNode, rIdx) => {
      const cells = getChildElements(rowNode).filter(n => n.tagName?.toLowerCase() === 'mtd');
      cells.forEach((cellNode, cIdx) => {
        const cellComponents = Array.from(cellNode.childNodes).flatMap(c => convertNodeToMathComponent(c));
        allComponents.push(...cellComponents);
        if (cIdx < cells.length - 1) {
          allComponents.push(new MathRun('    '));
        }
      });
      if (rIdx < rows.length - 1) {
        allComponents.push(new MathRun('\n'));
      }
    });

    return allComponents;
  }

  // Fallback unpacking for custom styled/styling wrappers
  return Array.from(node.childNodes).flatMap(child => convertNodeToMathComponent(child));
}

function parseMathML(mathmlString: string): DocxMath {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(mathmlString, 'text/html');
    const mathNode = doc.querySelector('math');
    if (!mathNode) {
      return new DocxMath({ children: [new MathRun(mathmlString)] });
    }
    const children = Array.from(mathNode.childNodes).flatMap(node => convertNodeToMathComponent(node));
    return new DocxMath({ children });
  } catch (err) {
    console.error('Lỗi khi parse MathML:', err);
    return new DocxMath({ children: [new MathRun(mathmlString.replace(/<[^>]+>/g, ''))] });
  }
}

function createElementsFromText(text: string, italics?: boolean, color?: string): any[] {
  const tokens = tokenizeInline(text);
  return tokens.map(token => {
    if (token.math) {
      if (token.text.trim().startsWith('<math')) {
        return parseMathML(token.text);
      }
      const unicodeMath = cleanLatexMath(token.text);
      return new TextRun({
        text: " " + unicodeMath + " ",
        italics: true,
        font: "Cambria",
        size: 22,
        color: "0F172A", // Dark Slate Color representing premium academic styling
      });
    }

    let textVal = token.text;
    // Strip escaping backslashes like \$ -> $, \* -> *, etc defined in rules
    textVal = textVal.replace(/\\([$*#_>`])/g, '$1');

    return new TextRun({
      text: textVal,
      bold: token.bold || undefined,
      italics: italics || token.italic || undefined,
      font: token.code ? "Consolas" : "Calibri",
      size: token.code ? 19 : 22, // Calibri 11pt stands for docx size 22
      color: color || (token.code ? "A855F7" : undefined), // slate code color
    });
  });
}

function parseMarkdownTable(tableLines: string[]): Table {
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
      return new TableCell({
        children: [
          new Paragraph({
            children: createElementsFromText(colText),
            spacing: { before: 80, after: 80 },
          }),
        ],
        shading: rIndex === 0 ? { fill: "F2F5F9" } : undefined, // elegant light header shading
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
      top: { style: BorderStyle.SINGLE, size: 8, color: "D1D5DB" },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "D1D5DB" },
      left: { style: BorderStyle.SINGLE, size: 8, color: "D1D5DB" },
      right: { style: BorderStyle.SINGLE, size: 8, color: "D1D5DB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
    },
    rows: parsedRows,
  });
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
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
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
                              font: "Consolas",
                              size: 19, // ~9.5pt
                              color: "374151",
                            }),
                          ],
                          spacing: { before: 120, after: 120 },
                        }),
                      ],
                      shading: { fill: "F3F4F6" },
                    }),
                  ],
                }),
              ],
            })
          );
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
          children.push(parseMarkdownTable(tableLines));
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
          let color = "1F497D";

          if (depth === 1) {
            headingLevel = HeadingLevel.HEADING_1;
            fontSize = 40; // 20pt
            color = "1F497D";
          } else if (depth === 2) {
            headingLevel = HeadingLevel.HEADING_2;
            fontSize = 32; // 16pt
            color = "2E74B5";
          } else if (depth === 3) {
            headingLevel = HeadingLevel.HEADING_3;
            fontSize = 26; // 13pt
            color = "1F4E79";
          } else {
            headingLevel = HeadingLevel.HEADING_4;
            fontSize = 24; // 12pt
            color = "333333";
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
                  font: "Segoe UI",
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
            children: createElementsFromText(quoteText, true, "4B5563"),
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
                font: "Calibri",
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
                      type: "png",
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
                      color: "EF4444",
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
                    color: "6B7280",
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
