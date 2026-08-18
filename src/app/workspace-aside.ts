import { ChangeDetectionStrategy, Component, output, inject, signal, effect, ElementRef, viewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DocumentProcessingService } from './services/document-processing.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workspace-aside',
  imports: [CommonModule, MatIconModule],
  host: {
    'class': 'w-full md:w-80 shrink-0 flex flex-col min-h-0 h-full'
  },
  template: `
    <aside class="w-full h-full border-r border-white/5 bg-slate-950/50 p-4 sm:p-5 flex flex-col space-y-5 overflow-y-auto custom-thin-scrollbar">
      
      <!-- File Info Card -->
      <div class="bg-slate-900/60 border border-white/5 rounded-2xl p-4 relative overflow-hidden group shrink-0">
        <div class="absolute top-0 right-0 p-3 text-slate-700">
          <mat-icon class="text-3xl">picture_as_pdf</mat-icon>
        </div>
        <h3 class="text-sm font-bold text-slate-200 truncate pr-6 font-sans mb-1" title="{{ fileName() }}">{{ fileName() }}</h3>
        
        <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-center">
          <div class="bg-slate-950/50 rounded-xl p-2">
            <span class="block text-[10px] text-slate-400 uppercase font-sans">Số trang</span>
            <span class="text-sm font-bold text-slate-200 font-mono">{{ totalPageCount() }}</span>
          </div>
          <div class="bg-slate-950/50 rounded-xl p-2">
            <span class="block text-[10px] text-slate-400 uppercase font-sans">Dung lượng</span>
            <span class="text-xs font-bold text-slate-300 font-mono">{{ formatFileSize(fileSize()) || 'N/A' }}</span>
          </div>
        </div>

        <!-- Reset current PDF -->
        <button 
          (click)="resetPdf.emit()"
          [disabled]="isOptimizing() || isParsing()"
          class="w-full mt-3 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 rounded-lg transition border border-white/5 font-sans disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-slate-300 cursor-pointer">
          <mat-icon class="text-sm">restart_alt</mat-icon>
          Đổi tài liệu khác
        </button>
      </div>

      <!-- Document Style Profile Badge / Section (Đầy đủ 100% thông tin quy chuẩn & mẫu) -->
      @if (documentStyleProfile() || isAnalyzingStyle()) {
        <div class="border-t border-white/5 pt-3 space-y-2 shrink-0" id="style-profile-section">
          <div class="flex flex-col gap-2 mb-1">
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
              
              <!-- 1. Loại tài liệu (Style Archetype Header) -->
              <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-indigo-400 shrink-0">auto_stories</mat-icon>
                <span class="text-[11px] font-medium truncate" title="{{ profile.styleArchetype }}">{{ profile.styleArchetype }}</span>
              </div>

              <!-- 2. Font nội dung, Font tiêu đề -->
              <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div class="bg-slate-950/40 rounded-lg p-2 border border-white/5 flex flex-col justify-between">
                  <span class="text-slate-500 text-[8.5px] uppercase tracking-wider block mb-0.5">Font nội dung</span>
                  <div class="flex items-baseline justify-between gap-1">
                    <span class="text-slate-200 font-semibold truncate" title="{{ profile.bodyFont }}">{{ profile.bodyFont }}</span>
                    <span class="text-[8.5px] text-cyan-400 bg-cyan-500/15 px-1 py-0.2 rounded font-mono shrink-0">{{ profile.bodyFontSize }}</span>
                  </div>
                </div>

                <div class="bg-slate-950/40 rounded-lg p-2 border border-white/5 flex flex-col justify-between">
                  <span class="text-slate-500 text-[8.5px] uppercase tracking-wider block mb-0.5">Font tiêu đề</span>
                  <span class="text-slate-200 font-semibold truncate" title="{{ profile.headingFont }}">{{ profile.headingFont }}</span>
                </div>
              </div>

              <!-- 3. Giãn dòng, Cách đoạn, Căn lề -->
              <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                <div class="bg-slate-950/40 rounded-lg py-1.5 px-1 border border-white/5">
                  <span class="block text-[8px] text-slate-500 uppercase">Giãn dòng</span>
                  <span class="text-slate-300 font-semibold">{{ profile.lineHeight }}</span>
                </div>
                <div class="bg-slate-950/40 rounded-lg py-1.5 px-1 border border-white/5">
                  <span class="block text-[8px] text-slate-500 uppercase">Cách đoạn</span>
                  <span class="text-slate-300 font-semibold">{{ profile.paragraphSpacing }}</span>
                </div>
                <div class="bg-slate-950/40 rounded-lg py-1.5 px-1 border border-white/5">
                  <span class="block text-[8px] text-slate-500 uppercase">Căn lề</span>
                  <span class="text-slate-300 font-semibold uppercase">{{ profile.textAlign === 'justify' ? 'Đều 2 bên' : 'Trái' }}</span>
                </div>
              </div>

              <!-- 4. Cỡ chữ thẻ Heading (H1, H2, H3) -->
              <div class="bg-slate-950/40 rounded-lg p-2 border border-white/5 space-y-1">
                <span class="text-slate-500 text-[8.5px] uppercase tracking-wider block mb-1">Cỡ chữ thẻ Heading (H1, H2, H3)</span>
                <div class="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
                  <div class="bg-slate-900/90 rounded px-1.5 py-1 border border-white/5">
                    <span class="text-indigo-400 font-bold block text-[9px]">H1</span>
                    <span class="text-slate-200 font-semibold text-[9.5px]">{{ profile.h1FontSize || '2.1em' }}</span>
                  </div>
                  <div class="bg-slate-900/90 rounded px-1.5 py-1 border border-white/5">
                    <span class="text-indigo-400 font-bold block text-[9px]">H2</span>
                    <span class="text-slate-200 font-semibold text-[9.5px]">{{ profile.h2FontSize || '1.6em' }}</span>
                  </div>
                  <div class="bg-slate-900/90 rounded px-1.5 py-1 border border-white/5">
                    <span class="text-indigo-400 font-bold block text-[9px]">H3</span>
                    <span class="text-slate-200 font-semibold text-[9.5px]">{{ profile.h3FontSize || '1.3em' }}</span>
                  </div>
                </div>
              </div>

              <!-- 5. Khối lấy mẫu (Sample Chunks used for styling) -->
              @if (profile.analyzedSampleChunks && profile.analyzedSampleChunks.length > 0) {
                <div class="w-full flex items-center justify-between text-[10px] font-mono bg-slate-950/40 rounded-lg px-2.5 py-1.5 border border-white/5 whitespace-nowrap">
                  <span class="text-slate-400 font-medium shrink-0">Khối lấy mẫu:</span>
                  <div class="flex items-center gap-1.5 shrink-0">
                    @for (cIdx of profile.analyzedSampleChunks; track cIdx) {
                      <span class="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold">
                        Khối {{ cIdx + 1 }}
                      </span>
                    }
                  </div>
                </div>
              }

            </div>
          }
        </div>
      }

      <!-- Processing Controls -->
      <div class="space-y-2.5 shrink-0">
        <!-- Batch Process Button -->
        <div class="flex items-center gap-2">
          @if (isBatchProcessing()) {
            <button 
              (click)="stopBatch.emit()"
              [disabled]="shouldStopBatch()"
              class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition border border-rose-500/30 font-sans shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              <mat-icon class="text-[18px] w-4.5 h-4.5 flex items-center justify-center">stop_circle</mat-icon>
              {{ shouldStopBatch() ? 'Đang dừng...' : 'Dừng xử lý' }}
            </button>
          }
          
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

        @if (isOptimizing()) {
          <div class="mt-2 flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-mono bg-indigo-500/10 py-1.5 px-3 rounded-md animate-pulse">
            <mat-icon class="text-[14px]">timer</mat-icon>
            <span>Thời gian: {{ optimizationTimeFormatted() }}</span>
          </div>
        }
      </div>

      <!-- Render Chunks as Interactive TOC -->
      <div class="border-t border-white/10 pt-3 space-y-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-semibold flex items-center gap-1">
            <mat-icon class="!text-[14px] !w-3.5 !h-3.5">format_list_bulleted</mat-icon>
            <span>Các khối cần xử lý</span>
          </span>
          <span class="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/5">{{ pdfChunks().length }} khối</span>
        </div>
        
        <div #chunksContainer class="space-y-2">
          @for (chunk of pdfChunks(); track chunk.index) {
            <div 
              [id]="'chunk-toc-item-' + $index"
              role="button"
              tabindex="0"
              class="rounded-xl border p-3 flex flex-col gap-2 transition-all duration-200 cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500/30 relative"
              [class.bg-indigo-900/25]="selectedChunkIndex() === $index"
              [class.border-indigo-500/60]="selectedChunkIndex() === $index"
              [class.shadow-md]="selectedChunkIndex() === $index"
              [class.shadow-indigo-500/10]="selectedChunkIndex() === $index"
              [class.bg-slate-900/40]="selectedChunkIndex() !== $index"
              [class.border-white/5]="selectedChunkIndex() !== $index"
              [class.hover:bg-slate-900/70]="selectedChunkIndex() !== $index"
              (click)="selectChunk.emit($index)"
              (keydown.enter)="selectChunk.emit($index)">
              
              <!-- Active reading left indicator bar -->
              @if (selectedChunkIndex() === $index) {
                <div class="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-sm shadow-indigo-400"></div>
              }

              <div class="flex items-center justify-between pl-1">
                 <span class="text-xs font-bold" [class.text-indigo-200]="selectedChunkIndex() === $index" [class.text-slate-200]="selectedChunkIndex() !== $index">{{ chunk.id }}</span>
                 <span class="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Trang {{ chunk.startPageNum }}-{{ chunk.endPageNum }}</span>
              </div>
              
              <div class="flex items-center justify-between mt-1 pl-1">
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
      </div>

    </aside>
  `
})
export class WorkspaceAside {
  private platformId = inject(PLATFORM_ID);
  public docService = inject(DocumentProcessingService);
  
  chunksContainer = viewChild<ElementRef<HTMLDivElement>>('chunksContainer');

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

    // Auto scroll the chunks TOC list to keep the active reading chunk in viewport
    effect(() => {
      const activeIdx = this.selectedChunkIndex();
      if (!isPlatformBrowser(this.platformId)) return;
      
      setTimeout(() => {
        const itemEl = document.getElementById(`chunk-toc-item-${activeIdx}`);
        if (itemEl) {
          itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
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
