import { ChangeDetectionStrategy, Component, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-api-key-modal',
  imports: [CommonModule, MatIconModule],
  template: `
    <div 
      role="button"
      tabindex="0"
      (click)="closeModal.emit()"
      (keydown.escape)="closeModal.emit()"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out">
      
      <div 
        role="document"
        tabindex="0"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        class="bg-slate-900 border border-white/10 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl relative text-left cursor-default animate-scale-up">
        
        <!-- Close Button -->
        <button 
          type="button"
          (click)="closeModal.emit()"
          class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors focus:outline-none">
          <mat-icon class="text-[20px] w-5 h-5 flex items-center justify-center">close</mat-icon>
        </button>

        <div class="flex items-center gap-3 mb-6">
          <div class="h-10 w-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
            <mat-icon>vpn_key</mat-icon>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white font-sans">Cấu hình Gemini API Key</h3>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Description -->
          <p class="text-xs text-slate-300 leading-relaxed font-sans">
            Để sử dụng công cụ chuyển đổi này bạn cần khóa API Key của Gemini. Bạn hãy vào link "Nơi lấy API Key Gemini" để thao tác. Key miễn phí chỉ có hiệu lực nếu bạn dùng ứng dụng qua AI Studio, với ai dùng trên looking-back-ocr.wpsila.com, chỉ Key trả phí mới dùng được. Hãy <a href="https://aistudio.google.com/apps/513da822-939a-4929-ac44-2e0e86309b06?showAssistant=true&project=gen-lang-client-0714435643&showPreview=true&fullscreenApplet=true" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 hover:underline">remix ứng dụng trên AI Studio</a> để dùng miễn phí.
          </p>

          <div class="flex justify-center pb-2">
            <img src="remix-epub.png" alt="Remix App" class="rounded-xl border border-white/10 w-full object-contain" referrerpolicy="no-referrer" />
          </div>

          <!-- Alert/Source bar -->
          <div class="bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 flex flex-wrap items-center justify-start gap-3 sm:gap-4 text-xs">
            <div class="flex items-center gap-2">
              @if (!tempApiKey().trim()) {
                <span class="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-lg text-[11px] font-medium font-sans">
                  Bạn chưa nhập API Key cho ứng dụng
                </span>
              } @else {
                <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[11px] font-medium font-sans font-semibold">
                  Đã nhập API Key cho ứng dụng
                </span>
              }
            </div>
            
            <div class="flex items-center gap-2 text-xs">
              <span class="text-slate-700 hidden sm:inline select-none">|</span>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Nơi lấy API Key Gemini
              </a>
            </div>
          </div>

          <!-- Input section -->
          <div class="space-y-2">
            <label for="modal-gemini-key-input" class="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">
              Gemini API Key cá nhân
            </label>
            <div class="relative bg-slate-950 border border-white/15 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/25 transition-all">
              <input 
                id="modal-gemini-key-input"
                [type]="showApiKey() ? 'text' : 'password'"
                placeholder="AIzaSy..." 
                [value]="tempApiKey()"
                (input)="onInputChange($event)"
                class="w-full bg-transparent pl-4 pr-12 py-3 text-xs text-slate-200 placeholder-slate-700 font-mono focus:outline-none" />
              <button 
                type="button" 
                (click)="toggleShowKey()"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0 transition-colors focus:outline-none outline-none hover:bg-white/5 rounded-lg">
                <mat-icon class="text-[20px] w-5 h-5 flex items-center justify-center">
                  {{ showApiKey() ? 'visibility_off' : 'visibility' }}
                </mat-icon>
              </button>
            </div>
            <!-- Security note -->
            <p class="text-[11px] text-slate-400 font-sans leading-normal">
              Khóa API của bạn được lưu cục bộ tuyệt đối trong trình duyệt của bạn ( <code class="bg-slate-950 px-1.5 py-0.5 font-mono rounded text-indigo-400">LocalStorage</code> ), không bao giờ gửi lên bất kỳ máy chủ nào khác.
            </p>
          </div>
          
          <!-- Actions footer buttons -->
          <div class="border-t border-white/5 pt-4 flex items-center justify-between">
            <button 
              type="button" 
              (click)="clearKey.emit()"
              class="px-4 py-2 flex items-center text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg transition-colors duration-200 focus:outline-none">
              Xóa Key cá nhân
            </button>
            
            <div class="flex items-center gap-3">
              <button 
                type="button" 
                (click)="closeModal.emit()"
                class="px-5 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors duration-200 focus:outline-none">
                Hủy
              </button>
              <button 
                type="button" 
                (click)="save.emit(tempApiKey())"
                class="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-750 rounded-lg text-white transition-colors duration-200 shadow-md shadow-indigo-600/15 focus:outline-none">
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ApiKeyModal implements OnInit {
  clientApiKey = input.required<string>();
  
  closeModal = output<void>();
  save = output<string>();
  clearKey = output<void>();

  tempApiKey = signal('');
  showApiKey = signal(false);

  ngOnInit() {
    this.tempApiKey.set(this.clientApiKey());
  }

  onInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.tempApiKey.set(target.value);
  }

  toggleShowKey() {
    this.showApiKey.update(v => !v);
  }
}
