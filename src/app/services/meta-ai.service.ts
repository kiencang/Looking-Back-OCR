/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import OpenAI from 'openai';
import { PdfChunk } from './document-processing.service';
import { DocumentStyleProfile, DEFAULT_STYLE_PROFILE } from '../header';

@Injectable({
  providedIn: 'root'
})
export class MetaAiService {
  /**
   * Phân tích phong cách thiết kế tài liệu thông qua Meta AI API
   */
  async analyzeDocumentStyle(
    apiKey: string,
    modelName: string,
    samplePdfBase64: string,
    analysisPrompt: string,
    sampleIndices: number[],
    parseProfileFromJson: (rawText: string) => DocumentStyleProfile
  ): Promise<DocumentStyleProfile> {
    try {
      const fileDataUri = samplePdfBase64.startsWith('data:')
        ? samplePdfBase64
        : `data:application/pdf;base64,${samplePdfBase64}`;

      const client = new OpenAI({
        baseURL: 'https://api.meta.ai/v1',
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const resData: any = await (client as any).responses.create({
        model: modelName,
        temperature: 0.1,
        top_p: 1.0,
        reasoning: {
          effort: 'high'
        },
        input: [
          {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: analysisPrompt
              },
              {
                type: 'input_file',
                filename: 'sample_style_analysis_chunks.pdf',
                file_data: fileDataUri
              }
            ]
          }
        ]
      });

      let textOutput = '';
      if (typeof resData?.output_text === 'string' && resData.output_text.trim()) {
        textOutput = resData.output_text;
      } else if (Array.isArray(resData?.output) && resData.output.length > 0) {
        const messageOutput = resData.output.find((out: any) => out?.type === 'message' && out?.role === 'assistant');
        if (messageOutput && Array.isArray(messageOutput.content)) {
          textOutput = messageOutput.content.map((c: any) => c?.text || c?.val || c?.content || '').join('');
        }
        if (!textOutput) {
          const firstOut = resData.output[0] as any;
          if (typeof firstOut === 'string') {
            textOutput = firstOut;
          } else if (firstOut && typeof firstOut === 'object' && 'content' in firstOut) {
            const content = (firstOut as { content: any }).content;
            if (typeof content === 'string') {
              textOutput = content;
            } else if (Array.isArray(content)) {
              textOutput = content.map((c: any) => (c?.text || c?.val || c?.content || '') as string).join('');
            }
          }
        }
      } else if (Array.isArray(resData?.choices) && (resData.choices[0] as any)?.message?.content) {
        textOutput = (resData.choices[0] as any).message.content;
      } else if (typeof resData?.text === 'string') {
        textOutput = resData.text;
      }

      if (textOutput) {
        return parseProfileFromJson(textOutput);
      }
      return { ...DEFAULT_STYLE_PROFILE, analyzedSampleChunks: sampleIndices, analyzedAt: Date.now() };
    } catch (metaErr) {
      console.warn('Lỗi phân tích phong cách qua Meta AI, sử dụng cấu hình mặc định:', metaErr);
      return { ...DEFAULT_STYLE_PROFILE, analyzedSampleChunks: sampleIndices, analyzedAt: Date.now() };
    }
  }

  /**
   * Thực hiện gọi Meta AI API để xử lý OCR cho một chunk PDF
   */
  async optimizeChunk(
    apiKey: string,
    modelName: string,
    pdfBase64: string,
    chunk: PdfChunk,
    systemInstructionText: string,
    userPromptText: string
  ): Promise<{ rawMarkdown: string; inputTokens: number; outputTokens: number }> {
    const fileDataUri = pdfBase64.startsWith('data:') ? pdfBase64 : `data:application/pdf;base64,${pdfBase64}`;

    const client = new OpenAI({
      baseURL: 'https://api.meta.ai/v1',
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });

    let resData: any;
    try {
      resData = await (client as any).responses.create({
        model: modelName,
        temperature: 0.1,
        top_p: 1.0,
        reasoning: {
          effort: 'high'
        },
        input: [
          {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `${systemInstructionText ? systemInstructionText + '\n\n' : ''}${userPromptText}`
              },
              {
                type: 'input_file',
                filename: `chunk_${chunk.index + 1}_pages_${chunk.startPageNum}-${chunk.endPageNum}.pdf`,
                file_data: fileDataUri
              }
            ]
          }
        ]
      });
    } catch (apiError: any) {
      const errMessage = apiError?.message || apiError?.error?.message || JSON.stringify(apiError);
      throw new Error(`Meta AI API Error: ${errMessage}`);
    }

    let textOutput = '';
    if (typeof resData?.output_text === 'string' && resData.output_text.trim()) {
      textOutput = resData.output_text;
    } else if (Array.isArray(resData?.output) && resData.output.length > 0) {
      const messageOutput = resData.output.find((out: any) => out?.type === 'message' && out?.role === 'assistant');
      if (messageOutput && Array.isArray(messageOutput.content)) {
        textOutput = messageOutput.content.map((c: any) => c?.text || c?.val || c?.content || '').join('');
      }

      if (!textOutput) {
        const firstOut = resData.output[0] as any;
        if (typeof firstOut === 'string') {
          textOutput = firstOut;
        } else if (firstOut && typeof firstOut === 'object' && 'content' in firstOut) {
          const content = (firstOut as { content: any }).content;
          if (typeof content === 'string') {
            textOutput = content;
          } else if (Array.isArray(content)) {
            textOutput = content.map((c: any) => (c?.text || c?.val || c?.content || '') as string).join('');
          }
        }
      }
    } else if (Array.isArray(resData?.choices) && (resData.choices[0] as any)?.message?.content) {
      textOutput = (resData.choices[0] as any).message.content;
    } else if (typeof resData?.text === 'string') {
      textOutput = resData.text;
    }

    if (!textOutput) {
      const rawJsonString = JSON.stringify(resData);
      throw new Error(`Meta AI không tìm thấy nội dung văn bản phản hồi. Chi tiết phản hồi: ${rawJsonString?.substring(0, 300)}...`);
    }

    // Xóa code fences markdown nếu có
    if (textOutput.includes('```')) {
      const match = textOutput.match(/```(?:markdown|html|xml)?([\s\S]*?)```/i);
      if (match && match[1]) {
        textOutput = match[1].trim();
      }
    }

    // Trích xuất thống kê Token chuẩn hóa theo tài liệu Meta AI Responses API:
    // Responses API: usage = { input_tokens, output_tokens, total_tokens, input_tokens_details, output_tokens_details }
    // Chat Completions fallback: usage = { prompt_tokens, completion_tokens, ... }
    const usage: any = resData?.usage || {};
    let inputTokens = usage?.input_tokens ?? usage?.prompt_tokens ?? (typeof resData?.input_tokens === 'number' ? resData.input_tokens : 0);
    let outputTokens = usage?.output_tokens ?? usage?.completion_tokens ?? (typeof resData?.output_tokens === 'number' ? resData.output_tokens : 0);

    // Thuật toán dự phòng an toàn nếu API phản hồi không kèm usage (môi trường giả lập / proxy)
    if (typeof inputTokens !== 'number' || inputTokens <= 0) {
      const pageCount = (chunk.endPageNum - chunk.startPageNum + 1) || 1;
      inputTokens = pageCount * 500 + Math.ceil(userPromptText.length / 4);
    }
    if (typeof outputTokens !== 'number' || outputTokens <= 0) {
      outputTokens = Math.max(1, Math.ceil(textOutput.length / 4));
    }

    return {
      rawMarkdown: textOutput,
      inputTokens: typeof inputTokens === 'number' ? inputTokens : 0,
      outputTokens: typeof outputTokens === 'number' ? outputTokens : 0
    };
  }
}
