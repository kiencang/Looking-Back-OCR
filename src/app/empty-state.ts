import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-empty-state',
  imports: [CommonModule, MatIconModule],
  host: {
    'class': 'flex-grow flex flex-col items-center justify-center w-full'
  },
  template: `
    <div class="flex-1 max-w-4xl mx-auto flex flex-col items-center justify-center px-6 py-12 text-center" id="empty-state">
      
      <!-- Drag or Select Card -->
      <div 
        role="button"
        [attr.aria-disabled]="isParsing() ? 'true' : null"
        [tabindex]="isParsing() ? -1 : 0"
        (dragover)="onDragOver($event)"
        (drop)="onFileDropped($event)"
        (click)="!isParsing() && fileInput.click()"
        (keydown.enter)="!isParsing() && fileInput.click()"
        class="w-full max-w-lg bg-slate-950 border-2 border-dashed border-white/20 rounded-3xl p-10 md:p-14 transition-all duration-300 shadow-2xl flex flex-col items-center group select-none"
        [class.hover:border-indigo-500/50]="!isParsing()"
        [class.cursor-pointer]="!isParsing()"
        [class.cursor-not-allowed]="isParsing()">
        
        <input 
          #fileInput 
          type="file" 
          accept="application/pdf" 
          (change)="onFileSelected($event)" 
          class="hidden" />

        <!-- Disable pointer events on all elements within the card when in parsing state -->
        <div class="w-full flex flex-col items-center" [class.pointer-events-none]="isParsing()">
          <div class="h-28 w-28 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 transition-all duration-300 mb-4 border border-indigo-500/10"
               [class.group-hover:scale-105]="!isParsing()"
               [class.group-hover:bg-indigo-500/20]="!isParsing()"
               [class.group-hover:text-indigo-300]="!isParsing()">
            @if (isParsing()) {
              <mat-icon class="text-4xl w-9 h-9 text-[36px] leading-[36px] animate-spin">sync</mat-icon>
            } @else {
              <mat-icon class="w-16 h-16 text-[64px] leading-[64px]">cloud_upload</mat-icon>
            }
          </div>

          <!-- Stable Header slot (height fixed) -->
          <div class="h-6 mb-2 flex items-center justify-center">
            @if (isParsing()) {
              <h2 class="text-sm font-semibold tracking-tight font-sans text-slate-100 text-center leading-none animate-pulse">
                Đang phân tích dữ liệu...
              </h2>
            } @else {
              <span class="text-[11px] font-sans font-medium text-slate-500 text-center uppercase tracking-wider select-none">
                [Tối đa: 100MB / 500 trang]
              </span>
            }
          </div>

          <!-- Stable Description slot (height fixed) -->
          <div class="min-h-[44px] flex items-center justify-center mb-8 max-w-sm mx-auto">
            <p class="text-[11px] text-slate-400 font-sans text-center leading-normal">
              @if (isParsing()) {
                <span class="text-indigo-300 font-medium">{{ parsingStatus() || 'Hệ thống đang cấu trúc thông tin' }}</span>
              } @else {
                Hỗ trợ PDF dung lượng lên đến 100MB và tối đa 500 trang. Kéo thả file vào đây hoặc nhấp để chọn.
              }
            </p>
          </div>

          <!-- Stable Action slot (height fixed) -->
          <div class="h-[54px] w-full flex items-center justify-center">
            @if (!isParsing()) {
              <span class="px-8 py-3.5 flex items-center gap-2 text-base font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-lg shadow-indigo-600/10 font-sans text-white select-none">
                <mat-icon class="text-[20px] w-5 h-5 leading-[20px]">description</mat-icon>
                Chọn tệp tin PDF
              </span>
            } @else {
              <div class="w-full bg-slate-900 rounded-full h-1.5 max-w-xs overflow-hidden border border-white/5 mx-auto">
                <div class="bg-indigo-500 h-1.5 rounded-full animate-pulse-width" style="width: 75%"></div>
              </div>
            }
          </div>
        </div>
      </div>

    </div>
  `
})
export class EmptyState {
  isParsing = input.required<boolean>();
  parsingStatus = input.required<string>();
  isScriptLoaded = input.required<boolean>();
  

  fileSelected = output<File>();

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.isParsing()) return;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        this.fileSelected.emit(file);
      }
    }
  }

  onFileSelected(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.fileSelected.emit(inputEl.files[0]);
    }
  }
}
