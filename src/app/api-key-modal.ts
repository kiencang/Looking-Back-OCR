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
        class="bg-slate-900 border border-white/10 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl relative text-left cursor-default animate-scale-up">
        
        <!-- Close Button -->
        <button 
          type="button"
          (click)="closeModal.emit()"
          class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors focus:outline-none z-10">
          <mat-icon class="text-[20px] w-5 h-5 flex items-center justify-center">close</mat-icon>
        </button>

        <!-- Scrollable Content -->
        <div class="p-6 md:p-8 overflow-y-auto custom-scrollbar">
          <div class="flex items-center gap-3 mb-6">
            <div class="h-10 w-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 border border-indigo-500/10 shrink-0">
              <mat-icon>vpn_key</mat-icon>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white font-sans">Cấu hình API Key</h3>
            </div>
          </div>

          <div class="space-y-6">
          <!-- Description -->
          <p class="text-xs text-slate-300 leading-relaxed font-sans">
            Để sử dụng các mô hình chuyển đổi, bạn cần thiết lập API Key cá nhân tương ứng. Bạn không bắt buộc phải nhập cả 2 API cùng lúc, nếu chỉ có một API bạn vẫn dùng bình thường cho AI tương ứng đó.
          </p>

          <!-- Gemini Input section -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label for="modal-gemini-key-input" class="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                Gemini API Key cá nhân
              </label>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 text-xs hover:underline">
                Lấy Key Gemini
              </a>
            </div>
            <div class="relative bg-slate-950 border border-white/15 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/25 transition-all">
              <input 
                id="modal-gemini-key-input"
                [type]="showApiKeyGemini() ? 'text' : 'password'"
                placeholder="AIzaSy..." 
                [value]="tempGeminiApiKey()"
                (input)="onGeminiInputChange($event)"
                class="w-full bg-transparent pl-4 pr-12 py-3 text-xs text-slate-200 placeholder-slate-700 font-mono focus:outline-none" />
              <button 
                type="button" 
                (click)="toggleShowKeyGemini()"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0 transition-colors focus:outline-none outline-none hover:bg-white/5 rounded-lg">
                <mat-icon class="text-[20px] w-5 h-5 flex items-center justify-center">
                  {{ showApiKeyGemini() ? 'visibility_off' : 'visibility' }}
                </mat-icon>
              </button>
            </div>
          </div>

          <!-- Meta Input section -->
          <div class="space-y-3 p-3.5 bg-slate-950/60 rounded-2xl border border-white/5">
            <div class="flex justify-between items-center">
              <label for="modal-meta-key-input" class="block text-[10px] font-sans font-bold text-emerald-400 uppercase tracking-wider">
                Meta API Key cá nhân (Muse)
              </label>
            </div>
            <div class="relative bg-slate-950 border border-white/15 rounded-xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/25 transition-all">
              <input 
                id="modal-meta-key-input"
                [type]="showApiKeyMeta() ? 'text' : 'password'"
                placeholder="Nhập Meta API Key..." 
                [value]="tempMetaApiKey()"
                (input)="onMetaInputChange($event)"
                class="w-full bg-transparent pl-4 pr-12 py-2.5 text-xs text-slate-200 placeholder-slate-700 font-mono focus:outline-none" />
              <button 
                type="button" 
                (click)="toggleShowKeyMeta()"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0 transition-colors focus:outline-none outline-none hover:bg-white/5 rounded-lg">
                <mat-icon class="text-[20px] w-5 h-5 flex items-center justify-center">
                  {{ showApiKeyMeta() ? 'visibility_off' : 'visibility' }}
                </mat-icon>
              </button>
            </div>

            <!-- Meta Custom Model Input -->
            <div class="space-y-1.5 pt-1 border-t border-white/5">
              <div class="flex justify-between items-center">
                <label for="modal-meta-model-input" class="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                  Mã Model Meta tùy chỉnh
                </label>
                <button
                  type="button"
                  (click)="resetDefaultMetaModel()"
                  class="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-0.5 focus:outline-none">
                  <mat-icon class="!text-[12px] !w-3 !h-3 leading-none flex items-center justify-center">restart_alt</mat-icon>
                  <span>Mặc định</span>
                </button>
              </div>
              <input 
                id="modal-meta-model-input"
                type="text"
                placeholder="muse-spark-1.2-contributor" 
                [value]="tempMetaModelName()"
                (input)="onMetaModelInputChange($event)"
                class="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-700 font-mono focus:border-emerald-500 focus:outline-none transition-colors" />
              <p class="text-[10px] text-slate-500 leading-tight">
                Bạn có thể đổi sang mã Model Meta Vision khác được tài khoản của bạn hỗ trợ. Model mặc định (khi không có điều chỉnh nào): <code class="text-emerald-400 font-mono">muse-spark-1.2-contributor</code>
              </p>
            </div>
          </div>

          <!-- Security note -->
          <div class="space-y-1.5 font-sans">
            <p class="text-[11px] text-slate-400 leading-normal">
              Khóa API của bạn được lưu cục bộ tuyệt đối trong trình duyệt của bạn ( <code class="bg-slate-950 px-1.5 py-0.5 font-mono rounded text-indigo-400">LocalStorage</code> ), không bao giờ gửi lên bất kỳ máy chủ nào khác.
            </p>
            <p class="text-[10.5px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 leading-relaxed">
              <strong class="font-semibold text-amber-300">Lưu ý:</strong> Với trường hợp sử dụng Key miễn phí trên AI Studio hoặc sử dụng model trợ giá của Muse (muse-spark-1.2-contributor) chỉ nên up lên tài liệu đã hết hạn bản quyền, vì các model trên có thể sẽ sử dụng dữ liệu người dùng up lên để đào tạo model AI của họ.
            </p>
          </div>

          <!-- Divider -->
          <hr class="border-white/10" />

          <!-- Remix App Banner -->
          <div class="flex flex-col gap-3 items-center text-center">
            <p class="text-xs text-slate-400 font-sans leading-relaxed">
              Bạn có thể remix ứng dụng này để sao chép mã thành ứng dụng của riêng bạn và vibe coding (chỉnh sửa thêm) nếu cần.
            </p>
            <img src="/remix-app.png" alt="Remix this app on AI Studio" class="rounded-lg border border-white/10 shadow-lg w-full max-w-sm object-cover" referrerpolicy="no-referrer" />
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
                (click)="save.emit({ geminiKey: tempGeminiApiKey(), metaKey: tempMetaApiKey(), metaModel: tempMetaModelName() })"
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
  metaApiKey = input<string>('');
  metaModel = input<string>('muse-spark-1.2-contributor');
  
  closeModal = output<void>();
  save = output<{geminiKey: string, metaKey: string, metaModel: string}>();
  clearKey = output<void>();

  tempGeminiApiKey = signal('');
  showApiKeyGemini = signal(false);
  
  tempMetaApiKey = signal('');
  showApiKeyMeta = signal(false);

  tempMetaModelName = signal('muse-spark-1.2-contributor');

  ngOnInit() {
    this.tempGeminiApiKey.set(this.clientApiKey());
    this.tempMetaApiKey.set(this.metaApiKey());
    this.tempMetaModelName.set(this.metaModel() || 'muse-spark-1.2-contributor');
  }

  onGeminiInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.tempGeminiApiKey.set(target.value);
  }

  onMetaInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.tempMetaApiKey.set(target.value);
  }

  onMetaModelInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.tempMetaModelName.set(target.value);
  }

  resetDefaultMetaModel() {
    this.tempMetaModelName.set('muse-spark-1.2-contributor');
  }

  toggleShowKeyGemini() {
    this.showApiKeyGemini.update(v => !v);
  }

  toggleShowKeyMeta() {
    this.showApiKeyMeta.update(v => !v);
  }
}
