/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utility for parsing and translating Gemini API and Browser Network errors into user-friendly Vietnamese messages.
 */
export function translateGeminiError(errorInput: any): string {
  if (!errorInput) return '🔴 Lỗi không xác định.';

  // Check for browser DOM Event serialization artifact: {"isTrusted":true}
  if (typeof errorInput === 'object') {
    const stringified = JSON.stringify(errorInput);
    if (stringified === '{"isTrusted":true}' || stringified === '{}' || (typeof Event !== 'undefined' && errorInput instanceof Event)) {
      return '🔴 Lỗi kết nối mạng / Tường lửa: Yêu cầu tới Google Gemini API bị chặn (CORS/Network error). Vui lòng kiểm tra kết nối internet, tắt trình chặn quảng cáo (AdBlocker/Brave Shields) hoặc vô hiệu hóa VPN/Proxy.';
    }
  }

  const rawMsg = typeof errorInput === 'string' ? errorInput : (errorInput.message || JSON.stringify(errorInput));
  if (rawMsg === '{"isTrusted":true}' || rawMsg === '{}') {
    return '🔴 Lỗi kết nối mạng / Tường lửa: Yêu cầu tới Google Gemini API bị chặn (CORS/Network error). Vui lòng kiểm tra kết nối internet, tắt trình chặn quảng cáo (AdBlocker/Brave Shields) hoặc vô hiệu hóa VPN/Proxy.';
  }

  const lower = rawMsg.toLowerCase();

  // 1. Quota Exceeded (429)
  if (lower.includes('quota') || lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('rate limit')) {
    return '🔴 Hết hạn mức API (Quota Exceeded / Rate Limit): Tài khoản của bạn đã đạt giới hạn yêu cầu (RPM/TPD) của Google. Vui lòng chờ 1-2 phút rồi thử lại hoặc đổi API Key khác.';
  }

  // 2. Invalid API Key / Auth (400, 401, 403)
  if (lower.includes('api_key_invalid') || lower.includes('api key not valid') || lower.includes('401') || lower.includes('unauthenticated') || lower.includes('permission denied')) {
    return '🔴 API Key không hợp lệ hoặc đã bị khóa: Vui lòng kiểm tra lại cấu hình Gemini API Key trong phần Cài đặt API Key.';
  }

  // 3. Model Not Found / Model Deprecated (404)
  if (lower.includes('not found') || lower.includes('404') || lower.includes('model') && lower.includes('deprecated')) {
    return '🔴 Mô hình AI không khả dụng hoặc đã thay đổi: Vui lòng thử chọn một mô hình khác trong thanh công cụ (ví dụ: Gemini 2.5 Flash).';
  }

  // 4. Overloaded / Server Error (500, 503)
  if (lower.includes('overloaded') || lower.includes('503') || lower.includes('internal error') || lower.includes('unavailable')) {
    return '🔴 Máy chủ Google Gemini đang quá tải tạm thời (503): Vui lòng chờ khoảng 30 giây và nhấn "Thử lại".';
  }

  // 5. Blocked Prompt / Safety
  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('candidate was blocked')) {
    return '🔴 Nội dung bị bộ lọc an toàn của Google từ chối xử lý: Trang PDF có thể chứa nội dung nhạy cảm hoặc không đạt tiêu chuẩn an toàn.';
  }

  // 6. Network / Offline
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('fetch error') || lower.includes('load failed')) {
    return '🔴 Lỗi kết nối mạng: Không thể kết nối tới máy chủ Google Gemini. Vui lòng kiểm tra đường truyền Internet của bạn.';
  }

  // 7. Token Limit / Context window
  if (lower.includes('token') && (lower.includes('exceed') || lower.includes('maximum') || lower.includes('too large'))) {
    return '🔴 Phần PDF quá lớn vượt giới hạn xử lý: Vui lòng giảm số trang mỗi phần hoặc chọn chất lượng nén phù hợp.';
  }

  return `🔴 ${rawMsg}`;
}
