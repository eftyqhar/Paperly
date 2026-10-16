import type { CanvasElement, PdfTextBlock } from '../types/pdf';

export interface OcrTextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  confidence: number;
  color?: string;
  backgroundColor?: string;
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

// Accurately samples background color from perimeter and text stroke color from contrast pixels
export const sampleColorsFromCanvas = (
  canvasOrCtx: HTMLCanvasElement | CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number = 1.0
): { backgroundColor: string; textColor: string } => {
  try {
    let ctx: CanvasRenderingContext2D | null = null;
    let canvasW = 3000;
    let canvasH = 3000;

    if ('getContext' in canvasOrCtx) {
      ctx = canvasOrCtx.getContext('2d');
      canvasW = canvasOrCtx.width;
      canvasH = canvasOrCtx.height;
    } else {
      ctx = canvasOrCtx;
      if (ctx.canvas) {
        canvasW = ctx.canvas.width;
        canvasH = ctx.canvas.height;
      }
    }

    if (!ctx) return { backgroundColor: '#ffffff', textColor: '#0f172a' };

    const cx = Math.max(0, Math.floor(x * scale));
    const cy = Math.max(0, Math.floor(y * scale));
    const cw = Math.min(canvasW - cx, Math.ceil(width * scale));
    const ch = Math.min(canvasH - cy, Math.ceil(height * scale));

    if (cw < 2 || ch < 2) return { backgroundColor: '#ffffff', textColor: '#0f172a' };

    const imgData = ctx.getImageData(cx, cy, cw, ch).data;

    // 1. Sample perimeter border pixels for background color
    const borderR: number[] = [];
    const borderG: number[] = [];
    const borderB: number[] = [];

    // Top and bottom borders
    for (let col = 0; col < cw; col++) {
      const topIdx = (0 * cw + col) * 4;
      borderR.push(imgData[topIdx]);
      borderG.push(imgData[topIdx + 1]);
      borderB.push(imgData[topIdx + 2]);

      const botIdx = ((ch - 1) * cw + col) * 4;
      borderR.push(imgData[botIdx]);
      borderG.push(imgData[botIdx + 1]);
      borderB.push(imgData[botIdx + 2]);
    }
    // Left and right borders
    for (let row = 1; row < ch - 1; row++) {
      const leftIdx = (row * cw + 0) * 4;
      borderR.push(imgData[leftIdx]);
      borderG.push(imgData[leftIdx + 1]);
      borderB.push(imgData[leftIdx + 2]);

      const rightIdx = (row * cw + (cw - 1)) * 4;
      borderR.push(imgData[rightIdx]);
      borderG.push(imgData[rightIdx + 1]);
      borderB.push(imgData[rightIdx + 2]);
    }

    const avgBgR = Math.round(borderR.reduce((a, b) => a + b, 0) / borderR.length);
    const avgBgG = Math.round(borderG.reduce((a, b) => a + b, 0) / borderG.length);
    const avgBgB = Math.round(borderB.reduce((a, b) => a + b, 0) / borderB.length);

    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const backgroundColor = `#${toHex(avgBgR)}${toHex(avgBgG)}${toHex(avgBgB)}`;

    // Background perceived luminance
    const bgLuminance = (avgBgR * 299 + avgBgG * 587 + avgBgB * 114) / 1000;

    // 2. Sample text pixels (pixels that contrast significantly with background)
    const textPixels: { r: number; g: number; b: number; diff: number }[] = [];
    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const diff = Math.abs(r - avgBgR) + Math.abs(g - avgBgG) + Math.abs(b - avgBgB);
      if (diff > 80) {
        textPixels.push({ r, g, b, diff });
      }
    }

    let textColor = bgLuminance < 140 ? '#ffffff' : '#0f172a';
    if (textPixels.length >= 8) {
      // Pick the most contrasting pixels (highest diff from background)
      textPixels.sort((a, b) => b.diff - a.diff);
      const topCount = Math.max(4, Math.floor(textPixels.length * 0.3));
      const topText = textPixels.slice(0, topCount);
      const avgTxtR = Math.round(topText.reduce((a, b) => a + b.r, 0) / topText.length);
      const avgTxtG = Math.round(topText.reduce((a, b) => a + b.g, 0) / topText.length);
      const avgTxtB = Math.round(topText.reduce((a, b) => a + b.b, 0) / topText.length);
      textColor = `#${toHex(avgTxtR)}${toHex(avgTxtG)}${toHex(avgTxtB)}`;
    }

    return { backgroundColor, textColor };
  } catch (err) {
    return { backgroundColor: '#ffffff', textColor: '#0f172a' };
  }
};

// Extracts text lines with column-aware word grouping and localized color sampling
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

    // Convert image string to offscreen canvas if needed for color sampling
    let canvas: HTMLCanvasElement | null = null;
    if (typeof canvasOrImage === 'string') {
      try {
        canvas = await new Promise<HTMLCanvasElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth || img.width;
            c.height = img.naturalHeight || img.height;
            const ctx = c.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(c);
            } else {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = canvasOrImage;
        });
      } catch {
        canvas = null;
      }
    } else {
      canvas = canvasOrImage;
    }

    // Extract word-level bounding boxes for column-aware grouping
    const words = ret?.data?.words;
    if (words && words.length > 0) {
      const rawWords = words
        .map((w: any) => ({
          text: (w.text || '').trim(),
          confidence: w.confidence !== undefined ? w.confidence : 80,
          x0: Math.round(w.bbox.x0 / scale),
          y0: Math.round(w.bbox.y0 / scale),
          x1: Math.round(w.bbox.x1 / scale),
          y1: Math.round(w.bbox.y1 / scale),
        }))
        .filter((w: any) => {
          if (!w.text) return false;
          // Filter out low confidence noise
          if (w.confidence < 40) return false;
          // Filter out isolated single character artifacts (e.g. noise on photo collars)
          if (w.text.length <= 1 && (w.confidence < 75 || !/[a-zA-Z0-9]/.test(w.text))) return false;
          // Filter out 2-character punctuation artifacts
          if (w.text.length <= 2 && !/[a-zA-Z0-9]/.test(w.text)) return false;
          return true;
        });

      // Sort words: top to bottom, then left to right
      rawWords.sort((a: any, b: any) => {
        const aMidY = (a.y0 + a.y1) / 2;
        const bMidY = (b.y0 + b.y1) / 2;
        const yTol = Math.max(5, Math.min(a.y1 - a.y0, b.y1 - b.y0) * 0.45);
        if (Math.abs(aMidY - bMidY) > yTol) {
          return aMidY - bMidY;
        }
        return a.x0 - b.x0;
      });

      // Group words into lines while respecting column boundaries
      const groupedLines: OcrTextLine[] = [];

      for (const word of rawWords) {
        const current = groupedLines[groupedLines.length - 1];
        const wordHeight = word.y1 - word.y0;
        const wordMidY = (word.y0 + word.y1) / 2;
        const currentMidY = current ? current.y + current.height / 2 : 0;
        const yTol = Math.max(5, Math.min(current ? current.height : wordHeight, wordHeight) * 0.45);

        const isSameY = current && Math.abs(currentMidY - wordMidY) <= yTol;

        if (current && isSameY) {
          const gap = word.x0 - (current.x + current.width);
          // Only merge if gap is within normal inter-word spacing in the SAME column
          // Gaps larger than 32px or 2.2x font height represent separate columns (e.g. sidebar vs main body)
          const maxGap = Math.max(22, Math.min(36, (current.height || 16) * 2.2));
          if (gap >= -4 && gap <= maxGap) {
            current.text += (gap > 2 ? ' ' : '') + word.text;
            current.width = Math.max(current.width, word.x1 - current.x);
            current.height = Math.max(current.height, word.y1 - current.y);
            current.confidence = Math.min(current.confidence, word.confidence);
            continue;
          }
        }

        // Start new distinct line (preserves columns and layouts cleanly!)
        groupedLines.push({
          text: word.text,
          x: word.x0,
          y: word.y0,
          width: word.x1 - word.x0,
          height: word.y1 - word.y0,
          fontSize: Math.max(10, Math.round((word.y1 - word.y0) * 0.75)),
          confidence: word.confidence,
        });
      }

      // Sample local background and text color for each recognized line
      if (canvas) {
        groupedLines.forEach((line) => {
          const { backgroundColor, textColor } = sampleColorsFromCanvas(
            canvas,
            line.x,
            line.y,
            line.width,
            line.height,
            scale
          );
          line.backgroundColor = backgroundColor;
          line.color = textColor;
        });
      }

      return groupedLines;
    }

    // Fallback if words array was not provided
    const lines: OcrTextLine[] = [];
    if (ret?.data?.lines) {
      for (const l of ret.data.lines) {
        const text = (l.text || '').trim();
        if (!text || (l.confidence !== undefined && l.confidence < 40)) continue;
        if (text.length <= 1 && (l.confidence < 75 || !/[a-zA-Z0-9]/.test(text))) continue;

        const x = Math.round(l.bbox.x0 / scale);
        const y = Math.round(l.bbox.y0 / scale);
        const width = Math.max(24, Math.round((l.bbox.x1 - l.bbox.x0) / scale));
        const height = Math.max(16, Math.round((l.bbox.y1 - l.bbox.y0) / scale));
        const fontSize = Math.max(10, Math.round(height * 0.72));

        let backgroundColor = '#ffffff';
        let textColor = '#0f172a';
        if (canvas) {
          const colors = sampleColorsFromCanvas(canvas, x, y, width, height, scale);
          backgroundColor = colors.backgroundColor;
          textColor = colors.textColor;
        }

        lines.push({
          text,
          x,
          y,
          width,
          height,
          fontSize,
          confidence: l.confidence || 80,
          backgroundColor,
          color: textColor,
        });
      }
    }

    return lines;
  } catch (err) {
    console.warn('OCR recognition skipped or failed:', err);
    return [];
  }
};

// Converts OCR recognized lines into interactive text blocks without initial whiteout pollution
export const convertOcrLinesToElements = (
  lines: OcrTextLine[],
  pageNumber: number
): { textBlocks: PdfTextBlock[]; elements: CanvasElement[] } => {
  const textBlocks: PdfTextBlock[] = lines.map((line, idx) => ({
    id: `ocr-tb-p${pageNumber}-${idx}`,
    pageNumber,
    x: line.x,
    y: line.y,
    width: line.width,
    height: line.height,
    text: line.text,
    fontSize: line.fontSize,
    fontWeight: 'normal',
    fontFamily: 'Arial, sans-serif',
    color: line.color || '#0f172a',
    backgroundColor: line.backgroundColor || '#ffffff',
    isErased: false, // CRITICAL: Pristine on initial load! No white boxes!
  }));

  // Return empty elements so the page renders 100% clean and pristine on load
  return { textBlocks, elements: [] };
};
