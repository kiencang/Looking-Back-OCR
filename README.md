OCR tài liệu, sách xưa tiếng Việt bằng Gemini. Đang trong quá trình phát triển và thử nghiệm.

## Tại sao tồn tại
Sách xưa có khá nhiều cuốn thú vị, tuy nhiên định dạng scan có thể không dễ đọc do bản chất sách gốc bị mờ (theo thời gian) hoặc do công nghệ scan không đủ tốt để tạo ra phiên bản nét đọc được ngay.

Looking-Back-OCR ra đời nhằm khắc phục phần nào tình trạng đó. Nó giúp tái tạo lại sách xưa với chữ rõ ràng & dễ đọc hơn. Ngoài ra là hiệu ứng phụ tích cực (dù có thể không quan trọng), bản OCR thường có dung lượng nhẹ hơn đáng kể so với bản gốc, việc truyền tải, chia sẻ do vậy sẽ dễ dàng hơn.

## Công nghệ
Mặc định công cụ này sử dụng Gemini AI, và bạn nên dùng bản trên AI Studio để tiết kiệm chi phí tối đa.

Gemini AI có khả năng OCR tài liệu rất tốt, chi phí bằng 0 nếu nhu cầu hàng ngày không quá lớn.

Looking-Back-OCR kế thừa và phát triển từ công cụ trước đó (cùng tác giả): https://github.com/kiencang/pdf-2-epub-docx

Điểm khác biệt cơ bản là Looking-Back-OCR tập trung vào sách xưa, và nó xuất ra nhiều định dạng hơn, cũng như mục đích là để con người đọc trực tiếp.

## Hai kiểu PDF
Có 2 kiểu định dạng sách PDF chính, là sách `scan` và loại thông thường (mà trong ứng dụng gọi là `tiêu chuẩn`).

Đa số sách xưa đều sẽ là định dạng PDF scan, và mặc định ở ứng dụng này bật chế độ PDF scan. Nó sẽ OCR được văn bản trong sách và tái tạo lại.

PDF tiêu chuẩn có cái lợi là sẽ bóc tách được ảnh ở trong file PDF, còn file PDF scan thì chính bản thân nó cũng như dạng ảnh rồi, và công cụ này sẽ không bóc tách được ảnh nằm trong PDF scan.

## Hai kiểu tái tạo
Ứng dụng này sau khi OCR nội dung gốc sẽ xuất ra một trong hai định dạng mà người dùng chọn:
- **HTML/CSS**: định dạng web, giúp bảo toàn tối đa định dạng gốc, ví dụ bản gốc chia 2 cột thì bản HTML/CSS cũng chia 2 cột. Không chỉ có thế, nó cũng tìm font chữ có hình dáng `hao hao` nội dung gốc;
- **Markdown**: định dạng đơn giản hơn, nhưng lại có khả năng xuất ra EPUB và đặc biệt là Docx, giúp người dùng có thể biên tập thêm khi cần;

Tóm lại: Nếu bạn muốn đọc bản OCR có mức độ giống cao nhất với bản gốc, không chỉ nội dung mà còn là cả định dạng, hãy dùng cách chuyển đổi HTML/CSS. Còn nếu bạn quan tâm đơn thuần đến việc đọc, muốn tiết kiệm token đầu ra (ví dụ khi bạn dùng API Key trả phí) hãy dùng kiểu chuyển sang Markdown. Ngoài ra nếu có nhu cầu biên tập lại thì chỉ có kiểu Markdown mới giúp bạn có được định dạng Docx.

## Tuyên bố từ chối trách nhiệm
Công cụ này có thể được sử dụng cho mục đích nghiên cứu và học tập cá nhân.

Looking-Back-OCR cũng như người phát triển nó không đưa ra bất kỳ bảo đảm rõ ràng hay ngụ ý nào, cũng như không tuyên bố rằng công cụ sẽ vận hành hoàn hảo, chính xác hoặc cập nhật. Người phát triển sẽ không chịu trách nhiệm cho bất kỳ tổn thất hay thiệt hại nào phát sinh trực tiếp hoặc gián tiếp liên quan đến hoặc phát sinh từ việc sử dụng công cụ này.
