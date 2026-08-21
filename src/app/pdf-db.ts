/* eslint-disable @typescript-eslint/no-explicit-any */
import { isPlatformBrowser } from '@angular/common';

export class PdfDb {
  constructor(private platformId: any) {}

  openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) {
        reject(new Error('IndexedDB chỉ khả dụng trên môi trường trình duyệt.'));
        return;
      }
      try {
        const request = indexedDB.open('pdf_epub_images_db', 2);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('history')) {
            db.createObjectStore('history', { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async saveHistoryItem(item: any): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('history', 'readwrite');
        const store = tx.objectStore('history');
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error('Lỗi lưu lịch sử vào IndexedDB:', err);
    }
  }

  async getAllHistoryItems(): Promise<any[]> {
    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('history', 'readonly');
        const store = tx.objectStore('history');
        const request = store.getAll();
        request.onsuccess = () => {
          const all = request.result || [];
          resolve(all);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Lỗi lấy lịch sử từ IndexedDB:', err);
      return [];
    }
  }

  async deleteHistoryItem(id: string): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('history', 'readwrite');
        const store = tx.objectStore('history');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Lỗi xóa lịch sử khỏi IndexedDB:', err);
    }
  }
}

