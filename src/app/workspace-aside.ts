import { ChangeDetectionStrategy, Component, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DocumentProcessingService } from './services/document-processing.service';

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
          <h3 class="text-sm font-bold text-slate-200 truncate pr-6 font-sans mb-1" title="{{ fileName() }}">{{ fileName() }}</h3>
          
          <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5 text-center">
            <div class="bg-slate-950/50 rounded-xl p-2.5">
              <span class="block text-[10px] text-slate-400 uppercase font-sans">Số trang</span>
              <span class="text-sm font-bold text-slate-200 font-mono">{{ totalPageCount() }}</span>
            </div>
            <div class="bg-slate-950/50 rounded-xl p-2.5">
              <span class="block text-[10px] text-slate-400 uppercase font-sans">Dung lượng</span>
              <span class="text-xs font-bold text-slate-300 font-mono">{{ formatFileSize(fileSize()) || 'N/A' }}</span>
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

        <!-- Document Style Profile Badge / Section -->
        @if (documentStyleProfile() || isAnalyzingStyle()) {
          <div class="mt-4 border-t border-white/5 pt-4 space-y-2" id="style-profile-section">
            <div class="flex flex-col gap-2.5 mb-1">
              <span class="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-indigo-400">palette</mat-icon>
                <span>Hồ sơ thiết kế đồng nhất</span>
              </span>
              <div>
                @if (isAnalyzingStyle()) {
                  <span class="inline-flex items-center gap-1 text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full animate-pulse border border-cyan-500/20 w-fit">
                    <mat-icon class="!text-[10px] !w-2.5 !h-2.5 animate-spin">refresh</mat-icon>
                    <span>Đang phân tích tài liệu...</span>
                  </span>
                } @else if (documentStyleProfile() && showStyleSuccessBadge()) {
                  <span class="inline-flex text-[9px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit animate-pulse">
                    Chuẩn hóa 100%
                  </span>
                }
              </div>
            </div>

            @if (documentStyleProfile(); as profile) {
              <div class="bg-slate-900/80 border border-white/10 rounded-xl p-3 space-y-2.5 text-xs relative group shadow-sm hover:border-indigo-500/30 transition-colors">
                
                <!-- Style Archetype Header -->
                <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                  <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-indigo-400 shrink-0">auto_stories</mat-icon>
                  <span class="text-[11px] font-medium truncate" title="{{ profile.styleArchetype }}">{{ profile.styleArchetype }}</span>
                </div>

                <!-- Font Specs (Body & Heading) -->
                <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div class="bg-slate-950/40 rounded-lg p-2 border border-white/5 flex flex-col justify-between">
                    <span class="text-slate-500 text-[9px] uppercase tracking-wider block mb-0.5">Font nội dung</span>
                    <div class="flex items-baseline justify-between gap-1">
                      <span class="text-slate-200 font-semibold truncate" title="{{ profile.bodyFont }}">{{ profile.bodyFont }}</span>
                      <span class="text-[9px] text-cyan-400 bg-cyan-500/15 px-1.5 py-0.5 rounded font-mono shrink-0">{{ profile.bodyFontSize }}</span>
                    </div>
                  </div>

                  <div class="bg-slate-950/40 rounded-lg p-2 border border-white/5 flex flex-col justify-between">
                    <span class="text-slate-500 text-[9px] uppercase tracking-wider block mb-0.5">Font tiêu đề</span>
                    <span class="text-slate-200 font-semibold truncate" title="{{ profile.headingFont }}">{{ profile.headingFont }}</span>
                  </div>
                </div>

                <!-- Spacing & Alignment (Line Height, Paragraph Spacing, Text Align) -->
                <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                  <div class="bg-slate-950/40 rounded-lg py-1.5 px-1 border border-white/5">
                    <span class="block text-[8.5px] text-slate-500 uppercase">Giãn dòng</span>
                    <span class="text-slate-300 font-semibold">{{ profile.lineHeight }}</span>
                  </div>
                  <div class="bg-slate-950/40 rounded-lg py-1.5 px-1 border border-white/5">
                    <span class="block text-[8.5px] text-slate-500 uppercase">Cách đoạn</span>
                    <span class="text-slate-300 font-semibold">{{ profile.paragraphSpacing }}</span>
                  </div>
                  <div class="bg-slate-950/40 rounded-lg py-1.5 px-1 border border-white/5">
                    <span class="block text-[8.5px] text-slate-500 uppercase">Căn lề</span>
                    <span class="text-slate-300 font-semibold">{{ profile.textAlign === 'justify' ? 'Căn đều' : 'Căn trái' }}</span>
                  </div>
                </div>

                <!-- Heading Scale System Preview -->
                <div class="pt-2 mt-1 border-t border-white/5">
                  <span class="text-[9px] font-bold uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1.5">
                    <mat-icon class="!w-3 !h-3 !text-[12px] text-indigo-400">format_size</mat-icon>
                    Tỷ lệ tiêu đề (Heading Scale)
                  </span>
                  <div class="grid grid-cols-3 gap-1.5 text-center font-mono">
                    <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-md py-1.5 px-1">
                      <span class="text-[8px] font-bold text-indigo-300 block mb-0.5">H1</span>
                      <span class="text-[10px] font-semibold text-indigo-200">{{ profile.h1FontSize || '2.1em' }}</span>
                    </div>
                    <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-md py-1.5 px-1">
                      <span class="text-[8px] font-bold text-indigo-300 block mb-0.5">H2</span>
                      <span class="text-[10px] font-semibold text-indigo-200">{{ profile.h2FontSize || '1.6em' }}</span>
                    </div>
                    <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-md py-1.5 px-1">
                      <span class="text-[8px] font-bold text-indigo-300 block mb-0.5">H3</span>
                      <span class="text-[10px] font-semibold text-indigo-200">{{ profile.h3FontSize || '1.3em' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Reference Sample Chunks -->
                @if (profile.analyzedSampleChunks && profile.analyzedSampleChunks.length) {
                  <div class="flex items-center justify-between pt-2.5 mt-1 border-t border-white/5 text-[9px] font-mono text-slate-400">
                    <span class="text-slate-500 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                      <mat-icon class="!text-[11px] !w-3 !h-3 text-cyan-600/80">find_in_page</mat-icon>
                      Trích mẫu từ:
                    </span>
                    <span class="text-cyan-300/90 font-medium text-right ml-2 line-clamp-1">
                      @for (idx of profile.analyzedSampleChunks; track idx; let last = $last) {
                        Khối #{{ idx + 1 }}{{ last ? '' : ', ' }}
                      }
                    </span>
                  </div>
                }

                <!-- Tooltip -->
                <div class="absolute bottom-full left-0 mb-2 px-3 py-2.5 bg-slate-950 border border-white/15 text-slate-200 text-[10px] font-normal leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[270px] text-left z-50 pointer-events-none whitespace-normal">
                  <div class="font-bold text-indigo-400 mb-1 flex items-center gap-1">
                    <mat-icon class="!text-[12px] !w-3 !h-3">auto_awesome</mat-icon>
                    Quy chuẩn Typography đồng nhất:
                  </div>
                  <span>Hệ thống đã phân tích các mẫu đại diện (đầu, giữa, cuối sách) và khóa toàn bộ thông số phông chữ, cỡ chữ, độ giãn dòng, cách đoạn và căn lề vào bộ Prompt AI để đảm bảo toàn bộ cuốn sách đồng nhất 100%.</span>
                </div>
              </div>
            }
          </div>
        }

         <!-- Batch Operations -->
         <div class="mt-4 border-t border-white/5 pt-4 space-y-2">
           <div class="flex gap-2">
             <button 
               (click)="stopBatch.emit()"
               [disabled]="!isBatchProcessing() || shouldStopBatch()"
               class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 rounded-lg transition border border-white/5 font-sans disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
               <mat-icon class="text-[18px] w-4.5 h-4.5 flex items-center justify-center">stop_circle</mat-icon>
               Dừng lại
             </button>
             
             <button 
               (click)="startBatch.emit()"
               [disabled]="isBatchProcessing() || isOptimizing() || isParsing()"
               class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition border border-indigo-500/30 font-sans shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-indigo-600/50 cursor-pointer">
               <mat-icon class="text-[18px] w-4.5 h-4.5 flex items-center justify-center">play_circle_filled</mat-icon>
               Xử lý tất cả
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
          <span class="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-semibold block mb-2">Các khối cần xử lý</span>
          
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
                    Xử lý riêng phần này
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
    public docService = inject(DocumentProcessingService);
  
  fileName = this.docService.fileName;
  fileSize = this.docService.fileSize;
  totalPageCount = this.docService.totalPageCount;
  extractedImagesCount = this.docService.extractedImagesCount;
  selectedOutputMode = this.docService.selectedOutputMode;
  isOutputModeLocked = this.docService.isOutputModeLocked;
  isBatchProcessing = this.docService.isBatchProcessing;
  shouldStopBatch = this.docService.shouldStopBatch;
  isOptimizing = this.docService.isOptimizing;
  isParsing = this.docService.isParsing;
  pdfChunks = this.docService.pdfChunks;
  selectedChunkIndex = this.docService.selectedChunkIndex;
  optimizationTimeFormatted = this.docService.optimizationTimeFormatted;
  documentStyleProfile = this.docService.documentStyleProfile;
  isAnalyzingStyle = this.docService.isAnalyzingStyle;
  showStyleSuccessBadge = signal(false);

  constructor() {
    effect(() => {
      const profile = this.documentStyleProfile();
      if (profile) {
        this.showStyleSuccessBadge.set(true);
        setTimeout(() => {
          this.showStyleSuccessBadge.set(false);
        }, 4000);
      } else {
        this.showStyleSuccessBadge.set(false);
      }
    });
  }

  resetPdf = output<void>();
  startBatch = output<void>();
  stopBatch = output<void>();
  selectChunk = output<number>();
  optimizeChunk = output<number>();

  formatFileSize(fileSize: string | undefined): string {
    if (!fileSize) return '';
    const match = fileSize.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2] || '';
      if (!isNaN(num)) {
        const rounded = parseFloat(num.toFixed(1));
        return unit ? `${rounded} ${unit}` : `${rounded}`;
      }
    }
    return fileSize;
  }
}
