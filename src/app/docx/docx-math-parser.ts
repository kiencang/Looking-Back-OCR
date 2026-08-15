/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  XmlComponent,
  BuilderElement,
  MathRun,
  MathFraction,
  MathSubScript,
  MathSuperScript,
  MathSubSuperScript,
  MathRadical,
  MathSum,
  MathIntegral,
  MathRoundBrackets,
  MathCurlyBrackets,
  MathSquareBrackets,
  MathAngledBrackets,
  createMathBase,
  Math as DocxMath
} from 'docx';

export interface InlineToken {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  math: boolean;
  superScript?: boolean;
  subScript?: boolean;
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
  math = false,
  superScript = false,
  subScript = false
): InlineToken[] {
  if (!s) return [];

  if (math) {
    return [{ text: s, bold, italic, code, math: true, superScript, subScript }];
  }

  if (code) {
    return [{ text: s, bold, italic, code, math: false, superScript, subScript }];
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
    nextSuperScript: boolean;
    nextSubScript: boolean;
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
          nextMath: true,
          nextSuperScript: superScript,
          nextSubScript: subScript
        };
        break;
      }
    }

    // 0.1 HTML Superscript: <sup>text</sup>
    if (s.toLowerCase().startsWith('<sup>', i)) {
      const endTag = '</sup>';
      const closerIdx = s.toLowerCase().indexOf(endTag, i + 5);
      if (closerIdx !== -1) {
        bestMatch = {
          tag: '<sup>',
          start: i,
          end: closerIdx + endTag.length - 1,
          inner: s.substring(i + 5, closerIdx),
          nextBold: bold,
          nextItalic: italic,
          nextCode: code,
          nextMath: false,
          nextSuperScript: true,
          nextSubScript: false
        };
        break;
      }
    }

    // 0.2 HTML Subscript: <sub>text</sub>
    if (s.toLowerCase().startsWith('<sub>', i)) {
      const endTag = '</sub>';
      const closerIdx = s.toLowerCase().indexOf(endTag, i + 5);
      if (closerIdx !== -1) {
        bestMatch = {
          tag: '<sub>',
          start: i,
          end: closerIdx + endTag.length - 1,
          inner: s.substring(i + 5, closerIdx),
          nextBold: bold,
          nextItalic: italic,
          nextCode: code,
          nextMath: false,
          nextSuperScript: false,
          nextSubScript: true
        };
        break;
      }
    }

    // 0.3 Markdown Caret Superscript: ^text^
    if (char === '^' && !isWhitespace(s[i + 1])) {
      const closerIdx = s.indexOf('^', i + 1);
      if (closerIdx !== -1 && !isWhitespace(s[closerIdx - 1])) {
        bestMatch = {
          tag: '^',
          start: i,
          end: closerIdx,
          inner: s.substring(i + 1, closerIdx),
          nextBold: bold,
          nextItalic: italic,
          nextCode: code,
          nextMath: false,
          nextSuperScript: true,
          nextSubScript: false
        };
        break;
      }
    }

    // 0.4 Markdown Tilde Subscript: ~text~ (not ~~strike~~)
    if (char === '~' && !s.startsWith('~~', i) && !isWhitespace(s[i + 1])) {
      const closerIdx = s.indexOf('~', i + 1);
      if (closerIdx !== -1 && !s.startsWith('~~', closerIdx) && !isWhitespace(s[closerIdx - 1])) {
        bestMatch = {
          tag: '~',
          start: i,
          end: closerIdx,
          inner: s.substring(i + 1, closerIdx),
          nextBold: bold,
          nextItalic: italic,
          nextCode: code,
          nextMath: false,
          nextSuperScript: false,
          nextSubScript: true
        };
        break;
      }
    }

    // 0.5 Display Math: $$formula$$
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
          nextMath: true,
          nextSuperScript: superScript,
          nextSubScript: subScript
        };
        break;
      }
    }

    // 0.6 Inline Math: $formula$
    if (char === '$' && !s.startsWith('$$', i)) {
      if (i > 0 && s[i - 1] === '\\') {
        // Escaped \$ -> Skip
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
            nextMath: true,
            nextSuperScript: superScript,
            nextSubScript: subScript
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
              nextMath: false,
              nextSuperScript: superScript,
              nextSubScript: subScript
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
              nextMath: false,
              nextSuperScript: superScript,
              nextSubScript: subScript
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
              nextMath: false,
              nextSuperScript: superScript,
              nextSubScript: subScript
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
            nextMath: false,
            nextSuperScript: superScript,
            nextSubScript: subScript
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
            nextMath: false,
            nextSuperScript: superScript,
            nextSubScript: subScript
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
            nextMath: false,
            nextSuperScript: superScript,
            nextSubScript: subScript
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
      tokens.push(...parseRecursive(beforeText, bold, italic, code, false, superScript, subScript));
    }

    tokens.push(...parseRecursive(
      bestMatch.inner,
      bestMatch.nextBold,
      bestMatch.nextItalic,
      bestMatch.nextCode,
      bestMatch.nextMath,
      bestMatch.nextSuperScript,
      bestMatch.nextSubScript
    ));

    if (afterText) {
      tokens.push(...parseRecursive(afterText, bold, italic, code, false, superScript, subScript));
    }

    return tokens;
  }

  return [{ text: s, bold, italic, code, math: false, superScript, subScript }];
}

export function tokenizeInline(text: string): InlineToken[] {
  return parseRecursive(text, false, false, false, false, false, false);
}

export function cleanLatexMath(latex: string): string {
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
  result = result.replace(/\^\{([^}]+)\}/g, (_match, p1) => {
    return p1.split('').map((char: string) => superscriptMap[char] || '^' + char).join('');
  });
  result = result.replace(/\^([0-9a-ixy+-])/g, (_match, p1) => {
    return superscriptMap[p1] || '^' + p1;
  });

  // Convert simple subscripts: e.g. a_n -> aₙ
  result = result.replace(/_\{([^}]+)\}/g, (_match, p1) => {
    return p1.split('').map((char: string) => subscriptMap[char] || '_' + char).join('');
  });
  result = result.replace(/_([0-9a-ixy+-])/g, (_match, p1) => {
    return subscriptMap[p1] || '_' + p1;
  });

  // 6. Clean escaped curly braces: e.g., \{ -> {, \} -> }
  result = result.replace(/\\\{/g, '{');
  result = result.replace(/\\\}/g, '}');

  // Remove other backslashes
  result = result.replace(/\\/g, ''); 

  return result.trim();
}

export class MathCustomDelimiters extends XmlComponent {
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

export function convertNodeToMathComponent(node: Node): any[] {
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

  return Array.from(node.childNodes).flatMap(child => convertNodeToMathComponent(child));
}

export function parseMathML(mathmlString: string): DocxMath {
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
