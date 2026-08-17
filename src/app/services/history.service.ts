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
  model?: string;
  selectedOutputMode: string;
  pdfPages?: any[];
  pdfChunks?: any[];
  pdfFileData?: any;
  documentStyleProfile?: any;
  pdfFileBlob?: Blob;
}

/**
 * Sinh ID duy nhất, ngắn gọn, tương thích 100% mọi trình duyệt (Timestamp Base36 + Crypto/Random Hex)
 */
export function generateHistoryId(): string {
  const timePart = Date.now().toString(36);
  let randomPart = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    randomPart = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  } else {
    randomPart = Math.random().toString(36).substring(2, 10);
  }
  return `hist_${timePart}_${randomPart}`;
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
      const sorted = (items || []).sort((a: HistoryItem, b: HistoryItem) => (b.timestamp || 0) - (a.timestamp || 0));
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
      const sorted = (allItems || []).sort((a: HistoryItem, b: HistoryItem) => (b.timestamp || 0) - (a.timestamp || 0));
      
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
    id?: string;
    fileName: string;
    fileSize: string;
    pdfPages: any[];
    pdfChunks: any[];
    selectedModel: string;
    selectedOutputMode: string;
    documentStyleProfile?: any;
    pdfFileBlob?: Blob;
  }): Promise<string> {
    if (!docState.fileName || docState.pdfChunks.length === 0) return '';

    try {
      const completedCount = docState.pdfChunks.filter((c: any) => c.status === 'completed').length;
      const historyId = docState.id || generateHistoryId();

      const historyItem: HistoryItem = {
        id: historyId,
        timestamp: Date.now(),
        fileName: docState.fileName,
        fileSize: docState.fileSize,
        totalChunks: docState.pdfChunks.length,
        completedChunks: completedCount,
        selectedModel: docState.selectedModel,
        model: docState.selectedModel,
        selectedOutputMode: docState.selectedOutputMode,
        pdfPages: docState.pdfPages,
        pdfChunks: docState.pdfChunks,
        documentStyleProfile: docState.documentStyleProfile,
        pdfFileBlob: docState.pdfFileBlob
      };

      await this.saveHistoryItemAndTrim(historyItem);
      return historyId;
    } catch (err) {
      console.error('Lỗi sao lưu tiến trình vào lịch sử:', err);
      return '';
    }
  }
}
