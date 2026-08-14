import { Injectable, signal, computed, inject } from '@angular/core';
import { PdfProcessor, PdfPageData } from '../pdf-processor';
import { AiPromptOptimizer } from '../ai-prompt-optimizer';
import { ModelType, PdfType, OutputMode, DocumentStyleProfile } from '../header';

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

  // Core Document State
  fileName = signal('');
  fileSize = signal('');
  pdfFile = signal<File | null>(null);
  pdfPages = signal<PdfPageData[]>([]);
  pdfChunks = signal<PdfChunk[]>([]);
  
  // Settings & Options
  selectedModel = signal<ModelType>('gemini-flash-latest');
  selectedPdfType = signal<PdfType>('scan');
  selectedOutputMode = signal<OutputMode>('html');
  clientApiKey = signal('');

  // Execution State
  isParsing = signal(false);
  isOptimizing = signal(false);
  isBatchProcessing = signal(false);
  shouldStopBatch = signal(false);
  parsingStatus = signal('');
  apiError = signal('');
  
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


  async ensureDocumentStyleProfile(): Promise<DocumentStyleProfile> {
    const currentProfile = this.documentStyleProfile();
    if (currentProfile) return currentProfile;

    const file = this.pdfFile();
    const pages = this.pdfPages();
    const apiKey = this.clientApiKey().trim();
    const modelName = this.selectedModel();

    if (!file || pages.length === 0) {
      throw new Error('Chưa có dữ liệu PDF để phân tích style.');
    }
    if (!apiKey) {
      throw new Error('Vui lòng cấu hình Gemini API Key trước khi thực hiện.');
    }

    this.isAnalyzingStyle.set(true);
    this.parsingStatus.set('Đang phân tích và thiết lập hồ sơ thiết kế đồng nhất (Style Profile) cho toàn bộ tài liệu...');

    try {
      const chunks = this.pdfChunks();
      const profile = await this.aiOptimizer.analyzeDocumentStyle(apiKey, modelName, file, chunks);
      this.documentStyleProfile.set(profile);
      return profile;
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
    const pdfType = this.selectedPdfType();
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
}
