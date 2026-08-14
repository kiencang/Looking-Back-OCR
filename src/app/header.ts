import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type ModelType = 'gemini-flash-latest' | 'gemini-flash-lite-latest' | 'gemma-4-26b-a4b-it';
export type PdfType = 'scan' | 'standard';
export type OutputMode = 'markdown' | 'html';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-header',
  imports: [CommonModule, MatIconModule],
  template: `
    <header class="border-b border-white/5 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col lg:grid lg:grid-cols-3 items-center justify-between gap-3">
      
      <!-- Left: Logo + Title -->
      <div class="flex items-center justify-center lg:justify-start gap-2.5 shrink-0 select-none w-full lg:w-auto lg:justify-self-start">
        <img src="favicon.svg" alt="Logo" class="h-8 w-8 sm:h-9 sm:w-9 object-contain hover:scale-105 transition-transform duration-200 cursor-pointer shrink-0" referrerpolicy="no-referrer" />
        <h1 class="text-sm font-bold tracking-tight font-sans bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent whitespace-nowrap">Looking-Back-OCR</h1>
      </div>

      <!-- Center: Model & Output Format Toggles -->
      <div class="flex flex-wrap items-center justify-center gap-2.5 shrink-0 lg:justify-self-center">
        
        <!-- Toggle 1: Model Switcher (Flash vs Lite) -->
        <div class="flex items-center bg-slate-900/90 border border-white/5 rounded-full p-0.5 shadow-inner relative select-none shrink-0 transition-opacity duration-200 w-[148px]"
             [class.opacity-50]="isOptimizing() || isParsing()"
             [class.pointer-events-none]="isOptimizing() || isParsing()"
             id="model-toggle-wrapper">
          <!-- Active indicator pill background -->
          <div 
            class="absolute top-0.5 bottom-0.5 rounded-full border transition-all duration-300 pointer-events-none overflow-hidden"
            [class.bg-amber-500/10]="selectedModel() === 'gemini-flash-latest'"
            [class.border-amber-500/30]="selectedModel() === 'gemini-flash-latest'"
            [class.shadow-[0_0_14px_rgba(245,158,11,0.25)]]="selectedModel() === 'gemini-flash-latest'"
            [class.bg-indigo-500/10]="selectedModel() === 'gemini-flash-lite-latest'"
            [class.border-indigo-500/30]="selectedModel() === 'gemini-flash-lite-latest'"
            [class.shadow-[0_0_14px_rgba(99,102,241,0.25)]]="selectedModel() === 'gemini-flash-lite-latest'"
            style="width: 72px;"
            [style.left.px]="selectedModel() === 'gemini-flash-latest' ? 2 : 74">
            <div class="absolute inset-0 opacity-20 blur-md rounded-full transition-colors duration-300"
                 [class.bg-amber-400]="selectedModel() === 'gemini-flash-latest'"
                 [class.bg-indigo-400]="selectedModel() === 'gemini-flash-lite-latest'">
            </div>
          </div>

          <!-- Option 1: Flash -->
          <button 
            id="toggle-btn-flash"
            type="button"
            (click)="onModelSelect('gemini-flash-latest')"
            [disabled]="isOptimizing() || isParsing()"
            class="relative w-[72px] h-7 rounded-full flex items-center justify-center gap-1 text-[11px] font-bold font-sans transition-all duration-200 outline-none cursor-pointer group disabled:cursor-not-allowed"
            [class.text-amber-400]="selectedModel() === 'gemini-flash-latest'"
            [class.text-slate-400]="selectedModel() !== 'gemini-flash-latest'"
            [class.hover:text-slate-200]="selectedModel() !== 'gemini-flash-latest'">
            <mat-icon class="!text-[13px] !w-3.5 !h-3.5 leading-none flex items-center justify-center group-hover:scale-110 transition-transform" [class.text-amber-400]="selectedModel() === 'gemini-flash-latest'">bolt</mat-icon>
            <span>Flash</span>
            
            <!-- Tooltip -->
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-950 border border-white/10 text-slate-200 text-[10px] font-normal leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[240px] text-left z-50 pointer-events-none">
              <span class="font-bold text-amber-400 block mb-0.5">Flash (mặc định):</span>
              Thích hợp xử lý tài liệu phức tạp, sách cổ và thơ phú.
            </div>
          </button>

          <!-- Option 2: Lite -->
          <button 
            id="toggle-btn-lite"
            type="button"
            (click)="onModelSelect('gemini-flash-lite-latest')"
            [disabled]="isOptimizing() || isParsing()"
            class="relative w-[72px] h-7 rounded-full flex items-center justify-center gap-1 text-[11px] font-bold font-sans transition-all duration-200 outline-none cursor-pointer group disabled:cursor-not-allowed"
            [class.text-indigo-400]="selectedModel() === 'gemini-flash-lite-latest'"
            [class.text-slate-400]="selectedModel() !== 'gemini-flash-lite-latest'"
            [class.hover:text-slate-200]="selectedModel() !== 'gemini-flash-lite-latest'">
            <mat-icon class="!text-[13px] !w-3.5 !h-3.5 leading-none flex items-center justify-center group-hover:scale-110 transition-transform" [class.text-indigo-400]="selectedModel() === 'gemini-flash-lite-latest'">spa</mat-icon>
            <span>Lite</span>

            <!-- Tooltip -->
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-950 border border-white/10 text-slate-200 text-[10px] font-normal leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[240px] text-left z-50 pointer-events-none">
              <span class="font-bold text-indigo-400 block mb-0.5">Lite:</span>
              Tối ưu tốc độ cao cho các tài liệu có cấu trúc đơn giản.
            </div>
          </button>
        </div>

        <!-- Toggle 2: Format Switcher (Markdown vs HTML) -->
        <div class="flex items-center bg-slate-900/90 border border-white/5 rounded-full p-0.5 shadow-inner relative select-none shrink-0 transition-opacity duration-200 w-[216px]"
             [class.opacity-75]="isOutputModeLocked()"
             id="format-toggle-wrapper">
          <!-- Active indicator pill background -->
          <div 
            class="absolute top-0.5 bottom-0.5 rounded-full border transition-all duration-300 pointer-events-none overflow-hidden"
            [class.bg-cyan-500/10]="selectedOutputMode() === 'markdown'"
            [class.border-cyan-500/30]="selectedOutputMode() === 'markdown'"
            [class.shadow-[0_0_14px_rgba(6,182,212,0.25)]]="selectedOutputMode() === 'markdown'"
            [class.bg-emerald-500/10]="selectedOutputMode() === 'html'"
            [class.border-emerald-500/30]="selectedOutputMode() === 'html'"
            [class.shadow-[0_0_14px_rgba(16,185,129,0.25)]]="selectedOutputMode() === 'html'"
            style="width: 106px;"
            [style.left.px]="selectedOutputMode() === 'markdown' ? 2 : 108">
            <div class="absolute inset-0 opacity-20 blur-md rounded-full transition-colors duration-300"
                 [class.bg-cyan-400]="selectedOutputMode() === 'markdown'"
                 [class.bg-emerald-400]="selectedOutputMode() === 'html'">
            </div>
          </div>

          <!-- Format Option 1: Markdown -->
          <button 
            id="toggle-btn-markdown"
            type="button"
            (click)="onOutputModeSelect('markdown')"
            [disabled]="isOptimizing() || isParsing() || isOutputModeLocked()"
            class="relative w-[106px] h-7 rounded-full flex items-center justify-center gap-1 px-2.5 text-[11px] font-bold font-sans transition-all duration-200 outline-none cursor-pointer group disabled:cursor-not-allowed whitespace-nowrap"
            [class.text-cyan-400]="selectedOutputMode() === 'markdown'"
            [class.text-slate-400]="selectedOutputMode() !== 'markdown'"
            [class.hover:text-slate-200]="selectedOutputMode() !== 'markdown' && !isOutputModeLocked()">
            <span>Markdown</span>
            @if (isOutputModeLocked() && selectedOutputMode() === 'markdown') {
              <mat-icon class="!text-[10px] !w-2.5 !h-2.5 leading-none text-slate-400/80 shrink-0">lock</mat-icon>
            }

            <!-- Tooltip -->
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-950 border border-white/10 text-slate-200 text-[10px] font-normal leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[260px] text-left z-50 pointer-events-none">
              <div class="flex items-center justify-between mb-0.5">
                <span class="font-bold text-cyan-400">Markdown (Tiết kiệm token):</span>
                @if (isOutputModeLocked()) {
                  <span class="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-medium">Đã khóa</span>
                }
              </div>
              <span>Nối dòng mượt mà, định dạng tiêu chuẩn, tiết kiệm token tối đa. Phù hợp đọc sách và xuất EPUB/Word.</span>
              @if (isOutputModeLocked()) {
                <div class="mt-1 pt-1 border-t border-white/10 text-amber-400/90 text-[9px]">
                  🔒 Chế độ đã được cố định cho tài liệu này vì đã có phần được xử lý.
                </div>
              }
            </div>
          </button>

          <!-- Format Option 2: HTML/CSS -->
          <button 
            id="toggle-btn-html"
            type="button"
            (click)="onOutputModeSelect('html')"
            [disabled]="isOptimizing() || isParsing() || isOutputModeLocked()"
            class="relative w-[106px] h-7 rounded-full flex items-center justify-center gap-1 px-2.5 text-[11px] font-bold font-sans transition-all duration-200 outline-none cursor-pointer group disabled:cursor-not-allowed whitespace-nowrap"
            [class.text-emerald-400]="selectedOutputMode() === 'html'"
            [class.text-slate-400]="selectedOutputMode() !== 'html'"
            [class.hover:text-slate-200]="selectedOutputMode() !== 'html' && !isOutputModeLocked()">
            <span>HTML/CSS</span>
            @if (isOutputModeLocked() && selectedOutputMode() === 'html') {
              <mat-icon class="!text-[10px] !w-2.5 !h-2.5 leading-none text-slate-400/80 shrink-0">lock</mat-icon>
            }

            <!-- Tooltip -->
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-950 border border-white/10 text-slate-200 text-[10px] font-normal leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[260px] text-left z-50 pointer-events-none">
              <div class="flex items-center justify-between mb-0.5">
                <span class="font-bold text-emerald-400">HTML/CSS (Bảo toàn bố cục):</span>
                @if (isOutputModeLocked()) {
                  <span class="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-medium">Đã khóa</span>
                }
              </div>
              <span>Tái hiện chính xác diện mạo, bố cục nhiều cột, căn lề, viền hộp và bảng biểu phức tạp của bản gốc.</span>
              @if (isOutputModeLocked()) {
                <div class="mt-1 pt-1 border-t border-white/10 text-amber-400/90 text-[9px]">
                  🔒 Chế độ đã được cố định cho tài liệu này vì đã có phần được xử lý.
                </div>
              }
            </div>
          </button>
        </div>

      </div>

      <!-- Right side: Actions & API Key Badge -->
      <div class="flex items-center justify-center lg:justify-end lg:justify-self-end gap-2 text-xs shrink-0 w-full lg:w-auto">
        @if (isScriptLoaded()) {
          <!-- History Button -->
          <button 
            type="button"
            (click)="openHistory.emit()"
            [disabled]="isOptimizing() || isParsing()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 rounded-full font-medium transition-colors cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none">
            <mat-icon class="!text-[15px] !w-[15px] !h-[15px] leading-none flex items-center justify-center -mt-[1px]">history</mat-icon>
            <span>Lịch sử</span>
            @if (historyCount() > 0) {
              <span class="bg-indigo-500 text-white text-[9px] min-w-[16px] h-4 flex items-center justify-center rounded-full font-semibold px-1 select-none leading-none">
                {{ historyCount() }}
              </span>
            }
          </button>

          <button 
            type="button"
            (click)="openApiKey.emit()"
            [disabled]="isOptimizing() || isParsing()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-full font-medium transition-colors cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="h-1.5 w-1.5 bg-emerald-400 rounded-full" [class.animate-pulse]="!clientApiKey()"></span>
            {{ clientApiKey() ? 'API Key cá nhân' : 'Nhập API Key' }}
          </button>
        } @else {
          <span class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-medium whitespace-nowrap">
            <span class="h-1.5 w-1.5 bg-amber-400 rounded-full animate-bounce"></span>
            Đang khởi tạo...
          </span>
        }
      </div>
    </header>
  `,
  styles: []
})
export class Header {
  isScriptLoaded = input.required<boolean>();
  selectedModel = input.required<ModelType>();
  selectedOutputMode = input.required<OutputMode>();
  isOutputModeLocked = input.required<boolean>();
  clientApiKey = input.required<string>();
  historyCount = input.required<number>();
  isOptimizing = input.required<boolean>();
  isParsing = input.required<boolean>();

  modelChange = output<ModelType>();
  outputModeChange = output<OutputMode>();
  openHistory = output<void>();
  openApiKey = output<void>();

  onModelSelect(model: ModelType) {
    if (this.isOptimizing() || this.isParsing()) return;
    this.modelChange.emit(model);
  }

  onOutputModeSelect(mode: OutputMode) {
    if (this.isOptimizing() || this.isParsing() || this.isOutputModeLocked()) return;
    this.outputModeChange.emit(mode);
  }
}
