import { Injectable, inject } from '@angular/core';
import JSZip from 'jszip';
import { PdfProcessor, PdfPageData } from '../pdf-processor';
import { generateHtmlDocument } from '../utils/html-template-builder';
import { DocumentStyleProfile, DEFAULT_STYLE_PROFILE } from '../header';
import { PdfChunk } from './document-processing.service';
import { generateHistoryId } from './history.service';

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

  // Backup & Restore Project via ZIP
  async exportProjectBackup(item: any): Promise<void> {
    const zip = new JSZip();

    // 1. Separate the heavy Blobs from the metadata
    const { pdfFileBlob, pdfFileBlobs, ...metadata } = item;

    // 2. Clean up any lingering pageImageUrl to prevent massive JSON stringify
    const cleanedPdfPages = (metadata.pdfPages || []).map((p: any) => ({ ...p, pageImageUrl: '' }));
    const cleanedPdfChunks = (metadata.pdfChunks || []).map((c: any) => ({
      ...c,
      pages: (c.pages || []).map((p: any) => ({ ...p, pageImageUrl: '' }))
    }));

    metadata.pdfPages = cleanedPdfPages;
    metadata.pdfChunks = cleanedPdfChunks;

    // 3. Serialize metadata to project.json
    const jsonString = JSON.stringify(metadata, null, 2);
    zip.file('project.json', jsonString);

    // 4. Attach the raw PDF File Blobs directly if they exist
    if (metadata.isMultiFileMode && pdfFileBlobs && pdfFileBlobs.length > 0) {
      pdfFileBlobs.forEach((blob: Blob, index: number) => {
        zip.file(`doc_${index}.pdf`, blob);
      });
    } else if (pdfFileBlob) {
      zip.file('document.pdf', pdfFileBlob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const safeName = this.getCleanFileName(metadata.fileName);
    this.triggerBrowserDownload(zipBlob, `${safeName}_Project.zip`);
  }

  async importProjectBackup(zipFile: File): Promise<any> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(zipFile);

    const projectJsonFile = loadedZip.file('project.json');
    if (!projectJsonFile) {
      throw new Error('Không tìm thấy tệp cấu hình project.json trong gói ZIP này.');
    }

    const jsonString = await projectJsonFile.async('string');
    const projectData = JSON.parse(jsonString);

    // 1. Generate a brand new ID so imported projects are completely isolated 
    // from existing history, even if imported multiple times.
    projectData.id = generateHistoryId();
    projectData.timestamp = Date.now();
    projectData.isImported = true;

    // 2. Extract PDF Blobs if they exist in the archive
    if (projectData.isMultiFileMode) {
      const blobs: Blob[] = [];
      let index = 0;
      while (true) {
        const file = loadedZip.file(`doc_${index}.pdf`);
        if (!file) break;
        const blob = await file.async('blob');
        blobs.push(blob);
        index++;
      }
      if (blobs.length > 0) {
        projectData.pdfFileBlobs = blobs;
      }
    } else {
      const pdfDocumentFile = loadedZip.file('document.pdf');
      if (pdfDocumentFile) {
        const blob = await pdfDocumentFile.async('blob');
        projectData.pdfFileBlob = blob;
      }
    }

    return projectData;
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
