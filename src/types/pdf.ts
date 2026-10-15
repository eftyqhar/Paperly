export type ToolMode = 
  | 'select' 
  | 'hand' 
  | 'text' 
  | 'image' 
  | 'link' 
  | 'highlight' 
  | 'comment' 
  | 'shape' 
  | 'signature' 
  | 'eraser'
  | 'whiteout';

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'highlight' | 'signature' | 'whiteout';
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  layerId?: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;

  // Text properties
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  backgroundColor?: string;

  // Image & Signature properties
  imageUrl?: string;

  // Shape properties
  shapeType?: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;

  // Highlight properties
  highlightColor?: string;

  // Track original text block being edited
  originTextBlockId?: string;
}

export interface PdfTextBlock {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontFamily?: string;
  isErased?: boolean;
}

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  thumbnailUrl?: string;
  renderedImageUrl?: string;
  textBlocks?: PdfTextBlock[];
}

export interface LayerItem {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  type: 'text' | 'image' | 'shape' | 'all';
}

export type ActiveTab = 'tools' | 'edit' | 'convert' | 'organize' | 'ai';
