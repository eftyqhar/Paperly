import type { CanvasElement, PdfTextBlock } from '../types/pdf';

export interface OcrTextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  confidence: number;
}

// Safely loads Tesseract.js in the browser on-demand
export const loadTesseract = async (): Promise<any> => {
  if (typeof window === 'undefined') return null;
  if ((window as any).Tesseract) return (window as any).Tesseract;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="tesseract"]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).Tesseract));
      existing.addEventListener('error', (err) => reject(err));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => resolve((window as any).Tesseract);
    script.onerror = () => reject(new Error('Failed to load OCR engine from CDN'));
    document.head.appendChild(script);
  });
};

// Extracts text lines and bounding boxes from a rendered document canvas
export const recognizeCanvasText = async (
  canvasOrImage: HTMLCanvasElement | string,
  scale: number = 2.0,
  lang: string = 'eng'
): Promise<OcrTextLine[]> => {
  try {
    const Tesseract = await loadTesseract();
    if (!Tesseract) return [];

    const worker = await Tesseract.createWorker(lang);
    const ret = await worker.recognize(canvasOrImage);
    await worker.terminate();

    const lines: OcrTextLine[] = [];
    if (ret?.data?.lines) {
      for (const l of ret.data.lines) {
        const text = (l.text || '').trim();
        if (!text || (l.confidence !== undefined && l.confidence < 30)) continue;

        const x = Math.round(l.bbox.x0 / scale);
        const y = Math.round(l.bbox.y0 / scale);
        const width = Math.max(30, Math.round((l.bbox.x1 - l.bbox.x0) / scale));
        const height = Math.max(16, Math.round((l.bbox.y1 - l.bbox.y0) / scale));
        const fontSize = Math.max(9, Math.round(height * 0.72));

        lines.push({
          text,
          x,
          y,
          width,
          height,
          fontSize,
          confidence: l.confidence || 80,
        });
      }
    }

    return lines;
  } catch (err) {
    console.warn('OCR recognition skipped or failed:', err);
    return [];
  }
};

// Converts OCR recognized lines into live editable canvas elements and whiteout masks
export const convertOcrLinesToElements = (
  lines: OcrTextLine[],
  pageNumber: number
): { textBlocks: PdfTextBlock[]; elements: CanvasElement[] } => {
  const textBlocks: PdfTextBlock[] = [];
  const elements: CanvasElement[] = [];

  lines.forEach((line, idx) => {
    const tbId = `ocr-tb-p${pageNumber}-${idx}`;
    textBlocks.push({
      id: tbId,
      pageNumber,
      x: line.x,
      y: line.y,
      width: line.width,
      height: line.height,
      text: line.text,
      fontSize: line.fontSize,
      fontWeight: 'normal',
      fontFamily: 'Arial, sans-serif',
      color: '#0f172a',
      isErased: true,
    });

    elements.push({
      id: `ocr-el-p${pageNumber}-${idx}-${Date.now()}`,
      originTextBlockId: tbId,
      type: 'text',
      pageNumber,
      x: line.x,
      y: line.y,
      width: Math.max(line.width + 12, 40),
      height: Math.max(24, Math.round(line.height * 1.15)),
      text: line.text,
      fontSize: line.fontSize,
      fontWeight: 'normal',
      fontFamily: 'Arial, sans-serif',
      color: '#0f172a',
      backgroundColor: '#ffffff', // Clean white background mask to redact original image text underneath
      layerId: 'text-layer',
      opacity: 1,
    });
  });

  return { textBlocks, elements };
};
