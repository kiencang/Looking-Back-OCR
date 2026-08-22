/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  afterNextRender,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

import { PdfProcessor } from './pdf-processor';
import { DocumentProcessingService, PdfChunk } from './services/document-processing.service';
import { HistoryService } from './services/history.service';
import { ExportService } from './services/export.service';

import { Header, OutputMode } from './header';

function safeGetItem(key: string): string {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}
function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function safeRemoveItem(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

import { Footer } from './footer';
import { EmptyState } from './empty-state';
import { InstructionModal } from './instruction-modal';
import { ApiKeyModal } from './api-key-modal';
import { HistoryModal } from './history-modal';
import { WorkspaceAside } from './workspace-aside';
import { WorkspacePreview } from './workspace-preview';
import { FullscreenComparison } from './fullscreen-comparison';
import { ToastNotification } from './toast-notification';

export type { PdfChunk };

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
  private pdfProcessor = inject(PdfProcessor);
  private sanitizer = inject(DomSanitizer);
  public docService = inject(DocumentProcessingService);
  public historyService = inject(HistoryService);
  public exportService = inject(ExportService);

  // Script and engine status
  isScriptLoaded = computed(() => this.pdfProcessor.isScriptLoaded());

  // Delegated Core Document State Signals
  isParsing = this.docService.isParsing;
  isOptimizing = this.docService.isOptimizing;
  isBatchProcessing = this.docService.isBatchProcessing;
  selectedModel = this.docService.selectedModel;
  selectedOutputMode = this.docService.selectedOutputMode;
  parsingStatus = this.docService.parsingStatus;
  apiError = this.docService.apiError;
  warningMessage = this.docService.warningMessage;
  successMessage = this.docService.successMessage;
  clientApiKey = this.docService.clientApiKey;
  metaApiKey = this.docService.metaApiKey;
  metaModelName = this.docService.metaModelName;

  fileName = this.docService.fileName;
  fileSize = this.docService.fileSize;
  pdfObjectUrl = this.docService.pdfObjectUrl;
  pdfPages = this.docService.pdfPages;
  pdfChunks = this.docService.pdfChunks;
  activeChunk = this.docService.activeChunk;
  isAllCompleted = this.docService.isAllCompleted;
  isOutputModeLocked = this.docService.isOutputModeLocked;
  currentHistoryId = this.docService.currentHistoryId;
  documentStyleProfile = this.docService.documentStyleProfile;

  // History state
  historyItems = this.historyService.historyItems;

  // Local UI State Signals
  selectedTab = signal<'reflow' | 'pdf' | 'source' | 'markdown'>('reflow');
  themeStyle = signal<'clean' | 'warm' | 'mono'>('clean');
  isDevMode = signal(false);
  showApiKeyModal = signal(false);
  showHistoryModal = signal(false);
  showInstruction = signal(false);
  showFullscreenComparison = signal(false);
  zoomImageUrl = signal<string | null>(null);

  // Computed HTML Renderers
  reflowHtml = computed(() => {
    const chunk = this.activeChunk();
    if (!chunk) return '';
    if (chunk.markdownContent && this.selectedOutputMode() === 'markdown') {
      return this.pdfProcessor.renderMarkdownToHtml(chunk.markdownContent, chunk.pages);
    }
    return chunk.reflowHtml || '';
  });
  reflowSafeHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.reflowHtml()));

  private successTimeout: any = null;
  private warningTimeout: any = null;
  private errorTimeout: any = null;

  constructor() {
    // Auto-dismiss errors after 12s
    effect(() => {
      const err = this.apiError();
      if (err) {
        if (this.errorTimeout) clearTimeout(this.errorTimeout);
        this.errorTimeout = setTimeout(() => {
          this.apiError.set('');
        }, 12000);
      }
    });

    // Auto-dismiss warnings after 9s
    effect(() => {
      const warn = this.warningMessage();
      if (warn) {
        if (this.warningTimeout) clearTimeout(this.warningTimeout);
        this.warningTimeout = setTimeout(() => {
          this.docService.clearWarning();
        }, 9000);
      }
    });

    // Auto-dismiss successes after 7s
    effect(() => {
      const msg = this.successMessage();
      if (msg) {
        if (this.successTimeout) clearTimeout(this.successTimeout);
        this.successTimeout = setTimeout(() => {
          this.docService.clearSuccess();
        }, 7000);
      }
    });

    afterNextRender(async () => {
      await this.loadPdfEngine();
      await this.historyService.loadHistory();

      // Load API Key from safe browser storage
      const savedKey = safeGetItem('user_gemini_api_key');
      this.clientApiKey.set(savedKey);

      const savedMetaKey = safeGetItem('user_meta_api_key');
      this.metaApiKey.set(savedMetaKey);

      const savedMetaModel = safeGetItem('custom_meta_model_name')?.trim() || 'muse-spark-1.2-contributor';
      this.metaModelName.set(savedMetaModel);

      // Global zoom helper for rendered HTML images
      (window as any).zoomPdfImage = (src: string) => {
        this.zoomImageUrl.set(src);
      };
    });
  }

  private async loadPdfEngine() {
    await this.pdfProcessor.loadPdfEngine(
      (msg) => this.parsingStatus.set(msg),
      (msg) => this.apiError.set(msg)
    );
  }

  showSuccess(msg: string) {
    this.docService.showSuccess(msg);
  }

  // File Upload & Reset Actions
  async processPdfFile(file: File) {
    const success = await this.docService.processPdfFile(file);
    if (success) {
      this.selectedTab.set('pdf');
    }
  }

  async processPdfFiles(files: File[]) {
    const success = await this.docService.processPdfFiles(files);
    if (success) {
      this.selectedTab.set('pdf');
    }
  }

  resetPdf() {
    this.docService.resetCurrentDocument();
  }

  onHeaderHomeClick() {
    if (this.isParsing() || this.isOptimizing() || this.isBatchProcessing()) {
      return;
    }
    if (this.pdfPages().length > 0) {
      this.resetPdf();
    }
  }

  onOutputModeChanged(mode: OutputMode) {
    if (this.isOutputModeLocked()) {
      this.apiError.set('🔒 Chế độ xuất đã được cố định cho tài liệu này vì đã có phần được xử lý.');
      return;
    }
    this.selectedOutputMode.set(mode);
  }

  // Chunk & Batch Processing
  async selectChunk(idx: number) {
    this.docService.selectedChunkIndex.set(idx);
    const chunk = this.docService.pdfChunks()[idx];
    if (chunk && chunk.status === 'completed') {
      this.selectedTab.set('reflow');
    } else {
      this.selectedTab.set('pdf');
    }
    // Lazy render pages for this chunk if not yet rendered
    await this.docService.ensureChunkPagesRendered(idx);
  }

  async optimizeChunkWithAI(chunkIndex: number) {
    const success = await this.docService.optimizeSingleChunk(chunkIndex);
    if (success) {
      this.selectedTab.set('reflow');
    }
  }

  async startBatchProcessing() {
    await this.docService.startBatchProcessing();
    if (this.isAllCompleted()) {
      this.selectedTab.set('reflow');
    }
  }

  stopBatchProcessing() {
    this.docService.stopBatchProcessing();
  }

  // API Key Management
  openApiKeyModal() {
    this.showApiKeyModal.set(true);
  }

  saveApiKeys(keys: {geminiKey: string, metaKey: string, metaModel?: string}) {
    const trimmedGemini = keys.geminiKey.trim();
    if (trimmedGemini && (/[\u0080-\uFFFF]/.test(trimmedGemini) || trimmedGemini.includes(' '))) {
      this.apiError.set('🔴 Lỗi định dạng API Key: API Key Gemini bạn nhập chứa ký tự không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    const trimmedMeta = keys.metaKey.trim();
    if (trimmedMeta && (/[\u0080-\uFFFF]/.test(trimmedMeta) || trimmedMeta.includes(' '))) {
      this.apiError.set('🔴 Lỗi định dạng API Key: API Key Meta bạn nhập chứa ký tự không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    this.clientApiKey.set(trimmedGemini);
    safeSetItem('user_gemini_api_key', trimmedGemini);
    
    this.metaApiKey.set(trimmedMeta);
    safeSetItem('user_meta_api_key', trimmedMeta);

    const modelName = keys.metaModel?.trim() || 'muse-spark-1.2-contributor';
    this.metaModelName.set(modelName);
    safeSetItem('custom_meta_model_name', modelName);
    
    this.showApiKeyModal.set(false);
    this.showSuccess('Đã lưu cấu hình API Key và Model thành công.');
  }

  clearApiKeyModal() {
    this.clientApiKey.set('');
    safeRemoveItem('user_gemini_api_key');
    
    this.metaApiKey.set('');
    safeRemoveItem('user_meta_api_key');

    this.metaModelName.set('muse-spark-1.2-contributor');
    safeRemoveItem('custom_meta_model_name');
    
    this.showApiKeyModal.set(false);
    this.showSuccess('Đã xóa cấu hình API Key cá nhân.');
  }

  // History Modal Handlers
  async restoreHistoryItem(item: any) {
    await this.docService.restoreFromHistoryItem(item);
    this.showHistoryModal.set(false);
    const active = this.activeChunk();
    if (active && active.status === 'completed') {
      this.selectedTab.set('reflow');
    } else {
      this.selectedTab.set('pdf');
    }
  }

  async removeHistoryItem(id: string) {
    if (this.currentHistoryId() === id) {
      this.resetPdf();
    }
    await this.historyService.removeHistoryItem(id);
    this.showSuccess('Đã xóa tệp khỏi Lịch sử chuyển đổi.');
  }

  // Export & Download Actions (Delegated to ExportService)
  async downloadDocxFile() {
    if (!this.isAllCompleted()) {
      this.apiError.set('Vui lòng hoàn thành xử lý AI trên tất cả các khối trước khi tải file Word.');
      return;
    }
    this.isParsing.set(true);
    const isMulti = this.docService.isMultiFileMode();
    this.parsingStatus.set(isMulti ? 'Đang đóng gói các tệp Word (.docx) vào tệp ZIP...' : 'Đang tạo tệp tài liệu Word (.docx) chuyên nghiệp...');
    try {
      if (isMulti) {
        await this.exportService.exportMultiFileDocxZip(
          this.fileName(),
          this.pdfChunks()
        );
        this.showSuccess('Đóng gói và tải tệp ZIP Word (.docx) thành công!');
      } else {
        await this.exportService.exportFullDocx(
          this.fileName(),
          this.pdfChunks(),
          this.pdfPages()
        );
        this.showSuccess('Tải tệp tài liệu Word (.docx) thành công!');
      }
    } catch (err: any) {
      this.apiError.set(`Lỗi biên dịch tệp Word: ${err.message || err}.`);
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
    this.isParsing.set(true);
    this.parsingStatus.set(`Đang tạo tệp tài liệu Word (.docx) chuyên nghiệp cho ${chunk.originalFileName || chunk.id}...`);
    try {
      await this.exportService.exportChunkDocx(this.fileName(), chunk);
      this.showSuccess(`Tải tệp tài liệu Word (.docx) cho ${chunk.originalFileName || chunk.id} thành công!`);
    } catch (err: any) {
      this.apiError.set(`Lỗi biên dịch tệp Word: ${err.message || err}.`);
    } finally {
      this.isParsing.set(false);
      this.parsingStatus.set('');
    }
  }

  downloadMarkdownFile() {
    if (!this.isAllCompleted()) {
      this.apiError.set('Vui lòng hoàn thành xử lý AI trên tất cả các khối trước.');
      return;
    }
    this.exportService.exportFullMarkdown(this.fileName(), this.pdfChunks());
    this.showSuccess('Đã tải tệp Markdown (.md) thành công.');
  }

  downloadChunkMarkdownFile() {
    const chunk = this.activeChunk();
    if (!chunk || chunk.status !== 'completed' || !chunk.markdownContent) {
      this.apiError.set('Phần này chưa được xử lý xong để tải xuống.');
      return;
    }
    this.exportService.exportChunkMarkdown(this.fileName(), chunk);
    this.showSuccess(`Đã tải tệp Markdown (.md) cho ${chunk.originalFileName || chunk.id} thành công.`);
  }

  async downloadHtmlFile() {
    if (!this.isAllCompleted()) {
      this.apiError.set('Vui lòng hoàn thành xử lý AI trên tất cả các khối trước khi tải file HTML trọn bộ.');
      return;
    }
    const isMulti = this.docService.isMultiFileMode();
    if (isMulti) {
      this.isParsing.set(true);
      this.parsingStatus.set('Đang đóng gói các tệp HTML vào tệp ZIP...');
      try {
        await this.exportService.exportMultiFileHtmlZip(
          this.fileName(),
          this.pdfChunks(),
          this.documentStyleProfile()
        );
        this.showSuccess('Đóng gói và tải tệp ZIP HTML thành công!');
      } catch (err: any) {
        this.apiError.set(`Lỗi đóng gói ZIP HTML: ${err.message || err}.`);
      } finally {
        this.isParsing.set(false);
        this.parsingStatus.set('');
      }
    } else {
      this.exportService.exportFullHtml(this.fileName(), this.pdfChunks(), this.documentStyleProfile());
      this.showSuccess('Đã tải tệp HTML trọn bộ (.html) thành công.');
    }
  }

  downloadChunkHtmlFile() {
    const chunk = this.activeChunk();
    if (!chunk || chunk.status !== 'completed' || !chunk.reflowHtml) {
      this.apiError.set('Phần này chưa được xử lý xong để tải xuống.');
      return;
    }
    this.exportService.exportChunkHtml(this.fileName(), chunk, this.documentStyleProfile());
    this.showSuccess(`Đã tải tệp HTML (.html) cho ${chunk.originalFileName || chunk.id} thành công.`);
  }
}
