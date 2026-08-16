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

    const h1Size = profile.h1FontSize || '2.1em';
    const h1Weight = profile.h1FontWeight || '700';
    const h2Size = profile.h2FontSize || '1.6em';
    const h2Weight = profile.h2FontWeight || '700';
    const h3Size = profile.h3FontSize || '1.3em';
    const h3Weight = profile.h3FontWeight || '600';

    return `<document_design_tokens>
BỘ QUY CHUẨN THIẾT KẾ ĐÃ ĐƯỢC XÁC LẬP CHO TOÀN BỘ CUỐN SÁCH (BẮT BUỘC TUÂN THỦ 100%):
- Loại hình tài liệu: ${profile.styleArchetype}
- Phông chữ nội dung chính (Body Font): ${bodyFontStack} (BẮT BUỘC dùng cho toàn bộ thẻ <p>, <li>, <td>, <dd>, văn xuôi).
- Phông chữ tiêu đề (Heading Font): ${headingFontStack} (BẮT BUỘC dùng cho các thẻ <h1>, <h2>, <h3>, <h4>, <h5>, <h6>).
- Cỡ chữ nội dung chính (Body Size): ${profile.bodyFontSize} (Mọi đoạn văn xuôi bắt buộc dùng đúng cỡ này, không tự ý thay đổi).
- Độ giãn dòng (Line Height): ${profile.lineHeight}
- Căn lề văn bản (Text Align): ${profile.textAlign}
- Khoảng cách đoạn văn (Paragraph Margin): margin-bottom: ${profile.paragraphSpacing};

- QUY CHUẨN KÍCH THƯỚC TIÊU ĐỀ (HEADING SCALE SYSTEM - TỶ LỆ CỐ ĐỊNH):
  * <h1> (Chương / Tiêu đề chính): font-size: ${h1Size}; font-weight: ${h1Weight}; font-family: ${headingFontStack};
  * <h2> (Mục lớn / Bài viết): font-size: ${h2Size}; font-weight: ${h2Weight}; font-family: ${headingFontStack};
  * <h3> (Mục nhỏ / Tiêu đề phụ): font-size: ${h3Size}; font-weight: ${h3Weight}; font-family: ${headingFontStack};
  * <h4> (Tiểu mục): font-size: ${profile.h4FontSize || '1.1em'}; font-weight: 600; font-family: ${headingFontStack};

* NGUYÊN TẮC BẤT BIẾN KHI XUẤT HTML/CSS:
1. KHÔNG tự ý chèn font lạ nào khác ngoài "${profile.bodyFont}" và "${profile.headingFont}".
2. KHÔNG tự đặt max-width hoặc chiều rộng cố định cho toàn trang (khung trang chuẩn sẽ do hệ thống quản lý).
3. BẮT BUỘC áp dụng đúng tỷ lệ Heading Scale (${h1Size} > ${h2Size} > ${h3Size} > ${profile.h4FontSize || '1.1em'}) cho các thẻ tiêu đề để đảm bảo tính đồng nhất giữa tất cả các trang/chunk.
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
        h1FontSize: parsed.h1FontSize || '2.1em',
        h1FontWeight: parsed.h1FontWeight || '700',
        h2FontSize: parsed.h2FontSize || '1.6em',
        h2FontWeight: parsed.h2FontWeight || '700',
        h3FontSize: parsed.h3FontSize || '1.3em',
        h3FontWeight: parsed.h3FontWeight || '600',
        h4FontSize: parsed.h4FontSize || '1.1em',
        h4FontWeight: parsed.h4FontWeight || '600',
        analyzedSampleChunks: sampleIndices,
        analyzedAt: Date.now()
      };
    } catch (err) {
      console.warn('Lỗi phân tích phong cách thiết kế tài liệu, sử dụng cấu hình mặc định:', err);
      return { ...DEFAULT_STYLE_PROFILE, analyzedSampleChunks: sampleIndices, analyzedAt: Date.now() };
    }
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

    let systemInstructionText: string | undefined = undefined;

    // 2. Format additional page-range constraints and style tokens
    if (outputMode === 'html') {
      systemInstructionText = promptText;

      let designTokensBlock = '';
      if (styleProfile) {
        designTokensBlock = `\n\n${this.formatDesignTokensBlock(styleProfile)}\n`;
      }

      const localizedInstructions = `${designTokensBlock}\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT HTML BẢO TOÀN BỐ CỤC): \nTài liệu PDF đính kèm ở trên đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, tái tạo bố cục thị giác, căn lề và chuyển đổi thành mã HTML/CSS sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ HTML NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã HTML ngay dưới đây:`;

      parts.push({ text: localizedInstructions });
    } else {
      const localizedInstructions = `${promptText}\n\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT MARKDOWN TIẾT KIỆM TOKEN): \nTài liệu PDF đính kèm ở trên đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, nối dòng mượt mà và chuyển đổi thành mã Markdown sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC ĐỐI VỚI CHẾ ĐỘ MARKDOWN: Đầu ra phải là một dòng chảy văn bản liền mạch (continuous text flow). Tuyệt đối KHÔNG sử dụng thẻ <!-- PAGE_BREAK: X --> hoặc bất kỳ ký hiệu ngắt trang nào. Đặc biệt chú ý: Nếu một đoạn văn hoặc một câu bị ngắt dở dang ở cuối trang PDF này và nối tiếp ở đầu trang PDF tiếp theo, hãy thông minh tự động nối chúng lại thành một câu/đoạn văn hoàn chỉnh mà không bị ngắt quãng bởi dấu xuống dòng.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ MARKDOWN NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã Markdown ngay dưới đây:`;

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

    // Call individual content generation REST endpoint
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const requestBody: any = {
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
    };

    if (systemInstructionText) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstructionText }]
      };
    }

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      const originalError = errorData?.error?.message || `HTTP ${apiResponse.status} ${apiResponse.statusText}`;
      const statusDetails = errorData?.error?.status || '';
      throw new Error(`Google API (HTTP ${apiResponse.status}${statusDetails ? ' - ' + statusDetails : ''}): ${originalError}`);
    }

    const resData = await apiResponse.json();
    let rawOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawOutput) {
      const promptBlockReason = resData?.promptFeedback?.blockReason;
      if (promptBlockReason) {
        throw new Error(`Yêu cầu bị chặn từ Google Gemini (Prompt Blocked: ${promptBlockReason})`);
      }

      const candidateObj = resData?.candidates?.[0];
      const finishReason = candidateObj?.finishReason;
      if (finishReason) {
        switch (finishReason) {
          case 'SAFETY':
            throw new Error('Lỗi từ AI: Tài liệu bị bộ lọc an toàn Google từ chối xử lý (SAFETY).');
          case 'RECITATION':
            throw new Error('Lỗi từ AI: Tài liệu bị từ chối do nghi ngờ bản quyền/sao chép (RECITATION).');
          case 'MAX_TOKENS':
            throw new Error('Lỗi từ AI: Độ dài vượt quá số token tối đa cho phép (MAX_TOKENS).');
          case 'OTHER':
            throw new Error('Lỗi từ AI: AI từ chối phản hồi vì lý do không xác định (OTHER).');
          default:
            throw new Error(`Lỗi từ AI: AI từ chối phản hồi (Lý do: ${finishReason}).`);
        }
      } else {
        const jsonDetail = JSON.stringify(resData);
        throw new Error(`Lỗi từ AI: Không nhận được dữ liệu văn bản phản hồi. Chi tiết từ Gemini API: ${jsonDetail}`);
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
