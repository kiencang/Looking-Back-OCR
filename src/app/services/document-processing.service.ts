/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, signal, computed, inject } from '@angular/core';
import { PdfProcessor, PdfPageData } from '../pdf-processor';
import { AiPromptOptimizer } from '../ai-prompt-optimizer';
import { ModelType, OutputMode, DocumentStyleProfile, DEFAULT_STYLE_PROFILE } from '../header';
import { translateGeminiError } from '../utils/gemini-error.util';
import { HistoryService, generateHistoryId } from './history.service';

export interface PdfChunk {
  id: string;
  originalFileName?: string;
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
  pdfFiles = signal<File[]>([]);
  isMultiFileMode = signal<boolean>(false);
  pdfObjectUrl = signal<string>('');
  pdfPages = signal<PdfPageData[]>([]);
  pdfChunks = signal<PdfChunk[]>([]);
  currentHistoryId = signal<string | null>(null);
  
  // Settings & Options
  selectedModel = signal<ModelType>('gemini-flash-latest');
  selectedOutputMode = signal<OutputMode>('html');
  clientApiKey = signal('');
  metaApiKey = signal('');
  metaModelName = signal('muse-spark-1.2-contributor');

  // Execution State
  isParsing = signal(false);
  isOptimizing = signal(false);
  isBatchProcessing = signal(false);
  shouldStopBatch = signal(false);
  parsingStatus = signal('');
  apiError = signal('');
  warningMessage = signal('');
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

  showWarning(msg: string) {
    this.warningMessage.set(msg);
  }

  clearWarning() {
    this.warningMessage.set('');
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
    this.pdfFiles.set([]);
    this.isMultiFileMode.set(false);
    this.fileName.set('');
    this.fileSize.set('');
    this.pdfPages.set([]);
    this.pdfChunks.set([]);
    this.selectedChunkIndex.set(0);
    this.documentStyleProfile.set(null);
    this.apiError.set('');
    this.warningMessage.set('');
    this.successMessage.set('');
  }

  private isSavingHistory = false;
  private saveHistoryQueue: (() => void)[] = [];

  async saveCurrentProgressToHistory(): Promise<void> {
    if (this.isSavingHistory) {
      await new Promise<void>(resolve => {
        this.saveHistoryQueue.push(resolve);
      });
    }
    this.isSavingHistory = true;

    try {
      const file = this.pdfFile();
      const chunks = this.pdfChunks();
      if ((!file && !this.isMultiFileMode()) || chunks.length === 0) return;

      const savedId = await this.historyService.saveCurrentProgressToHistory({
        id: this.currentHistoryId() || undefined,
        fileName: this.fileName(),
        fileSize: this.fileSize(),
        pdfPages: this.pdfPages(),
        pdfChunks: chunks,
        selectedModel: this.selectedModel(),
        selectedOutputMode: this.selectedOutputMode(),
        isMultiFileMode: this.isMultiFileMode(),
        documentStyleProfile: this.documentStyleProfile(),
        pdfFileBlob: file || undefined
      });
      if (savedId && !this.currentHistoryId()) {
        this.currentHistoryId.set(savedId);
      }
    } catch (e) {
      console.warn('Lỗi khi lưu lịch sử tiến trình:', e);
    } finally {
      this.isSavingHistory = false;
      const next = this.saveHistoryQueue.shift();
      if (next) {
        next();
      }
    }
  }

  async restoreFromHistoryItem(item: any): Promise<void> {
    if (!item) return;
    this.isParsing.set(true);
    this.parsingStatus.set('Đang nạp lại lịch sử chuyển đổi...');

    try {
      this.isMultiFileMode.set(!!item.isMultiFileMode);
      if (item.pdfFileBlob) {
        const restoredFile = new File([item.pdfFileBlob], item.fileName, { type: 'application/pdf' });
        this.pdfFile.set(restoredFile);
        if (this.pdfObjectUrl()) {
          URL.revokeObjectURL(this.pdfObjectUrl());
        }
        this.pdfObjectUrl.set(URL.createObjectURL(restoredFile));
        try {
          await this.pdfProcessor.loadPdfDocument(restoredFile);
        } catch (e) {
          console.warn('Could not load restored pdfjsDoc:', e);
        }
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

    this.isMultiFileMode.set(false);
    this.pdfFiles.set([file]);

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

    const newHistoryId = generateHistoryId();
    this.currentHistoryId.set(newHistoryId);

    if (isDuplicate) {
      this.showSuccess('Chúng tôi thấy file này bạn đã từng up lên, và vẫn còn trong Lịch sử chuyển đổi.');
    }

    try {
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

  async processPdfFiles(files: File[]): Promise<boolean> {
    if (!files || files.length === 0) return false;

    // If single file, delegate to standard single file flow
    if (files.length === 1) {
      return this.processPdfFile(files[0]);
    }

    // Constraint 1: Maximum 20 files
    if (files.length > 20) {
      this.apiError.set(`Chỉ cho phép tải lên tối đa 20 tệp PDF cùng lúc (bạn đã chọn ${files.length} tệp).`);
      return false;
    }

    // Sort files in natural alphabetical order (A-Z)
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const sortedFiles = [...files].sort((a, b) => collator.compare(a.name, b.name));

    this.isParsing.set(true);
    this.apiError.set('');
    this.clearSuccess();
    this.parsingStatus.set('Đang kiểm tra các tệp PDF nạp vào...');

    // Calculate total size and quick pre-check
    let totalBytes = 0;
    for (const f of sortedFiles) {
      totalBytes += f.size;
      if (f.size > 10 * 1024 * 1024) {
        this.isParsing.set(false);
        this.apiError.set(`Tệp "${f.name}" (${this.pdfProcessor.formatBytes(f.size)}) vượt quá giới hạn tối đa 10 MB cho chế độ tải nhiều file.`);
        return false;
      }
    }

    this.isMultiFileMode.set(true);
    this.pdfFiles.set(sortedFiles);
    this.pdfFile.set(sortedFiles[0]); // First file as anchor
    this.fileName.set(`${sortedFiles.length} tệp PDF (${sortedFiles[0].name}...)`);
    this.fileSize.set(this.pdfProcessor.formatBytes(totalBytes));
    this.pdfPages.set([]);
    this.pdfChunks.set([]);
    this.selectedChunkIndex.set(0);
    this.documentStyleProfile.set(null);

    const newHistoryId = generateHistoryId();
    this.currentHistoryId.set(newHistoryId);

    try {
      const { pages, chunks } = await this.pdfProcessor.extractMultiplePdfChunks(
        sortedFiles,
        (msg: string) => this.parsingStatus.set(msg)
      );

      this.pdfPages.set(pages);
      this.pdfChunks.set(chunks);

      this.parsingStatus.set('Đang thiết lập bản gốc...');

      // Save initial state to History
      await this.saveCurrentProgressToHistory();

      // Trigger background rendering for remaining chunks asynchronously
      this.startBackgroundPagesRendering();

      this.showSuccess(`Nạp thành công ${sortedFiles.length} tệp PDF (mỗi tệp thành 1 khối xử lý độc lập).`);
      return true;
    } catch (err: any) {
      this.isMultiFileMode.set(false);
      this.apiError.set(err.message || String(err));
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

  private styleAnalysisPromise: Promise<DocumentStyleProfile> | null = null;

  async ensureDocumentStyleProfile(): Promise<DocumentStyleProfile> {
    const currentProfile = this.documentStyleProfile();
    if (currentProfile) return currentProfile;

    if (this.styleAnalysisPromise) {
      return this.styleAnalysisPromise;
    }

    const file = this.pdfFile();
    const chunks = this.pdfChunks();
    const modelType = this.selectedModel();
    const isMeta = modelType === 'muse-spark-1.2-contributor';
    const effectiveModelName = isMeta ? (this.metaModelName()?.trim() || 'muse-spark-1.2-contributor') : modelType;
    const apiKey = (isMeta ? this.metaApiKey() : this.clientApiKey()).trim();

    if (!file || chunks.length === 0 || !apiKey) {
      const fallback: DocumentStyleProfile = { ...DEFAULT_STYLE_PROFILE, analyzedAt: Date.now() };
      this.documentStyleProfile.set(fallback);
      return fallback;
    }

    this.isAnalyzingStyle.set(true);
    this.parsingStatus.set('Đang phân tích phong cách thiết kế & nhận diện bộ font chuẩn toàn tài liệu...');

    this.styleAnalysisPromise = (async () => {
      try {
        const isMulti = this.isMultiFileMode();
        const filesList = isMulti && this.pdfFiles().length > 0 ? this.pdfFiles() : (file ? [file] : []);
        const profile = await this.aiOptimizer.analyzeDocumentStyle(apiKey, effectiveModelName, filesList.length === 1 ? filesList[0] : filesList, chunks);
        this.documentStyleProfile.set(profile);
        await this.saveCurrentProgressToHistory();
        return profile;
      } catch (e: any) {
        console.error('Lỗi khi phân tích phong cách tài liệu, sử dụng cấu hình mặc định:', e);
        const errMsg = e?.message || String(e);
        this.showWarning(`Không thể phân tích phong cách tài liệu (${errMsg}). Hệ thống tự động áp dụng Hồ sơ thiết kế chuẩn mặc định.`);
        const fallback: DocumentStyleProfile = { ...DEFAULT_STYLE_PROFILE, analyzedAt: Date.now() };
        this.documentStyleProfile.set(fallback);
        return fallback;
      } finally {
        this.isAnalyzingStyle.set(false);
        this.parsingStatus.set('');
        this.styleAnalysisPromise = null;
      }
    })();

    return this.styleAnalysisPromise;
  }

  async executeChunkOptimization(chunkIndex: number): Promise<void> {
    const chunks = this.pdfChunks();
    const chunk = chunks[chunkIndex];

    if (!chunk) {
      throw new Error('Không tìm thấy phần phân chia.');
    }

    const isMulti = this.isMultiFileMode();
    const file = (isMulti && (this.pdfFiles().find(f => f.name === chunk.originalFileName) || this.pdfFiles()[chunkIndex])) || this.pdfFile();

    if (!file) {
      throw new Error('Không tìm thấy file nguồn cho phần này.');
    }

    const modelType = this.selectedModel();
    const isMeta = modelType === 'muse-spark-1.2-contributor';
    const effectiveModelName = isMeta ? (this.metaModelName()?.trim() || 'muse-spark-1.2-contributor') : modelType;

    let apiKey = '';
    if (isMeta) {
      apiKey = this.metaApiKey().trim();
      if (!apiKey) {
        throw new Error('Vui lòng cấu hình Meta API Key ở mục "Nhập API Key" trước khi thực hiện mô hình Muse.');
      }
    } else {
      apiKey = this.clientApiKey().trim();
      if (!apiKey) {
        throw new Error('Vui lòng cấu hình Gemini API Key trước khi thực hiện.');
      }
    }

    // update state in chunks to processing
    this.pdfChunks.update(cs => {
       const newCs = [...cs];
       newCs[chunkIndex] = { ...newCs[chunkIndex], status: 'processing', errorMessage: '' };
       return newCs;
    });

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
    const { rawMarkdown, inputTokens, outputTokens } = isMeta
      ? await this.aiOptimizer.optimizeChunkWithMeta(
          apiKey,
          effectiveModelName,
          file,
          chunk,
          outputMode,
          styleProfile,
          isMulti
        )
      : await this.aiOptimizer.optimizeChunk(
          apiKey,
          effectiveModelName,
          file,
          chunk,
          outputMode,
          styleProfile,
          isMulti
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

    const isMeta = this.selectedModel() === 'muse-spark-1.2-contributor';
    if (isMeta) {
      if (!this.metaApiKey().trim()) {
        this.apiError.set('Vui lòng điền Meta API Key của bạn ở mục *Nhập API Key* nằm ở phía trên bên phải để sử dụng mô hình Muse.');
        return false;
      }
    } else {
      if (!this.clientApiKey().trim()) {
        this.apiError.set('Vui lòng điền Gemini API Key của bạn ở mục *Nhập API Key* nằm ở phía trên bên phải.');
        return false;
      }
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
      const translated = isMeta ? (err.message || String(err)) : translateGeminiError(err.message || err);
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

    const isMeta = this.selectedModel() === 'muse-spark-1.2-contributor';
    if (isMeta) {
      if (!this.metaApiKey().trim()) {
        this.apiError.set('Vui lòng điền Meta API Key của bạn ở mục *Nhập API Key* nằm ở phía trên bên phải để sử dụng mô hình Muse.');
        return;
      }
    } else {
      if (!this.clientApiKey().trim()) {
        this.apiError.set('Vui lòng điền Gemini API Key của bạn ở mục *Nhập API Key* nằm ở phía trên bên phải.');
        return;
      }
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
      // Trước khi chạy các chunk song song, nếu dùng outputMode là 'html', hãy đảm bảo Style Profile đã được phân tích hoàn tất.
      // Việc gọi hàm này tuần tự ở đây giúp tránh được xung đột tranh chấp (race condition) gửi đúp yêu cầu phân tích style
      // từ các tiến trình chunk chạy song song bên dưới.
      if (this.selectedOutputMode() === 'html' && !this.documentStyleProfile()) {
        await this.ensureDocumentStyleProfile();
      }

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
      this.apiError.set(isMeta ? (err.message || String(err)) : translateGeminiError(err.message || err));
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
    const isMeta = this.selectedModel() === 'muse-spark-1.2-contributor';
    try {
      this.selectedChunkIndex.set(chunkIndex);
      await this.executeChunkOptimization(chunkIndex);
      return true;
    } catch (err: any) {
      const translated = isMeta ? (err.message || String(err)) : translateGeminiError(err.message || err);
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
