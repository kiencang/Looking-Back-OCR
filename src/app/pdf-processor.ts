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

  markdownToXhtml(markdown: string): string {
    return MarkdownRenderer.markdownToXhtml(markdown);
  }

  /**
   * EPUB generation builder delegation
   */
  generateEpub(title: string, markdownContent: string, pdfPages: PdfPageData[]): Promise<Blob> {
    return EpubExporter.generateEpub(title, markdownContent, pdfPages);
  }

  /**
   * DOCX Word generation delegation
   */
  generateDocx(title: string, markdownContent: string, pdfPages: PdfPageData[]): Promise<Blob> {
    return DocxExporter.generateDocx(title, markdownContent, pdfPages);
  }
}
