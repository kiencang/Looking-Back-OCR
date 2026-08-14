import { ChangeDetectionStrategy, Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PdfType } from './header';
import { DocumentProcessingService } from './services/document-processing.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-footer',
  imports: [CommonModule, MatIconModule],
  template: `
    <footer class="border-t border-white/5 bg-slate-950/80 backdrop-blur py-2.5 px-4 sm:px-6 shrink-0 z-10 w-full">
      <div class="flex flex-col md:grid md:grid-cols-3 items-center gap-3 text-xs font-sans w-full">
        
        <!-- Left side: Links and Info Metadata -->
        <div class="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-2.5 shrink-0 text-slate-400 font-normal w-full md:w-auto md:justify-self-start">
          <span class="text-slate-400">v1.0.8</span>
          <span class="text-slate-800 font-light text-xs select-none">•</span>
          <a href="https://github.com/kiencang/Looking-Back-OCR" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors duration-200 cursor-pointer">GitHub</a>
          <span class="text-slate-800 font-light text-xs select-none">•</span>
          <button type="button" (click)="openInstruction.emit()" class="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200 cursor-pointer focus:outline-none">
            Hướng dẫn
          </button>
        </div>

        <!-- Center: PDF Type Switch Toggle (Scan vs Standard) -->
        <div class="flex items-center justify-center shrink-0 md:justify-self-center">
          <div class="group flex items-center bg-slate-900/90 border border-white/10 rounded-full p-0.5 shadow-inner relative select-none shrink-0 transition-all duration-200"
               [class.opacity-60]="hasPages()"
               [class.opacity-50]="isOptimizing() || isParsing()"
               [class.pointer-events-none]="isOptimizing() || isParsing()"
               [class.cursor-not-allowed]="hasPages()"
               id="pdf-type-toggle-wrapper">

            <!-- Tooltip khi bị khóa (hasPages = true) -->
            @if (hasPages()) {
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2.5 bg-slate-800 border border-white/10 text-slate-100 text-[11px] font-normal leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[260px] text-center z-50 pointer-events-none flex flex-col items-center gap-1.5">
                <mat-icon class="!text-[16px] !w-4 !h-4 text-amber-400">lock</mat-icon>
                <span>Việc thay đổi kiểu file PDF không thể thực hiện sau khi bạn đã upload tài liệu.</span>
                <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-b border-r border-white/10 transform rotate-45"></div>
              </div>
            }
            <!-- Active indicator pill -->
            <div 
              class="absolute top-0.5 bottom-0.5 rounded-full border transition-all duration-300 pointer-events-none overflow-hidden"
              [class.bg-emerald-500/15]="selectedPdfType() === 'scan'"
              [class.border-emerald-500/40]="selectedPdfType() === 'scan'"
              [class.shadow-[0_0_12px_rgba(16,185,129,0.25)]]="selectedPdfType() === 'scan'"
              [class.bg-sky-500/15]="selectedPdfType() === 'standard'"
              [class.border-sky-500/40]="selectedPdfType() === 'standard'"
              [class.shadow-[0_0_12px_rgba(14,165,233,0.25)]]="selectedPdfType() === 'standard'"
              [style.width.px]="selectedPdfType() === 'scan' ? 104 : 124"
              [style.left.px]="selectedPdfType() === 'scan' ? 2 : 106">
              <div class="absolute inset-0 opacity-20 blur-md rounded-full transition-colors duration-300"
                   [class.bg-emerald-400]="selectedPdfType() === 'scan'"
                   [class.bg-sky-400]="selectedPdfType() === 'standard'">
              </div>
            </div>

            <!-- Option 1: PDF Scan (Default) -->
            <button 
              id="toggle-btn-scan"
              type="button"
              (click)="onPdfTypeSelect('scan')"
              [disabled]="isOptimizing() || isParsing() || hasPages()"
              class="relative w-[104px] h-7 rounded-full flex items-center justify-center gap-1.5 px-2 text-[11px] font-bold font-sans transition-all duration-200 outline-none cursor-pointer group disabled:cursor-not-allowed"
              [class.text-emerald-400]="selectedPdfType() === 'scan'"
              [class.text-slate-400]="selectedPdfType() !== 'scan'"
              [class.hover:text-slate-200]="selectedPdfType() !== 'scan' && !hasPages()">
              <mat-icon class="!text-[13px] !w-3.5 !h-3.5 leading-none flex items-center justify-center group-hover:scale-110 transition-transform" [class.text-emerald-400]="selectedPdfType() === 'scan'">menu_book</mat-icon>
              <span class="truncate">PDF Scan</span>
            </button>

            <!-- Option 2: PDF Tiêu chuẩn -->
            <button 
              id="toggle-btn-standard"
              type="button"
              (click)="onPdfTypeSelect('standard')"
              [disabled]="isOptimizing() || isParsing() || hasPages()"
              class="relative w-[124px] h-7 rounded-full flex items-center justify-center gap-1.5 px-2 text-[11px] font-bold font-sans transition-all duration-200 outline-none cursor-pointer group disabled:cursor-not-allowed"
              [class.text-sky-400]="selectedPdfType() === 'standard'"
              [class.text-slate-400]="selectedPdfType() !== 'standard'"
              [class.hover:text-slate-200]="selectedPdfType() !== 'standard' && !hasPages()">
              <mat-icon class="!text-[13px] !w-3.5 !h-3.5 leading-none flex items-center justify-center group-hover:scale-110 transition-transform" [class.text-sky-400]="selectedPdfType() === 'standard'">photo_library</mat-icon>
              <span class="truncate">PDF Tiêu chuẩn</span>
            </button>
          </div>
        </div>

        <!-- Right side: Dev mode toggle -->
        <div class="flex items-center justify-center md:justify-end md:justify-self-end gap-2 relative group w-full md:w-auto shrink-0">
          @if (hasPages() && outputMode() === 'markdown') {
            <span class="text-slate-400 font-medium select-none">Dev</span>
            <button type="button" 
                    (click)="toggleDevMode.emit()" 
                    [disabled]="isOptimizing() || isParsing()"
                    class="relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    [class.bg-indigo-500]="isDevMode()"
                    [class.bg-slate-700]="!isDevMode()">
              <span class="pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    [class.translate-x-3]="isDevMode()"
                    [class.translate-x-0]="!isDevMode()"></span>
            </button>
            <!-- Tooltip -->
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 md:translate-x-0 md:right-0 md:left-auto mb-3 hidden w-[250px] group-hover:block bg-slate-800 text-slate-100 text-[11px] px-3 py-2 rounded-lg shadow-xl border border-white/10 z-[100] text-center md:text-left pointer-events-none">
              Chỉ dành cho lập trình viên, bật để quan sát file markdown và file HTML.
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 md:translate-x-0 md:right-2 md:left-auto w-2 h-2 bg-slate-800 border-b border-r border-white/10 transform rotate-45"></div>
            </div>
          }
        </div>
        
      </div>
    </footer>
  `
})
export class Footer {
  public docService = inject(DocumentProcessingService);
  outputMode = this.docService.selectedOutputMode;
  
  selectedPdfType = input.required<PdfType>();
  isDevMode = input.required<boolean>();
  hasPages = input.required<boolean>();
  isOptimizing = input.required<boolean>();
  isParsing = input.required<boolean>();

  pdfTypeChange = output<PdfType>();
  toggleDevMode = output<void>();
  openInstruction = output<void>();

  onPdfTypeSelect(type: PdfType) {
    if (this.isOptimizing() || this.isParsing()) return;
    this.pdfTypeChange.emit(type);
  }
}
