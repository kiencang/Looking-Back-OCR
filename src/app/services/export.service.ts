import { Injectable, inject } from '@angular/core';
import JSZip from 'jszip';
import { PdfProcessor, PdfPageData } from '../pdf-processor';
import { generateHtmlDocument } from '../utils/html-template-builder';
import { DocumentStyleProfile, DEFAULT_STYLE_PROFILE } from '../header';
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
    if (chunk.originalFileName) {
      return this.getCleanFileName(chunk.originalFileName);
    }
    const base = this.getCleanFileName(fileName);
    const match = chunk.id.match(/\d+/);
    const pSuffix = match ? `_p${match[0]}` : `_${chunk.id.replace(/\s+/g, '')}`;
    return `${base}${pSuffix}`;
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

  async exportMultiFileDocxZip(
    fileName: string,
    chunks: PdfChunk[]
  ): Promise<void> {
    const zip = new JSZip();
    
    // Generate individual docx file for each chunk keeping original file name
    for (const chunk of chunks) {
      const chunkTitle = this.getChunkFileName(fileName, chunk);
      const docxBlob = await this.pdfProcessor.generateDocx(chunkTitle, chunk.markdownContent, chunk.pages);
      zip.file(`${chunkTitle}.docx`, docxBlob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const bundleName = this.getCleanFileName(chunks[0]?.originalFileName || fileName);
    this.triggerBrowserDownload(zipBlob, `${bundleName}_DOCX_Bundle.zip`);
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

  async exportMultiFileHtmlZip(
    fileName: string,
    chunks: PdfChunk[],
    profile?: DocumentStyleProfile | null
  ): Promise<void> {
    const zip = new JSZip();
    const styleProfile = profile || DEFAULT_STYLE_PROFILE;

    for (const chunk of chunks) {
      const chunkTitle = this.getChunkFileName(fileName, chunk);
      const fullHtmlSource = generateHtmlDocument({
        title: chunkTitle,
        content: chunk.reflowHtml || '',
        profile: styleProfile,
        subtitle: `Tài liệu: ${chunkTitle}`
      });
      zip.file(`${chunkTitle}.html`, fullHtmlSource);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const bundleName = this.getCleanFileName(chunks[0]?.originalFileName || fileName);
    this.triggerBrowserDownload(zipBlob, `${bundleName}_HTML_Bundle.zip`);
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
