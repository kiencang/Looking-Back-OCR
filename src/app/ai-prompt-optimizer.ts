/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { PDFDocument } from 'pdf-lib';
import { PdfChunk } from './services/document-processing.service';
import { DocumentStyleProfile, DEFAULT_STYLE_PROFILE, OutputMode } from './header';

export type { OutputMode };

@Injectable({
  providedIn: 'root'
})
export class AiPromptOptimizer {
  private promptCache = new Map<string, string>();

  /**
   * Retrieves the prompt template from the public directory with in-memory caching
   */
  async getPromptTemplate(outputMode: OutputMode = 'html'): Promise<string> {
    const fileName = outputMode === 'html' ? 'html_reflow_instructions.md' : 'markdown_reflow_instructions.md';
    if (this.promptCache.has(fileName)) {
      return this.promptCache.get(fileName)!;
    }
    const response = await fetch(`/prompts/${fileName}`);
    if (!response.ok) {
      throw new Error(`Không thể tải tệp chỉ dẫn ${fileName} từ thư mục /public/prompts.`);
    }
    const text = await response.text();
    this.promptCache.set(fileName, text);
    return text;
  }

  /**
   * Retrieves the style analysis prompt template from the public directory with in-memory caching
   */
  async getStyleAnalysisPrompt(): Promise<string> {
    const fileName = 'style_analysis_instructions.md';
    if (this.promptCache.has(fileName)) {
      return this.promptCache.get(fileName)!;
    }
    const response = await fetch(`/prompts/${fileName}`);
    if (!response.ok) {
      throw new Error(`Không thể tải tệp chỉ dẫn ${fileName} từ thư mục /public/prompts.`);
    }
    const text = await response.text();
    this.promptCache.set(fileName, text);
    return text;
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
   * Helper function to convert Uint8Array back to Base64 in standard client-side sandbox
   */
  async uint8ArrayToBase64(arr: Uint8Array): Promise<string> {
    const blob = new Blob([arr as any], { type: 'application/pdf' });
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Extracts a specific range of pages (1-indexed) and builds a sliced PDF file (Base64)
   */
  async splitPdf(file: File, startPage: number, endPage: number): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load source document
    const srcDoc = await PDFDocument.load(arrayBuffer);
    
    // Create new sliced document
    const subDoc = await PDFDocument.create();
    
    const pageIndices: number[] = [];
    const pageCount = srcDoc.getPageCount();
    
    for (let i = startPage; i <= endPage; i++) {
      if (i - 1 >= 0 && i - 1 < pageCount) {
        pageIndices.push(i - 1);
      }
    }
    
    if (pageIndices.length === 0) {
      throw new Error(`Khoảng trang ${startPage} - ${endPage} không hợp lệ.`);
    }
    
    // Copy and append pages
    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => subDoc.addPage(page));
    
    const subPdfBytes = await subDoc.save();
    return this.uint8ArrayToBase64(subPdfBytes);
  }

  /**
   * Formats unified design tokens block in XML format to strictly constrain chunk typography & layout
   */
  formatDesignTokensBlock(profile: DocumentStyleProfile): string {
    const isSerif = ['Lora', 'Merriweather', 'EB Garamond', 'Playfair Display'].includes(profile.bodyFont);
    const bodyFontStack = isSerif ? `"${profile.bodyFont}", Georgia, serif` : `"${profile.bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const isHeadingSerif = ['Playfair Display', 'Lora', 'EB Garamond', 'Merriweather'].includes(profile.headingFont);
    const headingFontStack = isHeadingSerif 
      ? `"${profile.headingFont}", Georgia, serif` 
      : `"${profile.headingFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    return `<document_design_tokens>
BỘ QUY CHUẨN THIẾT KẾ ĐÃ ĐƯỢC XÁC LẬP CHO TOÀN BỘ CUỐN SÁCH (BẮT BUỘC TUÂN THỦ 100%):
- Loại hình tài liệu: ${profile.styleArchetype}
- Phông chữ nội dung chính (Body Font): ${bodyFontStack} (BẮT BUỘC dùng cho toàn bộ thẻ <p>, <li>, <td>, <dd>, văn xuôi).
- Phông chữ tiêu đề (Heading Font): ${headingFontStack} (BẮT BUỘC dùng cho các thẻ <h1>, <h2>, <h3>, <h4>, <h5>, <h6>).
- Cỡ chữ nội dung chính (Body Size): ${profile.bodyFontSize} (Mọi đoạn văn xuôi bắt buộc dùng đúng cỡ này, không tự ý thay đổi).
- Độ giãn dòng (Line Height): ${profile.lineHeight}
- Căn lề văn bản (Text Align): ${profile.textAlign}
- Khoảng cách đoạn văn (Paragraph Margin): margin-bottom: ${profile.paragraphSpacing};

* NGUYÊN TẮC BẤT BIẾN KHI XUẤT HTML/CSS:
1. KHÔNG tự ý chèn font lạ nào khác ngoài "${profile.bodyFont}" và "${profile.headingFont}".
2. KHÔNG tự đặt max-width hoặc chiều rộng cố định cho toàn trang (khung trang chuẩn sẽ do hệ thống quản lý).
3. Tiêu đề (h1-h6), trích dẫn và bảng biểu được phép co giãn kích cỡ và màu sắc linh hoạt theo đúng tài liệu gốc.
</document_design_tokens>`;
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
    if (chunks.length <= 3) {
      chunks.forEach((_, i) => sampleIndices.push(i));
    } else {
      sampleIndices.push(0);
      sampleIndices.push(Math.floor(chunks.length / 2));
      sampleIndices.push(chunks.length - 1);
    }

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

    const analysisPrompt = await this.getStyleAnalysisPrompt();
    parts.push({ text: analysisPrompt });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: 'HIGH' }
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      });

      if (!response.ok) {
        console.warn('Lỗi API phân tích phong cách, sử dụng cấu hình mặc định:', response.status);
        return { ...DEFAULT_STYLE_PROFILE, analyzedSampleChunks: sampleIndices, analyzedAt: Date.now() };
      }

      const data = await response.json();
      let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (rawText.includes('```')) {
        const match = rawText.match(/```(?:json)?([\s\S]*?)```/i);
        if (match && match[1]) rawText = match[1].trim();
      }

      const parsed = JSON.parse(rawText);
      const validFonts = [
        'Lora', 'Merriweather', 'EB Garamond', 'Playfair Display',
        'Be Vietnam Pro', 'Plus Jakarta Sans', 'Inter', 'Montserrat',
        'Roboto', 'JetBrains Mono'
      ];

      const bodyFont = validFonts.includes(parsed.bodyFont) ? parsed.bodyFont : 'Lora';
      const headingFont = validFonts.includes(parsed.headingFont) ? parsed.headingFont : 'Playfair Display';

      return {
        bodyFont,
        headingFont,
        bodyFontSize: parsed.bodyFontSize || '18px',
        lineHeight: parsed.lineHeight || '1.7',
        textAlign: parsed.textAlign === 'left' ? 'left' : 'justify',
        paragraphSpacing: parsed.paragraphSpacing || '16px',
        styleArchetype: parsed.styleArchetype || 'Văn bản / Sách tiêu chuẩn',
        analyzedSampleChunks: sampleIndices,
        analyzedAt: Date.now()
      };
    } catch (err) {
      console.warn('Lỗi phân tích phong cách thiết kế tài liệu, sử dụng cấu hình mặc định:', err);
      return { ...DEFAULT_STYLE_PROFILE, analyzedSampleChunks: sampleIndices, analyzedAt: Date.now() };
    }
  }

  /**
   * Prepares the full query parts list to send to the Gemini model (incorporating multimodal elements)
   */
  buildMultimodalParts(
    pdfBase64: string,
    promptText: string,
    chunk: PdfChunk,
    
    outputMode: OutputMode = 'markdown',
    styleProfile?: DocumentStyleProfile | null
  ): any[] {
    const parts: any[] = [];

    // 1. Send the sliced PDF document directly
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64
      }
    });

    // 2. Format additional page-range constraints and style tokens
    let designTokensBlock = '';
    if (styleProfile && outputMode === 'html') {
      designTokensBlock = `\n\n${this.formatDesignTokensBlock(styleProfile)}\n`;
    }

    let localizedInstructions = '';
    if (outputMode === 'html') {
      localizedInstructions = `${promptText}${designTokensBlock}\n\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT HTML BẢO TOÀN BỐ CỤC): \nTài liệu PDF đính kèm dưới đây đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, tái tạo bố cục thị giác, căn lề và chuyển đổi thành mã HTML/CSS sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ HTML NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã HTML ngay dưới đây:`;
    } else {
      localizedInstructions = `${promptText}\n\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT MARKDOWN TIẾT KIỆM TOKEN): \nTài liệu PDF đính kèm dưới đây đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, nối dòng mượt mà và chuyển đổi thành mã Markdown sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ MARKDOWN NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã Markdown ngay dưới đây:`;
    }
    
    parts.push({ text: localizedInstructions });

    // Removed images mapping logic for standard PDF

    return parts;
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
    const parts = this.buildMultimodalParts(pdfBase64, basePrompt, chunk, outputMode, styleProfile);

    // Call individual content generation REST endpoint
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {
          temperature: 0.1,
          thinkingConfig: { thinkingLevel: 'HIGH' }
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      })
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      const originalError = errorData?.error?.message || `Lỗi HTTP ${apiResponse.status}`;
      throw new Error(`Google API phản hồi thất bại: ${originalError}`);
    }

    const resData = await apiResponse.json();
    let rawOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawOutput) {
      const finishReason = resData?.candidates?.[0]?.finishReason;
      if (finishReason) {
        switch (finishReason) {
          case 'SAFETY':
            throw new Error('Lỗi: Tài liệu bị hệ thống từ chối xử lý do chứa nội dung vi phạm tiêu chuẩn an toàn (ví dụ: bạo lực, nhạy cảm...).');
          case 'RECITATION':
            throw new Error('Lỗi: Tài liệu bị từ chối xử lý do nghi ngờ vi phạm bản quyền hoặc chứa nội dung sao chép nguyên văn.');
          case 'MAX_TOKENS':
            throw new Error('Lỗi: Tài liệu quá dài hoặc quá phức tạp để xử lý trong một lần. Vui lòng cắt nhỏ file PDF.');
          case 'OTHER':
            throw new Error('Lỗi: AI từ chối phản hồi vì lý do không xác định (Mã lỗi: OTHER).');
          default:
            throw new Error(`Lỗi: AI từ chối phản hồi (Lý do: ${finishReason}).`);
        }
      } else {
        throw new Error('Lỗi từ AI: Không nhận được dữ liệu văn bản phản hồi.');
      }
    }

    // Secondary sanitization: remove Markdown/HTML code fences if returned despite strict instructions
    if (rawOutput.includes('```')) {
      const match = rawOutput.match(/```(?:markdown|html|xml)?([\s\S]*?)```/i);
      if (match && match[1]) {
        rawOutput = match[1].trim();
      }
    }

    const inputTokens = resData?.usageMetadata?.promptTokenCount || 0;
    const outputTokens = resData?.usageMetadata?.candidatesTokenCount || 0;

    return {
      rawMarkdown: rawOutput,
      inputTokens,
      outputTokens
    };
  }
}
