/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PdfDb } from './pdf-db';
import { MarkdownRenderer } from './markdown-renderer';
import { EpubExporter } from './epub-exporter';
import { DocxExporter } from './docx-exporter';
import { PDFDocument } from 'pdf-lib';

export interface PdfPageData {
  pageNum: number;
  items: any[];
  pageImageUrl: string; // PNG Data URL, scale 1.0 (lazy rendered)
  extractedImages: any[];
}

export interface SavedImage {
  id: string; // e.g., "filename_IMG-01"
  key: string; // e.g., "IMG-01"
  fileName: string;
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfProcessor {
  private platformId = inject(PLATFORM_ID);
  private db = new PdfDb(this.platformId);
  private pdfjsLib: any = null;
  private currentPdfDoc: any = null;
  private currentFileName = '';
  
  isScriptLoaded = signal(false);

  async loadPdfEngine(updateStatus: (msg: string) => void, setError: (msg: string) => void): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.pdfjsLib) {
      this.isScriptLoaded.set(true);
      return;
    }

    try {
      if ((window as any).pdfjsLib) {
        this.pdfjsLib = (window as any).pdfjsLib;
        this.isScriptLoaded.set(true);
        return;
      }

      updateStatus('Đang nạp trình kết xuất PDF...');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;

      await new Promise<void>((resolve, reject) => {
        script.onload = () => {
          this.pdfjsLib = (window as any).pdfjsLib;
          if (this.pdfjsLib) {
            this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            this.isScriptLoaded.set(true);
            resolve();
          } else {
            reject(new Error('Không tìm thấy pdfjsLib sau khi nạp script.'));
          }
        };
        script.onerror = () => reject(new Error('Lỗi khi tải thư viện PDF.js'));
        document.head.appendChild(script);
      });
    } catch (e: any) {
      setError('Lỗi nạp thư viện PDF.js: ' + (e.message || e));
    }
  }

  isLoaded(): boolean {
    return this.isScriptLoaded();
  }

  getPdfjsLib(): any {
    return this.pdfjsLib || (typeof window !== 'undefined' ? (window as any).pdfjsLib : null);
  }

  async loadPdfDocument(file: File): Promise<any> {
    if (!this.pdfjsLib) {
      await this.loadPdfEngine(() => undefined, () => undefined);
    }
    const lib = this.getPdfjsLib();
    if (!lib) {
      throw new Error('Thư viện PDF.js chưa sẵn sàng.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = lib.getDocument({ data: arrayBuffer });
    this.currentPdfDoc = await loadingTask.promise;
    this.currentFileName = file.name;
    return this.currentPdfDoc;
  }

  async renderPageToPng(pageNum: number): Promise<string> {
    if (!this.currentPdfDoc) return '';
    try {
      const page = await this.currentPdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 }); // Scale = 1.0 per requirement
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };
      await page.render(renderContext).promise;
      return canvas.toDataURL('image/png'); // Standard PNG format
    } catch (err) {
      console.error(`Error rendering page ${pageNum} to PNG:`, err);
      return '';
    }
  }

  async extractPdfChunks(file: File, onProgress: (msg: string) => void): Promise<{ pages: PdfPageData[], chunks: any[] }> {
    const arrayBuffer = await file.arrayBuffer();
    onProgress('Đọc tài liệu PDF...');
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const numPages = srcDoc.getPageCount();

    if (numPages > 500) {
      throw new Error(`Tài liệu có ${numPages} trang, vượt quá giới hạn cho phép (tối đa 500 trang). Vui lòng chia nhỏ tài liệu trước khi xử lý.`);
    }

    // Initialize pdfjs document for on-demand PNG rendering
    try {
      await this.loadPdfDocument(file);
    } catch (e) {
      console.warn('Could not load pdfjsDoc for on-demand rendering:', e);
    }

    const itemsExtracted: PdfPageData[] = [];
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      itemsExtracted.push({
        pageNum,
        items: [],
        pageImageUrl: '',
        extractedImages: []
      });
    }

    const createChunks = (pages: PdfPageData[]): any[] => {
      const chunks: any[] = [];
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

    let chunkCounter = 1;
    for (const chunk of generatedChunks) {
      chunk.id = `Phần ${chunkCounter}`;
      chunkCounter++;
    }

    // On-demand rendering: Render immediately ONLY for chunk 1 (pages in chunk 1)
    if (generatedChunks.length > 0) {
      onProgress('Đang render trước ảnh Bản gốc Phần 1...');
      const firstChunk = generatedChunks[0];
      for (const page of firstChunk.pages) {
        if (!page.pageImageUrl) {
          page.pageImageUrl = await this.renderPageToPng(page.pageNum);
        }
      }
    }

    return { pages: itemsExtracted, chunks: generatedChunks };
  }

  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * IndexedDB Persistence delegation
   */
  openDb(): Promise<IDBDatabase> {
    return this.db.openDb();
  }

  saveHistoryItem(item: any): Promise<void> {
    return this.db.saveHistoryItem(item);
  }

  getAllHistoryItems(): Promise<any[]> {
    return this.db.getAllHistoryItems();
  }

  deleteHistoryItem(id: string): Promise<void> {
    return this.db.deleteHistoryItem(id);
  }

  saveImageToDb(img: SavedImage): Promise<void> {
    return this.db.saveImageToDb(img);
  }

  getStoredImagesForFile(fileName: string): Promise<SavedImage[]> {
    return this.db.getStoredImagesForFile(fileName);
  }

  clearStoredImagesForFile(fileName: string): Promise<void> {
    return this.db.clearStoredImagesForFile(fileName);
  }

  /**
   * Markdown preview and XHTML compiler rendering delegation
   */
  renderMarkdownToHtml(markdown: string, pdfPages: PdfPageData[]): string {
    return MarkdownRenderer.renderMarkdownToHtml(markdown, pdfPages);
  }

  renderHtmlContent(htmlContent: string, pdfPages: PdfPageData[]): string {
    return MarkdownRenderer.renderHtmlContent(htmlContent, pdfPages);
  }

  renderContent(content: string, pdfPages: PdfPageData[], outputMode: 'markdown' | 'html' = 'markdown'): string {
    if (outputMode === 'html') {
      return MarkdownRenderer.renderHtmlContent(content, pdfPages);
    }
    return MarkdownRenderer.renderMarkdownToHtml(content, pdfPages);
  }

  markdownToXhtml(markdown: string): string {
    return MarkdownRenderer.markdownToXhtml(markdown);
  }

  htmlToXhtml(htmlContent: string): string {
    return MarkdownRenderer.htmlToXhtml(htmlContent);
  }

  /**
   * EPUB generation builder delegation
   */
  generateEpub(title: string, content: string, pdfPages: PdfPageData[], outputMode: 'markdown' | 'html' = 'markdown'): Promise<Blob> {
    return EpubExporter.generateEpub(title, content, pdfPages, outputMode);
  }

  /**
   * DOCX Word generation delegation
   */
  generateDocx(title: string, content: string, pdfPages: PdfPageData[]): Promise<Blob> {
    return DocxExporter.generateDocx(title, content, pdfPages);
  }
}

