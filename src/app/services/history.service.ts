/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PdfDb } from '../pdf-db';

export interface HistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  fileSize: string;
  totalChunks: number;
  completedChunks: number;
  selectedModel: string;
  selectedPdfType: string;
  selectedOutputMode: string;
  pdfPages?: any[];
  pdfChunks?: any[];
  pdfFileData?: any;
  documentStyleProfile?: any;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private platformId = inject(PLATFORM_ID);
  private pdfDb = new PdfDb(this.platformId);

  historyItems = signal<HistoryItem[]>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadHistory();
    }
  }

  async loadHistory(): Promise<HistoryItem[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const items = await this.pdfDb.getAllHistoryItems();
      const sorted = (items || []).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      this.historyItems.set(sorted);
      return sorted;
    } catch (err) {
      console.error('Lỗi khi tải lịch sử:', err);
      return [];
    }
  }

  async saveHistoryItemAndTrim(item: HistoryItem): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await this.pdfDb.saveHistoryItem(item);
      const allItems = await this.pdfDb.getAllHistoryItems();
      const sorted = (allItems || []).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      
      // Trim to maximum 10 items
      if (sorted.length > 10) {
        const toDelete = sorted.slice(10);
        for (const oldItem of toDelete) {
          if (oldItem.id) {
            await this.pdfDb.deleteHistoryItem(oldItem.id);
          }
        }
        this.historyItems.set(sorted.slice(0, 10));
      } else {
        this.historyItems.set(sorted);
      }
    } catch (err) {
      console.error('Lỗi lưu lịch sử:', err);
    }
  }

  async removeHistoryItem(id: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await this.pdfDb.deleteHistoryItem(id);
      this.historyItems.update(items => items.filter(i => i.id !== id));
    } catch (err) {
      console.error('Lỗi xóa mục lịch sử:', err);
    }
  }

  async saveCurrentProgressToHistory(docState: {
    fileName: string;
    fileSize: string;
    pdfPages: any[];
    pdfChunks: any[];
    selectedModel: string;
    selectedPdfType: string;
    selectedOutputMode: string;
    documentStyleProfile?: any;
  }): Promise<void> {
    if (!docState.fileName || docState.pdfChunks.length === 0) return;

    try {
      const completedCount = docState.pdfChunks.filter((c: any) => c.status === 'completed').length;
      const historyItem: HistoryItem = {
        id: `hist_${docState.fileName}_${docState.pdfPages.length}`,
        timestamp: Date.now(),
        fileName: docState.fileName,
        fileSize: docState.fileSize,
        totalChunks: docState.pdfChunks.length,
        completedChunks: completedCount,
        selectedModel: docState.selectedModel,
        selectedPdfType: docState.selectedPdfType,
        selectedOutputMode: docState.selectedOutputMode,
        pdfPages: docState.pdfPages,
        pdfChunks: docState.pdfChunks,
        documentStyleProfile: docState.documentStyleProfile
      };

      await this.saveHistoryItemAndTrim(historyItem);
    } catch (err) {
      console.error('Lỗi sao lưu tiến trình vào lịch sử:', err);
    }
  }
}
