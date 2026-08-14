/* eslint-disable @typescript-eslint/no-explicit-any */
import { PdfPageData } from './pdf-processor';
import { MarkdownRenderer } from './markdown-renderer';

export class EpubExporter {
  /**
   * Zip compilation of valid, standard EPUB structure package
   */
  static async generateEpub(
    title: string,
    content: string,
    pdfPages: PdfPageData[],
    outputMode: 'markdown' | 'html' = 'markdown'
  ): Promise<Blob> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8" ?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    const allImages: any[] = [];
    let imgIdx = 1;
    pdfPages.forEach(page => {
      if (page.extractedImages) {
        page.extractedImages.forEach((img: any) => {
          const key = img.labeledKey || `IMG-${String(imgIdx).padStart(2, '0')}`;
          const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '');
          allImages.push({
            id: `img-${safeKey.toLowerCase()}`,
            key: key,
            dataUrl: img.dataUrl,
            fileName: `images/${safeKey}.png`
          });
          imgIdx++;
        });
      }
    });

    allImages.forEach(img => {
      const base64Clean = img.dataUrl.split(',')[1];
      zip.file(`OEBPS/${img.fileName}`, base64Clean, { base64: true });
    });

    const xhtmlContent = outputMode === 'html' 
      ? MarkdownRenderer.htmlToXhtml(content)
      : MarkdownRenderer.markdownToXhtml(content);
    const mathmlProperty = xhtmlContent.includes('<math') ? ' properties="mathml"' : '';

    zip.file('OEBPS/section1.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  ${xhtmlContent}
</body>
</html>`);

    zip.file('OEBPS/stylesheet.css', `body {
  font-family: "Liberation Serif", "Times New Roman", serif;
  line-height: 1.6;
  margin: 1em;
  color: #111111;
}
h1, h2, h3 {
  font-family: sans-serif;
  color: #000000;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
p {
  margin-bottom: 0.8em;
  text-align: justify;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
}
blockquote {
  margin: 1em 2em;
  font-style: italic;
  border-left: 3px solid #ccc;
  padding-left: 1em;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
th, td {
  border: 1px solid #ccc;
  padding: 0.5em;
  text-align: left;
}
code {
  font-family: monospace;
  background-color: #f4f4f4;
  padding: 2px 4px;
  border-radius: 3px;
}`);

    zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Mục lục</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h2>Mục lục</h2>
    <ol>
      <li><a href="section1.xhtml">Nội dung chính</a></li>
    </ol>
  </nav>
</body>
</html>`);

    const uuid = this.generateUuid();
    let imageManifestItems = '';
    allImages.forEach(img => {
      imageManifestItems += `    <item id="${img.id}" href="${img.fileName}" media-type="image/png"/>\n`;
    });

    const currentDate = new Date().toISOString().split('.')[0] + 'Z';
    zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id" xml:lang="vi">
  <metadata>
    <dc:identifier id="id">urn:uuid:${uuid}</dc:identifier>
    <dc:creator id="author_0">Looking-Back-OCR</dc:creator>
    <meta property="file-as" refines="#author_0">Looking-Back-OCR</meta>
    <meta property="role" refines="#author_0" scheme="marc:relators">aut</meta>
    <dc:title>${title}</dc:title>
    <dc:language>vi</dc:language>
    <meta property="dcterms:modified">${currentDate}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="stylesheet.css" media-type="text/css"/>
    <item id="section1" href="section1.xhtml" media-type="application/xhtml+xml"${mathmlProperty}/>
${imageManifestItems}  </manifest>
  <spine toc="ncx">
    <itemref idref="nav"/>
    <itemref idref="section1"/>
  </spine>
</package>`);

    zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>Mục lục</text></navLabel>
      <content src="nav.xhtml"/>
    </navPoint>
    <navPoint id="navpoint-2" playOrder="2">
      <navLabel><text>Nội dung</text></navLabel>
      <content src="section1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`);

    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    return blob;
  }

  private static generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
