import { ChangeDetectionStrategy, Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DocumentProcessingService } from './services/document-processing.service';
import { OutputMode } from './header';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-footer',
  imports: [CommonModule, MatIconModule],
  template: `
    <footer class="border-t border-white/5 bg-slate-950/80 backdrop-blur py-2.5 px-4 sm:px-6 shrink-0 z-10 w-full">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 w-full max-w-[1920px] mx-auto">
        
        <!-- Left: OCR Format Toggle (Moved from Sidebar) -->
        <div class="flex items-center gap-3">
          <div class="relative flex items-center bg-slate-900/90 border border-white/5 rounded-lg p-0.5 shadow-inner transition-opacity duration-200"
               [class.opacity-75]="isOutputModeLocked()"
               style="width: 180px;">
            
            <!-- Sliding Indicator -->
            <div 
              class="absolute top-0.5 bottom-0.5 rounded-md border transition-all duration-300 pointer-events-none overflow-hidden"
              [class.bg-cyan-500/15]="outputMode() === 'markdown'"
              [class.border-cyan-500/40]="outputMode() === 'markdown'"
              [class.bg-emerald-500/15]="outputMode() === 'html'"
              [class.border-emerald-500/40]="outputMode() === 'html'"
              style="width: calc(50% - 2px);"
              [style.left]="outputMode() === 'markdown' ? '2px' : 'calc(50%)'">
            </div>

            <!-- Buttons -->
            <button 
              type="button"
              (click)="onOutputModeSelect('markdown')"
              [disabled]="isOptimizing() || isParsing() || isOutputModeLocked()"
              class="relative w-1/2 h-6 flex items-center justify-center gap-1 text-[10px] font-bold font-sans transition-all duration-200 z-10 rounded-md cursor-pointer disabled:cursor-not-allowed group"
              [class.text-cyan-400]="outputMode() === 'markdown'"
              [class.text-slate-400]="outputMode() !== 'markdown'"
              [class.hover:text-slate-200]="outputMode() !== 'markdown' && !isOutputModeLocked()">
              <mat-icon class="!text-[12px] !w-3 !h-3 leading-none" [class.text-cyan-400]="outputMode() === 'markdown'">article</mat-icon>
              <span>Đơn giản</span>
              <!-- Tooltip Simple -->
              <div class="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-950 border border-white/15 text-slate-200 text-[10px] font-normal leading-relaxed rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[200px] text-left z-50 pointer-events-none whitespace-normal">
                <div class="font-bold text-cyan-400 mb-0.5">Markdown (Đơn giản)</div>
                <span>Tái tạo đơn giản, phù hợp xuất DOCX. Tiết kiệm token tối đa.</span>
              </div>
            </button>

            <button 
              type="button"
              (click)="onOutputModeSelect('html')"
              [disabled]="isOptimizing() || isParsing() || isOutputModeLocked()"
              class="relative w-1/2 h-6 flex items-center justify-center gap-1 text-[10px] font-bold font-sans transition-all duration-200 z-10 rounded-md cursor-pointer disabled:cursor-not-allowed group"
              [class.text-emerald-400]="outputMode() === 'html'"
              [class.text-slate-400]="outputMode() !== 'html'"
              [class.hover:text-slate-200]="outputMode() !== 'html' && !isOutputModeLocked()">
              <mat-icon class="!text-[12px] !w-3 !h-3 leading-none" [class.text-emerald-400]="outputMode() === 'html'">code</mat-icon>
              <span>Bảo toàn</span>
              <!-- Tooltip HTML -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-950 border border-white/15 text-slate-200 text-[10px] font-normal leading-relaxed rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[200px] text-left z-50 pointer-events-none whitespace-normal">
                <div class="font-bold text-emerald-400 mb-0.5">HTML/CSS (Bảo toàn)</div>
                <span>Tái tạo bảng biểu, cột, lề, font chữ tương tự bản gốc.</span>
              </div>
            </button>
            
            @if (isOutputModeLocked()) {
               <div class="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-slate-900" title="Đã khóa sau khi bắt đầu xử lý">
                 <mat-icon class="!text-[10px] !w-2.5 !h-2.5 leading-none">lock</mat-icon>
               </div>
            }
          </div>
        </div>

        <!-- Right: Links and Info Metadata -->
        <div class="flex items-center gap-2 sm:gap-2.5 text-slate-400 font-normal flex-wrap justify-center text-xs font-sans">
          <span class="text-slate-400">v1.0.47</span>
          <span class="text-slate-800 font-light text-xs select-none">•</span>
          <a href="https://github.com/kiencang/Looking-Back-OCR" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors duration-200 cursor-pointer">GitHub</a>
          <span class="text-slate-800 font-light text-xs select-none">•</span>
          <span class="text-slate-400">Nguyễn Đức Anh</span>
          <span class="text-slate-800 font-light text-xs select-none">•</span>
          <span class="text-slate-400">contact@wpsila.com</span>
          <span class="text-slate-800 font-light text-xs select-none">•</span>
          <button type="button" (click)="openInstruction.emit()" class="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200 cursor-pointer focus:outline-none">
            Hướng dẫn dùng
          </button>
        </div>
      </div>
    </footer>
  `
})
export class Footer {
  public docService = inject(DocumentProcessingService);
  outputMode = this.docService.selectedOutputMode;
  isOutputModeLocked = this.docService.isOutputModeLocked;
  isOptimizing = this.docService.isOptimizing;
  isParsing = this.docService.isParsing;

  openInstruction = output<void>();
  outputModeChange = output<OutputMode>();

  onOutputModeSelect(mode: OutputMode) {
    if (this.isOptimizing() || this.isParsing() || this.isOutputModeLocked()) return;
    this.outputModeChange.emit(mode);
  }
}
