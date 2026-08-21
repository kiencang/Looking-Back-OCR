export class PageContinuationHandler {
  /**
   * Automatically adds ellipsis indicators ("...") for paragraph continuations across page breaks.
   * - Appends "..." to the end of a page's last paragraph if it's an incomplete sentence.
   * - Prepends "... " to the beginning of the next page's first paragraph if it starts with a lowercase letter.
   */
  static handleSentenceContinuations(html: string): string {
    if (!html) return html;

    // Helper to check if a character is a lowercase letter
    const isLowercase = (char: string): boolean => {
      if (!char) return false;
      return char === char.toLowerCase() && char !== char.toUpperCase();
    };

    // Regex to match the page break containers that separate pages
    const pageBreakContainerRegex = /<div id="page-anchor-\d+"[^>]*class="[^"]*ocr-page-break-container[\s\S]*?<\/div>|<div class="ocr-page-break-container[\s\S]*?<\/div>/gi;

    // Split the html into segments of text, keeping the page break dividers intact
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const parts: { isDivider: boolean; text: string }[] = [];

    while ((match = pageBreakContainerRegex.exec(html)) !== null) {
      const dividerStart = match.index;
      const dividerEnd = pageBreakContainerRegex.lastIndex;

      // Extract the page text segment preceding the divider
      const pageText = html.substring(lastIndex, dividerStart);
      parts.push({ isDivider: false, text: pageText });

      // Extract the divider itself
      const dividerText = html.substring(dividerStart, dividerEnd);
      parts.push({ isDivider: true, text: dividerText });

      lastIndex = dividerEnd;
    }

    // Add the remaining text after the final page break divider
    const remainingText = html.substring(lastIndex);
    parts.push({ isDivider: false, text: remainingText });

    // We only want to process non-divider segments
    let segmentIndex = 0;
    const nonDividerCount = parts.filter((p) => !p.isDivider).length;

    const processedParts = parts.map((part) => {
      if (part.isDivider) {
        return part.text;
      }

      let segmentHtml = part.text;
      const currentSegmentIdx = segmentIndex;
      segmentIndex++;

      // 1. First Paragraph Continuation Check (for pages that follow a page break)
      if (currentSegmentIdx > 0) {
        const firstPRegex = /<p([^>]*)>([\s\S]*?)<\/p>/i;
        const firstPMatch = firstPRegex.exec(segmentHtml);

        if (firstPMatch) {
          const firstMatchIndex = firstPMatch.index;
          const firstMatchAttributes = firstPMatch[1];
          const firstMatchText = firstPMatch[2];
          const firstMatchFull = firstPMatch[0];

          // Clean tags inside paragraph text to analyze raw starting character
          const pureText = firstMatchText.replace(/<[^>]*>/g, '').trim();
          if (pureText.length > 0) {
            const firstChar = pureText[0];
            if (isLowercase(firstChar)) {
              // Prepend "... " to indicate continuation from the previous page
              const newParagraph = `<p${firstMatchAttributes}>... ${firstMatchText}</p>`;
              const before = segmentHtml.substring(0, firstMatchIndex);
              const after = segmentHtml.substring(firstMatchIndex + firstMatchFull.length);
              segmentHtml = before + newParagraph + after;
            }
          }
        }
      }

      // 2. Last Paragraph Continuation Check (for pages that precede a page break)
      if (currentSegmentIdx < nonDividerCount - 1) {
        const pRegex = /<p([^>]*)>([\s\S]*?)<\/p>/gi;
        let pMatch: RegExpExecArray | null;
        let lastMatchIndex = -1;
        let lastMatchText = '';
        let lastMatchAttributes = '';
        let lastMatchFull = '';

        // Find the last paragraph in this specific page segment
        while ((pMatch = pRegex.exec(segmentHtml)) !== null) {
          lastMatchIndex = pMatch.index;
          lastMatchAttributes = pMatch[1];
          lastMatchText = pMatch[2];
          lastMatchFull = pMatch[0];
        }

        if (lastMatchIndex !== -1 && lastMatchText) {
          // Strip tags to get clean plain text content
          const pureText = lastMatchText.replace(/<[^>]*>/g, '').trim();

          if (pureText.length > 0) {
            const lastChar = pureText[pureText.length - 1];
            // Punctuation marks that represent complete sentences or quotes
            const sentenceEndings = ['.', '?', '!', ':', '”', '"', ';', '…', '’', ')', ']', '»'];
            const endsInPunctuation = sentenceEndings.includes(lastChar);

            if (!endsInPunctuation) {
              // Append "..." to indicate continuation to the next page
              const newParagraph = `<p${lastMatchAttributes}>${lastMatchText}...</p>`;
              const before = segmentHtml.substring(0, lastMatchIndex);
              const after = segmentHtml.substring(lastMatchIndex + lastMatchFull.length);
              segmentHtml = before + newParagraph + after;
            }
          }
        }
      }

      return segmentHtml;
    });

    return processedParts.join('');
  }
}
