/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  effect,
  afterNextRender,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SafeHtml } from '@angular/platform-browser';
import { PdfChunk } from './app';
import { PdfPageData } from './pdf-processor';
import { PdfType, OutputMode } from './header';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fullscreen-comparison',
  imports: [CommonModule, MatIconModule],
  host: {
    '(window:keydown.escape)': 'onEscapeKey()',
    'class': 'fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none'
  },
  template: `
    <!-- Top Header & Control Toolbar -->
    <header class="h-14 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 md:px-6 flex items-center justify-between shrink-0 gap-3 z-20">
      
      <!-- Left: File Title & Chunk Info -->
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-lg text-xs font-mono shrink-0">
          <mat-icon class="text-sm">compare</mat-icon>
          <span class="font-bold">Đối chiếu 1:1</span>
        </div>
        <div class="truncate">
          <span class="text-xs font-bold text-slate-200 block truncate" title="{{ fileName() }}">{{ fileName() }}</span>
          <span class="text-[10px] text-slate-400 font-mono block">
            {{ activeChunk()?.id || 'Toàn bộ tài liệu' }} 
            @if (activeChunk()?.startPageNum) {
              (Trang {{ activeChunk()?.startPageNum }} - {{ activeChunk()?.endPageNum }})
            }
          </span>
        </div>
      </div>

      <!-- Center: Page Jumping & Navigation Controls -->
      <div class="hidden sm:flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-1 rounded-xl">
        <button 
          (click)="prevPage()"
          [disabled]="currentPageIndex() <= 0"
          class="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Trang trước">
          <mat-icon class="text-base">chevron_left</mat-icon>
        </button>

        <div class="flex items-center gap-1.5 text-xs font-mono px-2">
          <span class="text-indigo-400 font-bold">Trang</span>
          <select 
            [value]="currentPageNum()" 
            (change)="onPageSelectChange($event)"
            class="bg-slate-900 text-white font-bold px-2 py-0.5 rounded border border-white/10 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer">
            @for (page of currentPages(); track page.pageNum) {
              <option [value]="page.pageNum">{{ page.pageNum }}</option>
            }
          </select>
          <span class="text-slate-400">/ {{ maxPageNum() }}</span>
        </div>

        <button 
          (click)="nextPage()"
          [disabled]="currentPageIndex() >= currentPages().length - 1"
          class="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Trang tiếp theo">
          <mat-icon class="text-base">chevron_right</mat-icon>
        </button>
      </div>

      <!-- Right: Zoom, Theme, Download & Exit -->
      <div class="flex items-center gap-2">
        
        <!-- PDF Zoom Controls -->
        <div class="hidden md:flex items-center gap-1 bg-slate-950/80 border border-white/10 px-2 py-1 rounded-xl text-xs font-mono text-slate-400">
          <button (click)="zoomOut()" class="p-0.5 hover:text-white cursor-pointer transition-colors" title="Thu nhỏ PDF">
            <mat-icon class="text-sm">remove</mat-icon>
          </button>
          <span class="px-1 text-[11px] text-slate-300 w-10 text-center">{{ pdfZoom() }}%</span>
          <button (click)="zoomIn()" class="p-0.5 hover:text-white cursor-pointer transition-colors" title="Phóng to PDF">
            <mat-icon class="text-sm">add</mat-icon>
          </button>
          <button (click)="resetZoom()" class="text-[10px] text-indigo-400 hover:text-indigo-300 px-1 border-l border-white/10 ml-0.5 cursor-pointer">
            Fit
          </button>
        </div>

        <!-- Reader Theme Switcher (Only in Markdown mode) -->
        @if (outputMode() === 'markdown') {
          <div class="flex items-center bg-slate-950/80 border border-white/10 p-0.5 rounded-lg text-xs">
            <button 
              (click)="themeStyleChange.emit('clean')"
              class="px-2 py-1 rounded text-[11px] font-sans transition-colors cursor-pointer"
              [class.bg-white]="themeStyle() === 'clean'"
              [class.text-slate-900]="themeStyle() === 'clean'"
              [class.text-slate-400]="themeStyle() !== 'clean'"
              title="Nền trắng sáng">
              Sáng
            </button>
            <button 
              (click)="themeStyleChange.emit('warm')"
              class="px-2 py-1 rounded text-[11px] font-sans transition-colors cursor-pointer"
              [class.bg-[#fbf6ec]]="themeStyle() === 'warm'"
              [class.text-amber-900]="themeStyle() === 'warm'"
              [class.text-slate-400]="themeStyle() !== 'warm'"
              title="Nền giấy ngả vàng">
              Ấm
            </button>
            <button 
              (click)="themeStyleChange.emit('mono')"
              class="px-2 py-1 rounded text-[11px] font-sans transition-colors cursor-pointer"
              [class.bg-zinc-800]="themeStyle() === 'mono'"
              [class.text-zinc-100]="themeStyle() === 'mono'"
              [class.text-slate-400]="themeStyle() !== 'mono'"
              title="Nền tối">
              Tối
            </button>
          </div>
        }

        <!-- Quick Export Buttons (Desktop) -->
        @if (isAllCompleted()) {
          <div class="hidden lg:flex items-center gap-1.5 border-l border-white/10 pl-2">
            @if (outputMode() === 'html') {
              <button 
                (click)="downloadHtml.emit()"
                class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm cursor-pointer"
                title="Tải tệp HTML độc lập trọn bộ">
                <mat-icon class="text-xs">html</mat-icon>
                <span>Tải HTML trọn bộ</span>
              </button>
            } @else {
              <button 
                (click)="downloadDocx.emit()"
                class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm cursor-pointer"
                title="Tải Microsoft Word">
                <mat-icon class="text-xs">description</mat-icon>
                <span>Word</span>
              </button>
              <button 
                (click)="downloadEpub.emit()"
                class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm cursor-pointer"
                title="Tải EPUB">
                <mat-icon class="text-xs">book</mat-icon>
                <span>EPUB</span>
              </button>
            }
          </div>
        }

        <!-- Exit Fullscreen Button -->
        <button 
          (click)="closeModal.emit()"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ml-1">
          <mat-icon class="text-sm">close</mat-icon>
          <span class="hidden sm:inline">Thoát</span>
          <span class="text-[9px] bg-rose-500/30 px-1 rounded text-rose-200 uppercase font-mono">Esc</span>
        </button>

      </div>
    </header>

    <!-- Main Side-by-Side Comparison Workspace -->
    <div class="flex-1 flex flex-col md:flex-row min-h-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
      
      <!-- LEFT PANE: Original PDF / Scanned Document (50%) -->
      <section class="w-full md:w-1/2 flex flex-col min-h-0 bg-slate-950">
        
        <!-- Left Pane Header Badge -->
        <div class="h-9 px-4 bg-slate-900/60 border-b border-white/5 flex items-center justify-between text-xs shrink-0 select-none">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span class="font-bold text-slate-300 uppercase tracking-wider font-mono text-[11px]">Bản gốc (PDF Scan)</span>
          </div>
          <div class="text-[11px] font-mono text-slate-400">
            {{ currentPages().length }} trang trong khối này
          </div>
        </div>

        <!-- Left Scrollable Canvas Container -->
        <div 
          #pdfContainer
          class="flex-1 overflow-y-auto overflow-x-auto p-4 md:p-6 space-y-6 flex flex-col items-center bg-slate-950/70"
          (scroll)="onPdfScroll()">
          
          @for (page of currentPages(); track page.pageNum) {
            <div 
              [id]="'fullscreen-pdf-page-' + page.pageNum"
              class="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-3 transition-all shrink-0"
              [class.ring-2]="currentPageNum() === page.pageNum"
              [class.ring-indigo-500]="currentPageNum() === page.pageNum">
              
              <div class="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-white/5 pb-2">
                <span class="font-bold text-slate-200">Trang số {{ page.pageNum }}</span>
                <button 
                  (click)="scrollToHtmlAnchor(page.pageNum)"
                  class="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-sans cursor-pointer hover:underline">
                  <span>Xem chữ OCR tương ứng</span>
                  <mat-icon class="text-xs">arrow_forward</mat-icon>
                </button>
              </div>

              <!-- Zoomable PDF Image Page -->
              <div class="overflow-hidden rounded-xl bg-slate-950 flex justify-center p-2 border border-white/5">
                <div 
                  class="transition-transform duration-200 origin-top flex justify-center"
                  [style.transform]="'scale(' + (pdfZoom() / 100) + ')'">
                  <img 
                    [src]="page.pageImageUrl" 
                    alt="Trang {{ page.pageNum }}" 
                    class="max-w-full h-auto object-contain rounded shadow-md pointer-events-auto"
                    referrerpolicy="no-referrer" />
                </div>
              </div>

              @if (selectedPdfType() === 'standard' && page.extractedImages && page.extractedImages.length > 0) {
                <div class="border-t border-white/5 pt-2 flex items-center gap-2 overflow-x-auto">
                  <span class="text-[10px] text-slate-500 font-mono uppercase">Ảnh lẻ:</span>
                  @for (img of page.extractedImages; track img.labeledKey) {
                    <span class="text-[10px] px-2 py-0.5 bg-slate-800 text-sky-300 font-mono rounded border border-white/5">
                      {{ img.labeledKey }}
                    </span>
                  }
                </div>
              }

            </div>
          }
        </div>

      </section>

      <!-- RIGHT PANE: Rendered OCR HTML / Markdown Content (50%) -->
      <section class="w-full md:w-1/2 flex flex-col min-h-0 bg-slate-900/30">
        
        <!-- Right Pane Header Badge -->
        <div class="h-9 px-4 bg-slate-900/60 border-b border-white/5 flex items-center justify-between text-xs shrink-0 select-none">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-pulse"></span>
            <span class="font-bold text-slate-300 uppercase tracking-wider font-mono text-[11px]">Bản chuyển đổi (HTML / OCR)</span>
          </div>
          <div class="text-[11px] font-sans text-indigo-400 font-medium">
            Tự động nối dòng & chia trang 1:1
          </div>
        </div>

        <!-- Right Scrollable Document Reader View -->
        <div 
          #htmlContainer
          class="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center"
          (scroll)="onHtmlScroll()">
          
          @if (reflowHtml()) {
            <article 
              class="w-full max-w-2xl rounded-2xl shadow-2xl border p-6 md:p-12 transition-all duration-300 h-fit"
              [class.theme-clean]="outputMode() === 'html' || themeStyle() === 'clean'"
              [class.theme-warm]="outputMode() === 'markdown' && themeStyle() === 'warm'"
              [class.theme-mono]="outputMode() === 'markdown' && themeStyle() === 'mono'"
              [class.font-mono]="outputMode() === 'markdown' && themeStyle() === 'mono'">
              
              <!-- Clean Proportional Reader typography -->
              <div 
                class="prose max-w-none text-justify flex flex-col select-text" 
                [innerHTML]="reflowSafeHtml()">
              </div>

            </article>
          } @else {
            <div class="flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-3 my-auto">
              <mat-icon class="text-4xl text-slate-600">hourglass_empty</mat-icon>
              <p class="text-sm font-sans">Chưa có dữ liệu OCR cho khối này. Hãy chạy xử lý AI trước khi xem đối chiếu.</p>
            </div>
          }

        </div>

      </section>

    </div>
  `
})
export class FullscreenComparison {
  private platformId = inject(PLATFORM_ID);

  fileName = input.required<string>();
  activeChunk = input.required<PdfChunk | null>();
  pdfPages = input.required<PdfPageData[]>();
  reflowHtml = input.required<string>();
  reflowSafeHtml = input.required<SafeHtml>();
  themeStyle = input.required<'clean' | 'warm' | 'mono'>();
  outputMode = input<OutputMode>('html');
  selectedPdfType = input<PdfType>('scan');
  isAllCompleted = input.required<boolean>();

  closeModal = output<void>();
  themeStyleChange = output<'clean' | 'warm' | 'mono'>();
  downloadDocx = output<void>();
  downloadEpub = output<void>();
  downloadMarkdown = output<void>();
  downloadHtml = output<void>();

  pdfContainer = viewChild<ElementRef<HTMLDivElement>>('pdfContainer');
  htmlContainer = viewChild<ElementRef<HTMLDivElement>>('htmlContainer');

  pdfZoom = signal<number>(100);
  currentPageIndex = signal<number>(0);

  currentPages = signal<PdfPageData[]>([]);

  currentPageNum = signal<number>(1);
  maxPageNum = signal<number>(1);

  constructor() {
    effect(() => {
      const chunk = this.activeChunk();
      const allPages = this.pdfPages();

      if (chunk && chunk.pages && chunk.pages.length > 0) {
        this.currentPages.set(chunk.pages);
        this.currentPageNum.set(chunk.pages[0].pageNum);
        this.maxPageNum.set(chunk.pages[chunk.pages.length - 1].pageNum);
      } else if (allPages && allPages.length > 0) {
        this.currentPages.set(allPages);
        this.currentPageNum.set(allPages[0].pageNum);
        this.maxPageNum.set(allPages[allPages.length - 1].pageNum);
      }
    });

    afterNextRender(() => {
      // Bind jump handler to window for inline onclick hooks in HTML
      if (isPlatformBrowser(this.platformId)) {
        (window as any).jumpToPdfPage = (pageNum: number) => {
          this.scrollToPdfPage(pageNum);
        };
      }
    });
  }

  onEscapeKey() {
    this.closeModal.emit();
  }

  zoomIn() {
    this.pdfZoom.update(z => Math.min(z + 20, 250));
  }

  zoomOut() {
    this.pdfZoom.update(z => Math.max(z - 20, 50));
  }

  resetZoom() {
    this.pdfZoom.set(100);
  }

  prevPage() {
    const idx = this.currentPageIndex();
    if (idx > 0) {
      this.currentPageIndex.set(idx - 1);
      const targetPage = this.currentPages()[idx - 1];
      if (targetPage) {
        this.currentPageNum.set(targetPage.pageNum);
        this.scrollToPdfPage(targetPage.pageNum);
        this.scrollToHtmlAnchor(targetPage.pageNum);
      }
    }
  }

  nextPage() {
    const idx = this.currentPageIndex();
    const pages = this.currentPages();
    if (idx < pages.length - 1) {
      this.currentPageIndex.set(idx + 1);
      const targetPage = pages[idx + 1];
      if (targetPage) {
        this.currentPageNum.set(targetPage.pageNum);
        this.scrollToPdfPage(targetPage.pageNum);
        this.scrollToHtmlAnchor(targetPage.pageNum);
      }
    }
  }

  onPageSelectChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const pageNum = parseInt(select.value, 10);
    if (!isNaN(pageNum)) {
      this.currentPageNum.set(pageNum);
      const idx = this.currentPages().findIndex(p => p.pageNum === pageNum);
      if (idx !== -1) {
        this.currentPageIndex.set(idx);
      }
      this.scrollToPdfPage(pageNum);
      this.scrollToHtmlAnchor(pageNum);
    }
  }

  scrollToPdfPage(pageNum: number) {
    const container = this.pdfContainer()?.nativeElement;
    if (!container) return;
    const targetEl = container.querySelector(`#fullscreen-pdf-page-${pageNum}`) as HTMLElement;
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToHtmlAnchor(pageNum: number) {
    const container = this.htmlContainer()?.nativeElement;
    if (!container) return;
    const targetEl = container.querySelector(`#page-anchor-${pageNum}`) as HTMLElement;
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onPdfScroll() {
    // Optional smooth sync indicator
  }

  onHtmlScroll() {
    // Optional smooth sync indicator
  }
}
