/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  afterNextRender,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { PdfProcessor, PdfPageData } from './pdf-processor';
import { AiPromptOptimizer } from './ai-prompt-optimizer';

import { Header, ModelType, PdfType, OutputMode, DocumentStyleProfile, DEFAULT_STYLE_PROFILE } from './header';
import { Footer } from './footer';
import { EmptyState } from './empty-state';
import { InstructionModal } from './instruction-modal';
import { ApiKeyModal } from './api-key-modal';
import { HistoryModal } from './history-modal';
import { WorkspaceAside } from './workspace-aside';
import { WorkspacePreview } from './workspace-preview';
import { FullscreenComparison } from './fullscreen-comparison';
import { ToastNotification } from './toast-notification';

export interface PdfChunk {
  id: string;
  index: number;
  startPageNum: number;
  endPageNum: number;
  pages: PdfPageData[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage: string;
  markdownContent: string;
  reflowHtml: string;
  inputTokens?: number;
  outputTokens?: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    CommonModule,
    MatIconModule,
    Header,
    Footer,
    EmptyState,
    InstructionModal,
    ApiKeyModal,
    HistoryModal,
    WorkspaceAside,
    WorkspacePreview,
    FullscreenComparison,
    ToastNotification
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private platformId = inject(PLATFORM_ID);
  private pdfProcessor = inject(PdfProcessor);
  private sanitizer = inject(DomSanitizer);
  private aiOptimizer = inject(AiPromptOptimizer);


  // Script and loading state
  isScriptLoaded = computed(() => this.pdfProcessor.isScriptLoaded());
  isParsing = signal(false);
  isOptimizing = signal(false);
  isBatchProcessing = signal(false);
  shouldStopBatch = signal(false);
  selectedModel = signal<ModelType>('gemini-flash-latest');
  selectedPdfType = signal<PdfType>('scan');
  selectedOutputMode = signal<OutputMode>('html');
  selectedFormat = signal<'epub' | 'docx'>('epub');
  parsingStatus = signal('');
  apiError = signal('');
  successMessage = signal('');
  optimizationTimer = signal(0);
  private timerInterval: any = null;
  optimizationTimeFormatted = computed(() => {
    const s = this.optimizationTimer();
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  // History storage
  currentHistoryId = signal<string | null>(null);
  historyItems = signal<any[]>([]);
  showHistoryModal = signal<boolean>(false);
  deletingItemId = signal<string | null>(null);

  // Loaded document details
  fileName = signal('');
  fileSize = signal('');
  pdfFile = signal<File | null>(null);
  pdfPages = signal<PdfPageData[]>([]);
  
  pdfChunks = signal<PdfChunk[]>([]);
  selectedChunkIndex = signal<number>(0);
  
  // Document style profile for unified typography and formatting tokens
  documentStyleProfile = signal<DocumentStyleProfile | null>(null);
  isAnalyzingStyle = signal<boolean>(false);
  
  activeChunk = computed(() => {
    const chunks = this.pdfChunks();
    const idx = this.selectedChunkIndex();
    if (chunks && chunks.length > idx) return chunks[idx];
    return null;
  });

  isAllCompleted = computed(() => {
    const chunks = this.pdfChunks();
    return chunks.length > 0 && chunks.every(c => c.status === 'completed');
  });

  // Mode locking rule: Once any chunk is processing or completed, the mode is locked for the entire file
  isOutputModeLocked = computed(() => {
    const chunks = this.pdfChunks();
    return chunks.some(c => c.status === 'completed' || c.status === 'processing');
  });

  // Computed fields
  totalPageCount = computed(() => this.pdfPages().length);
  extractedImagesCount = computed(() => {
    return this.pdfPages().reduce((sum, page) => sum + (page.extractedImages?.length || 0), 0);
  });
  extractedText = computed(() => {
    return this.pdfPages()
      .map(p => p.items.map(i => i.text).join(' '))
      .join('\n\n');
  });

  // UI state
  showApiKey = signal(false);
  showApiKeyModal = signal(false);
  isDevMode = signal(false);
  tempApiKey = signal('');
  private successTimeout: any = null;
  private errorTimeout: any = null;
  selectedTab = signal<'reflow' | 'pdf' | 'source' | 'markdown'>('reflow');
  themeStyle = signal<'clean' | 'warm' | 'mono'>('clean');

  // AI Configuration Options
  clientApiKey = signal('');

  // Markdown representations
  markdownContent = computed(() => this.activeChunk()?.markdownContent || '');

  // HTML representations (rendered from Markdown)
  reflowHtml = computed(() => this.activeChunk()?.reflowHtml || '');
  
  reflowSafeHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.reflowHtml()));

  // Image Lighbox Modal
  zoomImageUrl = signal<string | null>(null);
  showInstruction = signal(false);
  showFullscreenComparison = signal(false);

  constructor() {
    effect(() => {
      const err = this.apiError();
      if (err) {
        if (this.errorTimeout) {
          clearTimeout(this.errorTimeout);
        }
        this.errorTimeout = setTimeout(() => {
          this.apiError.set('');
        }, 12000);
      }
    });

    afterNextRender(async () => {
      this.loadPdfEngine();
      await this.loadHistoryFromDb();
      
      // Load user API key from safe localStorage
      const savedKey = localStorage.getItem('user_gemini_api_key') || '';
      this.clientApiKey.set(savedKey);

      // Bind safe handler to global window object
      (window as any).zoomPdfImage = (src: string) => {
        this.zoomImageUrl.set(src);
      };
    });
  }

  openApiKeyModal() {
    this.showApiKeyModal.set(true);
  }

  showSuccess(msg: string) {
    this.successMessage.set(msg);
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
    if (msg) {
      this.successTimeout = setTimeout(() => {
        this.successMessage.set('');
      }, 7000);
    }
  }

  logError(message: any, ...optionalParams: any[]) {
    if (this.isDevMode()) {
      console.error(message, ...optionalParams);
    }
  }

  saveApiKey(rawKey: string) {
    const trimmed = rawKey.trim();
    if (trimmed && (/[\u0080-\uFFFF]/.test(trimmed) || trimmed.includes(' '))) {
      this.apiError.set('🔴 Lỗi định dạng API Key: API Key cá nhân bạn nhập chứa ký tự không hợp lệ (như dấu cách, tiếng Việt có dấu). Vui lòng kiểm tra lại.');
      return;
    }
    this.updateApiKey(trimmed);
    this.showApiKeyModal.set(false);
    this.showSuccess('Đã cấu hình API Key thành công.');
  }

  onFormatTypeChanged(format: 'epub' | 'docx') {
    this.selectedFormat.set(format);
    this.showSuccess(`Đã chuyển mục tiêu ngắt dòng và chuyển đổi sang định dạng ${format.toUpperCase()}`);
  }

  onOutputModeChanged(mode: OutputMode) {
    if (this.isOutputModeLocked()) {
      this.apiError.set('🔒 Chế độ xuất đã được cố định cho tài liệu này vì đã có phần được xử lý.');
      return;
    }
    this.selectedOutputMode.set(mode);
    if (mode === 'html') {
      this.showSuccess('Đã kích hoạt chế độ OCR HTML/CSS: Tối ưu bảo toàn bố cục không gian thị giác của tài liệu gốc.');
    } else {
      this.showSuccess('Đã kích hoạt chế độ OCR Markdown: Tiết kiệm token, dòng văn bản liền mạch tối ưu.');
    }
  }

  clearApiKeyModal() {
    this.updateApiKey('');
    this.showApiKeyModal.set(false);
    this.showSuccess('Đã xóa cấu hình API Key cá nhân.');
  }

  resetPdf() {
    this.pdfFile.set(null);
    this.fileName.set('');
    this.fileSize.set('');
    this.pdfPages.set([]);
    this.pdfChunks.set([]);
    this.selectedChunkIndex.set(0);
    this.documentStyleProfile.set(null);
    this.currentHistoryId.set(null);
    this.showSuccess('Đã chuyển sang tài liệu mới.');
  }

  /**
   * Translates technical or English Gemini exceptions & network codes into clean user-friendly Vietnamese Toast templates
   */
  translateGeminiError(errorInput: any): string {
    if (!errorInput) return '🔴 Lỗi không xác định.';
    const rawMsg = typeof errorInput === 'string' ? errorInput : (errorInput.message || JSON.stringify(errorInput));
    const lower = rawMsg.toLowerCase();

    // 1. Quota Exceeded (429)
    if (lower.includes('quota') || lower.includes('429') || lower.includes('resource_exhausted')) {
      return '🔴 Lỗi: Đã vượt quá giới hạn API miễn phí (Quota exceeded). Vui lòng thử lại vào ngày mai hoặc đăng nhập tài khoản khác còn API miễn phí.';
    }

    // 2. Permission Denied (403)
    if (lower.includes('api key') || lower.includes('api_key') || lower.includes('403') || lower.includes('permission_denied') || lower.includes('unauthorized')) {
      return '🔴 Lỗi: Thao tác bị từ chối do API Key không hợp lệ hoặc thiếu quyền hạn (Permission Denied). Hãy kiểm tra lại API Key của bạn.';
    }

    // 3. API Key Format (Accents, spaces, headers error)
    if (lower.includes('failed to construct \'headers\'') || lower.includes('bytestring') || (/[\u0080-\uFFFF]/.test(rawMsg) && (lower.includes('apikey') || lower.includes('api key') || lower.includes('key')))) {
      return '🔴 Lỗi định dạng API Key: API Key cá nhân bạn nhập chứa ký tự không hợp lệ (như dấu cách, tiếng Việt có dấu). Vui lòng vào Cài đặt để kiểm tra lại.';
    }

    // 4. Overloaded (503)
    if (lower.includes('overloaded') || lower.includes('503') || lower.includes('service_unavailable')) {
      return '🔴 Lỗi: Máy chủ cung cấp AI đang quá tải, vui lòng thử lại sau một chút.';
    }

    // 5. Network errors
    if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('failed to fetch')) {
      return '🔴 Lỗi: Bị gián đoạn mạng. Vui lòng kiểm tra lại kết nối internet.';
    }

    // 6. Timeout
    if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline_exceeded')) {
      return '🔴 Lỗi: Quá thời gian chờ (Timeout).';
    }

    // 7. General Google API direct response
    if (rawMsg.includes('Google API phản hồi thất bại:')) {
      const original = rawMsg.replace('Google API phản hồi thất bại:', '').trim();
      return `🔴 Lỗi từ AI: ${original}`;
    }

    // If it already starts with red dot or generic user-friendly Viet text, return as-is
    if (rawMsg.startsWith('🔴') || rawMsg.startsWith('Vui lòng') || rawMsg.startsWith('Định dạng') || rawMsg.startsWith('Thư viện') || rawMsg.startsWith('Tài liệu') || rawMsg.startsWith('Lỗi phân tích cú pháp') || rawMsg.startsWith('Không tìm thấy')) {
      return rawMsg;
    }
    
    if (lower.includes('api') || lower.includes('google') || lower.includes('http') || lower.includes('model')) {
      return `🔴 Lỗi từ AI: ${rawMsg}`;
    }

    return rawMsg;
  }

  async loadHistoryFromDb() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const items = await this.pdfProcessor.getAllHistoryItems();
      items.sort((a, b) => b.timestamp - a.timestamp);
      this.historyItems.set(items);
    } catch (err) {
      this.logError('Lỗi khi tải lịch sử:', err);
    }
  }

  async saveHistoryItemAndTrim(item: any) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await this.pdfProcessor.saveHistoryItem(item);
      const items = await this.pdfProcessor.getAllHistoryItems();
      items.sort((a, b) => b.timestamp - a.timestamp);
      
      if (items.length > 10) {
        const itemsToDelete = items.slice(10);
        for (const delItem of itemsToDelete) {
          await this.pdfProcessor.deleteHistoryItem(delItem.id);
        }
      }
      await this.loadHistoryFromDb();
    } catch (err) {
      this.logError('Lỗi khi lưu lịch sử và tỉa gọn:', err);
    }
  }

  async saveCurrentProgressToHistory() {
    const historyId = this.currentHistoryId();
    if (!historyId) return;
    const file = this.pdfFile();
    if (!file) return;

    try {
      const historyItem = {
        id: historyId,
        fileName: this.fileName(),
        fileSize: this.fileSize(),
        timestamp: Date.now(),
        pdfPages: this.pdfPages(),
        pdfChunks: this.pdfChunks(),
        selectedChunkIndex: this.selectedChunkIndex(),
        pdfFileBlob: file,
        model: this.selectedModel(),
        pdfType: this.selectedPdfType(),
        outputMode: this.selectedOutputMode(),
        styleProfile: this.documentStyleProfile()
      };
      await this.pdfProcessor.saveHistoryItem(historyItem);
      await this.loadHistoryFromDb(); // Keep local state updated
    } catch (err) {
      this.logError('Lỗi tự động sao lưu tiến trình:', err);
    }
  }

  async restoreHistoryItem(item: any) {
    if (!item) return;
    try {
      this.isParsing.set(true);
      this.parsingStatus.set('Đang nạp lại lịch sử chuyển đổi...');

      // 1. Reconstruct pdfFile File object from stored Blob
      const restoredFile = new File([item.pdfFileBlob], item.fileName, { type: 'application/pdf' });
      this.pdfFile.set(restoredFile);

      // 2. Set details signals
      this.fileName.set(item.fileName);
      this.fileSize.set(item.fileSize);
      this.pdfPages.set(item.pdfPages);
      this.pdfChunks.set(item.pdfChunks);
      this.currentHistoryId.set(item.id);
      this.documentStyleProfile.set(item.styleProfile || null);
      if (item.model) {
        this.selectedModel.set(item.model);
      }
      if (item.pdfType) {
        this.selectedPdfType.set(item.pdfType);
      }
      if (item.outputMode) {
        this.selectedOutputMode.set(item.outputMode);
      }

      // 3. Auto-jump to the first chunk that is NOT completed
      const indexToJump = item.pdfChunks.findIndex((c: any) => c.status !== 'completed');
      if (indexToJump !== -1) {
        this.selectedChunkIndex.set(indexToJump);
        this.selectedTab.set('pdf');
      } else {
        const idx = item.selectedChunkIndex || 0;
        this.selectedChunkIndex.set(idx);
        if (item.pdfChunks && item.pdfChunks[idx] && item.pdfChunks[idx].status === 'completed') {
          this.selectedTab.set('reflow');
        } else {
          this.selectedTab.set('pdf');
        }
      }

      this.showHistoryModal.set(false);
      this.showSuccess('Đã khôi phục lịch sử chuyển đổi.');
    } catch (err: any) {
      this.logError('Lỗi khôi phục lịch sử:', err);
      this.apiError.set('Không thể khôi phục lịch sử chuyển đổi: ' + err.message + '.');
    } finally {
      this.isParsing.set(false);
      this.parsingStatus.set('');
    }
  }

  selectChunk(idx: number) {
    this.selectedChunkIndex.set(idx);
    const chunks = this.pdfChunks();
    if (chunks && chunks[idx]) {
      const chunk = chunks[idx];
      if (chunk.status === 'completed') {
        this.selectedTab.set('reflow');
      } else {
        this.selectedTab.set('pdf');
      }
    }
  }

  async removeHistoryItem(id: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await this.pdfProcessor.deleteHistoryItem(id);
      
      // If the current loaded history item is being deleted, reset the current active view
      if (this.currentHistoryId() === id) {
        this.currentHistoryId.set(null);
        this.pdfFile.set(null);
        this.fileName.set('');
        this.fileSize.set('');
        this.pdfPages.set([]);
        this.pdfChunks.set([]);
        this.selectedChunkIndex.set(0);
      }

      this.showSuccess('Đã xóa tệp khỏi Lịch sử chuyển đổi.');
      await this.loadHistoryFromDb();
    } catch (err) {
      this.logError('Lỗi khi xóa lịch sử:', err);
    }
  }

  getCompletedChunksCount(chunks: any[]): number {
    if (!chunks) return 0;
    return chunks.filter(c => c.status === 'completed').length;
  }

  getCompletedPercent(chunks: any[]): number {
    if (!chunks || chunks.length === 0) return 0;
    const completed = chunks.filter(c => c.status === 'completed').length;
    return Math.round((completed / chunks.length) * 100);
  }

  /**
   * Save API Key safely to localStorage
   */
  updateApiKey(key: string) {
    const trimmed = key.trim();
    this.clientApiKey.set(trimmed);
    localStorage.setItem('user_gemini_api_key', trimmed);
  }

  /**
   * Loaded engine from web standard CDN cdnjs
   */
  private async loadPdfEngine() {
    await this.pdfProcessor.loadPdfEngine(
      (msg) => this.parsingStatus.set(msg),
      (msg) => this.apiError.set(msg)
    );
  }

  /**
   * Handle uploaded PDF file
   */
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    await this.processPdfFile(file);
  }

  /**
   * Drag & Drop mechanics
   */
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  async onFileDropped(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        await this.processPdfFile(file);
      } else {
        this.apiError.set('Định dạng tệp không được hỗ trợ. Vui lòng kéo thả tệp tin PDF.');
      }
    }
  }

  /**
   * Deep extract PDF structure
   */
  async processPdfFile(file: File) {
    if (!this.isScriptLoaded() || !this.pdfProcessor.getPdfjsLib()) {
      this.apiError.set('Thư viện PDF.js đang được nạp, xin hãy đợi một giây rồi thử lại.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      this.apiError.set(`Tài liệu vượt quá giới hạn 100MB (${this.pdfProcessor.formatBytes(file.size)}). Vui lòng chọn tệp nhỏ hơn.`);
      return;
    }

    // Check duplication in history
    const isDuplicate = this.historyItems().some(h => h.fileName === file.name);

    const pdfjsLib = this.pdfProcessor.getPdfjsLib();
    this.isParsing.set(true);
    this.apiError.set('');
    this.showSuccess('');
    this.fileName.set(file.name);
    this.fileSize.set(this.pdfProcessor.formatBytes(file.size));
    this.pdfFile.set(file);
    this.pdfPages.set([]);
    this.pdfChunks.set([]);
    this.selectedChunkIndex.set(0);
    this.documentStyleProfile.set(null);

    const newHistoryId = `${Date.now()}_${file.name}`;
    this.currentHistoryId.set(newHistoryId);

    if (isDuplicate) {
      this.showSuccess('Chúng tôi thấy file này bạn đã từng up lên, và vẫn còn trong Lịch sử chuyển đổi.');
    }

    try {
      this.parsingStatus.set('Đang dọn dẹp bộ nhớ ảnh cũ trong IndexedDB...');
      await this.pdfProcessor.clearStoredImagesForFile(file.name);

      const fileReader = new FileReader();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result as ArrayBuffer);
        fileReader.onerror = (err) => reject(err);
        fileReader.readAsArrayBuffer(file);
      });

      this.parsingStatus.set('Chuẩn bị phân tích tài liệu...');
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      if (pdf.numPages > 1000) {
        this.apiError.set(`Tài liệu có ${pdf.numPages} trang, vượt quá giới hạn 1000 trang. Vui lòng cắt nhỏ tệp PDF trước khi xử lý.`);
        this.isParsing.set(false);
        this.parsingStatus.set('');
        return;
      }

      const itemsExtracted: PdfPageData[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        this.parsingStatus.set(`Trích xuất nội dung: Trang ${pageNum} / ${pdf.numPages}...`);
        const page = await pdf.getPage(pageNum);

        // 1. Text parsing
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => ({
          text: item.str,
          transform: item.transform, // coordinates
          width: item.width,
          height: item.height,
        }));

        // 2. High-quality canvas rendering to generate preview page image
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        const pageImageUrl = canvas.toDataURL('image/png');

        // 3. Isolated images extraction from Operators (only for standard PDF mode)
        let extractedImages: any[] = [];
        if (this.selectedPdfType() === 'standard') {
          this.parsingStatus.set(`Tách lập hình ảnh trang ${pageNum}...`);
          extractedImages = await this.pdfProcessor.extractImagesFromPage(page);
        }

        itemsExtracted.push({
          pageNum,
          items: textItems,
          pageImageUrl,
          extractedImages
        });
      }

      this.pdfPages.set(itemsExtracted);
      
      const createChunks = (pages: PdfPageData[]): PdfChunk[] => {
        const chunks: PdfChunk[] = [];
        const divide = (p: PdfPageData[]) => {
          if (p.length <= 12) {
             if (p.length > 0) {
                chunks.push({
                  id: '',
                  index: chunks.length,
                  startPageNum: p[0].pageNum,
                  endPageNum: p[p.length - 1].pageNum,
                  pages: p,
                  status: 'pending',
                  errorMessage: '',
                  markdownContent: '',
                  reflowHtml: ''
                });
             }
             return;
          }
          const mid = Math.floor(p.length / 2);
          divide(p.slice(0, mid));
          divide(p.slice(mid));
        };
        divide(pages);
        return chunks;
      };
      
      const generatedChunks = createChunks(itemsExtracted);

      // Save images sequentially to IndexedDB with IMG-CHUNKXX-XX keys (if in standard PDF mode)
      if (this.selectedPdfType() === 'standard') {
        this.parsingStatus.set('Đang đặt gán nhãn ảnh và lưu vào cơ sở dữ liệu IndexedDB trình duyệt...');
        let chunkCounter = 1;
        for (const chunk of generatedChunks) {
          chunk.id = `Phần ${chunkCounter}`;
          
          let imageIdxInChunk = 1;
          for (const page of chunk.pages) {
            if (page.extractedImages) {
              for (const img of page.extractedImages) {
                const labelKey = `IMG-CHUNK${chunkCounter}-${String(imageIdxInChunk).padStart(2, '0')}`;
                img.labeledKey = labelKey; // Assign sequential label
                
                await this.pdfProcessor.saveImageToDb({
                  id: `${file.name}_${labelKey}`,
                  key: labelKey,
                  fileName: file.name,
                  pageNum: page.pageNum,
                  dataUrl: img.dataUrl,
                  width: img.width,
                  height: img.height
                });
                imageIdxInChunk++;
              }
            }
          }
          chunkCounter++;
        }
      } else {
        let chunkCounter = 1;
        for (const chunk of generatedChunks) {
          chunk.id = `Phần ${chunkCounter}`;
          chunkCounter++;
        }
      }

      this.pdfChunks.set(generatedChunks);
 
       this.parsingStatus.set('Đang thiết lập bản gốc...');
 
       // Save initial state to Conversion History
       if (this.currentHistoryId()) {
         const historyItem = {
           id: this.currentHistoryId(),
           fileName: file.name,
           fileSize: this.pdfProcessor.formatBytes(file.size),
           timestamp: Date.now(),
           pdfPages: itemsExtracted,
           pdfChunks: generatedChunks,
           selectedChunkIndex: 0,
           pdfFileBlob: file,
           model: this.selectedModel(),
           pdfType: this.selectedPdfType(),
           outputMode: this.selectedOutputMode(),
           styleProfile: null
         };
         await this.saveHistoryItemAndTrim(historyItem);
       }
 
       this.selectedTab.set('pdf');
       this.showSuccess('Chia PDF thành công, chuyển sang bước chuẩn bị OCR.');
       this.isParsing.set(false);
      this.parsingStatus.set('');
    } catch (err: any) {
      this.logError(err);
      this.apiError.set('Lỗi phân tích cú pháp tệp PDF: ' + (err.message || err) + '.');
      this.isParsing.set(false);
      this.parsingStatus.set('');
    }
  }

  /**
   * Ensures a unified document typography & style profile is analyzed before processing HTML chunks
   */
  async ensureDocumentStyleProfile(): Promise<DocumentStyleProfile> {
    const current = this.documentStyleProfile();
    if (current) return current;

    const file = this.pdfFile();
    const chunks = this.pdfChunks();
    const apiKey = this.clientApiKey().trim();
    const modelName = this.selectedModel();

    if (!file || chunks.length === 0 || !apiKey) {
      const fallback: DocumentStyleProfile = { ...DEFAULT_STYLE_PROFILE, analyzedAt: Date.now() };
      this.documentStyleProfile.set(fallback);
      return fallback;
    }

    this.isAnalyzingStyle.set(true);
    this.parsingStatus.set('Đang phân tích phong cách thiết kế & nhận diện bộ font chuẩn toàn tài liệu...');
    try {
      const profile = await this.aiOptimizer.analyzeDocumentStyle(apiKey, modelName, file, chunks);
      this.documentStyleProfile.set(profile);
      await this.saveCurrentProgressToHistory();
      return profile;
    } catch (e) {
      this.logError('Lỗi khi phân tích phong cách tài liệu, sử dụng cấu hình mặc định:', e);
      const fallback: DocumentStyleProfile = { ...DEFAULT_STYLE_PROFILE, analyzedAt: Date.now() };
      this.documentStyleProfile.set(fallback);
      return fallback;
    } finally {
      this.isAnalyzingStyle.set(false);
      this.parsingStatus.set('');
    }
  }

  /**
   * Core function to perform text/image reflow optimization on a specific chunk
   */
  private async executeChunkOptimization(chunkIndex: number): Promise<void> {
    const file = this.pdfFile();
    const chunks = this.pdfChunks();
    const chunk = chunks[chunkIndex];

    if (!file || !chunk) {
      throw new Error('Không tìm thấy file nguồn hoặc phần phân chia.');
    }

    const apiKey = this.clientApiKey().trim();
    if (!apiKey) {
      throw new Error('Vui lòng cấu hình Gemini API Key trước khi thực hiện.');
    }

    // update state in chunks to processing
    this.pdfChunks.update(cs => {
       const newCs = [...cs];
       newCs[chunkIndex] = { ...newCs[chunkIndex], status: 'processing', errorMessage: '' };
       return newCs;
    });

    const modelName = this.selectedModel();
    const pdfType = this.selectedPdfType();
    const outputMode = this.selectedOutputMode();

    // Ensure style profile is established for consistent typography & design tokens in HTML mode
    let styleProfile: DocumentStyleProfile | undefined = this.documentStyleProfile() || undefined;
    if (outputMode === 'html' && !styleProfile) {
      try {
        styleProfile = await this.ensureDocumentStyleProfile();
      } catch (e) {
        this.logError('Không thể tạo style profile, dùng mặc định:', e);
      }
    }

    // Optimize layout and map structures using the AiPromptOptimizer module
    const { rawMarkdown, inputTokens, outputTokens } = await this.aiOptimizer.optimizeChunk(
      apiKey,
      modelName,
      file,
      chunk,
      outputMode,
      pdfType,
      styleProfile
    );

    // Parse output to HTML preview based on selected mode
    const renderedHtml = this.pdfProcessor.renderContent(rawMarkdown, chunk.pages, outputMode);
    
    this.pdfChunks.update(cs => {
      const newCs = [...cs];
      newCs[chunkIndex] = { 
        ...newCs[chunkIndex], 
        status: 'completed', 
        markdownContent: rawMarkdown,
        reflowHtml: renderedHtml,
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0
      };
      return newCs;
    });
  }

  /**
   * Optimize page text flow through Client-Side Gemini REST API
   */
  async optimizeChunkWithAI(chunkIndex: number) {
    const file = this.pdfFile();
    const chunks = this.pdfChunks();
    const chunk = chunks[chunkIndex];

    if (!file || !chunk) {
      this.apiError.set('Không tìm thấy file nguồn hoặc phần phân chia.');
      return;
    }

    const apiKey = this.clientApiKey().trim();
    if (!apiKey) {
      this.apiError.set('Vui lòng điền Gemini API Key của bạn ở mục *Nhập API Key* nằm ở phía trên bên phải.');
      return;
    }

    this.selectedChunkIndex.set(chunkIndex); // Update view to current processing chunk

    this.isOptimizing.set(true);
    this.apiError.set('');
    this.showSuccess('');
    this.optimizationTimer.set(0);
    this.timerInterval = setInterval(() => {
      this.optimizationTimer.update(v => v + 1);
    }, 1000);

    try {
      await this.executeChunkOptimization(chunkIndex);
      this.selectedTab.set('reflow');
      this.showSuccess(`Đã ráp nối thành công dữ liệu cho ${chunk.id}.`);
      await this.saveCurrentProgressToHistory();
    } catch (err: any) {
      this.logError(err);
      const translated = this.translateGeminiError(err.message || err);
      this.apiError.set(translated);
      this.pdfChunks.update(cs => {
        const newCs = [...cs];
        newCs[chunkIndex] = { 
          ...newCs[chunkIndex], 
          status: 'error', 
          errorMessage: translated
        };
        return newCs;
      });
      await this.saveCurrentProgressToHistory();
    } finally {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.isOptimizing.set(false);
    }
  }

  /**
   * Process all pending or error chunks in batches of 2 in parallel
   */
  async startBatchProcessing() {
    const file = this.pdfFile();
    if (!file) {
      this.apiError.set('Vui lòng chọn hoặc kéo thả tài liệu trước khi xử lý.');
      return;
    }

    const apiKey = this.clientApiKey().trim();
    if (!apiKey) {
      this.apiError.set('Vui lòng điền Gemini API Key của bạn ở mục *Nhập API Key* nằm ở phía trên bên phải.');
      return;
    }

    const chunks = this.pdfChunks();
    const pendingIndices = chunks
      .map((c, idx) => ({ status: c.status, idx }))
      .filter(item => item.status !== 'completed')
      .map(item => item.idx);

    if (pendingIndices.length === 0) {
      this.showSuccess('Tất cả các khối đã hoàn thành xử lý.');
      return;
    }

    this.isBatchProcessing.set(true);
    this.shouldStopBatch.set(false);
    this.isOptimizing.set(true);
    this.apiError.set('');
    this.showSuccess('');

    // Setup global timer for batch
    if (!this.timerInterval) {
      this.optimizationTimer.set(0);
      this.timerInterval = setInterval(() => {
        this.optimizationTimer.update(v => v + 1);
      }, 1000);
    }

    try {
      for (let i = 0; i < pendingIndices.length; i += 2) {
        if (this.shouldStopBatch()) {
          this.showSuccess('Đã nhận lệnh dừng. Các khối còn lại tạm dừng.');
          break;
        }

        const batch = pendingIndices.slice(i, i + 2);
        // Process this batch of up to 2 items in parallel
        const results = await Promise.all(batch.map(idx => this.processSingleChunkForBatch(idx)));
        
        // If any chunk encountered an unrecoverable/fatal error, halt queue immediately to conserve requests
        if (results.includes(false)) {
          this.shouldStopBatch.set(true);
          const currentErr = this.apiError();
          this.apiError.set(`${currentErr} (Tiến trình xử lý hàng loạt đã tự động dừng lại để tránh gửi tiếp các yêu cầu bị lỗi tương tự).`);
          break;
        }
      }
      
      const updatedChunks = this.pdfChunks();
      const allDoneNow = updatedChunks.every(c => c.status === 'completed');
      if (allDoneNow && !this.shouldStopBatch()) {
        this.showSuccess('Hoàn thành xử lý tất cả các phần thành công.');
        this.selectedTab.set('reflow');
      }
    } catch (err: any) {
      this.logError(err);
      this.apiError.set(this.translateGeminiError(err.message || err));
    } finally {
      this.isBatchProcessing.set(false);
      this.isOptimizing.set(false);
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }
  }

  /**
   * Request to stop batch processing after early finish of active batch
   */
  stopBatchProcessing() {
    if (this.isBatchProcessing()) {
      this.shouldStopBatch.set(true);
      this.showSuccess('Đang yêu cầu dừng lại... Vui lòng chờ các phần đang chạy nốt.');
    }
  }

  private async processSingleChunkForBatch(chunkIndex: number): Promise<boolean> {
    try {
      // Pre-select current processing item for visibility
      this.selectedChunkIndex.set(chunkIndex);
      await this.executeChunkOptimization(chunkIndex);
      return true;
    } catch (err: any) {
      this.logError(err);
      const translated = this.translateGeminiError(err.message || err);
      this.apiError.set(translated);
      this.pdfChunks.update(cs => {
        const newCs = [...cs];
        newCs[chunkIndex] = { 
          ...newCs[chunkIndex], 
          status: 'error', 
          errorMessage: translated
        };
        return newCs;
      });

      // Check if this error is an unrecoverable/fatal blockage that renders future batch turns obsolete
      const rawMsg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
      const lower = rawMsg.toLowerCase();
      const isFatal = lower.includes('quota') || lower.includes('429') || lower.includes('resource_exhausted') ||
                      lower.includes('api key') || lower.includes('api_key') || lower.includes('403') || lower.includes('permission_denied') || lower.includes('unauthorized') ||
                      lower.includes('failed to construct \'headers\'') || lower.includes('bytestring') ||
                      lower.includes('overloaded') || lower.includes('503') || lower.includes('service_unavailable');
      return !isFatal;
    } finally {
      await this.saveCurrentProgressToHistory();
    }
  }

  /**
   * Triggers download of strict EPUB zip standard package
   */
  async downloadEpubFile() {
    const chunks = this.pdfChunks();
    const isAllCompleted = chunks.length > 0 && chunks.every(c => c.status === 'completed');
    if (!isAllCompleted) {
      this.apiError.set('Vui lòng hoàn thành xử lý AI trên tất cả các khối trước khi tải file EPUB tổng.');
      return;
    }

    const activeMarkdown = chunks.map(c => c.markdownContent).join('\n\n');
    if (!activeMarkdown || activeMarkdown.trim() === '') {
      this.apiError.set('Không có dữ liệu văn bản để chuyển đổi thành EPUB.');
      return;
    }

    const title = this.fileName().replace(/\.pdf$/i, '') || 'tai_lieu_chuyen_doi';
    this.isParsing.set(true);
    this.parsingStatus.set('Đang biên dịch tệp tin sách điện tử chuẩn EPUB 3...');
    
    try {
      const blob = await this.pdfProcessor.generateEpub(title, activeMarkdown, this.pdfPages(), this.selectedOutputMode());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title + '.epub';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showSuccess('Tải tệp sách định dạng EPUB (.epub) thành công!');
    } catch (err: any) {
      this.logError(err);
      this.apiError.set('Lỗi biên dịch tệp EPUB: ' + err.message + '.');
    } finally {
      this.isParsing.set(false);
      this.parsingStatus.set('');
    }
  }

  /**
   * Triggers download of editable Word (.doc) file wrapping rich HTML structure and images
   */
  async downloadDocxFile() {
    const chunks = this.pdfChunks();
    const isAllCompleted = chunks.length > 0 && chunks.every(c => c.status === 'completed');
    if (!isAllCompleted) {
      this.apiError.set('Vui lòng hoàn thành xử lý AI trên tất cả các khối trước khi tải file Word.');
      return;
    }

    const activeMarkdown = chunks.map(c => c.markdownContent).join('\n\n');
    if (!activeMarkdown || activeMarkdown.trim() === '') {
      this.apiError.set('Không có dữ liệu văn bản để chuyển đổi thành Word.');
      return;
    }

    const title = this.fileName().replace(/\.pdf$/i, '') || 'tai_lieu_chuyen_doi';
    this.isParsing.set(true);
    this.parsingStatus.set('Đang tạo tệp tài liệu Word (.docx) chuyên nghiệp...');
    
    try {
      const blob = await this.pdfProcessor.generateDocx(title, activeMarkdown, this.pdfPages());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title + '.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showSuccess('Tải tệp tài liệu Word (.docx) thành công! Bạn có thể chỉnh sửa trực tiếp tệp này trên Microsoft Word hoặc Google Docs.');
    } catch (err: any) {
      this.logError(err);
      this.apiError.set('Lỗi biên dịch tệp Word: ' + err.message + '.');
    } finally {
      this.isParsing.set(false);
      this.parsingStatus.set('');
    }
  }

  async downloadChunkEpubFile() {
    const chunk = this.activeChunk();
    if (!chunk || chunk.status !== 'completed' || !chunk.markdownContent) {
      this.apiError.set('Phần này chưa được xử lý xong để tải xuống.');
      return;
    }

    const titleOriginal = this.fileName().replace(/\.pdf$/i, '') || 'tai_lieu_chuyen_doi';
    const match = chunk.id.match(/\d+/);
    const pSuffix = match ? `_p${match[0]}` : `_${chunk.id.replace(/\s+/g, '')}`;
    const title = `${titleOriginal}${pSuffix}`;
    
    this.isParsing.set(true);
    this.parsingStatus.set(`Đang biên dịch tệp tin sách điện tử chuẩn EPUB 3 cho ${chunk.id}...`);
    
    try {
      const blob = await this.pdfProcessor.generateEpub(title, chunk.markdownContent, chunk.pages, this.selectedOutputMode());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title + '.epub';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showSuccess(`Tải tệp sách định dạng EPUB (.epub) cho ${chunk.id} thành công!`);
    } catch (err: any) {
      this.logError(err);
      this.apiError.set('Lỗi biên dịch tệp EPUB: ' + err.message + '.');
    } finally {
      this.isParsing.set(false);
      this.parsingStatus.set('');
    }
  }

  async downloadChunkDocxFile() {
    const chunk = this.activeChunk();
    if (!chunk || chunk.status !== 'completed' || !chunk.markdownContent) {
      this.apiError.set('Phần này chưa được xử lý xong để tải xuống.');
      return;
    }

    const titleOriginal = this.fileName().replace(/\.pdf$/i, '') || 'tai_lieu_chuyen_doi';
    const match = chunk.id.match(/\d+/);
    const pSuffix = match ? `_p${match[0]}` : `_${chunk.id.replace(/\s+/g, '')}`;
    const title = `${titleOriginal}${pSuffix}`;
    
    this.isParsing.set(true);
    this.parsingStatus.set(`Đang tạo tệp tài liệu Word (.docx) chuyên nghiệp cho ${chunk.id}...`);
    
    try {
      const blob = await this.pdfProcessor.generateDocx(title, chunk.markdownContent, chunk.pages);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title + '.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showSuccess(`Tải tệp tài liệu Word (.docx) cho ${chunk.id} thành công!`);
    } catch (err: any) {
      this.logError(err);
      this.apiError.set('Lỗi biên dịch tệp Word: ' + err.message + '.');
    } finally {
      this.isParsing.set(false);
      this.parsingStatus.set('');
    }
  }

  /**
   * Download original clean .md Markdown file
   */
  downloadMarkdownFile() {
    const chunks = this.pdfChunks();
    const isAllCompleted = chunks.length > 0 && chunks.every(c => c.status === 'completed');
    if (!isAllCompleted) {
      this.apiError.set('Vui lòng hoàn thành xử lý AI trên tất cả các khối trước.');
      return;
    }
    const activeMarkdown = chunks.map(c => c.markdownContent).join('\n\n');
    if (!activeMarkdown || activeMarkdown.trim() === '') {
      this.apiError.set('Không có dữ liệu Markdown để tải.');
      return;
    }

    const title = this.fileName().replace(/\.pdf$/i, '') || 'tai_lieu_chuyen_doi';
    const blob = new Blob([activeMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showSuccess('Đã tải tệp Markdown (.md) thành công.');
  }

  downloadChunkMarkdownFile() {
    const chunk = this.activeChunk();
    if (!chunk || chunk.status !== 'completed' || !chunk.markdownContent) {
      this.apiError.set('Phần này chưa được xử lý xong để tải xuống.');
      return;
    }

    const titleOriginal = this.fileName().replace(/\.pdf$/i, '') || 'tai_lieu_chuyen_doi';
    const match = chunk.id.match(/\d+/);
    const pSuffix = match ? `_p${match[0]}` : `_${chunk.id.replace(/\s+/g, '')}`;
    const title = `${titleOriginal}${pSuffix}`;
    
    const blob = new Blob([chunk.markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showSuccess(`Đã tải tệp Markdown (.md) cho ${chunk.id} thành công.`);
  }

  downloadChunkHtmlFile() {
    const chunk = this.activeChunk();
    if (!chunk || chunk.status !== 'completed' || !chunk.reflowHtml) {
      this.apiError.set('Phần này chưa được xử lý xong để tải xuống.');
      return;
    }

    const titleOriginal = this.fileName().replace(/\.pdf$/i, '') || 'tai_lieu_chuyen_doi';
    const match = chunk.id.match(/\d+/);
    const pSuffix = match ? `_p${match[0]}` : `_${chunk.id.replace(/\s+/g, '')}`;
    const title = `${titleOriginal}${pSuffix}`;
    const profile = this.documentStyleProfile() || DEFAULT_STYLE_PROFILE;

    const fullHtmlSource = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  <script>
    window.MathJax = {
      tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
      svg: { fontCache: 'global' }
    };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: '${profile.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${profile.bodyFontSize};
      line-height: ${profile.lineHeight};
      color: #1e293b;
      background-color: #f8fafc;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${profile.headingFont}', Georgia, serif;
    }
    .multi-column-flow, [style*="column-count"], [style*="columns:"], [class*="columns-"] {
      column-fill: balance !important;
      -webkit-column-fill: balance !important;
      orphans: 2 !important;
      widows: 2 !important;
      hyphens: auto !important;
      -webkit-hyphens: auto !important;
    }
    .break-inside-avoid, figure, table, blockquote, img, math, pre {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      -webkit-column-break-inside: avoid !important;
    }
    @media print {
      .no-print { display: none !important; }
      body { background-color: white !important; padding: 0 !important; }
      .print-shadow-none { box-shadow: none !important; border: none !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 p-4 md:p-12 min-h-screen flex items-start justify-center">
  <div class="max-w-4xl w-full mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-16 print-shadow-none">
    <div class="no-print flex justify-between items-center mb-8 border-b pb-4 border-slate-100">
      <div class="text-xs text-slate-400 font-mono">${title} (Trang ${chunk.startPageNum} - ${chunk.endPageNum})</div>
      <button onclick="window.print()" class="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">In tài liệu / Lưu PDF</button>
    </div>
    <article class="prose max-w-none ${profile.textAlign === 'justify' ? 'text-justify' : 'text-left'} flex flex-col">
      ${chunk.reflowHtml}
    </article>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtmlSource], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showSuccess(`Đã tải tệp HTML (.html) cho ${chunk.id} thành công.`);
  }

  /**
   * Triggers file download of self-contained full HTML document
   */
  downloadHtmlFile() {
    const chunks = this.pdfChunks();
    const isAllCompleted = chunks.length > 0 && chunks.every(c => c.status === 'completed');
    if (!isAllCompleted) {
      this.apiError.set('Vui lòng hoàn thành xử lý AI trên tất cả các khối trước khi tải file HTML trọn bộ.');
      return;
    }
    const activeHtml = chunks.map(c => c.reflowHtml).join('<hr class="my-10 border-slate-200" />');
    const title = this.fileName().replace(/\.pdf$/i, '') || 'tai_lieu_chuyen_doi';
    const profile = this.documentStyleProfile() || DEFAULT_STYLE_PROFILE;

    const fullHtmlSource = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  <script>
    window.MathJax = {
      tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
      svg: { fontCache: 'global' }
    };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: '${profile.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${profile.bodyFontSize};
      line-height: ${profile.lineHeight};
      color: #1e293b;
      background-color: #f8fafc;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${profile.headingFont}', Georgia, serif;
    }
    .multi-column-flow, [style*="column-count"], [style*="columns:"], [class*="columns-"] {
      column-fill: balance !important;
      -webkit-column-fill: balance !important;
      orphans: 2 !important;
      widows: 2 !important;
      hyphens: auto !important;
      -webkit-hyphens: auto !important;
    }
    .break-inside-avoid, figure, table, blockquote, img, math, pre {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      -webkit-column-break-inside: avoid !important;
    }
    @media print {
      .no-print { display: none !important; }
      body { background-color: white !important; padding: 0 !important; }
      .print-shadow-none { box-shadow: none !important; border: none !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 p-4 md:p-12 min-h-screen flex items-start justify-center">
  <div class="max-w-4xl w-full mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-16 print-shadow-none">
    <div class="no-print flex justify-between items-center mb-8 border-b pb-4 border-slate-100">
      <div class="text-xs text-slate-400 font-mono">${title} (Trọn bộ tài liệu)</div>
      <button onclick="window.print()" class="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">In tài liệu / Lưu PDF</button>
    </div>
    <article class="prose max-w-none ${profile.textAlign === 'justify' ? 'text-justify' : 'text-left'} flex flex-col">
      ${activeHtml}
    </article>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtmlSource], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showSuccess('Đã tải tệp HTML trọn bộ (.html) thành công.');
  }
}
