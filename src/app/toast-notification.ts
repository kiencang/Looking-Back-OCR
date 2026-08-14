import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-toast-notification',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none" id="toast-wrapper">
      @if (apiError()) {
        <div class="pointer-events-auto bg-slate-950/95 backdrop-blur border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-4 animate-fade-in max-w-sm" id="toast-error">
          <div class="flex items-center gap-2.5">
            <mat-icon class="text-rose-400 shrink-0 text-[20px] w-5 h-5 leading-[20px] flex items-center justify-center animate-pulse">error_outline</mat-icon>
            <span class="font-sans text-sm leading-snug">{{ apiError() }}</span>
          </div>
          <button (click)="clearError.emit()" class="text-rose-300 hover:text-white shrink-0 outline-none flex items-center justify-center cursor-pointer transition-colors" aria-label="Đóng lỗi">
            <mat-icon class="text-[18px] w-[18px] h-[18px] leading-[18px] flex">close</mat-icon>
          </button>
        </div>
      }

      @if (successMessage()) {
        <div class="pointer-events-auto bg-slate-950/95 backdrop-blur border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-4 animate-fade-in max-w-sm" id="toast-success">
          <div class="flex items-center gap-2.5">
            <mat-icon class="text-emerald-400 shrink-0 text-[20px] w-5 h-5 leading-[20px] flex items-center justify-center">check_circle_outline</mat-icon>
            <span class="font-sans text-sm leading-snug">{{ successMessage() }}</span>
          </div>
          <button (click)="clearSuccess.emit()" class="text-emerald-300 hover:text-white shrink-0 outline-none flex items-center justify-center cursor-pointer transition-colors" aria-label="Đóng thông báo">
            <mat-icon class="text-[18px] w-[18px] h-[18px] leading-[18px] flex">close</mat-icon>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastNotification {
  apiError = input<string>('');
  successMessage = input<string>('');

  clearError = output<void>();
  clearSuccess = output<void>();
}
