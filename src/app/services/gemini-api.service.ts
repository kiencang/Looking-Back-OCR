/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { PdfChunk } from './document-processing.service';
import { OutputMode, DocumentStyleProfile, DEFAULT_STYLE_PROFILE } from '../header';

@Injectable({
  providedIn: 'root'
})
export class GeminiApiService {
  /**
   * Phân tích phong cách thiết kế tài liệu thông qua Google Gemini API
   */
  async analyzeDocumentStyle(
    apiKey: string,
    modelName: string,
    sampleParts: any[],
    analysisPrompt: string,
    sampleIndices: number[],
    parseProfileFromJson: (rawText: string) => DocumentStyleProfile
  ): Promise<DocumentStyleProfile> {
    const parts = [...sampleParts, { text: analysisPrompt }];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: 'HIGH' }
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      });

      if (!response.ok) {
        console.warn('Lỗi API phân tích phong cách Gemini, sử dụng cấu hình mặc định:', response.status);
        return { ...DEFAULT_STYLE_PROFILE, analyzedSampleChunks: sampleIndices, analyzedAt: Date.now() };
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return parseProfileFromJson(rawText);
    } catch (err) {
      console.warn('Lỗi phân tích phong cách thiết kế tài liệu Gemini, sử dụng cấu hình mặc định:', err);
      return { ...DEFAULT_STYLE_PROFILE, analyzedSampleChunks: sampleIndices, analyzedAt: Date.now() };
    }
  }

  /**
   * Thực hiện gọi Gemini API để xử lý OCR cho một chunk PDF
   */
  async optimizeChunk(
    apiKey: string,
    modelName: string,
    parts: any[],
    systemInstructionText?: string
  ): Promise<{ rawMarkdown: string; inputTokens: number; outputTokens: number }> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const requestBody: any = {
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        temperature: 0.1,
        thinkingConfig: { thinkingLevel: 'HIGH' }
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    if (systemInstructionText) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstructionText }]
      };
    }

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      const originalError = errorData?.error?.message || `HTTP ${apiResponse.status} ${apiResponse.statusText}`;
      const statusDetails = errorData?.error?.status || '';
      throw new Error(`Google API (HTTP ${apiResponse.status}${statusDetails ? ' - ' + statusDetails : ''}): ${originalError}`);
    }

    const resData = await apiResponse.json();
    let rawOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawOutput) {
      const promptBlockReason = resData?.promptFeedback?.blockReason;
      if (promptBlockReason) {
        throw new Error(`Yêu cầu bị chặn từ Google Gemini (Prompt Blocked: ${promptBlockReason})`);
      }

      const candidateObj = resData?.candidates?.[0];
      const finishReason = candidateObj?.finishReason;
      if (finishReason) {
        switch (finishReason) {
          case 'SAFETY':
            throw new Error('Lỗi từ AI: Tài liệu bị bộ lọc an toàn Google từ chối xử lý (SAFETY).');
          case 'RECITATION':
            throw new Error('Lỗi từ AI: Tài liệu bị từ chối do nghi ngờ bản quyền/sao chép (RECITATION).');
          case 'MAX_TOKENS':
            throw new Error('Lỗi từ AI: Độ dài vượt quá số token tối đa cho phép (MAX_TOKENS).');
          case 'OTHER':
            throw new Error('Lỗi từ AI: AI từ chối phản hồi vì lý do không xác định (OTHER).');
          default:
            throw new Error(`Lỗi từ AI: AI từ chối phản hồi (Lý do: ${finishReason}).`);
        }
      } else {
        const jsonDetail = JSON.stringify(resData);
        throw new Error(`Lỗi từ AI: Không nhận được dữ liệu văn bản phản hồi. Chi tiết từ Gemini API: ${jsonDetail}`);
      }
    }

    // Xóa code fences markdown nếu có
    if (rawOutput.includes('```')) {
      const match = rawOutput.match(/```(?:markdown|html|xml)?([\s\S]*?)```/i);
      if (match && match[1]) {
        rawOutput = match[1].trim();
      }
    }

    const inputTokens = resData?.usageMetadata?.promptTokenCount || 0;
    const outputTokens = resData?.usageMetadata?.candidatesTokenCount || 0;

    return {
      rawMarkdown: rawOutput,
      inputTokens,
      outputTokens
    };
  }
}
