/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { PDFDocument } from 'pdf-lib';
import { PdfChunk } from './services/document-processing.service';
import { DocumentStyleProfile, DEFAULT_STYLE_PROFILE, OutputMode } from './header';
import { GeminiApiService } from './services/gemini-api.service';
import { MetaAiService } from './services/meta-ai.service';

export type { OutputMode };

@Injectable({
  providedIn: 'root'
})
export class AiPromptOptimizer {
  private geminiService = inject(GeminiApiService);
  private metaService = inject(MetaAiService);
  private promptCache = new Map<string, string>();

  /**
   * Helper to fetch prompt files directly from /prompts with aggressive cache-busting
   */
  private async fetchFreshPrompt(fileName: string): Promise<string> {
    const cacheBuster = `cb=${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const url = `/prompts/${fileName}?${cacheBuster}`;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      throw new Error(`Không thể tải tệp chỉ dẫn ${fileName} từ thư mục /public/prompts (HTTP ${response.status}).`);
    }

    return await response.text();
  }

  /**
   * Retrieves the prompt template from the public directory without stale browser caching
   */
  async getPromptTemplate(outputMode: OutputMode = 'html'): Promise<string> {
    const fileName = outputMode === 'html' ? 'html_reflow_instructions.md' : 'markdown_reflow_instructions.md';
    return await this.fetchFreshPrompt(fileName);
  }

  /**
   * Retrieves the style analysis prompt template from the public directory without stale browser caching
   */
  async getStyleAnalysisPrompt(): Promise<string> {
    const fileName = 'style_analysis_instructions.md';
    return await this.fetchFreshPrompt(fileName);
  }

  /**
   * Reads a File object and converts it to a clean base64 data string (sans prefix)
   */
  async fileToBase64(file: File): Promise<string> {
    const fileReader = new FileReader();
    const fileBase64Url = await new Promise<string>((resolve, reject) => {
      fileReader.onload = () => resolve(fileReader.result as string);
      fileReader.onerror = reject;
      fileReader.readAsDataURL(file);
    });
    return fileBase64Url.split(',')[1];
  }

  /**
   * Helper to convert Uint8Array into clean base64 string
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Slices a range of pages from the master PDF using pdf-lib and returns as a Base64-encoded PDF
   */
  async splitPdf(file: File, startPageNum: number, endPageNum: number): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const subDoc = await PDFDocument.create();

    const pageCount = srcDoc.getPageCount();
    const pageIndicesToCopy: number[] = [];

    for (let pageNum = startPageNum; pageNum <= endPageNum; pageNum++) {
      const idx = pageNum - 1;
      if (idx >= 0 && idx < pageCount) {
        pageIndicesToCopy.push(idx);
      }
    }

    if (pageIndicesToCopy.length === 0) {
      return this.fileToBase64(file);
    }

    const copiedPages = await subDoc.copyPages(srcDoc, pageIndicesToCopy);
    copiedPages.forEach((page) => subDoc.addPage(page));

    const subPdfBytes = await subDoc.save();
    return this.uint8ArrayToBase64(subPdfBytes);
  }

  /**
   * Builds the strict design token instruction block to inject into system/user prompts
   */
  formatDesignTokensBlock(profile: DocumentStyleProfile): string {
    let h1Size = profile.h1FontSize;
    let h2Size = profile.h2FontSize;
    let h3Size = profile.h3FontSize;

    // Fallbacks if missing
    if (!h1Size || h1Size === '2.1em') {
      if (profile.styleArchetype.includes('Thơ ca') || profile.styleArchetype.includes('Thanh lịch')) {
        h1Size = '2.2em'; h2Size = '1.65em'; h3Size = '1.25em';
      } else if (profile.styleArchetype.includes('Khoa học') || profile.styleArchetype.includes('Kỹ thuật')) {
        h1Size = '1.8em'; h2Size = '1.4em'; h3Size = '1.15em';
      } else if (profile.styleArchetype.includes('Hiện đại') || profile.styleArchetype.includes('Báo chí')) {
        h1Size = '2.4em'; h2Size = '1.75em'; h3Size = '1.3em';
      } else {
        h1Size = '2.0em'; h2Size = '1.5em'; h3Size = '1.2em';
      }
    }

    const sansFonts = ['Be Vietnam Pro', 'Plus Jakarta Sans', 'Inter', 'Montserrat', 'Roboto'];
    const isMono = profile.headingFont === 'JetBrains Mono';
    const isSans = sansFonts.includes(profile.headingFont);
    const headingFontFamily = isMono
      ? `"${profile.headingFont}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
      : isSans
      ? `"${profile.headingFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
      : `"${profile.headingFont}", Georgia, "Times New Roman", Times, serif`;

    return `<document_design_tokens>
ÁP DỤNG QUY CHUẨN THIẾT KẾ ĐỒNG NHẤT CHO TOÀN BỘ TÀI LIỆU:
- Thể loại tài liệu: ${profile.styleArchetype}
- Phông chữ thân bài (bodyFont): "${profile.bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- Phông chữ tiêu đề (headingFont): ${headingFontFamily}
- Cỡ chữ thân bài: ${profile.bodyFontSize}
- Chiều cao dòng (lineHeight): ${profile.lineHeight}
- Căn lề đoạn văn: ${profile.textAlign === 'justify' ? 'justify (căn đều hai bên)' : 'left (căn trái)'}
- Khoảng cách giữa các đoạn: ${profile.paragraphSpacing}
- Hệ thống tiêu đề chuẩn hóa:
  + Cấp 1 (H1): font-size: ${h1Size}; font-weight: ${profile.h1FontWeight || '700'}; font-family: ${headingFontFamily};
  + Cấp 2 (H2): font-size: ${h2Size}; font-weight: ${profile.h2FontWeight || '700'}; font-family: ${headingFontFamily};
  + Cấp 3 (H3): font-size: ${h3Size}; font-weight: ${profile.h3FontWeight || '600'}; font-family: ${headingFontFamily};

* NGUYÊN TẮC BẤT BIẾN KHI XUẤT HTML/CSS:
1. KHÔNG tự ý chèn font lạ nào khác ngoài "${profile.bodyFont}" và "${profile.headingFont}".
2. NGOẠI LỆ DUY NHẤT VỀ PHÔNG CHỮ: Với các chữ Hán hoặc chữ Nôm inline đan xen, BẮT BUỘC ưu tiên bọc trong thẻ <span style="font-family: 'Noto Serif CJK TC', 'Noto Serif CJK SC', 'SimSun', serif; font-size: 0.95em; font-weight: normal; margin: 0 2px;"> như quy định trong chỉ dẫn hệ thống (không áp đặt bodyFont Latin lên chữ Hán/Nôm).
3. KHÔNG tự đặt max-width hoặc chiều rộng cố định cho toàn trang (khung trang chuẩn sẽ do hệ thống quản lý).
4. BẮT BUỘC áp dụng đúng tỷ lệ Heading Scale (${h1Size} > ${h2Size} > ${h3Size}) cho các thẻ tiêu đề để đảm bảo tính đồng nhất giữa tất cả các trang/chunk.
</document_design_tokens>`;
  }

  /**
   * Helper to build sample PDF containing pages from sample chunks
   */
  private async buildSamplePdf(file: File, sampleChunks: PdfChunk[]): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const subDoc = await PDFDocument.create();

    const pageCount = srcDoc.getPageCount();
    const pageIndicesToCopy: number[] = [];

    for (const chunk of sampleChunks) {
      for (let pageNum = chunk.startPageNum; pageNum <= chunk.endPageNum; pageNum++) {
        const idx = pageNum - 1;
        if (idx >= 0 && idx < pageCount && !pageIndicesToCopy.includes(idx)) {
          pageIndicesToCopy.push(idx);
        }
      }
    }

    if (pageIndicesToCopy.length === 0) {
      return this.fileToBase64(file);
    }

    const copiedPages = await subDoc.copyPages(srcDoc, pageIndicesToCopy);
    copiedPages.forEach((page) => subDoc.addPage(page));

    const subPdfBytes = await subDoc.save();
    return this.uint8ArrayToBase64(subPdfBytes);
  }

  /**
   * Analyzes aesthetic typography and layout from sample chunks to generate a DocumentStyleProfile
   */
  async analyzeDocumentStyle(
    apiKey: string,
    modelName: string,
    file: File,
    chunks: PdfChunk[]
  ): Promise<DocumentStyleProfile> {
    if (!chunks || chunks.length === 0) {
      return { ...DEFAULT_STYLE_PROFILE, analyzedAt: Date.now() };
    }

    const sampleIndices: number[] = [];
    const n = chunks.length;
    if (n <= 3) {
      chunks.forEach((_, i) => sampleIndices.push(i));
    } else if (n === 4) {
      sampleIndices.push(0);
      sampleIndices.push(1);
      sampleIndices.push(2);
    } else {
      const mid = Math.floor(n / 2);
      sampleIndices.push(0);
      sampleIndices.push(mid);
      sampleIndices.push(mid + 1);
    }

    const sampleChunks = sampleIndices.map((i) => chunks[i]);
    const analysisPrompt = await this.getStyleAnalysisPrompt();

    const validFonts = [
      'Lora', 'Merriweather', 'EB Garamond', 'Alegreya',
      'Be Vietnam Pro', 'Plus Jakarta Sans', 'Inter', 'Montserrat',
      'Roboto', 'JetBrains Mono'
    ];

    const parseProfileFromJson = (rawText: string): DocumentStyleProfile => {
      let cleanText = rawText;
      if (cleanText.includes('```')) {
        const match = cleanText.match(/```(?:json)?([\s\S]*?)```/i);
        if (match && match[1]) cleanText = match[1].trim();
      }

      const parsed = JSON.parse(cleanText);
      const sansFonts = ['Be Vietnam Pro', 'Plus Jakarta Sans', 'Inter', 'Roboto', 'JetBrains Mono'];
      const bodyFont = (parsed.bodyFont && sansFonts.includes(parsed.bodyFont)) 
        ? parsed.bodyFont 
        : (validFonts.includes(parsed.bodyFont) && !sansFonts.includes(parsed.bodyFont) ? 'Be Vietnam Pro' : 'Be Vietnam Pro');
      const headingFont = validFonts.includes(parsed.headingFont) ? parsed.headingFont : 'Alegreya';

      return {
        bodyFont,
        headingFont,
        bodyFontSize: parsed.bodyFontSize || '18px',
        lineHeight: parsed.lineHeight || '1.7',
        textAlign: parsed.textAlign === 'left' ? 'left' : 'justify',
        paragraphSpacing: parsed.paragraphSpacing || '16px',
        styleArchetype: parsed.styleArchetype || 'Văn bản / Sách tiêu chuẩn',
        h1FontSize: parsed.h1FontSize || '2.1em',
        h1FontWeight: parsed.h1FontWeight || '700',
        h2FontSize: parsed.h2FontSize || '1.6em',
        h2FontWeight: parsed.h2FontWeight || '700',
        h3FontSize: parsed.h3FontSize || '1.3em',
        h3FontWeight: parsed.h3FontWeight || '600',
        analyzedSampleChunks: sampleIndices,
        analyzedAt: Date.now()
      };
    };

    // --- NHÁNH 1: META AI (MUSE) ---
    if (modelName === 'muse-spark-1.2-contributor' || modelName.startsWith('muse-')) {
      const samplePdfBase64 = await this.buildSamplePdf(file, sampleChunks);
      return this.metaService.analyzeDocumentStyle(
        apiKey,
        modelName,
        samplePdfBase64,
        analysisPrompt,
        sampleIndices,
        parseProfileFromJson
      );
    }

    // --- NHÁNH 2: GOOGLE GEMINI ---
    const parts: any[] = [];
    for (const idx of sampleIndices) {
      const sampleChunk = chunks[idx];
      try {
        const pdfBase64 = await this.splitPdf(file, sampleChunk.startPageNum, sampleChunk.endPageNum);
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64
          }
        });
      } catch (err) {
        console.warn(`Không thể trích xuất PDF mẫu cho phần ${idx}:`, err);
      }
    }

    if (parts.length === 0) {
      try {
        const fullBase64 = await this.fileToBase64(file);
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: fullBase64
          }
        });
      } catch (e) {
        console.warn('Không thể nạp file PDF gốc để phân tích phong cách:', e);
        return { ...DEFAULT_STYLE_PROFILE, analyzedSampleChunks: sampleIndices, analyzedAt: Date.now() };
      }
    }

    return this.geminiService.analyzeDocumentStyle(
      apiKey,
      modelName,
      parts,
      analysisPrompt,
      sampleIndices,
      parseProfileFromJson
    );
  }

  /**
   * Prepares the full query parts list and system instruction to send to the Gemini model
   */
  buildMultimodalPayload(
    pdfBase64: string,
    promptText: string,
    chunk: PdfChunk,
    outputMode: OutputMode = 'markdown',
    styleProfile?: DocumentStyleProfile | null
  ): { parts: any[]; systemInstructionText?: string } {
    const parts: any[] = [];

    // 1. Send the sliced PDF document directly
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64
      }
    });

    const systemInstructionText: string | undefined = promptText;

    // 2. Format additional page-range constraints and style tokens
    if (outputMode === 'html') {
      let designTokensBlock = '';
      if (styleProfile) {
        designTokensBlock = `\n\n${this.formatDesignTokensBlock(styleProfile)}\n`;
      }

      const localizedInstructions = `${designTokensBlock}\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT HTML BẢO TOÀN BỐ CỤC): \nTài liệu PDF đính kèm ở trên đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, tái tạo bố cục thị giác, căn lề và chuyển đổi thành mã HTML/CSS sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ HTML NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã HTML ngay dưới đây:`;

      parts.push({ text: localizedInstructions });
    } else {
      const localizedInstructions = `CHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT MARKDOWN TIẾT KIỆM TOKEN): \nTài liệu PDF đính kèm ở trên đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, nối dòng mượt mà và chuyển đổi thành mã Markdown sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC ĐỐI VỚI CHẾ ĐỘ MARKDOWN: Đầu ra phải là một dòng chảy văn bản liền mạch (continuous text flow). Tuyệt đối KHÔNG sử dụng thẻ <!-- PAGE_BREAK: X --> hoặc bất kỳ ký hiệu ngắt trang nào. Đặc biệt chú ý: Nếu một đoạn văn hoặc một câu bị ngắt dở dang ở cuối trang PDF này và nối tiếp ở đầu trang PDF tiếp theo, hãy thông minh tự động nối chúng lại thành một câu/đoạn văn hoàn chỉnh mà không bị ngắt quãng bởi dấu xuống dòng.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ MARKDOWN NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã Markdown ngay dưới đây:`;

      parts.push({ text: localizedInstructions });
    }

    return { parts, systemInstructionText };
  }

  buildMultimodalParts(
    pdfBase64: string,
    promptText: string,
    chunk: PdfChunk,
    outputMode: OutputMode = 'markdown',
    styleProfile?: DocumentStyleProfile | null
  ): any[] {
    return this.buildMultimodalPayload(pdfBase64, promptText, chunk, outputMode, styleProfile).parts;
  }

  /**
   * Executes Content Generation from Gemini API, handles REST transport, and returns optimized Markdown/HTML output and token usage
   */
  async optimizeChunk(
    apiKey: string,
    modelName: string,
    file: File,
    chunk: PdfChunk,
    outputMode: OutputMode = 'markdown',
    styleProfile?: DocumentStyleProfile | null
  ): Promise<{ rawMarkdown: string; inputTokens: number; outputTokens: number }> {
    // Acquire sliced PDF or fallback to original
    let pdfBase64 = '';
    try {
      pdfBase64 = await this.splitPdf(file, chunk.startPageNum, chunk.endPageNum);
    } catch (splitErr) {
      console.warn('Lỗi phân tách PDF bằng pdf-lib, quay lại gửi cả tệp:', splitErr);
      pdfBase64 = await this.fileToBase64(file);
    }

    const basePrompt = await this.getPromptTemplate(outputMode);
    const { parts, systemInstructionText } = this.buildMultimodalPayload(pdfBase64, basePrompt, chunk, outputMode, styleProfile);

    return this.geminiService.optimizeChunk(apiKey, modelName, parts, systemInstructionText);
  }

  /**
   * Executes Content Generation from Meta AI API (https://api.meta.ai/v1/responses),
   * accepts sliced PDF directly in Base64 format and returns optimized Markdown/HTML output
   */
  async optimizeChunkWithMeta(
    apiKey: string,
    modelName: string,
    file: File,
    chunk: PdfChunk,
    outputMode: OutputMode = 'markdown',
    styleProfile?: DocumentStyleProfile | null
  ): Promise<{ rawMarkdown: string; inputTokens: number; outputTokens: number }> {
    // Acquire sliced PDF or fallback to original
    let pdfBase64 = '';
    try {
      pdfBase64 = await this.splitPdf(file, chunk.startPageNum, chunk.endPageNum);
    } catch (splitErr) {
      console.warn('Lỗi phân tách PDF bằng pdf-lib, quay lại gửi cả tệp:', splitErr);
      pdfBase64 = await this.fileToBase64(file);
    }

    const basePrompt = await this.getPromptTemplate(outputMode);

    let systemInstructionText = '';
    let userPromptText = '';

    if (outputMode === 'html') {
      systemInstructionText = basePrompt;

      let designTokensBlock = '';
      if (styleProfile) {
        designTokensBlock = `\n\n${this.formatDesignTokensBlock(styleProfile)}\n`;
      }

      userPromptText = `${designTokensBlock}\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT HTML BẢO TOÀN BỐ CỤC): \nTài liệu PDF đính kèm ở trên đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, tái tạo bố cục thị giác, căn lề và chuyển đổi thành mã HTML/CSS sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ HTML NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã HTML ngay dưới đây:`;
    } else {
      systemInstructionText = basePrompt;
      userPromptText = `CHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT MARKDOWN TIẾT KIỆM TOKEN): \nTài liệu PDF đính kèm ở trên đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, nối dòng mượt mà và chuyển đổi thành mã Markdown sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC ĐỐI VỚI CHẾ ĐỘ MARKDOWN: Đầu ra phải là một dòng chảy văn bản liền mạch (continuous text flow). Tuyệt đối KHÔNG sử dụng thẻ <!-- PAGE_BREAK: X --> hoặc bất kỳ ký hiệu ngắt trang nào. Đặc biệt chú ý: Nếu một đoạn văn hoặc một câu bị ngắt dở dang ở cuối trang PDF này và nối tiếp ở đầu trang PDF tiếp theo, hãy thông minh tự động nối chúng lại thành một câu/đoạn văn hoàn chỉnh mà không bị ngắt quãng bởi dấu xuống dòng.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ MARKDOWN NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã Markdown ngay dưới đây:`;
    }

    return this.metaService.optimizeChunk(
      apiKey,
      modelName,
      pdfBase64,
      chunk,
      systemInstructionText,
      userPromptText
    );
  }
}
