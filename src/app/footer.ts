import { ChangeDetectionStrategy, Component, output, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DocumentProcessingService } from './services/document-processing.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-footer',
  imports: [CommonModule, MatIconModule],
  template: `
    <footer class="border-t border-white/5 bg-slate-950/80 backdrop-blur py-2.5 px-4 sm:px-6 shrink-0 z-10 w-full">
      <div class="flex items-center justify-center w-full max-w-[1920px] mx-auto">
        <!-- Links and Info Metadata -->
        <div class="flex items-center gap-2 sm:gap-2.5 text-slate-400 font-normal flex-wrap justify-center text-xs font-sans">
          <span class="text-slate-400">v1.0.70</span>
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

          <!-- Toggle Dev Mode (Chỉ hiển thị khi ở chế độ Đơn giản / Markdown) -->
          @if (outputMode() === 'markdown') {
            <span class="text-slate-800 font-light text-xs select-none">•</span>
            <div class="relative group inline-flex items-center">
              <button 
                type="button"
                (click)="toggleDevMode.emit()"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-all duration-200 cursor-pointer focus:outline-none"
                [class]="isDevMode() ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.15)]' : 'text-slate-500 hover:text-slate-300 bg-white/5 border border-transparent'">
                <span class="w-1.5 h-1.5 rounded-full" [class]="isDevMode() ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600'"></span>
                Dev
              </button>

              <!-- Custom Tailwind Tooltip -->
              <div class="absolute bottom-full right-0 mb-2.5 hidden group-hover:flex flex-col items-end pointer-events-none z-50 transition-opacity duration-150">
                <div class="bg-slate-900/95 backdrop-blur-md text-slate-200 border border-slate-700/80 px-2.5 py-1.5 rounded-lg shadow-xl shadow-black/40 text-[11px] leading-relaxed whitespace-nowrap">
                  <div class="flex items-center gap-1.5 font-medium text-slate-100">
                    <span class="w-1.5 h-1.5 rounded-full" [class]="isDevMode() ? 'bg-cyan-400 shadow-[0_0_4px_#22d3ee]' : 'bg-slate-500'"></span>
                    <span>Chế độ Nhà phát triển (Dev Mode)</span>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-0.5 font-sans">
                    {{ isDevMode() ? 'Đang bật: Hiển thị tab & tải Markdown (.md) gốc' : 'Bật để xem trước & tải về file Markdown (.md) gốc' }}
                  </p>
                </div>
                <!-- Tooltip Arrow -->
                <div class="w-2 h-2 bg-slate-900 border-r border-b border-slate-700/80 transform rotate-45 mr-3 -mt-1"></div>
              </div>
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
  isOptimizing = this.docService.isOptimizing;
  isParsing = this.docService.isParsing;

  isDevMode = input<boolean>(false);

  openInstruction = output<void>();
  toggleDevMode = output<void>();
}
