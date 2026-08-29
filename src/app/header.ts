import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type ModelType = 'gemini-flash-latest' | 'gemini-pro-latest' | 'muse-spark-1.2-contributor';
export type OutputMode = 'markdown' | 'html';

export interface DocumentStyleProfile {
  bodyFont: string;
  headingFont: string;
  bodyFontSize: string;
  lineHeight: string;
  textAlign: 'justify' | 'left';
  paragraphSpacing: string;
  styleArchetype: string;
  h1FontSize?: string;
  h1FontWeight?: string;
  h2FontSize?: string;
  h2FontWeight?: string;
  h3FontSize?: string;
  h3FontWeight?: string;
  analyzedSampleChunks?: number[];
  analyzedAt?: number;
}

export const DEFAULT_STYLE_PROFILE: DocumentStyleProfile = {
  bodyFont: 'Be Vietnam Pro',
  headingFont: 'Alegreya',
  bodyFontSize: '18px',
  lineHeight: '1.72',
  textAlign: 'justify',
  paragraphSpacing: '16px',
  styleArchetype: 'Sách / Ấn phẩm tiêu chuẩn',
  h1FontSize: '2.1em',
  h1FontWeight: '700',
  h2FontSize: '1.6em',
  h2FontWeight: '700',
  h3FontSize: '1.3em',
  h3FontWeight: '600'
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-header',
  imports: [CommonModule, MatIconModule],
  template: `
    <header class="border-b border-white/5 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col lg:grid lg:grid-cols-3 items-center justify-between gap-3">
      
      <!-- Left: Logo + Title (Clickable when not processing) -->
      <button 
        type="button"
        id="header-brand-logo-btn"
        (click)="onLogoClick()"
        [disabled]="isOptimizing() || isParsing() || isBatchProcessing()"
        [title]="(isOptimizing() || isParsing() || isBatchProcessing()) ? 'Đang xử lý tài liệu, vui lòng đợi hoàn tất trước khi chuyển trang' : (hasDocument() ? 'Quay về trang tải tệp PDF' : 'Looking-Back-OCR')"
        class="flex items-center justify-center lg:justify-start gap-2.5 shrink-0 w-full lg:w-auto lg:justify-self-start group outline-none transition-all duration-200 text-left bg-transparent border-0 p-0"
        [class.cursor-pointer]="!(isOptimizing() || isParsing() || isBatchProcessing())"
        [class.cursor-not-allowed]="isOptimizing() || isParsing() || isBatchProcessing()"
        [class.opacity-60]="isOptimizing() || isParsing() || isBatchProcessing()">
        <img 
          src="favicon.svg" 
          alt="Logo" 
          class="h-8 w-8 sm:h-9 sm:w-9 object-contain transition-transform duration-200 shrink-0 select-none"
          [class.group-hover:scale-105]="!(isOptimizing() || isParsing() || isBatchProcessing())"
          referrerpolicy="no-referrer" />
        <span class="text-sm font-bold tracking-tight font-sans bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent whitespace-nowrap select-none transition-opacity duration-200"
              [class.group-hover:brightness-125]="!(isOptimizing() || isParsing() || isBatchProcessing())">
          Looking-Back-OCR
        </span>
      </button>

      <!-- Center: Model Switcher Toggle -->
      <div class="flex items-center justify-center shrink-0 lg:justify-self-center">
        <!-- Toggle: Model Switcher (Flash vs Pro vs Muse) -->
        <div class="flex items-center bg-slate-900/90 border border-white/5 rounded-full p-0.5 shadow-inner relative select-none shrink-0 transition-opacity duration-200 w-[220px]"
             [class.opacity-50]="isOptimizing() || isParsing() || isModelLocked()"
             id="model-toggle-wrapper">
          <!-- Active indicator pill background -->
          <div 
            class="absolute top-0.5 bottom-0.5 rounded-full border transition-all duration-300 pointer-events-none overflow-hidden"
            [class.bg-amber-500/10]="selectedModel() === 'gemini-flash-latest'"
            [class.border-amber-500/30]="selectedModel() === 'gemini-flash-latest'"
            [class.shadow-[0_0_14px_rgba(245,158,11,0.25)]]="selectedModel() === 'gemini-flash-latest'"
            [class.bg-violet-500/10]="selectedModel() === 'gemini-pro-latest'"
            [class.border-violet-500/30]="selectedModel() === 'gemini-pro-latest'"
            [class.shadow-[0_0_14px_rgba(139,92,246,0.25)]]="selectedModel() === 'gemini-pro-latest'"
            [class.bg-emerald-500/10]="selectedModel() === 'muse-spark-1.2-contributor'"
            [class.border-emerald-500/30]="selectedModel() === 'muse-spark-1.2-contributor'"
            [class.shadow-[0_0_14px_rgba(16,185,129,0.25)]]="selectedModel() === 'muse-spark-1.2-contributor'"
            style="width: 72px;"
            [style.left.px]="selectedModel() === 'gemini-flash-latest' ? 2 : (selectedModel() === 'gemini-pro-latest' ? 74 : 146)">
            <div class="absolute inset-0 opacity-20 blur-md rounded-full transition-colors duration-300"
                 [class.bg-amber-400]="selectedModel() === 'gemini-flash-latest'"
                 [class.bg-violet-400]="selectedModel() === 'gemini-pro-latest'"
                 [class.bg-emerald-400]="selectedModel() === 'muse-spark-1.2-contributor'">
            </div>
          </div>

          <!-- Option 1: Flash -->
          <button 
            id="toggle-btn-flash"
            type="button"
            (click)="onModelSelect('gemini-flash-latest')"
            [disabled]="isOptimizing() || isParsing() || isModelLocked()"
            class="relative w-[72px] h-7 rounded-full flex items-center justify-center gap-1 text-[11px] font-bold font-sans transition-all duration-200 outline-none cursor-pointer group disabled:cursor-not-allowed"
            [class.text-amber-400]="selectedModel() === 'gemini-flash-latest'"
            [class.text-slate-400]="selectedModel() !== 'gemini-flash-latest'"
            [class.hover:text-slate-200]="selectedModel() !== 'gemini-flash-latest' && !isModelLocked()">
            <mat-icon class="!text-[13px] !w-3.5 !h-3.5 leading-none flex items-center justify-center group-hover:scale-110 transition-transform" [class.text-amber-400]="selectedModel() === 'gemini-flash-latest'">bolt</mat-icon>
            <span>Flash</span>
            
            <!-- Tooltip -->
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-950 border border-white/10 text-slate-200 text-[10px] font-normal leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[240px] text-left z-50 pointer-events-none">
              <span class="font-bold text-amber-400 block mb-0.5">Flash (mặc định):</span>
              Thích hợp nhất trong đa số trường hợp.
              @if (isModelLocked()) {
                <span class="block mt-1 pt-1 border-t border-white/10 text-amber-300 font-medium">
                  @if (selectedModel() === 'gemini-flash-latest') {
                    🔒 Trạng thái hiện tại: Đã cố định cho tài liệu này.
                  } @else {
                    🔒 Không thể chuyển đổi vì tài liệu đã có phần được xử lý.
                  }
                </span>
              }
            </div>
          </button>

          <!-- Option 2: Pro -->
          <button 
            id="toggle-btn-pro"
            type="button"
            (click)="onModelSelect('gemini-pro-latest')"
            [disabled]="isOptimizing() || isParsing() || isModelLocked()"
            class="relative w-[72px] h-7 rounded-full flex items-center justify-center gap-1 text-[11px] font-bold font-sans transition-all duration-200 outline-none cursor-pointer group disabled:cursor-not-allowed"
            [class.text-violet-400]="selectedModel() === 'gemini-pro-latest'"
            [class.text-slate-400]="selectedModel() !== 'gemini-pro-latest'"
            [class.hover:text-slate-200]="selectedModel() !== 'gemini-pro-latest' && !isModelLocked()">
            <mat-icon class="!text-[13px] !w-3.5 !h-3.5 leading-none flex items-center justify-center group-hover:scale-110 transition-transform" [class.text-violet-400]="selectedModel() === 'gemini-pro-latest'">psychology</mat-icon>
            <span>Pro</span>
            <!-- Tooltip -->
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-950 border border-white/10 text-slate-200 text-[10px] font-normal leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[240px] text-left z-50 pointer-events-none">
              <span class="font-bold text-violet-400 block mb-0.5">Pro:</span>
              Model AI mạnh nhất trong dòng Gemini.
              @if (isModelLocked()) {
                <span class="block mt-1 pt-1 border-t border-white/10 text-violet-300 font-medium">
                  @if (selectedModel() === 'gemini-pro-latest') {
                    🔒 Trạng thái hiện tại: Đã cố định cho tài liệu này.
                  } @else {
                    🔒 Không thể chuyển đổi vì tài liệu đã có phần được xử lý.
                  }
                </span>
              }
            </div>
          </button>

          <!-- Option 4: Muse Spark -->
          <button 
            id="toggle-btn-muse"
            type="button"
            (click)="onModelSelect('muse-spark-1.2-contributor')"
            [disabled]="isOptimizing() || isParsing() || isModelLocked()"
            class="relative w-[72px] h-7 rounded-full flex items-center justify-center gap-1 text-[11px] font-bold font-sans transition-all duration-200 outline-none cursor-pointer group disabled:cursor-not-allowed"
            [class.text-emerald-400]="selectedModel() === 'muse-spark-1.2-contributor'"
            [class.text-slate-400]="selectedModel() !== 'muse-spark-1.2-contributor'"
            [class.hover:text-slate-200]="selectedModel() !== 'muse-spark-1.2-contributor' && !isModelLocked()">
            <mat-icon class="!text-[13px] !w-3.5 !h-3.5 leading-none flex items-center justify-center group-hover:scale-110 transition-transform" [class.text-emerald-400]="selectedModel() === 'muse-spark-1.2-contributor'">auto_awesome</mat-icon>
            <span>Muse</span>
            <!-- Tooltip -->
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-950 border border-white/10 text-slate-200 text-[10px] font-normal leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 shadow-2xl w-[240px] text-left z-50 pointer-events-none">
              <span class="font-bold text-emerald-400 block mb-0.5">Muse Spark:</span>
              Có khả năng xử lý đa dạng các kiểu tài liệu.
              @if (isModelLocked()) {
                <span class="block mt-1 pt-1 border-t border-white/10 text-emerald-300 font-medium">
                  @if (selectedModel() === 'muse-spark-1.2-contributor') {
                    🔒 Trạng thái hiện tại: Đã cố định cho tài liệu này.
                  } @else {
                    🔒 Không thể chuyển đổi vì tài liệu đã có phần được xử lý.
                  }
                </span>
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
  clientApiKey = input.required<string>();
  historyCount = input.required<number>();
  isOptimizing = input.required<boolean>();
  isParsing = input.required<boolean>();
  isBatchProcessing = input<boolean>(false);
  isModelLocked = input<boolean>(false);
  hasDocument = input<boolean>(false);

  modelChange = output<ModelType>();
  openHistory = output<void>();
  openApiKey = output<void>();
  navigateHome = output<void>();

  onLogoClick() {
    if (this.isOptimizing() || this.isParsing() || this.isBatchProcessing()) return;
    this.navigateHome.emit();
  }

  onModelSelect(model: ModelType) {
    if (this.isOptimizing() || this.isParsing() || this.isModelLocked()) return;
    this.modelChange.emit(model);
  }
}
