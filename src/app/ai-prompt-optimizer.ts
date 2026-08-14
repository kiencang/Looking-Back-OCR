/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { PDFDocument } from 'pdf-lib';
import { PdfChunk } from './app';

@Injectable({
  providedIn: 'root'
})
export class AiPromptOptimizer {
  /**
   * Returns the fallback/default Vietnamese AI prompt template
   */
  getDefaultPrompt(): string {
    return `Bạn là một Chuyên gia Số hóa Tài liệu, Kỹ sư OCR và Biên tập Sách Cổ cao cấp.
Nhiệm vụ của bạn là trích xuất văn bản từ tệp PDF scan đính kèm và chuyển đổi thành định dạng Markdown (MD) chuẩn mực, trung thực tuyệt đối với nguyên tác và mang lại trải nghiệm đọc thưởng thức tốt nhất cho CON NGƯỜI (Human Reading, EPUB, DOCX).

<objective>
[MỤC TIÊU TỐI THƯỢNG]:
1. TRUNG THỰC VỚI NGUYÊN TÁC: Trích xuất chính xác từng từ một đúng như bản gốc. Tuyệt đối không tóm tắt, không bỏ sót, không bịa đặt nội dung.
2. TỐI ƯU HÓA TRẢI NGHIỆM ĐỌC CHO CON NGƯỜI: Mạch văn liền mạch (reflow), bố cục thẩm mỹ, phân cấp tiêu đề rõ ràng, ngắt nhịp thơ ca chuẩn xác và loại bỏ sạch sẽ các tạp âm trang in.
3. BẢO TOÀN VỊ TRÍ HÌNH ẢNH & CHÚ GIẢI: Giữ đúng vị trí tranh ảnh minh họa, chú thích giải nghĩa và công thức toán học/khoa học (nếu có).
4. ĐỐI CHIẾU 1:1 VÀ ĐÁNH DẤU RANH GIỚI TRANG (PAGE BREAK): BẮT BUỘC chèn thẻ đánh dấu ngắt trang \`<!-- PAGE_BREAK: X -->\` (với X là số trang thực tế của tệp PDF gốc) ngay tại điểm bắt đầu của mỗi trang để phục vụ chế độ xem đối chiếu song song và chia trang tài liệu.
</objective>

BẠN PHẢI TUÂN THỦ NGHIÊM NGẶT CÁC QUY TẮC SAU:

<rules>
1. LIỀN MẠCH DÒNG ĐỌC & ĐOẠN VĂN (READING FLOW):
- Xóa ngắt dòng cứng (Hard Line Breaks): Tự động nối các dòng chữ thuộc cùng một đoạn văn thành một đoạn văn xuôi liên tục. Chỉ nhấn Enter (xuống dòng) khi thực sự kết thúc một đoạn văn.
- Nối câu qua trang (Cross-page Continuity): Nhận diện các câu bị đứt đoạn giữa cuối trang trước và đầu trang sau, nối chúng lại mượt mà thành câu hoàn chỉnh.
- Nối từ bị gạch nối ngắt dòng (De-hyphenation): Khi một từ bị gãy đôi ở cuối dòng do dấu gạch ngang (ví dụ: "lịch- \\n sử" hoặc "inter- \\n national"), hãy ghép lại thành từ hoàn chỉnh ("lịch sử", "international").
- Chữ cái lớn đầu đoạn (Drop Caps): Nhận diện chữ cái hoa nghệ thuật đầu đoạn bị tách rời và ghép liền với từ tương ứng (ví dụ: "N" \\n "ăm ấy..." -> "Năm ấy...").
- Bố cục nhiều cột (Multi-column): Nếu tài liệu in 2 hoặc 3 cột (báo chí, tạp chí, từ điển), hãy đọc theo đúng thứ tự logic tự nhiên của bài viết và gộp thành một luồng đọc duy nhất.

2. LOẠI BỎ RÁC TRANG IN (NOISE REMOVAL):
- Bỏ qua hoàn toàn: Tiêu đề đầu trang (Running Header), tiêu đề chân trang lặp lại (Footer), số trang (Page numbers), vạch kẻ trang trí mép giấy, watermark.
- Dọn dẹp tạp âm scan: Bỏ các đốm mực ố, ký tự rác vô nghĩa do scan mờ hoặc nếp gấp gáy sách gây ra.
- Thống nhất dấu câu thẩm mỹ: Sử dụng dấu ngoặc kép chuẩn ("nội dung"), bảo toàn dấu gạch ngang dài giải thích (— em-dash).

3. ĐẶC THÙ SÁCH CỔ, VĂN HỌC & TÀI LIỆU LỊCH SỬ TIẾNG VIỆT:
- Tôn trọng nguyên bản chính tả cổ: Giữ nguyên cách dùng từ, cách phiên âm cổ, dấu câu theo lối xưa hoặc chữ Hán - Nôm nguyên gốc. KHÔNG tự ý "sửa sang hiện đại hóa" làm mất đi giá trị lịch sử của văn bản cổ.
- Thơ ca, Phú, Vè, Câu đối: BẮT BUỘC giữ nguyên định dạng ngắt dòng của từng câu thơ (thơ lục bát, song thất lục bát, thất ngôn Đường luật, thơ tự do). Đặt khối thơ thụt lề hoặc bọc trong khối trích dẫn \`>\` để phân biệt rõ ràng với văn xuôi:
  > Trăm năm trong cõi người ta,
  > Chữ tài chữ mệnh khéo là ghét nhau.
- Lời Tựa (Tự), Lời Bạt (Bạt), Niên hiệu: Trình bày trang trọng, giữ đúng thông tin người viết, ngày tháng và niên hiệu ở cuối bài tựa (ví dụ: *Tự Đức năm thứ...*, *Bảo Đại năm...*).

4. PHÂN CẤP CẤU TRÚC MARKDOWN CHUẨN (TYPOGRAPHY):
- Tiêu đề (Headings): Dùng cú pháp \`#\` (H1 cho tên sách/chương lớn, \`##\` cho mục lớn, \`###\` cho tiểu mục). Tuyệt đối không dùng gạch dưới \`===\` hay \`---\`.
- Nhấn mạnh: Dùng \`*in nghiêng*\`, \`**in đậm**\`, \`***vừa đậm vừa nghiêng***\`.
- Danh sách: Dùng \`-\` cho danh sách không thứ tự, \`1.\` cho danh sách có thứ tự. Thụt lề 4 khoảng trắng cho danh sách cấp con.
- Bảng biểu (Tables): Chuyển đổi bảng dữ liệu thành bảng Markdown chuẩn (\`| Cột 1 | Cột 2 |\`).
- Khối trích dẫn (Blockquotes): Dùng \`>\` cho đoạn văn trích dẫn, lời dẫn nhập, chỉ dụ, thư từ cổ.
- Mã nguồn (nếu có): Dùng \`\`\`ngôn_ngữ cho khối code, hoặc \`code inline\` cho từ khóa.

5. CÔNG THỨC TOÁN HỌC & KHOA HỌC (NẾU CÓ):
- BẮT BUỘC dùng cú pháp LaTeX để hỗ trợ hiển thị đẹp trên EPUB/Word qua KaTeX:
  + \`\\( công_thức \\)\` cho biểu thức toán học nằm cùng dòng với chữ (Inline Math).
  + \`\\[ công_thức \\]\` cho công thức/phương trình đứng riêng một dòng (Block Math).
  + Giữ nguyên dấu chấm thập phân và không bọc công thức trong thẻ code HTML.

6. XỬ LÝ CHÚ THÍCH (FOOTNOTES / CHÚ GIẢI TỪ NGỮ):
- Trong văn bản, đánh dấu vị trí chú thích bằng \`[^1]\`, \`[^2]\`...
- Đặt nội dung giải nghĩa tương ứng ở cuối văn bản theo cú pháp chuẩn Markdown: \`[^1]: Lời giải nghĩa từ cổ/điển tích...\`.

7. ĐẶT VỊ TRÍ HÌNH ẢNH & TRANH MINH HỌA:
Chúng tôi đính kèm danh sách các hình ảnh bóc tách được (mang nhãn định danh như \`![IMG-CHUNK1-01]\`, \`![IMG-CHUNK1-02]\`, v.v.).
- Quan sát tệp PDF, xác định đúng ngữ cảnh xuất hiện của từng bức ảnh và chèn CHÍNH XÁC nhãn ảnh tương ứng vào luồng văn bản (ngay trước hoặc sau đoạn văn mô tả).
- Tuyệt đối KHÔNG bỏ sót hình ảnh nào, KHÔNG thay đổi cú pháp nhãn \`![IMG-CHUNKXX-XX]\`.
- Chú thích dưới ảnh: Nếu dưới ảnh có lời chú thích/chú dẫn, hãy in nghiêng và đặt ngay dưới ảnh:
  ![IMG-CHUNK1-01]
  *Hình 1: Tranh khắc gỗ minh họa sách cổ.*

8. NỘI DUNG CHỮ TRONG SƠ ĐỒ / BẢN ĐỒ / HÌNH VẼ (NẾU CÓ):
- Nếu hình ảnh có chứa chữ quan trọng bên trong, hãy trích xuất ngắn gọn dưới dạng trích dẫn in nghiêng đặt dưới chú thích ảnh:
  > *Thông tin ảnh: [Chữ quan trọng 1] - [Chữ quan trọng 2]...*

9. ĐÁNH DẤU PHÂN TRANG ĐỐI CHIẾU (1:1 PAGE ALIGNMENT):
- Tại điểm bắt đầu nội dung của mỗi trang (tương ứng với số thứ tự trang thực tế trong tệp PDF gốc), BẮT BUỘC chèn một dòng thẻ đánh dấu:
  \`<!-- PAGE_BREAK: X -->\` (với X là số trang, ví dụ: \`<!-- PAGE_BREAK: 1 -->\`, \`<!-- PAGE_BREAK: 2 -->\`...)
- Thẻ này giúp hệ thống tạo ranh giới trang để đối chiếu song song với bản gốc và tự động phân trang khi xuất file Word/EPUB.
</rules>

<output_format>
- ZERO-FLUFF: Bắt đầu xuất nội dung Markdown ngay lập tức.
- KHÔNG thêm lời chào, KHÔNG giải thích, KHÔNG xin lỗi.
- KHÔNG bọc toàn bộ đầu ra trong khối \`\`\`markdown. Hãy trả về văn bản Markdown trực tiếp.
</output_format>`;
  }

  /**
   * Retrieves the prompt template from the public file or returns the default fallback
   */
  async getPromptTemplate(formatType: 'epub' | 'docx' = 'epub'): Promise<string> {
    try {
      // Cả chuyển đổi thành docx và epub sẽ dùng chung prompt reflow_instructions.md 
      // vì bây giờ chúng đều có mục tiêu chung là chứa công thức toán dạng MathML
      const fileName = 'reflow_instructions.md';
      console.log('Tải prompt mẫu tối ưu cho:', formatType);
      const response = await fetch(`/prompts/${fileName}?t=${Date.now()}`);
      if (!response.ok) throw new Error('Không thể tải tệp prompt từ server');
      return await response.text();
    } catch (fetchErr) {
      console.warn('Lỗi fetch prompt template hoặc sử dụng môi trường client-only, dùng cấu hình mặc định:', fetchErr);
      return this.getDefaultPrompt();
    }
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
   * Prepares the full query parts list to send to the Gemini model (incorporating multimodal elements)
   */
  buildMultimodalParts(pdfBase64: string, promptText: string, chunk: PdfChunk, pdfType: 'scan' | 'standard' = 'scan'): any[] {
    const parts: any[] = [];

    // 1. Send the sliced PDF document directly
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64
      }
    });

    // 2. Format additional page-range constraints and append to prompt instructions
    let localizedInstructions = '';
    if (pdfType === 'scan') {
      localizedInstructions = `${promptText}\n\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ): \nTài liệu PDF đính kèm dưới đây đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, nối dòng mượt mà và chuyển đổi thành mã Markdown sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ MARKDOWN NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã Markdown ngay dưới đây:`;
    } else {
      localizedInstructions = `${promptText}\n\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ PDF TIÊU CHUẨN): \nTài liệu PDF đính kèm dưới đây đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc kĩ và xử lý toàn bộ nội dung của tệp PDF đính kèm này cùng các hình ảnh gốc liên quan, sau đó chuyển đổi thành mã Markdown sạch đẹp, bảo toàn cấu trúc và ngữ cảnh, rồi chèn đúng nhãn ảnh tương ứng.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ MARKDOWN NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã Markdown ngay dưới đây:`;
    }
    
    parts.push({ text: localizedInstructions });

    // 3. For standard PDF only: Map out and attach the extracted images that occurred within the target page range
    if (pdfType === 'standard') {
      chunk.pages.forEach(page => {
        if (page.extractedImages) {
          page.extractedImages.forEach((img: any) => {
            const rawBase64 = img.dataUrl.split(',')[1];
            parts.push({
              text: `\nDưới đây là dữ liệu hình ảnh bóc được mang nhãn [${img.labeledKey}]:\n`
            });
            parts.push({
              inlineData: {
                mimeType: 'image/png',
                data: rawBase64
              }
            });
          });
        }
      });
    }

    return parts;
  }

  /**
   * Executes Content Generation from Gemini API, handles REST transport, and returns optimized Markdown output and token usage
   */
  async optimizeChunk(
    apiKey: string,
    modelName: string,
    file: File,
    chunk: PdfChunk,
    formatType: 'epub' | 'docx' = 'epub',
    pdfType: 'scan' | 'standard' = 'scan'
  ): Promise<{ rawMarkdown: string; inputTokens: number; outputTokens: number }> {
    // Acquire sliced PDF or fallback to original
    let pdfBase64 = '';
    try {
      pdfBase64 = await this.splitPdf(file, chunk.startPageNum, chunk.endPageNum);
    } catch (splitErr) {
      console.warn('Lỗi phân tách PDF bằng pdf-lib, quay lại gửi cả tệp:', splitErr);
      pdfBase64 = await this.fileToBase64(file);
    }

    const basePrompt = await this.getPromptTemplate(formatType);
    const parts = this.buildMultimodalParts(pdfBase64, basePrompt, chunk, pdfType);

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
    let rawMarkdown = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawMarkdown) {
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

    // Secondary sanitization: remove Markdown wrappers if returned despite strict instructions
    if (rawMarkdown.includes('```')) {
      const match = rawMarkdown.match(/```(?:markdown)?([\s\S]*?)```/i);
      if (match && match[1]) {
        rawMarkdown = match[1].trim();
      }
    }

    const inputTokens = resData?.usageMetadata?.promptTokenCount || 0;
    const outputTokens = resData?.usageMetadata?.candidatesTokenCount || 0;

    return {
      rawMarkdown,
      inputTokens,
      outputTokens
    };
  }
}
