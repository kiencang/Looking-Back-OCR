/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, signal, computed, inject } from '@angular/core';
import { PdfProcessor, PdfPageData } from '../pdf-processor';
import { AiPromptOptimizer } from '../ai-prompt-optimizer';
import { ModelType, OutputMode, DocumentStyleProfile, DEFAULT_STYLE_PROFILE } from '../header';
import { translateGeminiError } from '../utils/gemini-error.util';
import { HistoryService } from './history.service';

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

@Injectable({
  providedIn: 'root'
})
export class DocumentProcessingService {
  private pdfProcessor = inject(PdfProcessor);
  private aiOptimizer = inject(AiPromptOptimizer);
  private historyService = inject(HistoryService);

  // Core Document State
  fileName = signal('');
  fileSize = signal('');
  pdfFile = signal<File | null>(null);
  pdfObjectUrl = signal<string>('');
  pdfPages = signal<PdfPageData[]>([]);
  pdfChunks = signal<PdfChunk[]>([]);
  currentHistoryId = signal<string | null>(null);
  
  // Settings & Options
  selectedModel = signal<ModelType>('gemini-flash-latest');
  selectedOutputMode = signal<OutputMode>('html');
  clientApiKey = signal('');

  // Execution State
  isParsing = signal(false);
  isOptimizing = signal(false);
  isBatchProcessing = signal(false);
  shouldStopBatch = signal(false);
  parsingStatus = signal('');
  apiError = signal('');
  successMessage = signal('');
  
  // Design Profile
  documentStyleProfile = signal<DocumentStyleProfile | null>(null);
  isAnalyzingStyle = signal<boolean>(false);

  selectedChunkIndex = signal<number>(0);
  optimizationTimer = signal(0);
  private timerInterval: any = null;

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

  isOutputModeLocked = computed(() => {
    const chunks = this.pdfChunks();
    return chunks.some(c => c.status === 'completed' || c.status === 'processing');
  });

  totalPageCount = computed(() => this.pdfPages().length);
  
  extractedImagesCount = computed(() => {
    return this.pdfPages().reduce((sum, page) => sum + (page.extractedImages?.length || 0), 0);
  });

  extractedText = computed(() => {
    return this.pdfPages()
      .map(p => p.items.map(i => i.text).join(' '))
      .join('\n\n');
  });

  optimizationTimeFormatted = computed(() => {
    const s = this.optimizationTimer();
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  showSuccess(msg: string) {
    this.successMessage.set(msg);
  }

  clearSuccess() {
    this.successMessage.set('');
  }

  private startTimer() {
    this.stopTimer();
    this.optimizationTimer.set(0);
    this.timerInterval = setInterval(() => {
      this.optimizationTimer.update(v => v + 1);
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetCurrentDocument() {
    this.currentHistoryId.set(null);
    this.pdfFile.set(null);
    this.fileName.set('');
    this.fileSize.set('');
    this.pdfPages.set([]);
    this.pdfChunks.set([]);
    this.selectedChunkIndex.set(0);
    this.documentStyleProfile.set(null);
    this.apiError.set('');
    this.successMessage.set('');
  }

  async saveCurrentProgressToHistory(): Promise<void> {
    const file = this.pdfFile();
    const chunks = this.pdfChunks();
    if (!file || chunks.length === 0) return;

    await this.historyService.saveCurrentProgressToHistory({
      fileName: this.fileName(),
      fileSize: this.fileSize(),
      pdfPages: this.pdfPages(),
      pdfChunks: chunks,
      selectedModel: this.selectedModel(),
      selectedOutputMode: this.selectedOutputMode(),
      documentStyleProfile: this.documentStyleProfile()
    });
  }

  async restoreFromHistoryItem(item: any): Promise<void> {
    if (!item) return;
    this.isParsing.set(true);
    this.parsingStatus.set('Đang nạp lại lịch sử chuyển đổi...');

    try {
      if (item.pdfFileBlob) {
        const restoredFile = new File([item.pdfFileBlob], item.fileName, { type: 'application/pdf' });
        this.pdfFile.set(restoredFile);
      }
      this.fileName.set(item.fileName);
      this.fileSize.set(item.fileSize);
      this.pdfPages.set(item.pdfPages || []);
      this.pdfChunks.set(item.pdfChunks || []);
      this.currentHistoryId.set(item.id);
      this.documentStyleProfile.set(item.styleProfile || item.documentStyleProfile || null);
      if (item.model || item.selectedModel) {
        this.selectedModel.set(item.model || item.selectedModel);
      }
      if (item.outputMode || item.selectedOutputMode) {
        this.selectedOutputMode.set(item.outputMode || item.selectedOutputMode);
      }

      // Auto jump to first incomplete chunk or selected index
      const incompleteIdx = (item.pdfChunks || []).findIndex((c: any) => c.status !== 'completed');
      if (incompleteIdx !== -1) {
        this.selectedChunkIndex.set(incompleteIdx);
      } else {
        this.selectedChunkIndex.set(item.selectedChunkIndex || 0);
      }

      this.showSuccess('Đã khôi phục lịch sử chuyển đổi.');
    } catch (err: any) {
      this.apiError.set(`Không thể khôi phục lịch sử: ${err.message || err}.`);
    } finally {
      this.isParsing.set(false);
      this.parsingStatus.set('');
    }
  }

  async processPdfFile(file: File): Promise<boolean> {
    if (file.size > 100 * 1024 * 1024) {
      this.apiError.set(`Tài liệu vượt quá giới hạn 100MB (${this.pdfProcessor.formatBytes(file.size)}). Vui lòng chọn tệp nhỏ hơn.`);
      return false;
    }

    // Check duplication in history
    const isDuplicate = this.historyService.historyItems().some(h => h.fileName === file.name);

    this.isParsing.set(true);
    this.apiError.set('');
    this.clearSuccess();
    this.fileName.set(file.name);
    this.fileSize.set(this.pdfProcessor.formatBytes(file.size));
    this.pdfFile.set(file);
    if (this.pdfObjectUrl()) {
      URL.revokeObjectURL(this.pdfObjectUrl());
    }
    this.pdfObjectUrl.set(URL.createObjectURL(file));
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

      const { pages, chunks } = await this.pdfProcessor.extractPdfChunks(
        file,
        (msg: string) => this.parsingStatus.set(msg)
      );

      this.pdfPages.set(pages);
      this.pdfChunks.set(chunks);

      this.parsingStatus.set('Đang thiết lập bản gốc...');

      // Save initial state to History
      await this.saveCurrentProgressToHistory();

      // Trigger background rendering for remaining chunks asynchronously
      this.startBackgroundPagesRendering();

      this.showSuccess('Chia PDF thành công, chuyển sang bước chuẩn bị OCR.');
      return true;
    } catch (err: any) {
      this.apiError.set('Lỗi phân tích cú pháp tệp PDF: ' + (err.message || err) + '.');
      return false;
    } finally {
      this.isParsing.set(false);
      this.parsingStatus.set('');
    }
  }

  async ensureChunkPagesRendered(chunkIndex: number): Promise<void> {
    const chunks = this.pdfChunks();
    if (chunkIndex < 0 || chunkIndex >= chunks.length) return;
    const chunk = chunks[chunkIndex];
    if (!chunk || !chunk.pages) return;

    // Check if any page in this chunk needs PNG rendering
    const unrenderedPages = chunk.pages.filter(p => !p.pageImageUrl);
    if (unrenderedPages.length === 0) return;

    for (const page of unrenderedPages) {
      const dataUrl = await this.pdfProcessor.renderPageToPng(page.pageNum);
      if (dataUrl) {
        page.pageImageUrl = dataUrl;
      }
    }
    // Trigger signal update so subscribers react
    this.pdfChunks.set([...chunks]);
  }

  private backgroundRenderingActive = false;

  private async startBackgroundPagesRendering(): Promise<void> {
    if (this.backgroundRenderingActive) return;
    this.backgroundRenderingActive = true;

    try {
      // Delay slightly to give UI breathing room after upload finishes
      await new Promise(resolve => setTimeout(resolve, 300));

      const totalChunks = this.pdfChunks().length;
      for (let i = 0; i < totalChunks; i++) {
        // If file was changed or cleared during background rendering, stop
        if (!this.pdfFile()) break;

        const chunk = this.pdfChunks()[i];
        if (chunk && chunk.pages && chunk.pages.some(p => !p.pageImageUrl)) {
          await this.ensureChunkPagesRendered(i);
          // Yield main thread between chunks so UI remains 100% responsive
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (e) {
      console.warn('Background page rendering notice:', e);
    } finally {
      this.backgroundRenderingActive = false;
    }
  }

  async ensureDocumentStyleProfile(): Promise<DocumentStyleProfile> {
    const currentProfile = this.documentStyleProfile();
    if (currentProfile) return currentProfile;

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
      console.error('Lỗi khi phân tích phong cách tài liệu, sử dụng cấu hình mặc định:', e);
      const fallback: DocumentStyleProfile = { ...DEFAULT_STYLE_PROFILE, analyzedAt: Date.now() };
      this.documentStyleProfile.set(fallback);
      return fallback;
    } finally {
      this.isAnalyzingStyle.set(false);
      this.parsingStatus.set('');
    }
  }

  async executeChunkOptimization(chunkIndex: number): Promise<void> {
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
    const outputMode = this.selectedOutputMode();

    // Ensure style profile is established for consistent typography & design tokens in HTML mode
    let styleProfile: DocumentStyleProfile | undefined = this.documentStyleProfile() || undefined;
    if (outputMode === 'html' && !styleProfile) {
      try {
        styleProfile = await this.ensureDocumentStyleProfile();
      } catch (e) {
        console.error('Không thể tạo style profile, dùng mặc định:', e);
      }
    }

    // Optimize layout and map structures using the AiPromptOptimizer module
    const { rawMarkdown, inputTokens, outputTokens } = await this.aiOptimizer.optimizeChunk(
      apiKey,
      modelName,
      file,
      chunk,
      outputMode,
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

  async optimizeSingleChunk(chunkIndex: number): Promise<boolean> {
    const file = this.pdfFile();
    const chunks = this.pdfChunks();
    const chunk = chunks[chunkIndex];

    if (!file || !chunk) {
      this.apiError.set('Không tìm thấy file nguồn hoặc phần phân chia.');
      return false;
    }

    const apiKey = this.clientApiKey().trim();
    if (!apiKey) {
      this.apiError.set('Vui lòng điền Gemini API Key của bạn ở mục *Nhập API Key* nằm ở phía trên bên phải.');
      return false;
    }

    this.selectedChunkIndex.set(chunkIndex);
    this.isOptimizing.set(true);
    this.apiError.set('');
    this.clearSuccess();
    this.startTimer();

    try {
      await this.executeChunkOptimization(chunkIndex);
      this.showSuccess(`Đã ráp nối thành công dữ liệu cho ${chunk.id}.`);
      await this.saveCurrentProgressToHistory();
      return true;
    } catch (err: any) {
      const translated = translateGeminiError(err.message || err);
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
      return false;
    } finally {
      this.stopTimer();
      this.isOptimizing.set(false);
    }
  }

  async startBatchProcessing(): Promise<void> {
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
    this.clearSuccess();
    this.startTimer();

    try {
      for (let i = 0; i < pendingIndices.length; i += 2) {
        if (this.shouldStopBatch()) {
          this.showSuccess('Đã nhận lệnh dừng. Các khối còn lại tạm dừng.');
          break;
        }

        const batch = pendingIndices.slice(i, i + 2);
        const results = await Promise.all(batch.map(idx => this.processSingleChunkForBatch(idx)));
        
        // If any chunk encountered an unrecoverable/fatal error, halt queue immediately
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
      }
    } catch (err: any) {
      this.apiError.set(translateGeminiError(err.message || err));
    } finally {
      this.isBatchProcessing.set(false);
      this.isOptimizing.set(false);
      this.stopTimer();
    }
  }

  stopBatchProcessing(): void {
    if (this.isBatchProcessing()) {
      this.shouldStopBatch.set(true);
      this.showSuccess('Đang yêu cầu dừng lại... Vui lòng chờ các phần đang chạy nốt.');
    }
  }

  private async processSingleChunkForBatch(chunkIndex: number): Promise<boolean> {
    try {
      this.selectedChunkIndex.set(chunkIndex);
      await this.executeChunkOptimization(chunkIndex);
      return true;
    } catch (err: any) {
      const translated = translateGeminiError(err.message || err);
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

      // Check if fatal error to halt batch
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
}
