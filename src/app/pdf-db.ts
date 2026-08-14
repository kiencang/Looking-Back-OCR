/* eslint-disable @typescript-eslint/no-explicit-any */
import { isPlatformBrowser } from '@angular/common';
import { SavedImage } from './pdf-processor';

export class PdfDb {
  constructor(private platformId: any) {}

  openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) {
        reject(new Error('IndexedDB chỉ khả dụng trên môi trường trình duyệt.'));
        return;
      }
      const request = indexedDB.open('pdf_epub_images_db', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
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

  async saveImageToDb(img: SavedImage): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        store.put(img);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error('Lỗi lưu ảnh vào IndexedDB:', err);
    }
  }

  async getStoredImagesForFile(fileName: string): Promise<SavedImage[]> {
    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readonly');
        const store = tx.objectStore('images');
        const request = store.getAll();
        request.onsuccess = () => {
          const all = request.result as SavedImage[];
          resolve(all.filter(x => x.fileName === fileName));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Lỗi đọc ảnh từ IndexedDB:', err);
      return [];
    }
  }

  async clearStoredImagesForFile(fileName: string): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        const request = store.getAll();
        request.onsuccess = () => {
          const all = request.result as SavedImage[];
          let completedCount = 0;
          const itemsToDelete = all.filter(x => x.fileName === fileName);
          if (itemsToDelete.length === 0) {
            resolve();
            return;
          }
          itemsToDelete.forEach(x => {
            const delReq = store.delete(x.id);
            delReq.onsuccess = () => {
              completedCount++;
              if (completedCount === itemsToDelete.length) {
                resolve();
              }
            };
            delReq.onerror = () => {
              completedCount++;
              if (completedCount === itemsToDelete.length) {
                resolve();
              }
            };
          });
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Lỗi xóa IndexedDB:', err);
    }
  }
}
