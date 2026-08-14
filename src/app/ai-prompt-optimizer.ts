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
  /**
   * Returns the fallback/default Vietnamese AI prompt template for Markdown mode
   */
  getDefaultMarkdownPrompt(): string {
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
Nếu hình ảnh trong file PDF có thể tách được, chúng tôi sẽ đính kèm danh sách các hình ảnh bóc tách được (mang nhãn định danh như \`![IMG-CHUNK1-01]\`, \`![IMG-CHUNK1-02]\`, v.v.).
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
   * Returns the fallback/default Vietnamese AI prompt template for Document Style Analysis
   */
  getDefaultStylePrompt(): string {
    return `Bạn là Chuyên gia Nghệ thuật Chữ (Typography) và Giám đốc Thiết kế Sách cao cấp.
Trước mặt bạn là các trang mẫu trích xuất từ tài liệu PDF (Đầu sách, Giữa sách và Cuối sách).

<objective>
Nhiệm vụ: Phân tích thể loại tài liệu, phong cách trình bày và chọn bộ font chữ cùng quy chuẩn thiết kế ĐỒNG NHẤT CHO TOÀN BỘ CUỐN SÁCH.
</objective>

<allowed_fonts>
DANH MỤC 10 PHÔNG CHỮ TIẾNG VIỆT CHUẨN ĐƯỢC PHÉP DÙNG:
1. Nhóm Văn học / Học thuật (Serif):
   - "Lora": Rất thanh nhã, mềm mại, chuẩn mực cho tiểu thuyết, văn xuôi, tản văn.
   - "Merriweather": Dày dặn, tương phản cao, tối ưu số 1 cho việc đọc văn bản dài.
   - "EB Garamond": Cổ điển, quý phái, phù hợp tài liệu lịch sử, sách xưa, triết học, chữ Hán Nôm.
   - "Playfair Display": Đẳng cấp, nghệ thuật, dùng làm Tiêu đề (Headings) sách sang trọng.
2. Nhóm Hiện đại / Báo chí (Sans-serif):
   - "Be Vietnam Pro": Font chuẩn tiếng Việt hiện đại, tối ưu dấu thanh, rất đẹp cho sách kỹ năng, tạp chí mới.
   - "Plus Jakarta Sans": Năng động, thanh thoát, hợp tài liệu hiện đại.
   - "Inter": Rõ ràng, trung tính, công thái học cao, phù hợp sách chuyên ngành, báo cáo, nghiên cứu.
   - "Montserrat": Vững chãi, góc cạnh, rất hợp làm Tiêu đề tài liệu hiện đại.
3. Nhóm Kỹ thuật / Tài liệu (Neutral & Monospace):
   - "Roboto": Phổ thông, dễ đọc, phù hợp sách giáo khoa, tài liệu hành chính.
   - "JetBrains Mono": Phù hợp sách công nghệ, lập trình, công thức và bảng kỹ thuật.
</allowed_fonts>

<rules>
QUY TẮC PHÂN TÍCH:
- \`styleArchetype\`: Xác định ngắn gọn thể loại tài liệu (ví dụ: "Văn học / Tiểu thuyết cổ điển", "Báo chí / Tạp chí hiện đại", "Sách chuyên khảo khoa học", "Sách giáo khoa / Hành chính", "Thơ ca / Văn nghệ").
- \`bodyFont\`: Bắt buộc chọn đúng 1 tên font trong 10 font trên.
- \`headingFont\`: Bắt buộc chọn đúng 1 tên font trong 10 font trên.
- \`bodyFontSize\`: Chọn trong dải tối ưu cho trải nghiệm đọc sách số thoải mái: '17px', '18px', '19px' hoặc '20px' (MẶC ĐỊNH CHUẨN ĐỌC SÁCH LÀ '18px').
  * NGUYÊN TẮC CÔNG THÁI HỌC THEO PHÔNG CHỮ:
    - Font có thân chữ nhỏ (low x-height) như "EB Garamond", "Lora": BẮT BUỘC chọn '18px' hoặc '19px' để văn bản rõ ràng, không bị bé.
    - Font hiện đại, nét đậm hoặc thân chữ to như "Merriweather", "Be Vietnam Pro", "Inter", "Plus Jakarta Sans", "Roboto": Chọn '17px' hoặc '18px'.
    - Sách kỹ thuật, báo cáo nhiều bảng biểu, công thức số liệu: Chọn '17px'.
- \`lineHeight\`: Chọn '1.65', '1.7' hoặc '1.75' (mặc định '1.7' tương ứng với cỡ chữ 18px giúp dòng chữ thông thoáng).
- \`textAlign\`: Chọn 'justify' (cho văn xuôi/sách đọc) hoặc 'left' (cho sách kỹ thuật/danh mục).
- \`paragraphSpacing\`: Chọn '14px', '16px' hoặc '18px' (mặc định '16px').
</rules>

<output_format>
BẮT BUỘC TRẢ VỀ DUY NHẤT 1 CHUỖI JSON HỢP LỆ (KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO NGOÀI JSON) theo mẫu:
{
  "styleArchetype": "Văn học / Tiểu thuyết cổ điển",
  "bodyFont": "Lora",
  "headingFont": "Playfair Display",
  "bodyFontSize": "18px",
  "lineHeight": "1.7",
  "textAlign": "justify",
  "paragraphSpacing": "16px"
}
</output_format>`;
  }

  /**
   * Returns the fallback/default Vietnamese AI prompt template for Layout-preserving HTML mode
   */
  getDefaultHtmlPrompt(): string {
    return `Bạn là một Chuyên gia Số hóa Tài liệu, Kỹ sư OCR và Chuyên gia Tái tạo Bố cục Thị giác (Layout-Preserving Visual OCR Specialist).
Nhiệm vụ của bạn là trích xuất văn bản từ tệp PDF scan đính kèm và chuyển đổi thành định dạng HTML/CSS chuẩn mực, vừa trung thực tuyệt đối với nội dung nguyên tác, vừa bảo toàn tối đa cấu trúc thị giác, màu sắc, bảng biểu và bố cục dàn trang của bản gốc.

<objective>
[MỤC TIÊU TỐI THƯỢNG]:
1. TRUNG THỰC VỚI NGUYÊN TÁC: Trích xuất chính xác 100% từng từ, số liệu, công thức như bản gốc. Tuyệt đối không tóm tắt, không bỏ sót, không bịa đặt nội dung.
2. BẢO TOÀN TỐI ĐA BỐ CỤC THỊ GIÁC (LAYOUT PRESERVATION): Tái tạo cấu trúc cột báo chí (multi-column), bảng biểu phức tạp (gộp ô, đường viền), hộp ghi chú (callout box), căn lề (text-align), ngắt nhịp thơ ca, màu nền và màu chữ nổi bật bằng HTML5 ngữ nghĩa và Inline CSS an toàn.
3. BẢO TOÀN VỊ TRÍ HÌNH ẢNH & CHÚ GIẢI: Giữ đúng vị trí tranh ảnh minh họa, chú thích giải nghĩa dưới ảnh và chú thích cuối trang (footnotes).
4. ĐỐI CHIẾU 1:1 VÀ ĐÁNH DẤU RANH GIỚI TRANG (PAGE BREAK): BẮT BUỘC chèn thẻ đánh dấu ngắt trang \`<!-- PAGE_BREAK: X -->\` (với X là số trang thực tế của tệp PDF gốc) ngay tại điểm bắt đầu của mỗi trang để phục vụ chế độ xem đối chiếu song song và phân trang tài liệu.
</objective>

BẠN PHẢI TUÂN THỦ NGHIÊM NGẶT CÁC QUY TẮC SAU:

<rules>
1. CẤU TRÚC DÀN TRANG & CỘT BÁO CHÍ (MULTI-COLUMN & FLUID CONTINUOUS FLOW):
- VĂN BẢN ĐA CỘT LIỀN MẠCH (Báo chí, tạp chí, sách in 2-3 cột):
  * TUYỆT ĐỐI KHÔNG chia thủ công thành 2 thẻ <div> riêng biệt bằng flexbox (vì sẽ làm hụt chân cột 1, gãy đôi câu văn và tạo khoảng trống thừa ở cuối cột).
  * BẮT BUỘC gộp toàn bộ các đoạn văn liên tục vào MỘT khối container duy nhất sử dụng CSS Multi-Columns:
    \`<div style="columns: 2; column-gap: 28px; column-fill: balance; text-align: justify;" class="multi-column-flow">\`
      \`<p style="margin-bottom: 12px; line-height: 1.6;">Nội dung đoạn văn liên tục chảy tự nhiên từ cột 1 sang cột 2...</p>\`
    \`</div>\`
  * Trình duyệt sẽ tự động rót dòng chữ từ chân cột 1 lên đỉnh cột 2 và cân bằng chiều cao 2 cột bằng nhau chằn chặn, không bao giờ bị hụt chữ hay ngắt câu vô lý.
- HAI LUỒNG SONG SONG ĐỘC LẬP (Bảng đối chiếu song ngữ, 2 bảng số liệu độc lập):
  * Lúc này mới dùng Flexbox/CSS Grid hai bên: \`<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">\`.
- LIỀN MẠCH VĂN PHONG QUA CỘT & QUA TRANG:
  * Nếu một câu hoặc từ ở cuối cột 1 / cuối trang n đang viết dở và nối tiếp sang trang sau, KHÔNG tự ý ngắt thẻ \`<p>\` hay thêm dấu câu giả tạo. Nối câu mạch lạc.
- Căn lề chuẩn xác: Văn bản văn xuôi cần căn đều (\`text-align: justify;\`), tiêu đề chính căn giữa (\`text-align: center;\`), lời đề tặng/chữ ký căn phải (\`text-align: right;\`).
- Thụt lề đầu dòng: Đối với đoạn văn truyền thống, có thể áp dụng \`text-indent: 1.5em;\` hoặc khoảng cách đoạn \`margin-bottom: 12px;\`.
- Chữ cái lớn đầu đoạn (Drop Caps): Sử dụng \`<span style="float: left; font-size: 3rem; line-height: 1; font-weight: bold; margin-right: 8px;">N</span>ăm ấy...\`
- Chống xé lẻ phần tử trong cột: Thêm \`style="break-inside: avoid; margin: 16px 0;"\` cho ảnh, bảng biểu hoặc công thức toán để không bị cắt đôi giữa 2 cột.

2. BẢNG BIỂU PHỨC TẠP (COMPLEX TABLES):
- Sử dụng thẻ HTML chuẩn: \`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tr>\`, \`<th>\`, \`<td>\`.
- Định dạng bảng rõ nét: \`<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">\`
- Đường kẻ ô: Áp dụng \`style="border: 1px solid #cbd5e1; padding: 8px 12px;"\` cho các ô.
- Gộp dòng và gộp cột: Nhận diện chính xác các ô gộp trong bản gốc và sử dụng \`colspan="X"\` hoặc \`rowspan="Y"\`.
- Ô tiêu đề: Thẻ \`<th>\` có nền xám nhạt \`style="background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px;"\`.

3. HỘP GHI CHÚ, KHUNG ĐẶC BIỆT & ĐIỂM NHẤN (CALLOUTS & BOXES):
- Nếu bản gốc có khung đóng viền, hộp ghi nhớ, lời cảnh báo hoặc trích dẫn nổi bật:
  \`<div style="border: 1px solid #e2e8f0; background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">...</div>\`
- Giữ nguyên màu sắc nổi bật (nếu có): màu chữ nổi bật, nền highlight màu vàng/xanh nhạt.

4. THƠ CA, VĂN BIỀN NGẪU, CÂU ĐỐI & SÁCH CỔ:
- Giữ nguyên từng dòng thơ bằng thẻ \`<p style="margin: 4px 0; font-style: italic;">\` hoặc bọc trong khối \`<blockquote style="margin: 16px 0; padding-left: 20px; border-left: 3px solid #cbd5e1;">\`.
- Câu đối song song: Dùng Flexbox hai bên \`<div style="display: flex; justify-content: space-around; font-weight: bold; margin: 16px 0;">\`.
- Tôn trọng nguyên bản chính tả cổ: Giữ nguyên cách dùng từ cổ, chữ Hán - Nôm, không tự ý hiện đại hóa.

5. PHÂN CẤP TIÊU ĐỀ & ĐỊNH DẠNG CHỮ (TYPOGRAPHY):
- Tiêu đề: Sử dụng \`<h1>\`, \`<h2>\`, \`<h3>\` kèm kích thước và độ đậm phù hợp (\`<h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 16px; text-align: center;">...</h1>\`).
- Nhấn mạnh: Dùng \`<strong>\` cho in đậm, \`<em>\` cho in nghiêng, \`<u>\` cho gạch chân (nếu bản gốc có).

6. CÔNG THỨC TOÁN HỌC & KHOA HỌC:
- Dùng cú pháp LaTeX chuẩn: \`\\( công_thức \\)\` cho công thức trên cùng dòng, \`\\[ công_thức \\]\` cho phương trình đứng riêng một khối có căn giữa \`style="text-align: center; margin: 12px 0;"\`.

7. CHÚ THÍCH CUỐI TRANG (FOOTNOTES):
- Đánh dấu số chú thích dạng chỉ số trên: \`<sup>[1]</sup>\`.
- Khối giải nghĩa chú thích đặt ở cuối phần:
  \`<div class="footnotes" style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 0.85rem; color: #475569;">\`
    \`<p><sup>[1]</sup> Lời giải nghĩa từ ngữ...</p>\`
  \`</div>\`

8. ĐẶT VỊ TRÍ HÌNH ẢNH & TRANH MINH HỌA:
Nếu hình ảnh trong file PDF có thể tách được, chúng tôi sẽ đính kèm danh sách các hình ảnh bóc tách được (mang nhãn định danh như \`![IMG-CHUNK1-01]\`, \`![IMG-CHUNK1-02]\`, v.v.).
- Tái tạo bằng cấu trúc thẻ figure:
  \`<figure style="margin: 20px 0; text-align: center;">\`
    \`<img src="![IMG-CHUNK1-01]" alt="IMG-CHUNK1-01" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />\`
    \`<figcaption style="font-style: italic; font-size: 0.875rem; color: #64748b; margin-top: 8px;">Hình 1: Chú thích dưới ảnh</figcaption>\`
  \`</figure>\`
- Nếu ảnh nằm lệch trái hoặc lệch phải để chữ chạy quanh: dùng \`style="float: right; margin: 0 0 16px 16px; max-width: 45%;"\`

9. ĐÁNH DẤU PHÂN TRANG ĐỐI CHIẾU (1:1 PAGE ALIGNMENT):
- Tại điểm bắt đầu nội dung của mỗi trang (tương ứng với số thứ tự trang thực tế trong tệp PDF gốc), BẮT BUỘC chèn một dòng thẻ đánh dấu:
  \`<!-- PAGE_BREAK: X -->\` (với X là số trang, ví dụ: \`<!-- PAGE_BREAK: 1 -->\`, \`<!-- PAGE_BREAK: 2 -->\`...)

10. AN TOÀN & BẢO MẬT MÃ NGUỒN (SECURITY & SANITIZATION):
- Chỉ dùng các thẻ HTML tĩnh an toàn: \`div\`, \`p\`, \`span\`, \`h1\`-\`h6\`, \`table\`, \`thead\`, \`tbody\`, \`tr\`, \`td\`, \`th\`, \`figure\`, \`figcaption\`, \`img\`, \`ul\`, \`ol\`, \`li\`, \`blockquote\`, \`em\`, \`strong\`, \`u\`, \`sup\`, \`sub\`, \`hr\`.
- TUYỆT ĐỐI KHÔNG sử dụng: \`<script>\`, \`<iframe>\`, \`<form>\`, \`<input>\`, \`<button>\`, thẻ \`<style>\` độc lập, hoặc các thuộc tính sự kiện javascript như \`onclick\`, \`onload\`.
</rules>

<output_format>
- ZERO-FLUFF: Bắt đầu xuất trực tiếp đoạn mã HTML ngay lập tức.
- KHÔNG thêm bất kỳ lời chào, lời dẫn nhập hay lời giải thích nào.
- KHÔNG bọc toàn bộ đầu ra trong khối \\\`\\\`\\\`html hay \\\`\\\`\\\`. Hãy trả về trực tiếp chuỗi HTML thuần.
</output_format>
`;
  }

  /**
   * Retrieves the prompt template from the public file or returns the default fallback
   */
  async getPromptTemplate(outputMode: OutputMode = 'html'): Promise<string> {
    try {
      const fileName = outputMode === 'html' ? 'html_reflow_instructions.md' : 'markdown_reflow_instructions.md';
      console.log('Tải prompt mẫu tối ưu cho chế độ:', outputMode, fileName);
      const response = await fetch(`/prompts/${fileName}?t=${Date.now()}`);
      if (!response.ok) throw new Error('Không thể tải tệp prompt từ server');
      return await response.text();
    } catch (fetchErr) {
      console.warn('Lỗi fetch prompt template hoặc sử dụng môi trường client-only, dùng cấu hình mặc định:', fetchErr);
      return outputMode === 'html' ? this.getDefaultHtmlPrompt() : this.getDefaultMarkdownPrompt();
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

    let analysisPrompt = '';
    try {
      const response = await fetch(`/prompts/style_analysis_instructions.md?t=${Date.now()}`);
      if (!response.ok) throw new Error('Không thể tải tệp prompt từ server');
      analysisPrompt = await response.text();
    } catch (fetchErr) {
      console.warn('Lỗi fetch style prompt template, dùng cấu hình mặc định:', fetchErr);
      analysisPrompt = this.getDefaultStylePrompt();
    }

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
    pdfType: 'scan' | 'standard' = 'scan',
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
      if (pdfType === 'scan') {
        localizedInstructions = `${promptText}${designTokensBlock}\n\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT HTML BẢO TOÀN BỐ CỤC): \nTài liệu PDF đính kèm dưới đây đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, tái tạo bố cục thị giác, căn lề và chuyển đổi thành mã HTML/CSS sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ HTML NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã HTML ngay dưới đây:`;
      } else {
        localizedInstructions = `${promptText}${designTokensBlock}\n\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ PDF TIÊU CHUẨN - XUẤT HTML BẢO TOÀN BỐ CỤC): \nTài liệu PDF đính kèm dưới đây đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc kĩ và xử lý toàn bộ nội dung của tệp PDF đính kèm này cùng các hình ảnh gốc liên quan, sau đó chuyển đổi thành mã HTML/CSS sạch đẹp, bảo toàn cấu trúc và ngữ cảnh thị giác, rồi chèn đúng thẻ ảnh tương ứng.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ HTML NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã HTML ngay dưới đây:`;
      }
    } else {
      if (pdfType === 'scan') {
        localizedInstructions = `${promptText}\n\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ SÁCH SCAN / TÀI LIỆU CỔ - XUẤT MARKDOWN TIẾT KIỆM TOKEN): \nTài liệu PDF đính kèm dưới đây đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc trực tiếp và kỹ lưỡng từng trang trong tệp PDF scan này để nhận diện chính xác toàn bộ chữ, bảo tồn nguyên tác, nối dòng mượt mà và chuyển đổi thành mã Markdown sạch đẹp nhất. KHÔNG đính kèm nhãn ảnh tách rời nào.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ MARKDOWN NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã Markdown ngay dưới đây:`;
      } else {
        localizedInstructions = `${promptText}\n\nCHÚ Ý ĐẶC BIỆT (CHẾ ĐỘ PDF TIÊU CHUẨN - XUẤT MARKDOWN TIẾT KIỆM TOKEN): \nTài liệu PDF đính kèm dưới đây đã được cắt nhỏ tự động phía Client, chứa chính xác các trang từ trang **${chunk.startPageNum}** đến trang **${chunk.endPageNum}** của tài liệu gốc. Bạn hãy đọc kĩ và xử lý toàn bộ nội dung của tệp PDF đính kèm này cùng các hình ảnh gốc liên quan, sau đó chuyển đổi thành mã Markdown sạch đẹp, bảo toàn cấu trúc và ngữ cảnh, rồi chèn đúng nhãn ảnh tương ứng.\nBẮT BUỘC: Tại điểm bắt đầu của mỗi trang (từ trang ${chunk.startPageNum} đến ${chunk.endPageNum}), hãy chèn một dòng thẻ đánh dấu ngắt trang: <!-- PAGE_BREAK: X --> (ví dụ: <!-- PAGE_BREAK: ${chunk.startPageNum} -->) để tạo ranh giới trang đối chiếu 1:1.\nĐẦU RA CHỈ ĐƯỢC PHÉP CHỨA ĐOẠN MÃ MARKDOWN NÀY, không viết lời giới thiệu hay phản hồi thừa. Bắt đầu mã Markdown ngay dưới đây:`;
      }
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
   * Executes Content Generation from Gemini API, handles REST transport, and returns optimized Markdown/HTML output and token usage
   */
  async optimizeChunk(
    apiKey: string,
    modelName: string,
    file: File,
    chunk: PdfChunk,
    outputMode: OutputMode = 'markdown',
    pdfType: 'scan' | 'standard' = 'scan',
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
    const parts = this.buildMultimodalParts(pdfBase64, basePrompt, chunk, pdfType, outputMode, styleProfile);

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
