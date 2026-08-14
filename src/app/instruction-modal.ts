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
        class="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative text-left cursor-default animate-scale-up">
        
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
            <p class="text-[11px] text-slate-400">Cách chuyển PDF thành định dạng sách EPUB & DOCX</p>
          </div>
        </div>

        <div class="space-y-4 font-sans text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-[50vh] md:max-h-[55vh] pr-2 scroll-smooth">
          <div class="flex gap-3">
            <div class="h-6 w-6 rounded-lg bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
            <div>
              <p class="text-sm font-bold text-slate-100 mb-1.5">Tải lên tài liệu PDF</p>
              <p>Kéo thả trực tiếp tệp tin PDF hoặc nhấp chọn tệp từ máy tính. Ứng dụng sẽ tách các ảnh từ tài liệu gốc để chuẩn bị cho việc tái cấu trúc lại thành EPUB. Việc tách ảnh được thực hiện thông qua thiết bị của người dùng, giai đoạn này chưa dùng đến AI.</p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="h-6 w-6 rounded-lg bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
            <div>
              <p class="text-sm font-bold text-slate-100 mb-1.5">Nhập API Key</p>
              <p>Bản cấu trúc gốc từ tài liệu PDF & các ảnh được trích xuất từ bước trước cần AI để ráp nối lại với nhau tạo thành dữ liệu hoàn chỉnh. Điền khóa API Key của bạn ở phần <code class="bg-slate-950 px-1 py-0.5 text-indigo-400 font-mono rounded">Nhập API Key</code> để xử lý công việc trong giai đoạn này.</p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="h-6 w-6 rounded-lg bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
            <div>
              <p class="text-sm font-bold text-slate-100 mb-1.5">Đổi định dạng sang EPUB & DOCX</p>
              <p>Hệ thống tự động gói dữ liệu thành tệp sách EPUB & định dạng DOCX, hỗ trợ tải về lưu trữ. EPUB xem tốt trên các máy đọc sách phổ thông như Kindle, iPad, v.v... DOCX là định dạng chuyên cho mục đích soạn thảo văn bản.<br/><br/>Và quan trọng nhất đầu vào là định dạng EPUB giúp dịch thuật rất tiện lợi & có bảo toàn ảnh.</p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="h-6 w-6 rounded-lg bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">4</div>
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
