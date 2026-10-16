import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import type { CanvasElement, PdfPageInfo, PdfTextBlock } from '../types/pdf';
import { recognizeCanvasText, convertOcrLinesToElements, sampleColorsFromCanvas } from './ocrEngine';

// Safely configure PDF.js worker with Vite asset URL
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface PdfParseResult {
  pages: PdfPageInfo[];
  elements: CanvasElement[];
}

// Render real PDF file pages to high-resolution data URLs and extract all text items as editable elements
export const renderAndExtractPdf = async (file: File): Promise<PdfParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages: PdfPageInfo[] = [];
  const elements: CanvasElement[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const scale = 2.0; // High resolution rendering for 100% crisp visual fidelity
    const viewport = page.getViewport({ scale });
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    const pageTextBlocks: PdfTextBlock[] = [];

    if (ctx) {
      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      // Extract text content and build accurate text blocks
      try {
        const textContent = await page.getTextContent();
        const rawItems: {
          str: string;
          x: number;
          y: number;
          width: number;
          height: number;
          fontSize: number;
          baselineY: number;
          fontWeight: 'normal' | 'bold';
          fontFamily: string;
        }[] = [];

        for (const item of textContent.items) {
          if (!('str' in item) || !item.str) continue;
          const cleanStr = item.str.replace(/\u0000/g, '');
          if (cleanStr.trim().length === 0) continue;
          
          const transform = item.transform;
          const [vx, vy] = unscaledViewport.convertToViewportPoint(transform[4], transform[5]);
          
          const fontScale = Math.hypot(transform[0], transform[1]) || Math.abs(transform[3]) || item.height || 12;
          const fontSize = Math.max(8, Math.round(fontScale));
          const baselineY = Math.round(vy);
          const x = Math.round(vx);
          const height = Math.max(18, Math.round(fontSize * 1.25));
          const y = Math.round(vy - fontSize * 0.88);
          const width = Math.round(item.width || (cleanStr.length * fontSize * 0.55));

          const style = textContent.styles ? textContent.styles[item.fontName] : null;
          const fontNameLower = (item.fontName || '').toLowerCase();
          const styleFamilyLower = (style?.fontFamily || '').toLowerCase();
          const isBold = fontNameLower.includes('bold') ||
                         fontNameLower.includes('black') ||
                         fontNameLower.includes('heavy') ||
                         fontNameLower.includes('medium') ||
                         styleFamilyLower.includes('bold') ||
                         fontSize >= 20;
          const fontWeight: 'normal' | 'bold' = isBold ? 'bold' : 'normal';

          let fontFamily = 'Arial, sans-serif';
          if (styleFamilyLower.includes('serif') || styleFamilyLower.includes('times') || styleFamilyLower.includes('georgia')) {
            fontFamily = 'Georgia, serif';
          } else if (styleFamilyLower.includes('mono') || styleFamilyLower.includes('courier')) {
            fontFamily = 'Courier New, monospace';
          } else if (styleFamilyLower.includes('roboto')) {
            fontFamily = 'Roboto, sans-serif';
          }

          rawItems.push({
            str: cleanStr,
            x,
            y,
            width,
            height,
            fontSize,
            baselineY,
            fontWeight,
            fontFamily,
          });
        }

        // Sort items: top-to-bottom by baseline, then left-to-right on the same line
        rawItems.sort((a, b) => {
          const baselineTol = Math.max(3, Math.min(a.fontSize, b.fontSize) * 0.4);
          if (Math.abs(a.baselineY - b.baselineY) > baselineTol) {
            return a.baselineY - b.baselineY;
          }
          return a.x - b.x;
        });

        // Merge adjacent or overlapping items into complete, coherent sentences and lines
        const groupedLines: typeof rawItems = [];

        for (const item of rawItems) {
          const current = groupedLines[groupedLines.length - 1];
          const lineTol = Math.max(3.5, Math.min(current ? current.fontSize : 12, item.fontSize) * 0.45);
          const isSameLine = current && Math.abs(current.baselineY - item.baselineY) <= lineTol;
          const isSameFont = current && Math.abs(current.fontSize - item.fontSize) <= 3 && current.fontWeight === item.fontWeight;

          if (current && isSameLine && isSameFont) {
            const prevRight = current.x + current.width;
            const isAdjacentOrOverlapping = item.x >= current.x - 2 && item.x <= prevRight + current.fontSize * 2.5;

            if (isAdjacentOrOverlapping) {
              const gap = item.x - prevRight;
              const needsSpace = gap > current.fontSize * 0.15 && !current.str.endsWith(' ') && !item.str.startsWith(' ');
              current.str += (needsSpace ? ' ' : '') + item.str;
              current.width = Math.max(current.width, item.x + item.width - current.x);
              current.height = Math.max(current.height, item.height);
              continue;
            }
          }

          // Otherwise, start a new distinct text block
          groupedLines.push({ ...item });
        }

        // Sample background and text colors accurately for each line
        groupedLines.forEach((line, idx) => {
          const { backgroundColor: detectedBg, textColor: detectedColor } = sampleColorsFromCanvas(
            canvas,
            line.x,
            line.y,
            line.width,
            line.height,
            scale
          );

          const tbId = `tb-p${pageNum}-${idx}`;
          pageTextBlocks.push({
            id: tbId,
            pageNumber: pageNum,
            x: line.x,
            y: line.y,
            width: Math.max(24, Math.round(line.width)),
            height: Math.max(18, Math.round(line.height)),
            text: line.str,
            fontSize: line.fontSize,
            fontWeight: line.fontWeight,
            fontFamily: line.fontFamily,
            color: detectedColor,
            backgroundColor: detectedBg,
            isErased: false, // CRITICAL: Pristine on initial load! No white boxes!
          });
        });
      } catch (e) {
        console.warn('Text extraction fallback for page', pageNum, e);
      }

      // If page has NO text blocks extracted from vector stream (e.g. Scanned / Flattened Image PDF), run OCR
      if (pageTextBlocks.length === 0 && pageNum === 1) {
        try {
          const ocrLines = await recognizeCanvasText(canvas, scale, 'eng');
          if (ocrLines.length > 0) {
            const { textBlocks: ocrBlocks } = convertOcrLinesToElements(ocrLines, pageNum);
            pageTextBlocks.push(...ocrBlocks);
          }
        } catch (ocrErr) {
          console.warn('Auto-OCR fallback error:', ocrErr);
        }
      }

      // Pristine, 100% authentic PDF rendering matching the original PDF perfectly
      const imageUrl = canvas.toDataURL('image/png');
      pages.push({
        pageNumber: pageNum,
        width: Math.round(viewport.width / scale),
        height: Math.round(viewport.height / scale),
        rotation: 0,
        renderedImageUrl: imageUrl,
        textBlocks: pageTextBlocks,
      });
    }
  }

  return { pages, elements };
};

// Creates initial sample elements matching the screenshot's "Project Proposal"
export const createInitialElements = (): CanvasElement[] => {
  return [
    {
      id: 'el-dl-logo',
      type: 'text',
      pageNumber: 1,
      x: 60,
      y: 65,
      width: 140,
      height: 30,
      text: 'DeepLogic',
      fontFamily: 'Inter',
      fontSize: 22,
      fontWeight: 'bold',
      color: '#1d4ed8',
      layerId: 'text-layer'
    },
    {
      id: 'el-title',
      type: 'text',
      pageNumber: 1,
      x: 60,
      y: 130,
      width: 250,
      height: 90,
      text: 'Project\nProposal',
      fontFamily: 'Inter',
      fontSize: 44,
      fontWeight: 'bold',
      textAlign: 'left',
      color: '#0f172a',
      layerId: 'text-layer'
    },
    {
      id: 'el-hero-img',
      type: 'image',
      pageNumber: 1,
      x: 350,
      y: 80,
      width: 200,
      height: 250,
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
      layerId: 'image-layer',
      opacity: 1
    },
    {
      id: 'el-subtitle',
      type: 'text',
      pageNumber: 1,
      x: 60,
      y: 235,
      width: 260,
      height: 45,
      text: 'Building Smarter Solutions\nfor a Brighter Tomorrow',
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 'bold',
      color: '#334155',
      layerId: 'text-layer'
    },
    {
      id: 'el-desc',
      type: 'text',
      pageNumber: 1,
      x: 60,
      y: 310,
      width: 480,
      height: 70,
      text: 'This proposal outlines our approach, timeline and key deliverables for the upcoming project. We are confident that our expertise and commitment to innovation will deliver significant value.',
      fontFamily: 'Inter',
      fontSize: 12,
      color: '#475569',
      layerId: 'text-layer'
    },
    {
      id: 'el-meta-prep',
      type: 'text',
      pageNumber: 1,
      x: 60,
      y: 430,
      width: 180,
      height: 40,
      text: 'Prepared for\nAcme Corporation',
      fontFamily: 'Inter',
      fontSize: 11,
      color: '#1e293b',
      layerId: 'text-layer'
    },
    {
      id: 'el-meta-date',
      type: 'text',
      pageNumber: 1,
      x: 350,
      y: 430,
      width: 150,
      height: 40,
      text: 'Date\nMarch 20, 2024',
      fontFamily: 'Inter',
      fontSize: 11,
      color: '#1e293b',
      layerId: 'text-layer'
    }
  ];
};

export const createInitialPages = (): PdfPageInfo[] => {
  return [
    { pageNumber: 1, width: 595, height: 842, rotation: 0 },
    { pageNumber: 2, width: 595, height: 842, rotation: 0 },
    { pageNumber: 3, width: 595, height: 842, rotation: 0 },
    { pageNumber: 4, width: 595, height: 842, rotation: 0 },
  ];
};

// Generates and downloads a real PDF using pdf-lib with current elements (or on top of existing PDF)
export const exportElementsToPdf = async (
  pages: PdfPageInfo[],
  elements: CanvasElement[],
  fileName: string = 'Paperly_Document.pdf',
  originalBuffer?: ArrayBuffer | null
) => {
  let pdfDoc: PDFDocument;

  if (originalBuffer) {
    pdfDoc = await PDFDocument.load(originalBuffer);
  } else {
    pdfDoc = await PDFDocument.create();
    for (const pageInfo of pages) {
      pdfDoc.addPage([pageInfo.width, pageInfo.height]);
    }
  }

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const docPages = pdfDoc.getPages();

  for (const pageInfo of pages) {
    const pageIndex = pageInfo.pageNumber - 1;
    if (pageIndex >= docPages.length) continue;
    const page = docPages[pageIndex];

    if (pageInfo.rotation) {
      page.setRotation(degrees(pageInfo.rotation));
    }

    const pageElements = elements.filter(el => el.pageNumber === pageInfo.pageNumber && el.visible !== false);

    // Erase original text on the PDF for all blocks that were edited
    if (pageInfo.textBlocks) {
      for (const tb of pageInfo.textBlocks) {
        if (tb.isErased) {
          const tbPdfY = pageInfo.height - tb.y - tb.height;
          let maskR = 1, maskG = 1, maskB = 1;
          if (tb.backgroundColor && tb.backgroundColor.startsWith('#')) {
            const hex = tb.backgroundColor.replace('#', '');
            if (hex.length === 6) {
              maskR = (parseInt(hex.substring(0, 2), 16) || 255) / 255;
              maskG = (parseInt(hex.substring(2, 4), 16) || 255) / 255;
              maskB = (parseInt(hex.substring(4, 6), 16) || 255) / 255;
            }
          }
          page.drawRectangle({
            x: tb.x - 2,
            y: tbPdfY - 2,
            width: tb.width + 5,
            height: tb.height + 4,
            color: rgb(maskR, maskG, maskB),
            opacity: 1,
          });
        }
      }
    }

    for (const el of pageElements) {
      const pdfY = pageInfo.height - el.y - (el.height || 20);

      // Whiteout tool or text background mask
      if (el.type === 'whiteout') {
        page.drawRectangle({
          x: el.x,
          y: pdfY,
          width: el.width,
          height: el.height,
          color: rgb(1, 1, 1),
          opacity: el.opacity !== undefined ? el.opacity : 1,
        });
      } else if (el.type === 'text' && el.text) {
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
          let bgR = 1, bgG = 1, bgB = 1;
          if (el.backgroundColor.startsWith('#')) {
            const hex = el.backgroundColor.replace('#', '');
            if (hex.length === 6) {
              bgR = (parseInt(hex.substring(0, 2), 16) || 255) / 255;
              bgG = (parseInt(hex.substring(2, 4), 16) || 255) / 255;
              bgB = (parseInt(hex.substring(4, 6), 16) || 255) / 255;
            }
          }
          page.drawRectangle({
            x: el.x - 2,
            y: pdfY - 2,
            width: el.width + 4,
            height: el.height + 4,
            color: rgb(bgR, bgG, bgB),
            opacity: 1,
          });
        }

        const lines = el.text.split('\n');
        const chosenFont = el.fontWeight === 'bold' ? font : regularFont;
        const fontSize = el.fontSize ? Math.max(8, el.fontSize * 0.75) : 12;
        
        let hex = el.color || '#000000';
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
        const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
        const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

        lines.forEach((line, index) => {
          try {
            page.drawText(line, {
              x: el.x,
              y: pdfY + (lines.length - 1 - index) * (fontSize * 1.2),
              size: fontSize,
              font: chosenFont,
              color: rgb(r, g, b),
              opacity: el.opacity !== undefined ? el.opacity : 1,
            });
          } catch {
            try {
              const safeLine = line.replace(/[^\x00-\x7F]/g, ' ');
              if (safeLine.trim()) {
                page.drawText(safeLine, {
                  x: el.x,
                  y: pdfY + (lines.length - 1 - index) * (fontSize * 1.2),
                  size: fontSize,
                  font: chosenFont,
                  color: rgb(r, g, b),
                  opacity: el.opacity !== undefined ? el.opacity : 1,
                });
              }
            } catch (err) {
              console.warn('drawText fallback skipped', err);
            }
          }
        });
      } else if (el.type === 'highlight') {
        let hex = (el.color || el.highlightColor || '#fef08a').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255 || 1;
        const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.94;
        const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.54;
        page.drawRectangle({
          x: el.x,
          y: pdfY,
          width: el.width,
          height: el.height,
          color: rgb(r, g, b),
          opacity: el.opacity !== undefined ? el.opacity : 0.5,
        });
      } else if (el.type === 'shape') {
        let strokeR = 0.23, strokeG = 0.51, strokeB = 0.96;
        if (el.strokeColor) {
          const sc = el.strokeColor.replace('#', '');
          strokeR = parseInt(sc.substring(0, 2), 16) / 255 || 0.23;
          strokeG = parseInt(sc.substring(2, 4), 16) / 255 || 0.51;
          strokeB = parseInt(sc.substring(4, 6), 16) / 255 || 0.96;
        }

        let fillR = 1, fillG = 1, fillB = 1, hasFill = false;
        if (el.fillColor && el.fillColor !== 'transparent') {
          hasFill = true;
          const fc = el.fillColor.replace('#', '');
          fillR = parseInt(fc.substring(0, 2), 16) / 255 || 1;
          fillG = parseInt(fc.substring(2, 4), 16) / 255 || 1;
          fillB = parseInt(fc.substring(4, 6), 16) / 255 || 1;
        }

        if (el.shapeType === 'circle') {
          const rx = (el.width || 50) / 2;
          const ry = (el.height || 50) / 2;
          page.drawEllipse({
            x: el.x + rx,
            y: pdfY + ry,
            xScale: rx,
            yScale: ry,
            borderColor: rgb(strokeR, strokeG, strokeB),
            borderWidth: el.strokeWidth || 2,
            color: hasFill ? rgb(fillR, fillG, fillB) : undefined,
            opacity: el.opacity !== undefined ? el.opacity : 1,
          });
        } else {
          page.drawRectangle({
            x: el.x,
            y: pdfY,
            width: el.width,
            height: el.height,
            borderColor: rgb(strokeR, strokeG, strokeB),
            borderWidth: el.strokeWidth || 2,
            color: hasFill ? rgb(fillR, fillG, fillB) : undefined,
            opacity: el.opacity !== undefined ? el.opacity : 1,
          });
        }
      } else if (el.type === 'image' && el.imageUrl) {
        try {
          const isPng = el.imageUrl.includes('image/png');
          const imgBytes = await fetch(el.imageUrl).then(res => res.arrayBuffer());
          const embedded = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
          page.drawImage(embedded, {
            x: el.x,
            y: pdfY,
            width: el.width || 120,
            height: el.height || 120,
            opacity: el.opacity !== undefined ? el.opacity : 1,
          });
        } catch {
          // ignore image embed error if format differs
        }
      } else if (el.type === 'signature' && el.imageUrl) {
        try {
          const imgBytes = await fetch(el.imageUrl).then(res => res.arrayBuffer());
          const embedded = await pdfDoc.embedPng(imgBytes);
          page.drawImage(embedded, {
            x: el.x,
            y: pdfY,
            width: el.width || 120,
            height: el.height || 50,
            opacity: el.opacity !== undefined ? el.opacity : 1,
          });
        } catch {
          // ignore signature embed error if format differs
        }
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Merges multiple PDF files into one
export const mergePdfs = async (files: File[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
};

// Adds watermark to all pages of a PDF
export const addWatermarkToPdf = async (
  pdfBytes: ArrayBuffer,
  watermarkText: string,
  watermarkOpacity: number = 0.3
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: width / 4,
      y: height / 2,
      size: 48,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: watermarkOpacity,
      rotate: degrees(45),
    });
  }

  return await pdfDoc.save();
};
