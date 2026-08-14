/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-history-modal',
  imports: [CommonModule, MatIconModule],
  template: `
    <div 
      role="button"
      tabindex="0"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" 
      id="modal-history-backdrop"
      (click)="closeModal.emit()"
      (keydown.escape)="closeModal.emit()">
      
      <div 
        role="document"
        tabindex="0"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-up text-left" 
        id="modal-history-content">
        
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-white/5 bg-slate-950/40 space-y-2">
          <!-- Top row: Title with Icon and Close button -->
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <mat-icon class="text-indigo-400 text-xl leading-none flex items-center justify-center select-none">history</mat-icon>
              <h3 class="text-sm font-bold text-slate-100 font-sans tracking-tight">Lịch sử chuyển đổi gần đây</h3>
            </div>
            <button 
              type="button" 
              (click)="closeModal.emit()"
              class="text-slate-400 hover:text-white hover:bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus:outline-none outline-none shrink-0">
              <mat-icon class="text-[20px] w-5 h-5 flex items-center justify-center">close</mat-icon>
            </button>
          </div>
          <!-- Description spans full width beneath -->
          <p class="text-[11px] text-slate-400 font-sans leading-relaxed">
            Lưu lại tối đa 10 tệp tin gần đây nhất của bạn. Các lưu trữ này chỉ lưu tại trình duyệt mà bạn đang dùng & chúng có thể bị mất nếu bạn xóa dữ liệu web. Luôn chủ động tải về định dạng EPUB & DOCX hoàn chỉnh sau khi chuyển đổi xong để lưu trữ lâu dài.
          </p>
        </div>

        <!-- Modal Body / History List -->
        <div class="p-6 overflow-y-auto space-y-4 flex-1">
          @if (historyItems().length === 0) {
            <div class="py-12 flex flex-col items-center justify-center text-center">
              <div class="h-16 w-16 bg-slate-800/50 rounded-2xl flex items-center justify-center border border-white/5 mb-4 text-slate-500">
                <mat-icon class="!text-[32px] !w-8 !h-8 leading-none flex items-center justify-center animate-pulse">folder_open</mat-icon>
              </div>
              <h4 class="text-xs font-bold text-slate-300 font-sans">Chưa có lịch sử chuyển đổi</h4>
              <p class="text-[11px] text-slate-500 font-sans max-w-xs mt-1.5 leading-relaxed">
                Tệp PDF bạn xử lý sẽ được lưu tiến trình ở đây, giúp bạn dễ dàng làm việc tiếp khi quay trở lại.
              </p>
            </div>
          } @else {
            @for (item of historyItems(); track item.id) {
              <div 
                role="button"
                [attr.aria-label]="'Khôi phục tiến trình tài liệu ' + item.fileName"
                tabindex="0"
                [class.border-emerald-500/50]="currentHistoryId() === item.id"
                [class.bg-emerald-950/20]="currentHistoryId() === item.id"
                [class.ring-1]="currentHistoryId() === item.id"
                [class.ring-emerald-500/40]="currentHistoryId() === item.id"
                [class.border-white/5]="currentHistoryId() !== item.id"
                [class.bg-slate-950/20]="currentHistoryId() !== item.id"
                [class.cursor-pointer]="!isParsing() && !isOptimizing()"
                [class.opacity-75]="isParsing() || isOptimizing()"
                (click)="!isParsing() && !isOptimizing() && restoreItem.emit(item)"
                (keydown.enter)="!isParsing() && !isOptimizing() && restoreItem.emit(item)"
                (keydown.space)="$event.preventDefault(); !isParsing() && !isOptimizing() && restoreItem.emit(item)"
                class="border rounded-xl p-4 transition-all hover:border-emerald-500/40 hover:bg-slate-950/40 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50">
                
                <div class="flex items-start justify-between gap-4">
                  <!-- File info -->
                  <div class="space-y-1 min-w-0 flex-1">
                    <div class="flex items-center flex-wrap gap-2 min-w-0">
                      <span class="text-xs font-bold text-slate-100 font-sans break-all truncate block select-text">
                        {{ item.fileName }}
                      </span>
                      @if (currentHistoryId() === item.id) {
                        <span class="inline-flex items-center gap-1 text-[9.5px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono shadow-sm">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Đang mở
                        </span>
                      }
                    </div>
                    <div class="flex items-center flex-wrap gap-2 text-[10.5px] text-slate-400 font-sans pt-0.5">
                      <span class="font-medium bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">{{ item.fileSize }}</span>
                      <span class="text-slate-600">•</span>
                      <span>{{ item.pdfPages?.length || 0 }} trang</span>
                      
                      <!-- Model Badge -->
                      @if (item.model) {
                        <span class="text-slate-600">•</span>
                        <span 
                          class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-medium font-mono border"
                          [class.bg-amber-500/10]="item.model === 'gemini-flash-latest'"
                          [class.text-amber-300]="item.model === 'gemini-flash-latest'"
                          [class.border-amber-500/20]="item.model === 'gemini-flash-latest'"
                          [class.bg-indigo-500/10]="item.model !== 'gemini-flash-latest'"
                          [class.text-indigo-300]="item.model !== 'gemini-flash-latest'"
                          [class.border-indigo-500/20]="item.model !== 'gemini-flash-latest'">
                          <mat-icon class="!text-[10px] !w-2.5 !h-2.5 leading-none flex items-center justify-center">
                            {{ item.model === 'gemini-flash-latest' ? 'bolt' : 'spa' }}
                          </mat-icon>
                          <span>{{ item.model === 'gemini-flash-latest' ? 'Flash' : 'Lite' }}</span>
                        </span>
                      }

                      <!-- PDF Type Badge -->
                      @if (item.pdfType) {
                        <span class="text-slate-600">•</span>
                        <span 
                          class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-medium font-sans border"
                          [class.bg-emerald-500/10]="item.pdfType === 'scan'"
                          [class.text-emerald-300]="item.pdfType === 'scan'"
                          [class.border-emerald-500/20]="item.pdfType === 'scan'"
                          [class.bg-sky-500/10]="item.pdfType === 'standard'"
                          [class.text-sky-300]="item.pdfType === 'standard'"
                          [class.border-sky-500/20]="item.pdfType === 'standard'">
                          <mat-icon class="!text-[10px] !w-2.5 !h-2.5 leading-none flex items-center justify-center">
                            {{ item.pdfType === 'scan' ? 'menu_book' : 'photo_library' }}
                          </mat-icon>
                          <span>{{ item.pdfType === 'scan' ? 'Sách Scan' : 'Tiêu chuẩn' }}</span>
                        </span>
                      }
                    </div>

                    <!-- Token Usage Row -->
                    @if (getTotalTokens(item.pdfChunks).input > 0 || getTotalTokens(item.pdfChunks).output > 0) {
                      <div class="flex items-center gap-2 pt-1 text-[10px] font-mono text-slate-400">
                        <span class="inline-flex items-center gap-1 bg-slate-900 border border-white/5 px-2 py-0.5 rounded-md text-slate-300">
                          <span class="text-slate-500">Input:</span>
                          <span class="text-emerald-400 font-bold">{{ formatTokenCount(getTotalTokens(item.pdfChunks).input) }}</span>
                          <span class="text-slate-600">|</span>
                          <span class="text-slate-500">Output:</span>
                          <span class="text-sky-400 font-bold">{{ formatTokenCount(getTotalTokens(item.pdfChunks).output) }}</span>
                        </span>
                      </div>
                    }
                  </div>

                  <!-- Quick Actions / Confirm Delete -->
                  @if (deletingItemId() === item.id) {
                    <div class="flex items-center gap-1.5 shrink-0 bg-rose-500/10 border border-rose-500/20 rounded-lg p-1 animate-fade-in">
                      <span class="text-[10px] text-rose-400 font-bold px-1.5 font-sans">Xác nhận xóa?</span>
                      <button 
                        type="button"
                        (click)="$event.stopPropagation(); deleteItem.emit(item.id); deletingItemId.set(null)"
                        class="px-2 py-1 flex items-center justify-center text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors cursor-pointer focus:outline-none">
                        Xóa
                      </button>
                      <button 
                        type="button"
                        (click)="$event.stopPropagation(); deletingItemId.set(null)"
                        class="px-2 py-1 flex items-center justify-center text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors cursor-pointer focus:outline-none">
                        Hủy
                      </button>
                    </div>
                  } @else {
                    <div class="flex items-center gap-2 shrink-0">
                      <button 
                        type="button"
                        [disabled]="isParsing() || isOptimizing()"
                        (click)="$event.stopPropagation(); restoreItem.emit(item)"
                        class="px-2.5 py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer focus:outline-none">
                        <mat-icon class="!text-[12px] !w-3 !h-3 leading-none flex items-center justify-center">folder_shared</mat-icon>
                        <span>Khôi phục</span>
                      </button>
                      
                      <button 
                        type="button"
                        (click)="$event.stopPropagation(); deletingItemId.set(item.id)"
                        class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer focus:outline-none"
                        title="Xóa khỏi lịch sử">
                        <mat-icon class="text-[18px] w-4.5 h-4.5 flex items-center justify-center leading-none">delete_outline</mat-icon>
                      </button>
                    </div>
                  }
                </div>

                <!-- Progress display -->
                <div class="mt-3 pt-3 border-t border-white/5">
                  <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span class="flex items-center gap-1.5 font-sans font-medium text-slate-300">
                      <mat-icon class="!text-[12px] !w-3.5 !h-3.5 text-indigo-400 flex items-center justify-center leading-none">done_all</mat-icon>
                      Hoàn thành: {{ getCompletedChunksCount(item.pdfChunks) }}/{{ item.pdfChunks.length }} khối 
                      ({{ getCompletedPercent(item.pdfChunks) }}%)
                    </span>
                    <span class="text-[10px] font-mono text-slate-500 opacity-60">{{ item.timestamp | date:'HH:mm dd/MM/yyyy' }}</span>
                  </div>
                  <!-- Progress bar -->
                  <div class="mt-1.5 w-full bg-slate-950 border border-white/5 rounded-full h-1 overflow-hidden">
                    <div 
                      class="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                      [style.width.%]="getCompletedPercent(item.pdfChunks)">
                    </div>
                  </div>
                </div>

              </div>
            }
          }
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-white/5 flex items-center justify-end bg-slate-950/20">
          <button 
            type="button" 
            (click)="closeModal.emit()"
            class="px-5 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors focus:outline-none cursor-pointer">
            Đóng
          </button>
        </div>

      </div>
    </div>
  `
})
export class HistoryModal {
  historyItems = input.required<any[]>();
  currentHistoryId = input.required<string | null>();
  isParsing = input.required<boolean>();
  isOptimizing = input.required<boolean>();

  closeModal = output<void>();
  restoreItem = output<any>();
  deleteItem = output<string>();

  deletingItemId = signal<string | null>(null);

  getCompletedChunksCount(chunks: any[]): number {
    if (!chunks) return 0;
    return chunks.filter(c => c.status === 'completed').length;
  }

  getCompletedPercent(chunks: any[]): number {
    if (!chunks || chunks.length === 0) return 0;
    const completed = chunks.filter(c => c.status === 'completed').length;
    return Math.round((completed / chunks.length) * 100);
  }

  getTotalTokens(chunks: any[]): { input: number; output: number } {
    if (!chunks) return { input: 0, output: 0 };
    let input = 0;
    let output = 0;
    for (const c of chunks) {
      if (c.inputTokens) input += c.inputTokens;
      if (c.outputTokens) output += c.outputTokens;
    }
    return { input, output };
  }

  formatTokenCount(count: number): string {
    if (!count || count === 0) return '0';
    if (count < 1000) {
      return `${count}`;
    }
    const inK = count / 1000;
    // Format to 1 decimal place, stripping trailing .0 if integer
    const formatted = inK % 1 === 0 ? inK.toFixed(0) : inK.toFixed(1);
    return `${formatted}K`;
  }
}
