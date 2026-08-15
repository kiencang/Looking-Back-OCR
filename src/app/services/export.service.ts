import { Injectable, inject } from '@angular/core';
import { PdfProcessor, PdfPageData } from '../pdf-processor';
import { generateHtmlDocument } from '../utils/html-template-builder';
import { DocumentStyleProfile, OutputMode, DEFAULT_STYLE_PROFILE } from '../header';
import { PdfChunk } from './document-processing.service';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private pdfProcessor = inject(PdfProcessor);

  private triggerBrowserDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getCleanFileName(fileName: string): string {
    return fileName.replace(/\.pdf$/i, '') || 'tai_lieu_chuyen_doi';
  }

  getChunkFileName(fileName: string, chunk: PdfChunk): string {
    const base = this.getCleanFileName(fileName);
    const match = chunk.id.match(/\d+/);
    const pSuffix = match ? `_p${match[0]}` : `_${chunk.id.replace(/\s+/g, '')}`;
    return `${base}${pSuffix}`;
  }

  async exportFullEpub(
    fileName: string,
    chunks: PdfChunk[],
    pages: PdfPageData[],
    outputMode: OutputMode
  ): Promise<void> {
    const activeMarkdown = chunks.map(c => c.markdownContent).join('\n\n');
    const title = this.getCleanFileName(fileName);
    const blob = await this.pdfProcessor.generateEpub(title, activeMarkdown, pages, outputMode);
    this.triggerBrowserDownload(blob, `${title}.epub`);
  }

  async exportChunkEpub(
    fileName: string,
    chunk: PdfChunk,
    outputMode: OutputMode
  ): Promise<void> {
    const title = this.getChunkFileName(fileName, chunk);
    const blob = await this.pdfProcessor.generateEpub(title, chunk.markdownContent, chunk.pages, outputMode);
    this.triggerBrowserDownload(blob, `${title}.epub`);
  }

  async exportFullDocx(
    fileName: string,
    chunks: PdfChunk[],
    pages: PdfPageData[]
  ): Promise<void> {
    const activeMarkdown = chunks.map(c => c.markdownContent).join('\n\n');
    const title = this.getCleanFileName(fileName);
    const blob = await this.pdfProcessor.generateDocx(title, activeMarkdown, pages);
    this.triggerBrowserDownload(blob, `${title}.docx`);
  }

  async exportChunkDocx(
    fileName: string,
    chunk: PdfChunk
  ): Promise<void> {
    const title = this.getChunkFileName(fileName, chunk);
    const blob = await this.pdfProcessor.generateDocx(title, chunk.markdownContent, chunk.pages);
    this.triggerBrowserDownload(blob, `${title}.docx`);
  }

  exportFullMarkdown(fileName: string, chunks: PdfChunk[]): void {
    const activeMarkdown = chunks.map(c => c.markdownContent).join('\n\n');
    const title = this.getCleanFileName(fileName);
    const blob = new Blob([activeMarkdown], { type: 'text/markdown;charset=utf-8' });
    this.triggerBrowserDownload(blob, `${title}.md`);
  }

  exportChunkMarkdown(fileName: string, chunk: PdfChunk): void {
    const title = this.getChunkFileName(fileName, chunk);
    const blob = new Blob([chunk.markdownContent], { type: 'text/markdown;charset=utf-8' });
    this.triggerBrowserDownload(blob, `${title}.md`);
  }

  exportFullHtml(fileName: string, chunks: PdfChunk[], profile?: DocumentStyleProfile | null): void {
    const activeHtml = chunks.map(c => c.reflowHtml).join('<hr class="my-10 border-slate-200" />');
    const title = this.getCleanFileName(fileName);
    const styleProfile = profile || DEFAULT_STYLE_PROFILE;

    const fullHtmlSource = generateHtmlDocument({
      title,
      content: activeHtml || '',
      profile: styleProfile,
      subtitle: 'Trọn bộ tài liệu'
    });

    const blob = new Blob([fullHtmlSource], { type: 'text/html;charset=utf-8' });
    this.triggerBrowserDownload(blob, `${title}.html`);
  }

  exportChunkHtml(fileName: string, chunk: PdfChunk, profile?: DocumentStyleProfile | null): void {
    const title = this.getChunkFileName(fileName, chunk);
    const styleProfile = profile || DEFAULT_STYLE_PROFILE;

    const fullHtmlSource = generateHtmlDocument({
      title,
      content: chunk.reflowHtml || '',
      profile: styleProfile,
      subtitle: `Trang ${chunk.startPageNum} - ${chunk.endPageNum}`
    });

    const blob = new Blob([fullHtmlSource], { type: 'text/html;charset=utf-8' });
    this.triggerBrowserDownload(blob, `${title}.html`);
  }
}
