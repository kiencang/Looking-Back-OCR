/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, output, effect, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DocumentProcessingService } from './services/document-processing.service';
import { SafeHtml, DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workspace-preview',
  imports: [CommonModule, MatIconModule],
  host: {
    'class': 'flex-1 flex flex-col min-h-0 bg-slate-950 w-full overflow-hidden'
  },
  template: `
      
      <!-- Top Tab Switch Layout -->
      <div class="border-b border-white/5 bg-slate-950 px-6 py-2 flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div class="flex gap-2 flex-wrap">
          <button 
            (click)="tabChange.emit('pdf')"
            class="px-4 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 font-sans cursor-pointer"
            [class.bg-white/10]="selectedTab() === 'pdf'"
            [class.text-white]="selectedTab() === 'pdf'"
            [class.font-bold]="selectedTab() === 'pdf'"
            [class.text-slate-400]="selectedTab() !== 'pdf'"
            [class.hover:text-slate-200]="selectedTab() !== 'pdf'">
            <mat-icon class="text-xs">picture_as_pdf</mat-icon>
            Bản gốc
          </button>
          
          @if (reflowHtml()) {
            <button 
              (click)="tabChange.emit('reflow')"
              class="px-4 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 font-sans cursor-pointer"
              [class.bg-white/10]="selectedTab() === 'reflow'"
              [class.text-white]="selectedTab() === 'reflow'"
              [class.font-bold]="selectedTab() === 'reflow'"
              [class.text-slate-400]="selectedTab() !== 'reflow'"
              [class.hover:text-slate-200]="selectedTab() !== 'reflow'">
              <mat-icon class="text-xs">chrome_reader_mode</mat-icon>
              Xem trước
            </button>
            @if (isDevMode()) {
              <button 
                (click)="tabChange.emit('markdown')"
                class="px-4 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 font-sans cursor-pointer"
                [class.bg-white/10]="selectedTab() === 'markdown'"
                [class.text-white]="selectedTab() === 'markdown'"
                [class.font-bold]="selectedTab() === 'markdown'"
                [class.text-slate-400]="selectedTab() !== 'markdown'"
                [class.hover:text-slate-200]="selectedTab() !== 'markdown'">
                <mat-icon class="text-xs">text_snippet</mat-icon>
                Markdown
              </button>
              <button 
                (click)="tabChange.emit('source')"
                class="px-4 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 font-sans cursor-pointer"
                [class.bg-white/10]="selectedTab() === 'source'"
                [class.text-white]="selectedTab() === 'source'"
                [class.font-bold]="selectedTab() === 'source'"
                [class.text-slate-400]="selectedTab() !== 'source'"
                [class.hover:text-slate-200]="selectedTab() !== 'source'">
                <mat-icon class="text-xs">code</mat-icon>
                HTML
              </button>
            }
          }
        </div>

        <!-- Action Bar: Export EPUB and Word & Fullscreen Comparison -->
        <div class="flex items-center gap-2 text-xs font-sans">
          @if (reflowHtml()) {
            <!-- Fullscreen Comparison Button -->
            <button 
              (click)="openFullscreen.emit()"
              class="py-2.5 px-3 bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 hover:text-indigo-100 border border-indigo-500/30 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer focus:outline-none shrink-0"
              title="Mở chế độ toàn màn hình để đối chiếu song song với bản gốc">
              <mat-icon class="text-[18px] w-[18px] h-[18px] leading-[18px] flex items-center justify-center">open_in_full</mat-icon>
              <span class="hidden sm:inline">Đối chiếu bản gốc</span>
            </button>
          }

          @if (reflowHtml() && isAllCompleted()) {
            @if (outputMode() === 'html') {
              <!-- Single HTML Export Button for Full Document -->
              <div class="relative group">
                <button 
                  (click)="downloadHtml.emit()"
                  [disabled]="isParsing() || isOptimizing()"
                  class="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow shadow-emerald-500/10 cursor-pointer focus:outline-none disabled:cursor-not-allowed shrink-0">
                  <mat-icon class="text-[18px] w-[18px] h-[18px] leading-[18px] flex items-center justify-center">html</mat-icon>
                  <span>Tải HTML (đầy đủ)</span>
                </button>
                <!-- Tailwind Tooltip Downwards -->
                <div class="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 pointer-events-none z-50 bg-slate-900 border border-white/10 text-slate-200 text-[11px] font-sans py-1.5 px-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 scale-95 group-hover:scale-100 whitespace-nowrap">
                  Tải toàn bộ tài liệu dưới dạng trang HTML/CSS độc lập
                  <!-- Tooltip Arrow Pointing Up -->
                  <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-slate-900"></div>
                </div>
              </div>
            } @else {
              <!-- Docx Export Wrapper (Markdown mode) -->
              <div class="relative group">
                <button 
                  (click)="downloadDocx.emit()"
                  [disabled]="isParsing() || isOptimizing()"
                  class="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow shadow-indigo-500/10 cursor-pointer focus:outline-none disabled:cursor-not-allowed shrink-0">
                  <mat-icon class="text-[18px] w-[18px] h-[18px] leading-[18px] flex items-center justify-center">description</mat-icon>
                  <span>Tải Docx (đầy đủ)</span>
                </button>
                <!-- Tailwind Tooltip Downwards -->
                <div class="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 pointer-events-none z-50 bg-slate-900 border border-white/10 text-slate-200 text-[11px] font-sans py-1.5 px-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 scale-95 group-hover:scale-100 whitespace-nowrap">
                  Tải tài liệu Microsoft Word (.docx) đầy đủ
                  <!-- Tooltip Arrow Pointing Up -->
                  <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-slate-900"></div>
                </div>
              </div>

            }
          }
        </div>
      </div>

      <!-- Preview Content Canvas Window -->
      <div class="flex-grow overflow-y-auto px-4 pt-4 pb-6 md:px-8 md:pt-5 md:pb-8 flex justify-center">
        
        <!-- Reflow modern article Tab container -->
        @if (selectedTab() === 'reflow') {
          <div 
            class="w-full max-w-4xl rounded-2xl shadow-lg border p-6 md:p-14 transition-all duration-300 relative"
            [class.theme-clean]="outputMode() === 'html' || themeStyle() === 'clean'"
            [class.theme-warm]="outputMode() === 'markdown' && themeStyle() === 'warm'"
            [class.theme-mono]="outputMode() === 'markdown' && themeStyle() === 'mono'"
            [class.font-mono]="outputMode() === 'markdown' && themeStyle() === 'mono'">
            
            @if (activeChunk()?.status === 'completed') {
              <!-- Single chunk download buttons -->
              <div class="flex items-center justify-end gap-2 mb-6 border-b border-slate-200/5 pb-4">
                @if (outputMode() === 'html') {
                  <button 
                    (click)="downloadHtmlForChunk.emit()"
                    [disabled]="isParsing() || isOptimizing()"
                    class="py-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-50 text-[11px] font-bold rounded-md flex items-center justify-center gap-1 transition cursor-pointer disabled:cursor-not-allowed">
                    <mat-icon class="text-[14px] w-[14px] h-[14px] leading-[14px] flex items-center justify-center">html</mat-icon>
                    <span>Tải HTML ({{ activeChunk()?.id | lowercase }})</span>
                  </button>
                } @else {
                  <button 
                    (click)="downloadDocxForChunk.emit()"
                    [disabled]="isParsing() || isOptimizing()"
                    class="py-1.5 px-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200 disabled:opacity-50 text-[11px] font-bold rounded-md flex items-center justify-center gap-1 transition cursor-pointer disabled:cursor-not-allowed">
                    <mat-icon class="text-[14px] w-[14px] h-[14px] leading-[14px] flex items-center justify-center">description</mat-icon>
                    <span>Tải Docx ({{ activeChunk()?.id | lowercase }})</span>
                  </button>
                }
              </div>
            }

            @if (reflowHtml()) {
              <!-- Render optimized AI output -->
              <div class="prose max-w-none text-justify flex flex-col" [innerHTML]="reflowSafeHtml()"></div>
            }

          </div>
        }

        <!-- Markdown Source Code Viewer -->
        @if (selectedTab() === 'markdown') {
          <div class="w-full max-w-4xl h-full flex flex-col bg-slate-950" id="markdown-source-preview">
            <div class="flex flex-col justify-center items-center h-full shrink-0 bg-slate-900/50 p-6 border border-white/5 rounded-2xl font-sans gap-4 flex-grow">
              <mat-icon class="text-slate-500 text-[48px] !h-12 !w-12 mb-2 leading-none">markdown</mat-icon>
              <p class="text-sm text-slate-400 text-center max-w-md">Mã Markdown đã được bóc tách và tạo thành công. Bạn có thể tải file Markdown về máy.</p>
              <div class="flex flex-wrap items-center justify-center gap-3 mt-4">
                @if (activeChunk()?.status === 'completed') {
                  <button 
                    (click)="downloadMarkdownForChunk.emit()" 
                    class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition cursor-pointer">
                    <mat-icon class="text-[18px] !h-[18px] !w-[18px] leading-none flex items-center justify-center -mt-[1px]">download</mat-icon>
                    Tải về .md ({{ activeChunk()?.id | lowercase }})
                  </button>
                }
                @if (isAllCompleted()) {
                  <button 
                    (click)="downloadMarkdown.emit()" 
                    class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-500/20 cursor-pointer">
                    <mat-icon class="text-[18px] !h-[18px] !w-[18px] leading-none flex items-center justify-center -mt-[1px]">download</mat-icon>
                    Tải về .md (đầy đủ)
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- Canvas View (Original exact PDF page renders) -->
        @if (selectedTab() === 'pdf') {
          <div class="w-full max-w-4xl h-full flex flex-col space-y-6 items-center" id="pdf-scroller-layout">
            @if (activeChunkPages().length > 0) {
              @for (page of activeChunkPages(); track page.pageNum) {
                <div class="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                  <div class="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-white/5 pb-2">
                    <span class="font-bold text-slate-200">Trang số {{ page.pageNum }}</span>
                    <span class="text-[10px] text-slate-500 font-mono">Độ phân giải gốc 1:1 (PNG)</span>
                  </div>
                  
                  <div class="overflow-hidden rounded-xl bg-slate-950 flex justify-center p-2 border border-white/5 min-h-[200px] items-center">
                    @if (page.pageImageUrl) {
                      <img 
                        [src]="page.pageImageUrl" 
                        alt="Trang {{ page.pageNum }}" 
                        class="max-w-full h-auto object-contain rounded shadow-md"
                        referrerpolicy="no-referrer" />
                    } @else {
                      <div class="flex items-center gap-2 text-slate-400 text-xs font-mono py-8">
                        <mat-icon class="animate-spin text-sm text-indigo-400">sync</mat-icon>
                        <span>Đang hiển thị bản gốc trang {{ page.pageNum }}...</span>
                      </div>
                    }
                  </div>
                </div>
              }
            } @else {
              <div class="w-full h-64 flex flex-col items-center justify-center text-slate-400 gap-2 border border-white/5 rounded-2xl bg-slate-900/40">
                <mat-icon class="text-3xl text-slate-600">picture_as_pdf</mat-icon>
                <span class="text-xs">Chưa có dữ liệu trang cho khối này</span>
              </div>
            }
          </div>
        }

        <!-- Source HTML code view -->
        @if (selectedTab() === 'source') {
          <div class="w-full max-w-4xl h-full flex flex-col bg-slate-950" id="html-source-preview">
            <div class="flex flex-col justify-center items-center h-full shrink-0 bg-slate-900/50 p-6 border border-white/5 rounded-2xl font-sans gap-4 flex-grow">
              <mat-icon class="text-slate-500 text-[48px] !h-12 !w-12 mb-2 leading-none">html</mat-icon>
              <p class="text-sm text-slate-400 text-center max-w-md">Mã HTML đã được bóc tách và tạo thành công. Bạn có thể tải file HTML về máy.</p>
              <div class="flex flex-wrap items-center justify-center gap-3 mt-4">
                @if (activeChunk()?.status === 'completed') {
                  <button 
                    (click)="downloadHtmlForChunk.emit()" 
                    class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition cursor-pointer">
                    <mat-icon class="text-[18px] !h-[18px] !w-[18px] leading-none flex items-center justify-center -mt-[1px]">download</mat-icon>
                    Tải về .html ({{ activeChunk()?.id | lowercase }})
                  </button>
                }
                @if (isAllCompleted()) {
                  <button 
                    (click)="downloadHtml.emit()" 
                    class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-500/20 cursor-pointer">
                    <mat-icon class="text-[18px] !h-[18px] !w-[18px] leading-none flex items-center justify-center -mt-[1px]">download</mat-icon>
                    Tải về .html (đầy đủ)
                  </button>
                }
              </div>
            </div>
          </div>
        }

      </div>
  `
})
export class WorkspacePreview {
  selectedTab = input.required<'reflow' | 'pdf' | 'source' | 'markdown'>();
  themeStyle = input.required<'clean' | 'warm' | 'mono'>();
  public docService = inject(DocumentProcessingService);
  private sanitizer = inject(DomSanitizer);
  outputMode = this.docService.selectedOutputMode;
  reflowHtml = input.required<string>();
  reflowSafeHtml = input.required<SafeHtml>();
  isDevMode = input.required<boolean>();
  isParsing = this.docService.isParsing;
  isOptimizing = this.docService.isOptimizing;
  activeChunk = this.docService.activeChunk;
  isAllCompleted = this.docService.isAllCompleted;

  activeChunkPages = computed(() => {
    const chunk = this.activeChunk();
    if (chunk && chunk.pages && chunk.pages.length > 0) {
      return chunk.pages;
    }
    return this.docService.pdfPages();
  });

  tabChange = output<'reflow' | 'pdf' | 'source' | 'markdown'>();
  themeStyleChange = output<'clean' | 'warm' | 'mono'>();

  safePdfUrl(): SafeResourceUrl | null {
    const url = this.docService.pdfObjectUrl();
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  downloadDocx = output<void>();
  downloadDocxForChunk = output<void>();
  downloadMarkdownForChunk = output<void>();
  downloadHtmlForChunk = output<void>();
  downloadMarkdown = output<void>();
  downloadHtml = output<void>();
  zoomImage = output<string>();
  openFullscreen = output<void>();

  constructor() {
    effect(() => {
      // Trigger whenever reflowHtml or selectedTab changes to 'reflow'
      const html = this.reflowHtml();
      const tab = this.selectedTab();
      
      if (tab === 'reflow' && html) {
        if (typeof window !== 'undefined' && (window as any).MathJax) {
          setTimeout(() => {
            try {
              (window as any).MathJax.typesetPromise?.();
            } catch (err) {
              console.warn('MathJax typesetting error:', err);
            }
          }, 60);
        }
      }
    });
  }
}
