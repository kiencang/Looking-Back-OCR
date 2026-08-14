/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
export class ImageExtractor {
  /**
   * PDF.js Operator image extraction helper
   */
  static async extractImagesFromPage(page: any, pdfjsLib: any): Promise<any[]> {
    const images: any[] = [];
    if (!pdfjsLib) return images;

    try {
      const operatorList = await page.getOperatorList();
      const fns = operatorList.fnArray;
      const args = operatorList.argsArray;

      const uniqueKeys = new Map<string, { fn: number; inlineImg?: any }>();
      for (let i = 0; i < fns.length; i++) {
        const fn = fns[i];
        if (fn === pdfjsLib.OPS.paintImageXObject) {
          const imageKey = args[i][0];
          if (imageKey && typeof imageKey === 'string' && !uniqueKeys.has(imageKey)) {
            uniqueKeys.set(imageKey, { fn });
          }
        } else if (fn === pdfjsLib.OPS.paintInlineImageXObject) {
          const inlineObj = args[i][0];
          if (inlineObj && typeof inlineObj === 'object') {
            const inlineKey = `inline_img_${i}`;
            uniqueKeys.set(inlineKey, {
              fn,
              inlineImg: inlineObj
            });
          }
        }
      }

      const fetchPromises = Array.from(uniqueKeys.entries()).map(async ([imageKey, info]) => {
        try {
          if (info.inlineImg) {
            return { imageKey, imgObj: info.inlineImg };
          }

          const imgObj = await new Promise<any>((resolve) => {
            let completed = false;
            const timeoutId = setTimeout(() => {
              if (!completed) {
                completed = true;
                resolve(null);
              }
            }, 1000);

            if (page.objs) {
              try {
                page.objs.get(imageKey, (obj: any) => {
                  if (obj && !completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    resolve(obj);
                  }
                });
              } catch (err) {
                // ignore
              }
            }

            if (page.commonObjs) {
              try {
                page.commonObjs.get(imageKey, (obj: any) => {
                  if (obj && !completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    resolve(obj);
                  }
                });
              } catch (err) {
                // ignore
              }
            }
          });

          return { imageKey, imgObj };
        } catch (e) {
          return { imageKey, imgObj: null };
        }
      });

      const fetchedResults = await Promise.all(fetchPromises);

      for (const { imageKey, imgObj } of fetchedResults) {
        if (!imgObj) continue;

        const width = imgObj.width || (imgObj.bitmap && imgObj.bitmap.width) || (imgObj.image && imgObj.image.width) || 0;
        const height = imgObj.height || (imgObj.bitmap && imgObj.bitmap.height) || (imgObj.image && imgObj.image.height) || 0;

        if (width > 24 && height > 24) {
          // Absolute Hard Cap: Bảo toàn tỷ lệ nhưng khống chế kích cỡ tối đa hai chiều không quá 1024px
          const MAX_DIMENSION = 1024;
          let targetWidth = width;
          let targetHeight = height;

          if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / targetWidth, MAX_DIMENSION / targetHeight);
            targetWidth = Math.floor(targetWidth * ratio);
            targetHeight = Math.floor(targetHeight * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d')!;

          const drawable = imgObj.bitmap || imgObj.image || 
            (typeof ImageBitmap !== 'undefined' && imgObj instanceof ImageBitmap ? imgObj : null) || 
            (typeof HTMLImageElement !== 'undefined' && imgObj instanceof HTMLImageElement ? imgObj : null) ||
            (typeof HTMLCanvasElement !== 'undefined' && imgObj instanceof HTMLCanvasElement ? imgObj : null);

          if (drawable) {
            try {
              ctx.drawImage(drawable, 0, 0, targetWidth, targetHeight);
              const dataUrl = canvas.toDataURL('image/png');
              images.push({
                dataUrl,
                width: targetWidth,
                height: targetHeight,
                key: imageKey
              });
            } catch (drawErr) {
              // ignore
            }
          } else if (imgObj.data) {
            try {
              const rawData = imgObj.data;
              const numPixels = width * height;

              // Tái dựng dữ liệu pixel gốc sang canvas đệm để trình duyệt xử lý nội suy (bilinear/bicubic) tự động khi thu nhỏ
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = width;
              tempCanvas.height = height;
              const tempCtx = tempCanvas.getContext('2d')!;
              const tempImgData = tempCtx.createImageData(width, height);
              const tempTargetData = tempImgData.data;

              if (rawData.length === numPixels * 4) {
                tempTargetData.set(rawData);
              } else if (rawData.length === numPixels * 3) {
                let src = 0;
                let dest = 0;
                for (let p = 0; p < numPixels; p++) {
                  tempTargetData[dest] = rawData[src];
                  tempTargetData[dest + 1] = rawData[src + 1];
                  tempTargetData[dest + 2] = rawData[src + 2];
                  tempTargetData[dest + 3] = 255;
                  src += 3;
                  dest += 4;
                }
              } else {
                let src = 0;
                let dest = 0;
                for (let p = 0; p < numPixels; p++) {
                  const val = rawData[src] !== undefined ? rawData[src] : 128;
                  tempTargetData[dest] = val;
                  tempTargetData[dest + 1] = val;
                  tempTargetData[dest + 2] = val;
                  tempTargetData[dest + 3] = 255;
                  src++;
                  dest += 4;
                }
              }

              tempCtx.putImageData(tempImgData, 0, 0);
              
              // Vẽ scaled từ canvas đệm xuống canvas đích
              ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);

              const dataUrl = canvas.toDataURL('image/png');
              images.push({
                dataUrl,
                width: targetWidth,
                height: targetHeight,
                key: imageKey
              });
            } catch (pixelErr) {
              // ignore
            }
          }
        }
      }
    } catch (e) {
      console.error('Không bóc được hình lẻ:', e);
    }
    return images;
  }
}
