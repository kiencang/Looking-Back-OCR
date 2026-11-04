/**
 * Bộ lưu trữ khóa bảo mật cấp độ phần cứng/trình duyệt sử dụng Web Crypto API (AES-GCM 256-bit)
 * kết hợp tách kho lưu trữ:
 * - Khóa giải mã đối xứng CryptoKey (extractable: false) lưu trong IndexedDB ('secure_key_db').
 * - Bản mã (Ciphertext) + Vector khởi tạo 12-byte (IV) lưu trong LocalStorage.
 * - Tự động di trú (Auto-Migration) và xóa khóa văn bản thuần cũ.
 * - Cơ chế tự hủy (Tamper Detection) khi phát hiện can thiệp dữ liệu.
 */

const DB_NAME = 'secure_key_db';
const DB_VERSION = 1;
const STORE_NAME = 'crypto_keys';
const MASTER_KEY_ID = 'aes_gcm_master_key_v1';

export type ApiKeyProvider = 'gemini' | 'meta';

interface ProviderStorageConfig {
  encryptedStorageKey: string;
  ivStorageKey: string;
  legacyPlaintextKey: string;
}

const PROVIDER_CONFIGS: Record<ApiKeyProvider, ProviderStorageConfig> = {
  gemini: {
    encryptedStorageKey: 'encrypted_api_key',
    ivStorageKey: 'api_key_iv',
    legacyPlaintextKey: 'user_gemini_api_key'
  },
  meta: {
    encryptedStorageKey: 'encrypted_meta_api_key',
    ivStorageKey: 'meta_api_key_iv',
    legacyPlaintextKey: 'user_meta_api_key'
  }
};

function safeLocalGet(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function safeLocalSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore storage quota or privacy error */
  }
}

function safeLocalRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function isWebCryptoSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined' &&
    typeof window.indexedDB !== 'undefined'
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getOrCreateMasterKey(): Promise<CryptoKey> {
  const db = await openKeyDatabase();
  try {
    const existingKey = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(MASTER_KEY_ID);
      req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
      req.onerror = () => reject(req.error);
    });

    if (existingKey) {
      return existingKey;
    }

    // Sinh khóa AES-GCM 256-bit với extractable = false (không thể xuất khóa thô khỏi trình duyệt)
    const newKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(newKey, MASTER_KEY_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return newKey;
  } finally {
    db.close();
  }
}

async function getExistingMasterKey(): Promise<CryptoKey | null> {
  const db = await openKeyDatabase();
  try {
    const existingKey = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(MASTER_KEY_ID);
      req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
      req.onerror = () => reject(req.error);
    });
    return existingKey || null;
  } finally {
    db.close();
  }
}

async function clearMasterKeyFromIndexedDB(): Promise<void> {
  try {
    const db = await openKeyDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

/**
 * Mã hóa và lưu API Key cho nhà cung cấp tương ứng ('gemini' | 'meta').
 * Tự động xóa sạch key dạng văn bản thuần cũ trong localStorage.
 */
export async function saveSecureApiKey(provider: ApiKeyProvider, plainApiKey: string): Promise<void> {
  const config = PROVIDER_CONFIGS[provider];
  const trimmed = plainApiKey.trim();

  // Luôn dọn sạch key dạng rõ cũ nếu có
  safeLocalRemove(config.legacyPlaintextKey);

  if (!trimmed) {
    safeLocalRemove(config.encryptedStorageKey);
    safeLocalRemove(config.ivStorageKey);
    return;
  }

  if (!isWebCryptoSupported()) {
    return;
  }

  try {
    const cryptoKey = await getOrCreateMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(trimmed);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encodedData
    );

    safeLocalSet(config.encryptedStorageKey, bytesToBase64(new Uint8Array(cipherBuffer)));
    safeLocalSet(config.ivStorageKey, bytesToBase64(iv));
  } catch {
    await removeSecureApiKey();
  }
}

/**
 * Giải mã và đọc API Key cho nhà cung cấp tương ứng ('gemini' | 'meta').
 * Hỗ trợ tự động di trú (migrate) từ khóa dạng văn bản thuần cũ nếu tồn tại.
 * Nếu phát hiện can thiệp trái phép làm giải mã thất bại, tự động kích hoạt removeSecureApiKey().
 */
export async function getSecureApiKey(provider: ApiKeyProvider): Promise<string> {
  const config = PROVIDER_CONFIGS[provider];

  if (!isWebCryptoSupported()) {
    return '';
  }

  // 1. Tự động di trú (Auto-Migration) nếu phát hiện còn key dạng rõ cũ trong localStorage
  const legacyKey = safeLocalGet(config.legacyPlaintextKey).trim();
  if (legacyKey) {
    await saveSecureApiKey(provider, legacyKey);
    return legacyKey;
  }

  // 2. Kiểm tra bản mã và IV trong localStorage
  const encryptedBase64 = safeLocalGet(config.encryptedStorageKey);
  const ivBase64 = safeLocalGet(config.ivStorageKey);

  if (!encryptedBase64 && !ivBase64) {
    return '';
  }

  // Nếu thiếu 1 trong 2 thành phần (dấu hiệu bị sửa đổi/xóa dở dang) -> Tự hủy để bảo vệ
  if (!encryptedBase64 || !ivBase64) {
    await removeSecureApiKey();
    return '';
  }

  try {
    const cryptoKey = await getExistingMasterKey();
    if (!cryptoKey) {
      // Có bản mã nhưng mất khóa trong IndexedDB -> Dọn sạch toàn bộ
      await removeSecureApiKey();
      return '';
    }

    const cipherBytes = base64ToBytes(encryptedBase64);
    const ivBytes = base64ToBytes(ivBase64);

    if (ivBytes.byteLength !== 12) {
      throw new Error('Invalid AES-GCM IV length');
    }

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes as BufferSource },
      cryptoKey,
      cipherBytes as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    // Tamper Detection: Giải mã thất bại do can thiệp bản mã, IV hoặc khóa -> Xóa sạch cả LocalStorage và IndexedDB
    await removeSecureApiKey();
    return '';
  }
}

/**
 * Xóa toàn bộ dữ liệu API Key (bản mã, IV, khóa cũ) ở cả LocalStorage và IndexedDB.
 */
export async function removeSecureApiKey(): Promise<void> {
  for (const provider of Object.keys(PROVIDER_CONFIGS) as ApiKeyProvider[]) {
    const config = PROVIDER_CONFIGS[provider];
    safeLocalRemove(config.legacyPlaintextKey);
    safeLocalRemove(config.encryptedStorageKey);
    safeLocalRemove(config.ivStorageKey);
  }
  await clearMasterKeyFromIndexedDB();
}
