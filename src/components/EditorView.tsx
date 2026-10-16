import React, { useState, useRef, useEffect } from 'react';
import { 
  MousePointer, 
  Hand, 
  Type, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Highlighter, 
  MessageSquare, 
  Square, 
  PenTool, 
  MoreHorizontal,
  X,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  Eye,
  EyeOff,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Trash2,
  FolderOpen,
  Eraser,
  Undo2,
  Redo2,
  Copy,
  CheckSquare,
  Layers,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  FileText,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import type { ToolMode, CanvasElement, PdfPageInfo, LayerItem, PdfTextBlock } from '../types/pdf';

interface EditorViewProps {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  pages: PdfPageInfo[];
  setPages: React.Dispatch<React.SetStateAction<PdfPageInfo[]>>;
  activePage: number;
  setActivePage: (p: number) => void;
  onOpenSignatureModal: () => void;
  onUploadPdf?: (file: File) => void;
  pdfFileName?: string;
}

export const EditorView: React.FC<EditorViewProps> = ({
  elements,
  setElements,
  pages,
  setPages,
  activePage,
  setActivePage,
  onOpenSignatureModal,
  onUploadPdf,
  pdfFileName = 'Document.pdf',
}) => {
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>(['el-title']);
  const selectedId = selectedIds[0] || null;
  const selectedElement = elements.find((el) => el.id === selectedId);
  const currentPage = pages.find((p) => p.pageNumber === activePage) || pages[0] || { pageNumber: 1, width: 595, height: 842, rotation: 0 };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [showPagesSidebar, setShowPagesSidebar] = useState<boolean>(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'pages' | 'layers'>('pages');
  const [showPropertiesSidebar, setShowPropertiesSidebar] = useState<boolean>(true);
  const [highlightEditableText] = useState<boolean>(true);

  // Undo / Redo History Stack
  interface HistorySnapshot {
    elements: CanvasElement[];
    pages: PdfPageInfo[];
  }
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Clipboard for Copy / Paste
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);

  // Marquee Selection Box State
  const [isMarqueeDragging, setIsMarqueeDragging] = useState<boolean>(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number } | null>(null);

  // Layers state
  const [layers, setLayers] = useState<LayerItem[]>([
    { id: 'text-layer', name: 'Text Layer', visible: true, locked: false, type: 'text' },
    { id: 'image-layer', name: 'Image Layer', visible: true, locked: false, type: 'image' },
    { id: 'shape-layer', name: 'Shape Layer', visible: true, locked: false, type: 'shape' },
  ]);

  // Dragging state for single or multiple canvas elements
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartMouse, setDragStartMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragInitialPositions, setDragInitialPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Resizing state for canvas elements (shapes, highlights, text, whiteouts, images)
  type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [resizeElementId, setResizeElementId] = useState<string | null>(null);
  const [resizeStartMouse, setResizeStartMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizeInitialRect, setResizeInitialRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const elementsRef = useRef<CanvasElement[]>(elements);
  elementsRef.current = elements;

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openPdfInputRef = useRef<HTMLInputElement>(null);

  // Initialize history when elements or pages are first available
  useEffect(() => {
    if (history.length === 0 && (elements.length > 0 || pages.length > 0)) {
      setHistory([{ elements, pages }]);
      setHistoryIndex(0);
    }
  }, [elements, pages]);

  const recordHistory = (newElements: CanvasElement[], newPages?: PdfPageInfo[]) => {
    const pagesToRecord = newPages || pages;
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, { elements: newElements, pages: pagesToRecord }];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setElements(target.elements);
      setPages(target.pages);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setElements(target.elements);
      setPages(target.pages);
    }
  };

  // Resolve layerId for any element (ensures every element belongs to a valid layer)
  const getElementLayerId = (el: CanvasElement): string => {
    if (el.layerId) return el.layerId;
    if (el.type === 'image' || el.type === 'signature') return 'image-layer';
    if (el.type === 'shape' || el.type === 'highlight' || el.type === 'whiteout') return 'shape-layer';
    return 'text-layer';
  };

  // Check if element is visible based on element and layer visibility
  const isElementVisible = (el: CanvasElement) => {
    if (el.visible === false) return false;
    const lId = getElementLayerId(el);
    const layer = layers.find((l) => l.id === lId);
    return layer ? layer.visible : true;
  };

  // Check if element or its layer is locked
  const isElementLocked = (el: CanvasElement) => {
    if (el.locked) return true;
    const lId = getElementLayerId(el);
    const layer = layers.find((l) => l.id === lId);
    return layer ? layer.locked : false;
  };

  // Toggle layer category visibility
  const toggleLayerVisibility = (id: string) => {
    const target = layers.find((l) => l.id === id);
    const newVis = target ? !target.visible : true;
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: newVis } : l))
    );
  };

  // Toggle layer category lock
  const toggleLayerLock = (id: string) => {
    const target = layers.find((l) => l.id === id);
    const newLock = target ? !target.locked : false;
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, locked: newLock } : l))
    );
  };

  // Toggle individual element visibility
  const toggleElementVisibility = (elementId: string) => {
    const updated = elements.map((el) =>
      el.id === elementId ? { ...el, visible: el.visible === false ? true : false } : el
    );
    setElements(updated);
    recordHistory(updated);
  };

  // Toggle individual element lock
  const toggleElementLock = (elementId: string) => {
    const updated = elements.map((el) =>
      el.id === elementId ? { ...el, locked: !el.locked } : el
    );
    setElements(updated);
    recordHistory(updated);
  };

  // Move element up/down in stack order (Z-index)
  const moveElementZIndex = (id: string, direction: 'front' | 'back' | 'forward' | 'backward') => {
    const pageEls = elements.filter((el) => el.pageNumber === activePage);
    const otherEls = elements.filter((el) => el.pageNumber !== activePage);

    const index = pageEls.findIndex((el) => el.id === id);
    if (index === -1) return;

    const newPageEls = [...pageEls];
    const [target] = newPageEls.splice(index, 1);

    if (direction === 'front') {
      newPageEls.push(target);
    } else if (direction === 'back') {
      newPageEls.unshift(target);
    } else if (direction === 'forward') {
      const newIdx = Math.min(newPageEls.length, index + 1);
      newPageEls.splice(newIdx, 0, target);
    } else if (direction === 'backward') {
      const newIdx = Math.max(0, index - 1);
      newPageEls.splice(newIdx, 0, target);
    }

    const allNew = [...otherEls, ...newPageEls];
    setElements(allNew);
    recordHistory(allNew);
  };

  const handleCopy = () => {
    if (selectedIds.length === 0) return;
    const toCopy = elements.filter((el) => selectedIds.includes(el.id));
    setClipboard(toCopy);
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;
    const pasted: CanvasElement[] = clipboard.map((item, idx) => ({
      ...item,
      id: `el-copy-${Date.now()}-${idx}`,
      pageNumber: activePage,
      x: item.x + 20,
      y: item.y + 20,
    }));
    const updated = [...elements, ...pasted];
    setElements(updated);
    recordHistory(updated);
    setSelectedIds(pasted.map((p) => p.id));
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    const updated = elements.filter((el) => {
      if (!selectedIds.includes(el.id)) return true;
      return isElementLocked(el);
    });
    setElements(updated);
    recordHistory(updated);
    setSelectedIds((prev) => prev.filter((id) => {
      const el = elements.find((item) => item.id === id);
      return el && isElementLocked(el);
    }));
    if (editingId && selectedIds.includes(editingId)) setEditingId(null);
  };

  const handleSelectAll = () => {
    // 1. Get untouched text blocks on current page
    const uneditedBlocks = (currentPage.textBlocks || []).filter(
      (tb) => !tb.isErased && !elements.some((el) => el.originTextBlockId === tb.id)
    );

    let updatedPages = pages;
    let allCurrentElements = elements;

    if (uneditedBlocks.length > 0) {
      // Mark all unedited blocks as erased on the page
      updatedPages = pages.map((p) =>
        p.pageNumber === activePage
          ? {
              ...p,
              textBlocks: p.textBlocks?.map((b) => ({ ...b, isErased: true })),
            }
          : p
      );
      setPages(updatedPages);

      // Convert all untouched blocks into editable elements
      const newElements: CanvasElement[] = uneditedBlocks.map((tb, idx) => ({
        id: `el-edited-${tb.id}-${Date.now()}-${idx}`,
        originTextBlockId: tb.id,
        type: 'text',
        pageNumber: activePage,
        x: tb.x,
        y: tb.y,
        width: Math.max(tb.width + 6, 30),
        height: tb.height,
        text: tb.text,
        fontSize: tb.fontSize,
        fontFamily: tb.fontFamily || 'Arial, sans-serif',
        fontWeight: tb.fontWeight || 'normal',
        color: tb.color || '#0f172a',
        backgroundColor: 'transparent',
        layerId: 'text-layer',
        opacity: 1,
      }));

      allCurrentElements = [...elements, ...newElements];
      setElements(allCurrentElements);
      recordHistory(allCurrentElements, updatedPages);
    }

    // Select ALL elements on the active page
    const pageEls = allCurrentElements.filter((el) => el.pageNumber === activePage);
    setSelectedIds(pageEls.map((el) => el.id));
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is actively editing inside a text element or input
      const targetTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea';

      if (editingId) return;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+Z: Undo
      if (modKey && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((modKey && (e.key === 'y' || e.key === 'Y')) || (modKey && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+C: Copy
      if (modKey && (e.key === 'c' || e.key === 'C') && !isInput) {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Ctrl+V: Paste
      if (modKey && (e.key === 'v' || e.key === 'V') && !isInput) {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Ctrl+A: Select All
      if (modKey && (e.key === 'a' || e.key === 'A') && !isInput) {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Delete / Backspace: Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Enter or F2: Edit selected text element
      if ((e.key === 'Enter' || e.key === 'F2') && !isInput && selectedIds.length === 1) {
        const el = elements.find((item) => item.id === selectedIds[0]);
        if (el && el.type === 'text' && !isElementLocked(el)) {
          e.preventDefault();
          setEditingId(el.id);
          return;
        }
      }

      // Escape: Deselect all / Exit editing
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setEditingId(null);
        return;
      }

      // Arrow Keys: Nudge selected
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInput && selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const updated = elements.map((el) =>
          selectedIds.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el
        );
        setElements(updated);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, editingId, historyIndex, history, clipboard, activePage]);

  // Tool selection handler
  const handleToolSelect = (tool: ToolMode) => {
    setActiveTool(tool);
    if (tool === 'signature') {
      onOpenSignatureModal();
      return;
    }
    if (tool === 'image') {
      fileInputRef.current?.click();
      return;
    }
    if (tool === 'text') {
      setActiveTool('text');
      return;
    }
    if (tool === 'whiteout') {
      setActiveTool('whiteout');
      return;
    }
    if (tool === 'highlight') {
      const newEl: CanvasElement = {
        id: `el-hl-${Date.now()}`,
        type: 'highlight',
        pageNumber: activePage,
        x: 60,
        y: 310,
        width: 320,
        height: 24,
        color: '#fef08a',
        layerId: 'shape-layer',
        opacity: 0.5,
      };
      const updated = [...elements, newEl];
      setElements(updated);
      recordHistory(updated);
      setSelectedIds([newEl.id]);
      setActiveTool('select');
    }
    if (tool === 'shape') {
      const newEl: CanvasElement = {
        id: `el-rect-${Date.now()}`,
        type: 'shape',
        shapeType: 'rectangle',
        pageNumber: activePage,
        x: 120,
        y: 200,
        width: 140,
        height: 90,
        strokeColor: '#3b82f6',
        strokeWidth: 2,
        fillColor: 'transparent',
        layerId: 'shape-layer',
        opacity: 1,
      };
      const updated = [...elements, newEl];
      setElements(updated);
      recordHistory(updated);
      setSelectedIds([newEl.id]);
      setActiveTool('select');
    }
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newEl: CanvasElement = {
            id: `el-img-${Date.now()}`,
            type: 'image',
            pageNumber: activePage,
            x: 150,
            y: 150,
            width: 180,
            height: 180,
            imageUrl: event.target.result as string,
            layerId: 'image-layer',
            opacity: 1,
          };
          const updated = [...elements, newEl];
          setElements(updated);
          recordHistory(updated);
          setSelectedIds([newEl.id]);
          setActiveTool('select');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Element property updates for all selected elements
  const updateSelected = (props: Partial<CanvasElement>) => {
    if (selectedIds.length === 0) return;
    const updated = elements.map((el) =>
      selectedIds.includes(el.id) ? { ...el, ...props } : el
    );
    setElements(updated);
    recordHistory(updated);
  };

  // Cursor helper for resizing
  const getCursorForHandle = (handle: ResizeHandle | null) => {
    switch (handle) {
      case 'tl':
      case 'br':
        return 'nwse-resize';
      case 'tr':
      case 'bl':
        return 'nesw-resize';
      case 't':
      case 'b':
        return 'ns-resize';
      case 'l':
      case 'r':
        return 'ew-resize';
      default:
        return 'default';
    }
  };

  // Resize handler start
  const handleResizeStart = (
    e: React.MouseEvent,
    id: string,
    handle: ResizeHandle,
    currentEl: CanvasElement
  ) => {
    if (isElementLocked(currentEl)) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeElementId(id);
    setResizeStartMouse({ x: e.clientX, y: e.clientY });
    setResizeInitialRect({
      x: currentEl.x,
      y: currentEl.y,
      width: currentEl.width || 60,
      height: currentEl.height || 24,
    });
  };

  // Global mouseup listener for flawless resizing release anywhere on screen
  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        setResizeHandle(null);
        setResizeElementId(null);
        recordHistory(elementsRef.current);
      }
    };
    if (isResizing) {
      window.addEventListener('mouseup', onGlobalMouseUp);
      return () => window.removeEventListener('mouseup', onGlobalMouseUp);
    }
  }, [isResizing]);

  // Multi-element dragging logic
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (isResizing) return;
    e.stopPropagation();

    let nextSelected = selectedIds;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedIds.includes(id)) {
        nextSelected = selectedIds.filter((item) => item !== id);
      } else {
        nextSelected = [...selectedIds, id];
      }
    } else {
      if (!selectedIds.includes(id)) {
        nextSelected = [id];
      }
    }
    setSelectedIds(nextSelected);

    const clickedEl = elements.find((item) => item.id === id);
    if (clickedEl && isElementLocked(clickedEl)) {
      return;
    }

    if (nextSelected.length > 0) {
      const anyLocked = elements.some((el) => nextSelected.includes(el.id) && isElementLocked(el));
      if (anyLocked) return;
      setIsDragging(true);
      setDragStartMouse({ x: e.clientX, y: e.clientY });
      const posMap: Record<string, { x: number; y: number }> = {};
      elements.forEach((el) => {
        if (nextSelected.includes(el.id)) {
          posMap[el.id] = { x: el.x, y: el.y };
        }
      });
      setDragInitialPositions(posMap);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Element resizing
    if (isResizing && resizeElementId && resizeHandle) {
      const scale = zoom / 100;
      const dx = Math.round((e.clientX - resizeStartMouse.x) / scale);
      const dy = Math.round((e.clientY - resizeStartMouse.y) / scale);

      const minW = 15;
      const minH = 10;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== resizeElementId) return el;

          let newX = resizeInitialRect.x;
          let newY = resizeInitialRect.y;
          let newW = resizeInitialRect.width;
          let newH = resizeInitialRect.height;

          // Horizontal resize
          if (resizeHandle === 'r' || resizeHandle === 'tr' || resizeHandle === 'br') {
            newW = Math.max(minW, resizeInitialRect.width + dx);
          } else if (resizeHandle === 'l' || resizeHandle === 'tl' || resizeHandle === 'bl') {
            newW = Math.max(minW, resizeInitialRect.width - dx);
            newX = resizeInitialRect.x + (resizeInitialRect.width - newW);
          }

          // Vertical resize
          if (resizeHandle === 'b' || resizeHandle === 'bl' || resizeHandle === 'br') {
            newH = Math.max(minH, resizeInitialRect.height + dy);
          } else if (resizeHandle === 't' || resizeHandle === 'tl' || resizeHandle === 'tr') {
            newH = Math.max(minH, resizeInitialRect.height - dy);
            newY = resizeInitialRect.y + (resizeInitialRect.height - newH);
          }

          return {
            ...el,
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH),
          };
        })
      );
      return;
    }

    // 2. Element dragging
    if (isDragging && selectedIds.length > 0) {
      const scale = zoom / 100;
      const dx = Math.round((e.clientX - dragStartMouse.x) / scale);
      const dy = Math.round((e.clientY - dragStartMouse.y) / scale);

      setElements((prev) =>
        prev.map((el) => {
          if (dragInitialPositions[el.id]) {
            return {
              ...el,
              x: Math.max(0, dragInitialPositions[el.id].x + dx),
              y: Math.max(0, dragInitialPositions[el.id].y + dy),
            };
          }
          return el;
        })
      );
      return;
    }

    // Marquee rubber-band selection box dragging
    if (isMarqueeDragging && marqueeStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const scale = zoom / 100;
        const currentX = (e.clientX - rect.left) / scale;
        const currentY = (e.clientY - rect.top) / scale;
        setMarqueeCurrent({ x: currentX, y: currentY });

        const minX = Math.min(marqueeStart.x, currentX);
        const maxX = Math.max(marqueeStart.x, currentX);
        const minY = Math.min(marqueeStart.y, currentY);
        const maxY = Math.max(marqueeStart.y, currentY);

        const intersecting = elements
          .filter((el) => el.pageNumber === activePage && isElementVisible(el))
          .filter((el) => {
            const right = el.x + (el.width || 60);
            const bottom = el.y + (el.height || 24);
            return el.x <= maxX && right >= minX && el.y <= maxY && bottom >= minY;
          })
          .map((el) => el.id);

        setSelectedIds(intersecting);
      }
    }
  };

  const handleMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeElementId(null);
      recordHistory(elementsRef.current);
      return;
    }
    if (isDragging) {
      setIsDragging(false);
      recordHistory(elementsRef.current);
    }
    if (isMarqueeDragging && marqueeStart && marqueeCurrent) {
      setIsMarqueeDragging(false);
      const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
      const maxX = Math.max(marqueeStart.x, marqueeCurrent.x);
      const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
      const maxY = Math.max(marqueeStart.y, marqueeCurrent.y);

      if (maxX - minX > 5 || maxY - minY > 5) {
        const intersectingBlocks = (currentPage.textBlocks || [])
          .filter((tb) => !tb.isErased && !elements.some((el) => el.originTextBlockId === tb.id))
          .filter((tb) => {
            const right = tb.x + tb.width;
            const bottom = tb.y + tb.height;
            return tb.x <= maxX && right >= minX && tb.y <= maxY && bottom >= minY;
          });

        if (intersectingBlocks.length > 0) {
          const updatedPages = pages.map((p) =>
            p.pageNumber === activePage
              ? {
                  ...p,
                  textBlocks: p.textBlocks?.map((b) =>
                    intersectingBlocks.some((ib) => ib.id === b.id)
                      ? { ...b, isErased: true }
                      : b
                  ),
                }
              : p
          );
          setPages(updatedPages);

          const newElements: CanvasElement[] = intersectingBlocks.map((tb, idx) => ({
            id: `el-edited-${tb.id}-${Date.now()}-${idx}`,
            originTextBlockId: tb.id,
            type: 'text',
            pageNumber: activePage,
            x: tb.x,
            y: tb.y,
            width: Math.max(tb.width + 6, 30),
            height: tb.height,
            text: tb.text,
            fontSize: tb.fontSize,
            fontFamily: tb.fontFamily || 'Arial, sans-serif',
            fontWeight: tb.fontWeight || 'normal',
            color: tb.color || '#0f172a',
            backgroundColor: 'transparent',
            layerId: 'text-layer',
            opacity: 1,
          }));

          const allElements = [...elements, ...newElements];
          setElements(allElements);
          recordHistory(allElements, updatedPages);

          const selectedIdsList = allElements
            .filter((el) => el.pageNumber === activePage && isElementVisible(el))
            .filter((el) => {
              const right = el.x + (el.width || 60);
              const bottom = el.y + (el.height || 24);
              return el.x <= maxX && right >= minX && el.y <= maxY && bottom >= minY;
            })
            .map((el) => el.id);

          setSelectedIds(selectedIdsList);
        }
      }

      setMarqueeStart(null);
      setMarqueeCurrent(null);
    } else if (isMarqueeDragging) {
      setIsMarqueeDragging(false);
      setMarqueeStart(null);
      setMarqueeCurrent(null);
    }
  };

  // Canvas rubber-band marquee selection start
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'select') return;
    if (e.target !== canvasRef.current && (e.target as HTMLElement).tagName !== 'IMG') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = zoom / 100;
    const startX = (e.clientX - rect.left) / scale;
    const startY = (e.clientY - rect.top) / scale;

    setIsMarqueeDragging(true);
    setMarqueeStart({ x: startX, y: startY });
    setMarqueeCurrent({ x: startX, y: startY });

    if (!e.shiftKey && !e.ctrlKey) {
      setSelectedIds([]);
    }
  };

  // Page rotation
  const rotatePage = (deg: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === activePage
          ? { ...p, rotation: (p.rotation + deg + 360) % 360 }
          : p
      )
    );
  };


  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = Math.round((e.clientX - rect.left) / (zoom / 100));
    const clickY = Math.round((e.clientY - rect.top) / (zoom / 100));

    if (activeTool === 'text') {
      const clickedEl = elements.find((el) => {
        if (el.pageNumber !== activePage || el.type !== 'text') return false;
        return (
          clickX >= el.x - 4 &&
          clickX <= el.x + (el.width || 60) + 4 &&
          clickY >= el.y - 4 &&
          clickY <= el.y + (el.height || 24) + 4
        );
      });

      if (clickedEl && !isElementLocked(clickedEl)) {
        setSelectedIds([clickedEl.id]);
        setEditingId(clickedEl.id);
        setActiveTool('select');
        return;
      }

      const isScannedPage = !currentPage.textBlocks || currentPage.textBlocks.length === 0;

      const newEl: CanvasElement = {
        id: `el-text-${Date.now()}`,
        type: 'text',
        pageNumber: activePage,
        x: Math.max(10, clickX - 10),
        y: Math.max(10, clickY - 12),
        width: 180,
        height: 32,
        text: 'Type text here',
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: 'normal',
        color: '#0f172a',
        backgroundColor: isScannedPage ? '#ffffff' : 'transparent',
        layerId: 'text-layer',
        opacity: 1,
      };
      const updated = [...elements, newEl];
      setElements(updated);
      recordHistory(updated);
      setSelectedIds([newEl.id]);
      setEditingId(newEl.id);
      setActiveTool('select');
      return;
    }
    if (activeTool === 'whiteout') {
      const newEl: CanvasElement = {
        id: `el-whiteout-${Date.now()}`,
        type: 'whiteout',
        pageNumber: activePage,
        x: Math.max(10, clickX - 50),
        y: Math.max(10, clickY - 12),
        width: 140,
        height: 28,
        layerId: 'shape-layer',
        opacity: 1,
      };
      const updated = [...elements, newEl];
      setElements(updated);
      recordHistory(updated);
      setSelectedIds([newEl.id]);
      setActiveTool('select');
      return;
    }

    // If user clicked close to an untouched text block in select mode, start editing it immediately
    const nearbyBlock = (currentPage.textBlocks || []).find((tb) => {
      if (tb.isErased) return false;
      return (
        clickX >= tb.x - 4 &&
        clickX <= tb.x + tb.width + 4 &&
        clickY >= tb.y - 4 &&
        clickY <= tb.y + tb.height + 4
      );
    });

    if (nearbyBlock) {
      const textLayer = layers.find((l) => l.id === 'text-layer');
      if (!textLayer || (!textLayer.locked && textLayer.visible !== false)) {
        startEditingTextBlock(nearbyBlock);
        return;
      }
    }

    setSelectedIds([]);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = Math.round((e.clientX - rect.left) / (zoom / 100));
    const clickY = Math.round((e.clientY - rect.top) / (zoom / 100));

    // Check if user double-clicked on or near any untouched text block
    const nearbyBlock = (currentPage.textBlocks || []).find((tb) => {
      if (tb.isErased) return false;
      const padX = 14;
      const padY = 8;
      return (
        clickX >= tb.x - padX &&
        clickX <= tb.x + tb.width + padX &&
        clickY >= tb.y - padY &&
        clickY <= tb.y + tb.height + padY
      );
    });

    if (nearbyBlock) {
      startEditingTextBlock(nearbyBlock);
      return;
    }

    const isScannedPage = !currentPage.textBlocks || currentPage.textBlocks.length === 0;

    // Otherwise, double-clicking anywhere spawns a new text block at that position
    const newEl: CanvasElement = {
      id: `el-text-${Date.now()}`,
      type: 'text',
      pageNumber: activePage,
      x: Math.max(10, clickX - 10),
      y: Math.max(10, clickY - 14),
      width: 180,
      height: 32,
      text: 'Type text here',
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 'normal',
      color: '#0f172a',
      backgroundColor: isScannedPage ? '#ffffff' : 'transparent',
      layerId: 'text-layer',
      opacity: 1,
    };
    const updated = [...elements, newEl];
    setElements(updated);
    recordHistory(updated);
    setSelectedIds([newEl.id]);
    setEditingId(newEl.id);
  };

  const startEditingTextBlock = (tb: PdfTextBlock) => {
    // 1. Mark this original text block as erased so a clean white mask permanently covers the original text
    const updatedPages = pages.map((p) =>
      p.pageNumber === activePage
        ? {
            ...p,
            textBlocks: p.textBlocks?.map((b) =>
              b.id === tb.id ? { ...b, isErased: true } : b
            ),
          }
        : p
    );
    setPages(updatedPages);

    const safeHeight = Math.max(26, Math.round(tb.fontSize * 1.35), Math.round(tb.height * 1.2));
    const safeWidth = Math.max(tb.width + 16, 40);

    // 2. Spawn the editable element matching font size, weight, family, and color
    const newEl: CanvasElement = {
      id: `el-edited-${Date.now()}`,
      originTextBlockId: tb.id,
      type: 'text',
      pageNumber: activePage,
      x: tb.x,
      y: tb.y,
      width: safeWidth,
      height: safeHeight,
      text: tb.text,
      fontSize: tb.fontSize,
      fontFamily: tb.fontFamily || 'Arial, sans-serif',
      fontWeight: tb.fontWeight || 'normal',
      color: tb.color || '#0f172a',
      backgroundColor: 'transparent',
      layerId: 'text-layer',
      opacity: 1,
    };
    const updatedElements = [...elements, newEl];
    setElements(updatedElements);
    recordHistory(updatedElements, updatedPages);
    setSelectedIds([newEl.id]);
    setEditingId(newEl.id);
  };

  // Convert all detected text blocks on current page into live editable elements
  const makeAllPageTextEditable = () => {
    const unedited = (currentPage.textBlocks || []).filter(
      (tb) => !tb.isErased && !elements.some((el) => el.originTextBlockId === tb.id)
    );
    if (unedited.length === 0) return;

    const updatedPages = pages.map((p) =>
      p.pageNumber === activePage
        ? {
            ...p,
            textBlocks: p.textBlocks?.map((b) => ({ ...b, isErased: true })),
          }
        : p
    );
    setPages(updatedPages);

    const newElements: CanvasElement[] = unedited.map((tb, idx) => ({
      id: `el-all-${Date.now()}-${idx}`,
      originTextBlockId: tb.id,
      type: 'text',
      pageNumber: activePage,
      x: tb.x,
      y: tb.y,
      width: Math.max(tb.width + 16, 40),
      height: Math.max(26, Math.round(tb.fontSize * 1.35), Math.round(tb.height * 1.2)),
      text: tb.text,
      fontSize: tb.fontSize,
      fontFamily: tb.fontFamily || 'Arial, sans-serif',
      fontWeight: tb.fontWeight || 'normal',
      color: tb.color || '#0f172a',
      backgroundColor: 'transparent',
      layerId: 'text-layer',
      opacity: 1,
    }));

    const allElements = [...elements, ...newElements];
    setElements(allElements);
    recordHistory(allElements, updatedPages);
    setSelectedIds(newElements.map((el) => el.id));
  };

  return (
    <div 
      className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 dark:bg-slate-950 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={isResizing ? { cursor: getCursorForHandle(resizeHandle) } : undefined}
    >
      {/* Hidden file input for image insertion */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Hidden file input for opening PDFs */}
      <input
        type="file"
        ref={openPdfInputRef}
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0] && onUploadPdf) {
            onUploadPdf(e.target.files[0]);
          }
        }}
      />

      {/* Sub-toolbar / Action bar (Top-right mockup) */}
      <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1">
          {onUploadPdf && (
            <button
              onClick={() => openPdfInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-all mr-1 shadow-xs"
              title="Open PDF from your device"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Open PDF</span>
            </button>
          )}

          {pdfFileName && (
            <span
              className="hidden lg:inline-block max-w-[130px] truncate text-xs text-slate-400 font-medium px-1 mr-1.5 border-r border-slate-200 dark:border-slate-800 pr-2"
              title={pdfFileName}
            >
              {pdfFileName}
            </span>
          )}

          {[
            { id: 'select', label: 'Select', icon: MousePointer },
            { id: 'hand', label: 'Hand', icon: Hand },
            { id: 'text', label: 'Text', icon: Type },
            { id: 'whiteout', label: 'Whiteout', icon: Eraser },
            { id: 'image', label: 'Image', icon: ImageIcon },
            { id: 'link', label: 'Link', icon: LinkIcon },
            { id: 'highlight', label: 'Highlight', icon: Highlighter },
            { id: 'comment', label: 'Comment', icon: MessageSquare },
            { id: 'shape', label: 'Shape', icon: Square },
            { id: 'signature', label: 'Signature', icon: PenTool },
          ].map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id as ToolMode)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold shadow-xs ring-1 ring-blue-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                <span>{tool.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={() => {}}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="More Tools"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* View / Actions Controls */}
        <div className="flex items-center space-x-2">
          {/* History Undo / Redo & Copy */}
          <div className="flex items-center space-x-0.5 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 text-xs text-slate-600 dark:text-slate-400">
            <button 
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`p-1.5 rounded transition-colors ${
                historyIndex > 0
                  ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`p-1.5 rounded transition-colors ${
                historyIndex < history.length - 1
                  ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleCopy}
              disabled={selectedIds.length === 0}
              className={`p-1.5 rounded transition-colors ${
                selectedIds.length > 0
                  ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
              }`}
              title="Copy (Ctrl+C)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleSelectAll}
              className="p-1.5 rounded transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              title="Select All (Ctrl+A)"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Editable Text Indicator */}
          {elements.filter(el => el.pageNumber === activePage && el.type === 'text').length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 font-medium shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>{elements.filter(el => el.pageNumber === activePage && el.type === 'text').length} Editable Text Blocks</span>
            </div>
          )}

          {/* View / Zoom Stepper */}
          <div className="hidden sm:flex items-center space-x-1 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 text-xs text-slate-600 dark:text-slate-400">
            <button 
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-medium">{zoom}%</span>
            <button 
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setZoom(100)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[10px]"
              title="Reset Zoom"
            >
              <Maximize className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Panels Toggles: Pages, Layers, Properties */}
          <div className="flex items-center space-x-0.5 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 text-xs text-slate-600 dark:text-slate-400">
            <button
              onClick={() => {
                if (showPagesSidebar && leftSidebarTab === 'pages') {
                  setShowPagesSidebar(false);
                } else {
                  setShowPagesSidebar(true);
                  setLeftSidebarTab('pages');
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                showPagesSidebar && leftSidebarTab === 'pages'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Toggle Pages"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (showPagesSidebar && leftSidebarTab === 'layers') {
                  setShowPagesSidebar(false);
                } else {
                  setShowPagesSidebar(true);
                  setLeftSidebarTab('layers');
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                showPagesSidebar && leftSidebarTab === 'layers'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Toggle Layers"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowPropertiesSidebar(!showPropertiesSidebar)}
              className={`p-1.5 rounded transition-colors ${
                showPropertiesSidebar
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Toggle Properties"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar: Pages Thumbnails & Layers Tree */}
        {showPagesSidebar ? (
          <aside className="w-56 sm:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 transition-all">
            {/* Header: Tabs between Pages and Layers */}
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setLeftSidebarTab('pages')}
                  className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                    leftSidebarTab === 'pages'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pages</span>
                </button>
                <button
                  onClick={() => setLeftSidebarTab('layers')}
                  className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                    leftSidebarTab === 'layers'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Layers</span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 px-1 rounded-full font-mono">
                    {elements.filter(el => el.pageNumber === activePage).length}
                  </span>
                </button>
              </div>
              <button
                onClick={() => setShowPagesSidebar(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                title="Hide sidebar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {leftSidebarTab === 'pages' ? (
              /* Thumbnails list */
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {pages.map((p) => {
                  const isCurrent = p.pageNumber === activePage;
                  return (
                    <div
                      key={p.pageNumber}
                      onClick={() => setActivePage(p.pageNumber)}
                      className="flex flex-col items-center cursor-pointer group"
                    >
                      <div
                        className={`w-32 h-44 rounded-lg bg-white dark:bg-slate-800 border-2 shadow-sm transition-all overflow-hidden relative flex flex-col p-2 ${
                          isCurrent
                            ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                        style={{ transform: `rotate(${p.rotation}deg)` }}
                      >
                        {p.renderedImageUrl ? (
                          <div className="w-full h-full flex items-center justify-center overflow-hidden">
                            <img
                              src={p.renderedImageUrl}
                              alt={`Page ${p.pageNumber}`}
                              className="w-full h-full object-contain pointer-events-none"
                            />
                          </div>
                        ) : p.pageNumber === 1 ? (
                          <div className="w-full h-full flex flex-col justify-between pointer-events-none opacity-85 text-[5px] scale-[0.9]">
                            <div>
                              <div className="font-bold text-blue-600">DeepLogic</div>
                              <div className="font-black text-slate-900 dark:text-white mt-1 text-[7px] leading-tight">
                                Project<br/>Proposal
                              </div>
                              <div className="text-[4px] text-slate-400 mt-0.5">
                                Building Smarter Solutions
                              </div>
                            </div>
                            <div className="w-12 h-14 bg-blue-100 dark:bg-blue-900/50 rounded self-end overflow-hidden my-auto">
                              <img
                                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=150&q=80"
                                alt="thumb"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-[4px] text-slate-400">
                              Acme Corp • 2024
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full p-1 space-y-1.5 opacity-60">
                            <div className="w-1/2 h-1 bg-slate-300 dark:bg-slate-600 rounded" />
                            <div className="w-full h-0.5 bg-slate-200 dark:bg-slate-700 rounded" />
                            <div className="w-5/6 h-0.5 bg-slate-200 dark:bg-slate-700 rounded" />
                            <div className="w-4/5 h-0.5 bg-slate-200 dark:bg-slate-700 rounded" />
                            <div className="w-full h-0.5 bg-slate-200 dark:bg-slate-700 rounded mt-3" />
                            <div className="w-3/4 h-0.5 bg-slate-200 dark:bg-slate-700 rounded" />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5">
                        {p.pageNumber}
                      </span>
                    </div>
                  );
                })}

                {/* Add page button */}
                <button
                  onClick={() => {
                    const newPageNum = pages.length + 1;
                    setPages([...pages, { pageNumber: newPageNum, width: 595, height: 842, rotation: 0 }]);
                    setActivePage(newPageNum);
                  }}
                  className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl text-xs font-medium text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Page
                </button>
              </div>
            ) : (
              /* Full Interactive Layers Tree */
              <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                {/* Category Groups */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Layer Groups</span>
                  </div>
                  {layers.map((layer) => {
                    const layerCount = elements.filter(
                      (el) => el.pageNumber === activePage && getElementLayerId(el) === layer.id
                    ).length;

                    return (
                      <div
                        key={layer.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          layer.visible
                            ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
                            : 'bg-slate-100/50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 text-slate-400 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => toggleLayerVisibility(layer.id)}
                            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 rounded transition-colors"
                            title={layer.visible ? 'Hide layer' : 'Show layer'}
                          >
                            {layer.visible ? (
                              <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleLayerLock(layer.id)}
                            className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-0.5 rounded transition-colors"
                            title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                          >
                            {layer.locked ? (
                              <Lock className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                            )}
                          </button>
                          <span className="font-medium truncate text-xs">{layer.name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                          {layerCount}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Page Objects Stacking Tree */}
                <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Page {activePage} Objects</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {elements.filter((el) => el.pageNumber === activePage).length} total
                    </span>
                  </div>

                  {currentPage?.textBlocks && currentPage.textBlocks.some((tb) => !tb.isErased) && (
                    <button
                      onClick={makeAllPageTextEditable}
                      className="w-full py-2 px-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      title="Convert all original page text into interactive layer objects"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                      <span>Make All Text Editable</span>
                    </button>
                  )}

                  {elements.filter((el) => el.pageNumber === activePage).length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                      <p>No converted elements on page {activePage}.</p>
                      <p className="text-[11px] text-slate-400/80">Click any text on canvas or use the button above.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {[...elements]
                        .filter((el) => el.pageNumber === activePage)
                        .reverse()
                        .map((el) => {
                          const isSelected = selectedIds.includes(el.id);
                          const isLocked = isElementLocked(el);
                          const isVisible = isElementVisible(el);

                          let ElementIcon = Type;
                          if (el.type === 'image') ElementIcon = ImageIcon;
                          if (el.type === 'signature') ElementIcon = PenTool;
                          if (el.type === 'highlight') ElementIcon = Highlighter;
                          if (el.type === 'shape') ElementIcon = Square;
                          if (el.type === 'whiteout') ElementIcon = Eraser;

                          let label = el.name;
                          if (!label) {
                            if (el.type === 'text') {
                              label = el.text ? `"${el.text.slice(0, 16)}${el.text.length > 16 ? '...' : ''}"` : 'Text';
                            } else if (el.type === 'highlight') {
                              label = 'Highlight Box';
                            } else if (el.type === 'shape') {
                              label = el.shapeType === 'circle' ? 'Circle' : 'Rectangle';
                            } else if (el.type === 'whiteout') {
                              label = 'Whiteout Box';
                            } else if (el.type === 'image') {
                              label = 'Image';
                            } else if (el.type === 'signature') {
                              label = 'Signature';
                            } else {
                              label = 'Element';
                            }
                          }

                          return (
                            <div
                              key={el.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIds([el.id]);
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold shadow-xs ring-1 ring-blue-500/30'
                                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-1">
                                <ElementIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                                <span className="truncate text-xs">{label}</span>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => moveElementZIndex(el.id, 'forward')}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700"
                                  title="Bring Forward (Move Up in Layers)"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => moveElementZIndex(el.id, 'backward')}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700"
                                  title="Send Backward (Move Down in Layers)"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => toggleElementVisibility(el.id)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-blue-600"
                                  title={isVisible ? 'Hide element' : 'Show element'}
                                >
                                  {isVisible ? (
                                    <Eye className="w-3 h-3 text-blue-500" />
                                  ) : (
                                    <EyeOff className="w-3 h-3 text-slate-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => toggleElementLock(el.id)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-amber-600"
                                  title={isLocked ? 'Unlock element' : 'Lock element'}
                                >
                                  {isLocked ? (
                                    <Lock className="w-3 h-3 text-amber-500" />
                                  ) : (
                                    <Unlock className="w-3 h-3 text-slate-400 opacity-50" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        ) : (
          <div className="absolute left-3 top-3 z-30 flex items-center gap-1">
            <button
              onClick={() => {
                setShowPagesSidebar(true);
                setLeftSidebarTab('pages');
              }}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50"
              title="Show Pages"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Pages</span>
            </button>
            <button
              onClick={() => {
                setShowPagesSidebar(true);
                setLeftSidebarTab('layers');
              }}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50"
              title="Show Layers"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layers</span>
            </button>
          </div>
        )}

        {/* Center Canvas Viewport */}
        <div 
          ref={canvasContainerRef}
          onClick={() => setSelectedIds([])}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files?.[0] && onUploadPdf) {
              onUploadPdf(e.dataTransfer.files[0]);
            }
          }}
          className="flex-1 min-w-0 overflow-auto flex items-start justify-center p-4 sm:p-8 bg-slate-200/60 dark:bg-slate-950/80"
        >
          {/* Paper Document Canvas */}
          <div
            ref={canvasRef}
            className={`relative bg-white text-slate-900 shadow-2xl transition-transform origin-top duration-150 overflow-hidden ${
              activeTool === 'text'
                ? 'cursor-text'
                : activeTool === 'whiteout'
                ? 'cursor-crosshair'
                : 'cursor-default'
            }`}
            style={{
              width: `${currentPage.width || 595}px`,
              minHeight: `${currentPage.height || 842}px`,
              height: `${currentPage.height || 842}px`,
              transform: `scale(${zoom / 100}) rotate(${currentPage.rotation}deg)`,
              transformOrigin: 'top center',
            }}
            onMouseDown={handleCanvasMouseDown}
            onClick={(e) => {
              e.stopPropagation();
              handleCanvasClick(e);
            }}
            onDoubleClick={handleCanvasDoubleClick}
          >
            {/* Real rendered PDF page background */}
            {currentPage.renderedImageUrl && (
              <img
                src={currentPage.renderedImageUrl}
                alt={`Page ${currentPage.pageNumber}`}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0"
              />
            )}

            {/* Scanned / Image PDF notification pill */}
            {(!currentPage.textBlocks || currentPage.textBlocks.length === 0) && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 bg-slate-900/95 backdrop-blur text-white text-xs rounded-full shadow-lg flex items-center gap-2.5 border border-slate-700/60 select-none">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="font-medium text-slate-200">Scanned / Flattened Document</span>
                <span className="text-slate-500">•</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTool('text');
                  }}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-[11px] cursor-pointer transition-colors shadow-xs"
                >
                  Add / Replace Text
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTool('whiteout');
                  }}
                  className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded text-[11px] cursor-pointer transition-colors"
                >
                  Whiteout / Redact
                </button>
              </div>
            )}

            {/* Permanent whiteout masks over all edited original text blocks */}
            {currentPage.textBlocks
              ?.filter((tb) => tb.isErased)
              .map((tb) => (
                <div
                  key={`erased-${tb.id}`}
                  className="absolute bg-white pointer-events-none z-5"
                  style={{
                    left: `${tb.x - 1}px`,
                    top: `${tb.y}px`,
                    width: `${tb.width + 3}px`,
                    height: `${tb.height}px`,
                  }}
                />
              ))}

            {/* Rubber-band Marquee Selection Box */}
            {isMarqueeDragging && marqueeStart && marqueeCurrent && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-50 rounded-xs transition-none"
                style={{
                  left: `${Math.min(marqueeStart.x, marqueeCurrent.x)}px`,
                  top: `${Math.min(marqueeStart.y, marqueeCurrent.y)}px`,
                  width: `${Math.abs(marqueeCurrent.x - marqueeStart.x)}px`,
                  height: `${Math.abs(marqueeCurrent.y - marqueeStart.y)}px`,
                }}
              />
            )}

            {/* Interactive Original Text Blocks (Click or double-click to edit any untouched line on the PDF) */}
            {(() => {
              const textLayer = layers.find((l) => l.id === 'text-layer');
              if (textLayer && textLayer.visible === false) return null;
              const isTextLayerLocked = textLayer ? textLayer.locked : false;

              return currentPage.textBlocks
                ?.filter((tb) => !tb.isErased)
                .map((tb) => (
                  <div
                    key={tb.id}
                    onMouseDown={(e) => {
                      if (isTextLayerLocked) return;
                      e.stopPropagation();
                      startEditingTextBlock(tb);
                    }}
                    onClick={(e) => {
                      if (isTextLayerLocked) return;
                      e.stopPropagation();
                      startEditingTextBlock(tb);
                    }}
                    onDoubleClick={(e) => {
                      if (isTextLayerLocked) return;
                      e.stopPropagation();
                      startEditingTextBlock(tb);
                    }}
                    className={`absolute ${
                      isTextLayerLocked
                        ? 'cursor-not-allowed'
                        : highlightEditableText
                        ? 'cursor-text ring-1 ring-blue-400/50 bg-blue-500/10 hover:bg-blue-500/25 hover:ring-2 hover:ring-blue-500 shadow-xs'
                        : 'cursor-text hover:ring-1.5 hover:ring-blue-400 hover:bg-blue-500/15'
                    } rounded-xs transition-all z-10`}
                    style={{
                      left: `${tb.x - 2}px`,
                      top: `${tb.y - 2}px`,
                      width: `${tb.width + 4}px`,
                      height: `${tb.height + 4}px`,
                    }}
                    title={isTextLayerLocked ? 'Text layer is locked' : `Click to edit: "${tb.text}"`}
                  />
                ));
            })()}

            {/* Render Elements for the active page */}
            {elements
              .filter((el) => el.pageNumber === activePage && isElementVisible(el))
              .map((el) => {
                const isSelected = selectedIds.includes(el.id);
                const isEditing = editingId === el.id;
                const isLocked = isElementLocked(el);

                return (
                  <div
                    key={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey || e.ctrlKey || e.metaKey) {
                        setSelectedIds((prev) =>
                          prev.includes(el.id) ? prev.filter((id) => id !== el.id) : [...prev, el.id]
                        );
                      } else {
                        if (selectedIds.includes(el.id) && selectedIds.length === 1 && el.type === 'text' && !isLocked) {
                          setEditingId(el.id);
                        } else {
                          setSelectedIds([el.id]);
                          if (activeTool === 'text' && el.type === 'text' && !isLocked) {
                            setEditingId(el.id);
                          } else if (activeTool === 'text' && el.type === 'whiteout' && !isLocked) {
                            const updated = elements.map((item) =>
                              item.id === el.id
                                ? {
                                    ...item,
                                    type: 'text' as const,
                                    text: 'Type text here',
                                    backgroundColor: '#ffffff',
                                    color: '#0f172a',
                                    fontSize: 14,
                                    fontFamily: 'Arial, sans-serif',
                                    layerId: 'text-layer',
                                  }
                                : item
                            );
                            setElements(updated);
                            recordHistory(updated);
                            setEditingId(el.id);
                          }
                        }
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (el.type === 'text' && !isLocked) {
                        setEditingId(el.id);
                      } else if (el.type === 'whiteout' && !isLocked) {
                        const updated = elements.map((item) =>
                          item.id === el.id
                            ? {
                                ...item,
                                type: 'text' as const,
                                text: 'Type text here',
                                backgroundColor: '#ffffff',
                                color: '#0f172a',
                                fontSize: 14,
                                fontFamily: 'Arial, sans-serif',
                                layerId: 'text-layer',
                              }
                            : item
                        );
                        setElements(updated);
                        recordHistory(updated);
                        setEditingId(el.id);
                      }
                    }}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    className={`absolute ${isLocked ? 'cursor-default' : 'cursor-move'} transition-shadow z-20 ${
                      isSelected
                        ? isLocked
                          ? 'ring-2 ring-amber-500/90 ring-offset-1 rounded-xs'
                          : 'ring-2 ring-blue-500 ring-offset-1 rounded-xs'
                        : 'hover:ring-1 hover:ring-blue-300 hover:ring-offset-1'
                    }`}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: el.width ? `${el.width}px` : 'auto',
                      height: el.height ? `${el.height}px` : 'auto',
                      opacity: el.opacity !== undefined ? el.opacity : 1,
                    }}
                  >
                    {/* Lock indicator badge when locked */}
                    {isLocked && (
                      <div
                        className="absolute -top-2.5 -right-2.5 bg-amber-500 text-white rounded-full p-1 shadow-sm z-30 pointer-events-none flex items-center justify-center"
                        title="Element or layer is locked"
                      >
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}

                    {/* 8 Interactive Resize Handles when Selected and NOT locked */}
                    {isSelected && !isEditing && !isLocked && (
                      <>
                        {/* 4 Corner Handles */}
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'tl', el)}
                          onClick={(e) => e.stopPropagation()}
                          title="Resize top-left"
                          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-30 shadow-xs hover:scale-125 transition-transform"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'tr', el)}
                          onClick={(e) => e.stopPropagation()}
                          title="Resize top-right"
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-30 shadow-xs hover:scale-125 transition-transform"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'bl', el)}
                          onClick={(e) => e.stopPropagation()}
                          title="Resize bottom-left"
                          className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-30 shadow-xs hover:scale-125 transition-transform"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'br', el)}
                          onClick={(e) => e.stopPropagation()}
                          title="Resize bottom-right"
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-30 shadow-xs hover:scale-125 transition-transform"
                        />

                        {/* 4 Edge Handles */}
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, 't', el)}
                          onClick={(e) => e.stopPropagation()}
                          title="Resize height (top)"
                          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-ns-resize z-30 shadow-xs hover:scale-125 transition-transform"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'b', el)}
                          onClick={(e) => e.stopPropagation()}
                          title="Resize height (bottom)"
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-ns-resize z-30 shadow-xs hover:scale-125 transition-transform"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'l', el)}
                          onClick={(e) => e.stopPropagation()}
                          title="Resize width (left)"
                          className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-ew-resize z-30 shadow-xs hover:scale-125 transition-transform"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'r', el)}
                          onClick={(e) => e.stopPropagation()}
                          title="Resize width (right)"
                          className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-ew-resize z-30 shadow-xs hover:scale-125 transition-transform"
                        />
                      </>
                    )}

                    {/* Element Render based on Type */}
                    {el.type === 'text' && (
                      isEditing ? (
                        <textarea
                          autoFocus
                          value={el.text}
                          onChange={(e) => updateSelected({ text: e.target.value })}
                          onBlur={() => setEditingId(null)}
                          className={`w-full h-full p-1 m-0 border-2 border-blue-500 rounded-xs outline-none resize-none bg-white font-sans ${
                            el.text?.includes('\n') ? 'whitespace-pre-line' : 'whitespace-nowrap overflow-hidden'
                          }`}
                          style={{
                            fontSize: `${el.fontSize || 14}px`,
                            fontWeight: el.fontWeight || 'normal',
                            fontStyle: el.fontStyle || 'normal',
                            textDecoration: el.textDecoration || 'none',
                            textAlign: el.textAlign || 'left',
                            color: el.color || '#0f172a',
                            fontFamily: el.fontFamily || 'Arial, sans-serif',
                            lineHeight: 1.25,
                          }}
                        />
                      ) : (
                        <div
                          className={`leading-normal p-0.5 rounded-xs select-text hover:bg-blue-50/50 ${
                            el.text?.includes('\n') ? 'whitespace-pre-line' : 'whitespace-nowrap'
                          }`}
                          style={{
                            backgroundColor: el.backgroundColor || 'transparent',
                            fontSize: `${el.fontSize || 14}px`,
                            fontWeight: el.fontWeight || 'normal',
                            fontStyle: el.fontStyle || 'normal',
                            textDecoration: el.textDecoration || 'none',
                            textAlign: el.textAlign || 'left',
                            color: el.color || '#0f172a',
                            fontFamily: el.fontFamily || 'Arial, sans-serif',
                            lineHeight: 1.25,
                          }}
                        >
                          {el.text}
                        </div>
                      )
                    )}

                    {el.type === 'whiteout' && (
                      <div
                        className="w-full h-full bg-white border border-dashed border-slate-300 hover:border-slate-400 shadow-xs rounded-xs"
                        style={{
                          backgroundColor: el.backgroundColor || '#ffffff',
                        }}
                      />
                    )}

                    {el.type === 'image' && el.imageUrl && (
                      <div className="w-full h-full overflow-hidden rounded shadow-sm">
                        <img
                          src={el.imageUrl}
                          alt="canvas visual"
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      </div>
                    )}

                    {el.type === 'signature' && el.imageUrl && (
                      <img
                        src={el.imageUrl}
                        alt="Signature"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    )}

                    {el.type === 'highlight' && (
                      <div
                        className="w-full h-full rounded"
                        style={{ backgroundColor: el.color || '#fef08a' }}
                      />
                    )}

                    {el.type === 'shape' && (
                      <div
                        className="w-full h-full"
                        style={{
                          border: `${el.strokeWidth || 2}px solid ${el.strokeColor || '#3b82f6'}`,
                          backgroundColor: el.fillColor || 'transparent',
                          borderRadius: el.shapeType === 'circle' ? '9999px' : '4px',
                        }}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Sidebar: Properties & Inspector */}
        {showPropertiesSidebar ? (
          <aside className="w-72 sm:w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 transition-all text-xs">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                {selectedElement
                  ? selectedElement.type === 'highlight'
                    ? 'Highlight Box'
                    : selectedElement.type === 'shape'
                    ? `${selectedElement.shapeType || 'Shape'}`
                    : selectedElement.type === 'whiteout'
                    ? 'Whiteout Box'
                    : selectedElement.type === 'image'
                    ? 'Image'
                    : 'Text'
                  : 'Properties'}
              </span>
              <button
                onClick={() => setShowPropertiesSidebar(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Dimensions & Position Controls for any selected element */}
              {selectedElement && (
                <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                    Size & Dimensions
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-medium">Width (px)</label>
                      <input
                        type="number"
                        min="10"
                        value={Math.round(selectedElement.width || 0)}
                        onChange={(e) => updateSelected({ width: Math.max(10, parseInt(e.target.value) || 10) })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-medium">Height (px)</label>
                      <input
                        type="number"
                        min="8"
                        value={Math.round(selectedElement.height || 0)}
                        onChange={(e) => updateSelected({ height: Math.max(8, parseInt(e.target.value) || 8) })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Highlight Controls */}
              {selectedElement?.type === 'highlight' && (
                <div className="space-y-3">
                  <label className="text-[11px] text-slate-500 block mb-1 font-medium">Highlight Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedElement.color || '#fef08a'}
                      onChange={(e) => updateSelected({ color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                    />
                    <div className="flex gap-1.5">
                      {[
                        { label: 'Yellow', color: '#fef08a' },
                        { label: 'Green', color: '#bbf7d0' },
                        { label: 'Blue', color: '#bae6fd' },
                        { label: 'Pink', color: '#fbcfe8' },
                        { label: 'Orange', color: '#fed7aa' },
                      ].map((item) => (
                        <button
                          key={item.color}
                          onClick={() => updateSelected({ color: item.color })}
                          title={item.label}
                          className={`w-6 h-6 rounded-md border shadow-xs transition-transform hover:scale-110 ${
                            (selectedElement.color || '#fef08a') === item.color
                              ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-400'
                              : 'border-slate-300'
                          }`}
                          style={{ backgroundColor: item.color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Shape Controls */}
              {selectedElement?.type === 'shape' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 font-medium">Shape</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSelected({ shapeType: 'rectangle' })}
                        className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                          selectedElement.shapeType !== 'circle'
                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        Rectangle
                      </button>
                      <button
                        onClick={() => updateSelected({ shapeType: 'circle' })}
                        className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                          selectedElement.shapeType === 'circle'
                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        Circle
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500 font-medium">Border Color</label>
                    <input
                      type="color"
                      value={selectedElement.strokeColor || '#3b82f6'}
                      onChange={(e) => updateSelected({ strokeColor: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Border Width</span>
                      <span className="font-mono font-medium">{selectedElement.strokeWidth || 2}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={selectedElement.strokeWidth || 2}
                      onChange={(e) => updateSelected({ strokeWidth: parseInt(e.target.value) || 1 })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500 font-medium">Fill Color</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateSelected({ fillColor: 'transparent' })}
                        className={`px-2 py-1 text-[10px] rounded border ${
                          selectedElement.fillColor === 'transparent' || !selectedElement.fillColor
                            ? 'bg-slate-200 dark:bg-slate-700 font-bold text-slate-800 dark:text-white'
                            : 'text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        None
                      </button>
                      <input
                        type="color"
                        value={selectedElement.fillColor && selectedElement.fillColor !== 'transparent' ? selectedElement.fillColor : '#3b82f6'}
                        onChange={(e) => updateSelected({ fillColor: e.target.value })}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Whiteout Controls */}
              {selectedElement?.type === 'whiteout' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500 font-medium">Mask Color</label>
                    <input
                      type="color"
                      value={selectedElement.backgroundColor || '#ffffff'}
                      onChange={(e) => updateSelected({ backgroundColor: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                    />
                  </div>
                </div>
              )}

              {/* Text Formatting Controls (shown for text elements or when nothing selected) */}
              {(!selectedElement || selectedElement.type === 'text') && (
                <div className="space-y-3">
                  {/* Font Family Dropdown */}
                  <div>
                    <select
                      value={selectedElement?.fontFamily || 'Arial, sans-serif'}
                      onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="Courier New, monospace">Courier New</option>
                      <option value="Times New Roman, serif">Times New Roman</option>
                    </select>
                  </div>

                  {/* Font Size Stepper */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={selectedElement?.fontSize || 16}
                        onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value) || 12 })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateSelected({ fontSize: Math.max(8, (selectedElement?.fontSize || 16) - 2) })}
                        className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-bold"
                      >
                        -
                      </button>
                      <button
                        onClick={() => updateSelected({ fontSize: (selectedElement?.fontSize || 16) + 2 })}
                        className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Style Buttons Row: Bold, Italic, Underline, Strikethrough, Color */}
                  <div className="flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-slate-50 dark:bg-slate-800/50">
                    <button
                      onClick={() =>
                        updateSelected({
                          fontWeight: selectedElement?.fontWeight === 'bold' ? 'normal' : 'bold',
                        })
                      }
                      className={`p-2 rounded-lg ${
                        selectedElement?.fontWeight === 'bold'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        updateSelected({
                          fontStyle: selectedElement?.fontStyle === 'italic' ? 'normal' : 'italic',
                        })
                      }
                      className={`p-2 rounded-lg ${
                        selectedElement?.fontStyle === 'italic'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        updateSelected({
                          textDecoration:
                            selectedElement?.textDecoration === 'underline' ? 'none' : 'underline',
                        })
                      }
                      className={`p-2 rounded-lg ${
                        selectedElement?.textDecoration === 'underline'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title="Underline"
                    >
                      <Underline className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        updateSelected({
                          textDecoration:
                            selectedElement?.textDecoration === 'line-through' ? 'none' : 'line-through',
                        })
                      }
                      className={`p-2 rounded-lg ${
                        selectedElement?.textDecoration === 'line-through'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title="Strikethrough"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </button>

                    {/* Color Swatch Picker */}
                    <div className="relative pl-1">
                      <input
                        type="color"
                        value={selectedElement?.color || '#0f172a'}
                        onChange={(e) => updateSelected({ color: e.target.value })}
                        className="w-6 h-6 rounded-md cursor-pointer border border-slate-300 p-0"
                        title="Font Color"
                      />
                    </div>
                  </div>

                  {/* Text Alignment Row */}
                  <div className="flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-slate-50 dark:bg-slate-800/50">
                    {[
                      { id: 'left', icon: AlignLeft },
                      { id: 'center', icon: AlignCenter },
                      { id: 'right', icon: AlignRight },
                      { id: 'justify', icon: AlignJustify },
                    ].map((align) => {
                      const Icon = align.icon;
                      const isActive = (selectedElement?.textAlign || 'left') === align.id;
                      return (
                        <button
                          key={align.id}
                          onClick={() => updateSelected({ textAlign: align.id as any })}
                          className={`flex-1 p-1.5 rounded-lg flex justify-center ${
                            isActive
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Text Background Mask (Transparent vs Whiteout / Opaque) */}
                  {selectedElement?.type === 'text' && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500 font-medium">Cover Background</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelected({
                            backgroundColor:
                              selectedElement.backgroundColor && selectedElement.backgroundColor !== 'transparent'
                                ? 'transparent'
                                : '#ffffff',
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          selectedElement.backgroundColor && selectedElement.backgroundColor !== 'transparent'
                            ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950 dark:text-blue-300'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {selectedElement.backgroundColor && selectedElement.backgroundColor !== 'transparent'
                          ? 'Opaque White'
                          : 'Transparent'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Appearance (Opacity Slider) */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Appearance
                </span>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Opacity</span>
                  <span className="font-mono font-medium">
                    {Math.round((selectedElement?.opacity !== undefined ? selectedElement.opacity : 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={selectedElement?.opacity !== undefined ? selectedElement.opacity : 1}
                  onChange={(e) => updateSelected({ opacity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Page Controls (Rotate Left, Rotate Right, Flip 180) */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Page
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px] flex-1">Rotate</span>
                  <button
                    onClick={() => rotatePage(-90)}
                    title="Rotate Counter-Clockwise"
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => rotatePage(90)}
                    title="Rotate Clockwise"
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => rotatePage(180)}
                    title="Flip 180°"
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Layers & Arrange Section */}
              <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    Layers & Arrange
                  </span>
                  <button
                    onClick={() => {
                      setShowPagesSidebar(true);
                      setLeftSidebarTab('layers');
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    title="Open full layer stack in left panel"
                  >
                    View Stack &rarr;
                  </button>
                </div>

                {/* If an element is selected, show Arrange & Lock controls */}
                {selectedElement && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Selected Object
                      </span>
                      <button
                        onClick={() => toggleElementLock(selectedElement.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 border transition-colors ${
                          selectedElement.locked
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                        }`}
                        title={selectedElement.locked ? 'Unlock element' : 'Lock element'}
                      >
                        {selectedElement.locked ? (
                          <>
                            <Lock className="w-2.5 h-2.5 text-amber-600" /> Locked
                          </>
                        ) : (
                          <>
                            <Unlock className="w-2.5 h-2.5" /> Unlock
                          </>
                        )}
                      </button>
                    </div>

                    {/* Z-Index / Stack Order Buttons */}
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Stack Order (Z-Index)</span>
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          onClick={() => moveElementZIndex(selectedElement.id, 'front')}
                          className="px-1.5 py-1 text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 font-medium"
                          title="Bring to Front"
                        >
                          To Front
                        </button>
                        <button
                          onClick={() => moveElementZIndex(selectedElement.id, 'forward')}
                          className="px-1.5 py-1 text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 font-medium"
                          title="Bring Forward"
                        >
                          Forward
                        </button>
                        <button
                          onClick={() => moveElementZIndex(selectedElement.id, 'backward')}
                          className="px-1.5 py-1 text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 font-medium"
                          title="Send Backward"
                        >
                          Backward
                        </button>
                        <button
                          onClick={() => moveElementZIndex(selectedElement.id, 'back')}
                          className="px-1.5 py-1 text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 font-medium"
                          title="Send to Back"
                        >
                          To Back
                        </button>
                      </div>
                    </div>

                    {/* Layer Assignment */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500">Assign Layer</span>
                      <select
                        value={getElementLayerId(selectedElement)}
                        onChange={(e) => updateSelected({ layerId: e.target.value })}
                        className="text-[11px] px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
                      >
                        <option value="text-layer">Text Layer</option>
                        <option value="shape-layer">Shape Layer</option>
                        <option value="image-layer">Image & Signatures</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Layer categories with quick visibility, lock, and item count */}
                <div className="space-y-1.5">
                  {layers.map((layer) => {
                    const layerElements = elements.filter(
                      (el) => el.pageNumber === activePage && getElementLayerId(el) === layer.id
                    );
                    const isAllSelected =
                      layerElements.length > 0 &&
                      layerElements.every((el) => selectedIds.includes(el.id));

                    return (
                      <div
                        key={layer.id}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${
                          isAllSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Visibility Toggle */}
                          <button
                            onClick={() => toggleLayerVisibility(layer.id)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title={layer.visible ? 'Hide layer' : 'Show layer'}
                          >
                            {layer.visible ? (
                              <Eye className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>

                          {/* Lock Toggle */}
                          <button
                            onClick={() => toggleLayerLock(layer.id)}
                            className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                              layer.locked
                                ? 'text-amber-500'
                                : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                            }`}
                            title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                          >
                            {layer.locked ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Layer Name - Click to select elements in this layer */}
                          <button
                            onClick={() => {
                              if (layerElements.length > 0) {
                                setSelectedIds(layerElements.map((el) => el.id));
                              }
                            }}
                            className="font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors"
                            title="Click to select all objects on this layer"
                          >
                            {layer.name}
                          </button>
                        </div>

                        {/* Count Badge */}
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                            layerElements.length > 0
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {layerElements.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delete / Copy selected items action */}
              {selectedIds.length > 0 && (
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    title="Copy (Ctrl+C)"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="flex-1 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    title="Delete (Delete / Backspace)"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
                  </button>
                </div>
              )}

            </div>
          </aside>
        ) : (
          <button
            onClick={() => setShowPropertiesSidebar(true)}
            className="absolute right-3 top-3 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1"
          >
            <span>Properties</span>
          </button>
        )}

      </div>
    </div>
  );
};

export default EditorView;
