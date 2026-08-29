import { Injectable } from '@angular/core';
import { PDFDocument } from 'pdf-lib';

@Injectable({
  providedIn: 'root'
})
export class ImageToPdfService {

  async convertImagesToPdf(files: File[]): Promise<File> {
    // 1. Sort files alphanumerically
    const sortedFiles = [...files].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();

    for (const file of sortedFiles) {
      const { blob, width, height } = await this.processImage(file);
      
      const buffer = await blob.arrayBuffer();
      
      let pdfImage;
      try {
        pdfImage = await pdfDoc.embedJpg(buffer);
      } catch {
        throw new Error('Lỗi nhúng ảnh vào PDF (có thể do lỗi định dạng).');
      }

      // Add a blank page to the document
      const page = pdfDoc.addPage([width, height]);

      // Draw the image on the page
      page.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new File([pdfBytes as unknown as BlobPart], 'Converted_Images.pdf', { type: 'application/pdf' });
  }

  private processImage(file: File): Promise<{ blob: Blob, width: number, height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        const MAX_DIMENSION = 2000;
        
        if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * MAX_DIMENSION) / targetWidth);
            targetWidth = MAX_DIMENSION;
          } else {
            targetWidth = Math.round((targetWidth * MAX_DIMENSION) / targetHeight);
            targetHeight = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        // Draw image with new dimensions
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        // Export to JPEG with 0.95 quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, width: targetWidth, height: targetHeight });
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          'image/jpeg', // Force output to JPEG since pdf-lib handles JPEG very efficiently
          0.95
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load image: ${file.name}`));
      };

      img.src = url;
    });
  }
}
