import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-instruction-modal',
  imports: [MatIconModule],
  template: `
    <div 
      role="button"
      tabindex="0"
      (click)="closeModal.emit()"
      (keydown.escape)="closeModal.emit()"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out">
      
      <div 
        role="document"
        tabindex="0"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        class="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative text-left cursor-default animate-scale-up">
        
        <!-- Close Button -->
        <button 
          type="button"
          (click)="closeModal.emit()"
          class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors focus:outline-none">
          <mat-icon class="text-[20px] w-5 h-5 flex items-center justify-center">close</mat-icon>
        </button>

        <div class="flex items-center gap-3 mb-6">
          <div class="h-10 w-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
            <mat-icon>chrome_reader_mode</mat-icon>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white font-sans">Hướng dẫn sử dụng</h3>
            <p class="text-[11px] text-slate-400">Cách chuyển file PDF scan thành định dạng dễ đọc hơn</p>
          </div>
        </div>

        <div class="space-y-4 font-sans text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-[55vh] md:max-h-[60vh] pr-2 scroll-smooth">
          <div class="flex gap-3">
            <div class="h-6 w-6 rounded-lg bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
            <div>
              <p class="text-sm font-bold text-slate-100 mb-1.5">Nhập API Key</p>
              <p>Ứng dụng cần API Key từ Gemini để hoạt động, bạn cần vào AI Studio để lấy khóa này. Click vào button "Nhập API Key" ở trên cùng bên tay phải để biết cách làm. Ngoài ra bạn có thể dùng AI của Meta, nó cũng có chất lượng khá tốt. Tuy nhiên vẫn nên ưu tiên Gemini hơn, vì chất lượng OCR của nó rất cao.</p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="h-6 w-6 rounded-lg bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
            <div>
              <p class="text-sm font-bold text-slate-100 mb-1.5">Tải lên tài liệu PDF</p>
              <p>Kéo thả trực tiếp tệp tin PDF hoặc nhấp chọn tệp từ máy tính. Tùy chọn mặc định model AI là Flash thường thích hợp nhất để phân tích đa số các file PDF. Còn model Lite chỉ đủ dùng cho các file rất đơn giản. Model Muse của Meta có thể phù hợp với các tài liệu mà Gemini hiểu nhầm và từ chối chuyển đổi.</p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="h-6 w-6 rounded-lg bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
            <div>
              <p class="text-sm font-bold text-slate-100 mb-1.5">OCR tài liệu</p>
              <p>Công cụ sẽ tách file PDF lớn thành nhiều phần khác nhau & xử lý dần dần. Ở footer/chân trang, tùy chọn mặc định OCR PDF là "Bảo toàn", đây là chọn lựa phù hợp trong phần lớn trường hợp, giúp đầu ra có cấu trúc, bố cục tương tự bản gốc. Nếu bạn muốn tải về bản .DOCX để biên tập lại, thì bạn cần tải lại tài liệu, ở footer, chọn "Đơn giản" thay vì mặc định "Bảo toàn", rồi sau đó nhấn nút "Xử lý tất cả".</p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="h-6 w-6 rounded-lg bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">4</div>
            <div>
              <p class="text-sm font-bold text-slate-100 mb-1.5">Xuất/Nhập dự án</p>
              <p>Trường hợp đang chuyển đổi dở và bạn hết ngưỡng miễn phí, bạn có thể "Xuất dự án" trong mục "Lịch sử" rồi "Nhập dự án" vào tài khoản khác để thực hiện chuyển đổi tiếp.</p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="h-6 w-6 rounded-lg bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">5</div>
            <div>
              <p class="text-sm font-bold text-slate-100 mb-1.5">Tuyên bố từ chối trách nhiệm</p>
              <p>Công cụ này chỉ nên sử dụng cho mục đích nghiên cứu và học tập cá nhân.<br/><br/>Looking-Back-OCR cũng như người phát triển nó không đưa ra bất kỳ bảo đảm rõ ràng hay ngụ ý nào, cũng như không tuyên bố rằng công cụ sẽ vận hành hoàn hảo, chính xác hoặc cập nhật. Người phát triển sẽ không chịu trách nhiệm cho bất kỳ tổn thất hay thiệt hại nào phát sinh trực tiếp hoặc gián tiếp liên quan đến hoặc phát sinh từ việc sử dụng công cụ này.</p>
            </div>
          </div>
        </div>

        <div class="border-t border-white/5 mt-6 pt-4 flex justify-end">
          <button 
            type="button" 
            (click)="closeModal.emit()"
            class="px-6 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors duration-200">
            Tôi đã hiểu
          </button>
        </div>

      </div>
    </div>
  `
})
export class InstructionModal {
  closeModal = output<void>();
}
