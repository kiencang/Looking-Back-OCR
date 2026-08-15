/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, output, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DocumentProcessingService } from './services/document-processing.service';
import { SafeHtml } from '@angular/platform-browser';

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
            <mat-icon class="text-xs">collections</mat-icon>
            Ảnh & Bản gốc
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
              <span class="hidden sm:inline">Toàn màn hình</span>
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

              <!-- EPUB Export Wrapper (Markdown mode) -->
              <div class="relative group">
                <button 
                  (click)="downloadEpub.emit()"
                  [disabled]="isParsing() || isOptimizing()"
                  class="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow shadow-emerald-500/10 cursor-pointer focus:outline-none disabled:cursor-not-allowed shrink-0">
                  <mat-icon class="text-[18px] w-[18px] h-[18px] leading-[18px] flex items-center justify-center">book</mat-icon>
                  <span>Tải EPUB (đầy đủ)</span>
                </button>
                <!-- Tailwind Tooltip Downwards -->
                <div class="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 pointer-events-none z-50 bg-slate-900 border border-white/10 text-slate-200 text-[11px] font-sans py-1.5 px-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 scale-95 group-hover:scale-100 whitespace-nowrap">
                  Tải sách điện tử định dạng EPUB 3 đầy đủ
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
                  <button 
                    (click)="downloadEpubForChunk.emit()"
                    [disabled]="isParsing() || isOptimizing()"
                    class="py-1.5 px-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-50 text-[11px] font-bold rounded-md flex items-center justify-center gap-1 transition cursor-pointer disabled:cursor-not-allowed">
                    <mat-icon class="text-[14px] w-[14px] h-[14px] leading-[14px] flex items-center justify-center">book</mat-icon>
                    <span>Tải EPUB ({{ activeChunk()?.id | lowercase }})</span>
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
          <div class="w-full max-w-3xl flex flex-col" id="pdf-scroller-layout">
            <div class="text-center py-2 px-3 mb-3 text-[11px] font-sans block bg-slate-900 border border-white/5 rounded-xl shrink-0 truncate"
                 [class.text-emerald-400]="selectedPdfType() === 'scan'"
                 [class.text-sky-400]="selectedPdfType() === 'standard'">
              @if (selectedPdfType() === 'scan') {
                📄 Chế độ PDF Scan: Phù hợp nhất cho chuyển đổi PDF dạng scan. Không có khả năng tách ảnh trong file PDF.
              } @else {
                📸 Chế độ PDF Tiêu chuẩn: Có khả năng bóc tách ảnh trong file PDF tiêu chuẩn.
              }
            </div>
            
            <!-- Bounded height scrollable container with customized scrollbar styling -->
            <div class="max-h-[66vh] overflow-y-auto pr-3 flex flex-col gap-5">
              <!-- Page renders -->
              @for (page of (activeChunk()?.pages || []); track page.pageNum) {
                <div class="border border-white/10 rounded-2xl overflow-hidden bg-slate-950 shadow-md p-4 space-y-4 shrink-0">
                  <div class="text-xs font-mono text-slate-400 flex justify-between">
                    <span class="font-bold">Trang số {{ page.pageNum }}</span>
                    @if (selectedPdfType() === 'standard') {
                      <span>Số ảnh riêng lẻ tách được: {{ page.extractedImages.length || 0 }} ảnh</span>
                    } @else {
                      <span class="text-emerald-400 font-sans text-[11px]">Trang scan trực tiếp</span>
                    }
                  </div>
                  
                  <div class="border border-white/5 rounded-xl overflow-hidden max-w-2xl mx-auto">
                    <img [src]="page.pageImageUrl" alt="Trang {{ page.pageNum }}" class="w-full h-auto object-contain" referrerpolicy="no-referrer" />
                  </div>

                  @if (selectedPdfType() === 'standard' && page.extractedImages && page.extractedImages.length > 0) {
                    <div class="border-t border-white/5 pt-4">
                      <span class="text-[11px] text-slate-400 font-semibold block mb-2 font-sans">Các ảnh lẻ từ trang này:</span>
                      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        @for (img of page.extractedImages; track img.labeledKey) {
                          <div class="bg-slate-900 border border-white/5 p-2 rounded-xl flex flex-col items-center">
                            <button type="button" (click)="zoomImage.emit(img.dataUrl)" class="cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1" title="Nhấp để phóng to ảnh">
                              <img [src]="img.dataUrl" alt="{{ img.labeledKey }}" class="h-20 object-contain" referrerpolicy="no-referrer" />
                            </button>
                            <span class="text-[10px] font-bold text-indigo-400 mt-2 font-mono">{{ img.labeledKey }}</span>
                            <span class="text-[8px] text-slate-500 font-mono">{{ img.width }}x{{ img.height }}px</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                </div>
              }
            </div>
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
  outputMode = this.docService.selectedOutputMode;
  reflowHtml = input.required<string>();
  reflowSafeHtml = input.required<SafeHtml>();
  selectedPdfType = this.docService.selectedPdfType;
  isDevMode = input.required<boolean>();
  isParsing = this.docService.isParsing;
  isOptimizing = this.docService.isOptimizing;
  activeChunk = this.docService.activeChunk;
  isAllCompleted = this.docService.isAllCompleted;

  tabChange = output<'reflow' | 'pdf' | 'source' | 'markdown'>();
  themeStyleChange = output<'clean' | 'warm' | 'mono'>();
  downloadEpub = output<void>();
  downloadDocx = output<void>();
  downloadEpubForChunk = output<void>();
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
