import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PdfChunk } from './app';
import { PdfType } from './header';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workspace-aside',
  imports: [CommonModule, MatIconModule],
  host: {
    'class': 'w-full md:w-80 shrink-0 flex flex-col min-h-0'
  },
  template: `
    <aside class="w-full h-full border-r border-white/5 bg-slate-950/50 p-5 flex flex-col justify-between overflow-y-auto space-y-6">
      <div class="space-y-6">

        <!-- File Info Card -->
        <div class="bg-slate-900/60 border border-white/5 rounded-2xl p-4 relative overflow-hidden group">
          <div class="absolute top-0 right-0 p-3 text-slate-700">
            <mat-icon class="text-3xl">picture_as_pdf</mat-icon>
          </div>
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="text-[10px] font-mono tracking-widest uppercase font-semibold block"
                  [class.text-emerald-400]="selectedPdfType() === 'scan'"
                  [class.text-sky-400]="selectedPdfType() === 'standard'">
              {{ selectedPdfType() === 'scan' ? '📸 Sách Scan' : '📄 PDF Tiêu chuẩn' }}
            </span>
          </div>
          <h3 class="text-sm font-bold text-slate-200 truncate pr-6 font-sans" title="{{ fileName() }}">{{ fileName() }}</h3>
          
          <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5 text-center">
            <div class="bg-slate-950/50 rounded-xl p-2.5">
              <span class="block text-[10px] text-slate-400 uppercase font-sans">Trang</span>
              <span class="text-sm font-bold text-slate-200 font-mono">{{ totalPageCount() }}</span>
            </div>
            <div class="bg-slate-950/50 rounded-xl p-2.5">
              <span class="block text-[10px] text-slate-400 uppercase font-sans">
                {{ selectedPdfType() === 'scan' ? 'Chế độ' : 'Ảnh tách được' }}
              </span>
              @if (selectedPdfType() === 'scan') {
                <span class="text-xs font-bold text-emerald-400 font-mono">Trực tiếp</span>
              } @else {
                <span class="text-sm font-bold text-sky-400 font-mono">{{ extractedImagesCount() }}</span>
              }
            </div>
          </div>

          <!-- Reset current PDF -->
          <button 
            (click)="resetPdf.emit()"
            [disabled]="isOptimizing() || isParsing()"
            class="w-full mt-4 flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 rounded-lg transition border border-white/5 font-sans disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-slate-300 cursor-pointer">
            <mat-icon class="text-sm">restart_alt</mat-icon>
            Đổi tài liệu khác
          </button>
        </div>

         <!-- Batch Operations -->
         <div class="mt-4 border-t border-white/5 pt-4 space-y-2">
           <div class="flex gap-2">
             <button 
               (click)="startBatch.emit()"
               [disabled]="isBatchProcessing() || isOptimizing() || isParsing()"
               class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition border border-indigo-500/30 font-sans shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-indigo-600/50 cursor-pointer">
               <mat-icon class="text-[18px] w-4.5 h-4.5 flex items-center justify-center">play_circle_filled</mat-icon>
               Xử lý tất cả
             </button>
             
             <button 
               (click)="stopBatch.emit()"
               [disabled]="!isBatchProcessing() || shouldStopBatch()"
               class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 rounded-lg transition border border-white/5 font-sans disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
               <mat-icon class="text-[18px] w-4.5 h-4.5 flex items-center justify-center">stop_circle</mat-icon>
               Dừng lại
             </button>
           </div>
           
           @if (isBatchProcessing() && shouldStopBatch()) {
             <div class="text-[10px] text-rose-400 font-mono text-center animate-pulse">
               ⏳ Đang chờ hoàn tất nốt tiến trình dang dở...
             </div>
           }
         </div>

         <!-- Render Chunks -->
         <div class="mt-4 border-t border-white/5 pt-4 space-y-2">
          <span class="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-semibold block mb-2">Các khối cần xử lý bằng AI</span>
          
          @for (chunk of pdfChunks(); track chunk.index) {
            <div 
              role="button"
              tabindex="0"
              class="rounded-xl border p-3 flex flex-col gap-2 transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500/30"
              [class.bg-indigo-900/20]="selectedChunkIndex() === $index"
              [class.border-indigo-500/50]="selectedChunkIndex() === $index"
              [class.bg-slate-900/30]="selectedChunkIndex() !== $index"
              [class.border-white/5]="selectedChunkIndex() !== $index"
              [class.hover:bg-slate-900/60]="selectedChunkIndex() !== $index"
              (click)="selectChunk.emit($index)"
              (keydown.enter)="selectChunk.emit($index)">
              <div class="flex items-center justify-between">
                 <span class="text-xs font-bold text-slate-200">{{ chunk.id }}</span>
                 <span class="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Trang {{ chunk.startPageNum }}-{{ chunk.endPageNum }}</span>
              </div>
              
              <div class="flex items-center justify-between mt-1">
                <span class="text-[10px] text-slate-400 font-mono">
                  @if (chunk.status === 'pending') { <span class="text-slate-400">⏳ Chờ lệnh</span> } 
                  @else if (chunk.status === 'processing') { <span class="text-amber-400 animate-pulse">⚙️ Đang xử lý...</span> } 
                  @else if (chunk.status === 'completed') { <span class="text-emerald-400">✅ Hoàn tất</span> } 
                  @else { <span class="text-rose-400">❌ Xảy ra lỗi</span> }
                </span>
                
                @if (chunk.status !== 'completed' && chunk.status !== 'processing') {
                  <button 
                    (click)="optimizeChunk.emit($index); $event.stopPropagation()"
                    [disabled]="isOptimizing()"
                    class="text-[10px] bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white px-2 py-1 rounded disabled:opacity-50 font-semibold shadow shadow-indigo-500/20 cursor-pointer">
                    Xử lý phần này
                  </button>
                }
              </div>
            </div>
          }
        </div>

        @if (isOptimizing()) {
          <div class="mt-3 flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-mono bg-indigo-500/10 py-1.5 px-3 rounded-md animate-pulse">
            <mat-icon class="text-[14px]">timer</mat-icon>
            <span>Thời gian: {{ optimizationTimeFormatted() }}</span>
          </div>
        }

      </div>
    </aside>
  `
})
export class WorkspaceAside {
  fileName = input.required<string>();
  fileSize = input.required<string>();
  totalPageCount = input.required<number>();
  extractedImagesCount = input.required<number>();
  selectedPdfType = input<PdfType>('scan');
  isBatchProcessing = input.required<boolean>();
  shouldStopBatch = input.required<boolean>();
  isOptimizing = input.required<boolean>();
  isParsing = input.required<boolean>();
  pdfChunks = input.required<PdfChunk[]>();
  selectedChunkIndex = input.required<number>();
  optimizationTimeFormatted = input.required<string>();

  resetPdf = output<void>();
  startBatch = output<void>();
  stopBatch = output<void>();
  selectChunk = output<number>();
  optimizeChunk = output<number>();
}
