/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PdfDb } from './pdf-db';
import { ImageExtractor } from './image-extractor';
import { MarkdownRenderer } from './markdown-renderer';
import { EpubExporter } from './epub-exporter';
import { DocxExporter } from './docx-exporter';

export interface PdfPageData {
  pageNum: number;
  items: any[];
  pageImageUrl: string;
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
  async extractPdfChunks(file: File, pdfType: 'scan' | 'standard', onProgress: (msg: string) => void): Promise<{ pages: PdfPageData[], chunks: any[] }> {
    if (!this.pdfjsLib) throw new Error('PDF.js not loaded');

    const fileReader = new FileReader();
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      fileReader.onload = () => resolve(fileReader.result as ArrayBuffer);
      fileReader.onerror = (err) => reject(err);
      fileReader.readAsArrayBuffer(file);
    });

    onProgress('Chuẩn bị phân tích tài liệu...');
    const loadingTask = this.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pdf.numPages > 1000) {
      throw new Error(`Tài liệu có ${pdf.numPages} trang, vượt quá giới hạn 1000 trang`);
    }

    const itemsExtracted: PdfPageData[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      onProgress(`Trích xuất nội dung: Trang ${pageNum} / ${pdf.numPages}...`);
      const page = await pdf.getPage(pageNum);

      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => ({
        text: item.str,
        transform: item.transform,
        width: item.width,
        height: item.height,
      }));

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      }
      const pageImageUrl = canvas.toDataURL('image/png');

      let extractedImages: any[] = [];
      if (pdfType === 'standard') {
        onProgress(`Tách lập hình ảnh trang ${pageNum}...`);
        extractedImages = await this.extractImagesFromPage(page);
      }

      itemsExtracted.push({
        pageNum,
        items: textItems,
        pageImageUrl,
        extractedImages
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

    if (pdfType === 'standard') {
      onProgress('Đang đặt gán nhãn ảnh và lưu vào cơ sở dữ liệu IndexedDB trình duyệt...');
      let chunkCounter = 1;
      for (const chunk of generatedChunks) {
        chunk.id = `Phần ${chunkCounter}`;
        let imageIdxInChunk = 1;
        for (const page of chunk.pages) {
          if (page.extractedImages) {
            for (const img of page.extractedImages) {
              const labelKey = `IMG-CHUNK${chunkCounter}-${String(imageIdxInChunk).padStart(2, '0')}`;
              img.labeledKey = labelKey;

              await this.saveImageToDb({
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

    return { pages: itemsExtracted, chunks: generatedChunks };
  }

  private platformId = inject(PLATFORM_ID);
  private db = new PdfDb(this.platformId);
  
  isScriptLoaded = signal(false);
  private pdfjsLib: any = null;

  async loadPdfEngine(updateStatus: (msg: string) => void, setError: (msg: string) => void): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      updateStatus('Đang tải thư viện xử lý thông tin PDF...');
      if ((window as any).pdfjsLib) {
        this.pdfjsLib = (window as any).pdfjsLib;
        this.isScriptLoaded.set(true);
        updateStatus('');
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        this.pdfjsLib = (window as any).pdfjsLib;
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        this.isScriptLoaded.set(true);
        updateStatus('');
      };
      script.onerror = () => {
        setError('Không thể tải thư viện PDF.js từ máy chủ CDN. Vui lòng kiểm tra lại kết nối!');
      };
      document.head.appendChild(script);
    } catch (e: any) {
      setError('Lỗi cài đặt công cụ PDF: ' + e.message);
    }
  }

  isLoaded(): boolean {
    return this.isScriptLoaded() && !!this.pdfjsLib;
  }

  getPdfjsLib(): any {
    return this.pdfjsLib;
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
   * Extraction delegation
   */
  extractImagesFromPage(page: any): Promise<any[]> {
    return ImageExtractor.extractImagesFromPage(page, this.pdfjsLib);
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
