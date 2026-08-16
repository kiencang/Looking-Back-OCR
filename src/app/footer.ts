import { ChangeDetectionStrategy, Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DocumentProcessingService } from './services/document-processing.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-footer',
  imports: [CommonModule, MatIconModule],
  template: `
    <footer class="border-t border-white/5 bg-slate-950/80 backdrop-blur py-2.5 px-4 sm:px-6 shrink-0 z-10 w-full">
      <div class="flex items-center justify-between text-xs font-sans w-full">
        
        <!-- Left side: Links and Info Metadata -->
        <div class="flex items-center gap-2 sm:gap-2.5 text-slate-400 font-normal">
          <span class="text-slate-400">v1.0.23</span>
          <span class="text-slate-800 font-light text-xs select-none">•</span>
          <a href="https://github.com/kiencang/Looking-Back-OCR" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors duration-200 cursor-pointer">GitHub</a>
          <span class="text-slate-800 font-light text-xs select-none">•</span>
          <button type="button" (click)="openInstruction.emit()" class="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200 cursor-pointer focus:outline-none">
            Hướng dẫn
          </button>
        </div>
        
      </div>
    </footer>
  `
})
export class Footer {
  public docService = inject(DocumentProcessingService);
  outputMode = this.docService.selectedOutputMode;

  openInstruction = output<void>();
}
