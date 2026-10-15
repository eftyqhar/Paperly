import React, { useState, useEffect } from 'react';
import type { ActiveTab, CanvasElement, PdfPageInfo } from './types/pdf';
import { 
  createInitialElements, 
  createInitialPages, 
  exportElementsToPdf, 
  renderAndExtractPdf 
} from './utils/pdfEngine';
import Header from './components/Header';
import ToolsView from './components/ToolsView';
import EditorView from './components/EditorView';
import ConvertView from './components/ConvertView';
import AiAssistantView from './components/AiAssistantView';
import OrganizeView from './components/OrganizeView';

// Modals
import SignatureModal from './components/Modals/SignatureModal';
import MergeModal from './components/Modals/MergeModal';
import SplitModal from './components/Modals/SplitModal';
import ProtectModal from './components/Modals/ProtectModal';
import WatermarkModal from './components/Modals/WatermarkModal';
import CompressModal from './components/Modals/CompressModal';
import { OcrModal, CompareModal } from './components/Modals/OcrAndCompareModals';

import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';

export function App() {
  const queryTab = new URLSearchParams(window.location.search).get('tab') as ActiveTab | null;
  const validTabs: ActiveTab[] = ['tools', 'edit', 'convert', 'organize', 'ai'];
  const initialTab = queryTab && validTabs.includes(queryTab) ? queryTab : 'tools';
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Canvas elements with undo/redo
  const [elements, setElements] = useState<CanvasElement[]>(createInitialElements());
  const [history, setHistory] = useState<CanvasElement[][]>([createInitialElements()]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Pages
  const [pages, setPages] = useState<PdfPageInfo[]>(createInitialPages());
  const [activePage, setActivePage] = useState<number>(1);
  const [originalPdfBuffer, setOriginalPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('Project_Proposal_DeepLogic.pdf');
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);

  // Active modal
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Sync dark mode class to html document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Keep history updated when elements change
  const updateElementsWithHistory = (newElementsOrFn: React.SetStateAction<CanvasElement[]>) => {
    setElements((prev) => {
      const nextElements = typeof newElementsOrFn === 'function' ? newElementsOrFn(prev) : newElementsOrFn;
      if (JSON.stringify(nextElements) !== JSON.stringify(prev)) {
        const newHist = history.slice(0, historyIndex + 1);
        newHist.push(nextElements);
        setHistory(newHist);
        setHistoryIndex(newHist.length - 1);
      }
      return nextElements;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      setElements(history[targetIdx]);
      setHistoryIndex(targetIdx);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      setElements(history[targetIdx]);
      setHistoryIndex(targetIdx);
    }
  };

  // Download PDF handler
  const handleDownload = () => {
    exportElementsToPdf(pages, elements, pdfFileName, originalPdfBuffer);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
  };

  // Signature placement handler
  const handleSaveSignature = (dataUrl: string) => {
    const sigElement: CanvasElement = {
      id: `sig-${Date.now()}`,
      type: 'signature',
      pageNumber: activePage,
      x: 320,
      y: 450,
      width: 160,
      height: 70,
      imageUrl: dataUrl,
      layerId: 'text-layer',
      opacity: 1,
    };
    updateElementsWithHistory((prev) => [...prev, sigElement]);
  };

  // Custom PDF file upload and full visual rendering with editable text extraction
  const handleUploadPdf = async (file: File) => {
    setIsLoadingPdf(true);
    try {
      const buffer = await file.arrayBuffer();
      setOriginalPdfBuffer(buffer);
      setPdfFileName(file.name);

      const { pages: renderedPages, elements: extractedElements } = await renderAndExtractPdf(file);
      if (renderedPages.length > 0) {
        setPages(renderedPages);
        setActivePage(1);
        setElements(extractedElements);
        setHistory([extractedElements]);
        setHistoryIndex(0);
      }
      setActiveTab('edit');
    } catch (err) {
      console.error('Failed to parse PDF', err);
      alert('Could not render PDF pages. Loaded in fallback mode.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* Header with Navigation and Branding */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onDownload={handleDownload}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onOpenModal={(modal) => setActiveModal(modal)}
      />

      {/* Loading Overlay */}
      {isLoadingPdf && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xs text-white">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              Opening & Rendering PDF...
            </p>
            <p className="text-xs text-slate-400">
              Processing all pages locally in your browser
            </p>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'tools' && (
          <ToolsView
            setActiveTab={setActiveTab}
            onOpenModal={(modal) => setActiveModal(modal)}
            onUploadPdf={handleUploadPdf}
          />
        )}

        {activeTab === 'edit' && (
          <EditorView
            elements={elements}
            setElements={updateElementsWithHistory}
            pages={pages}
            setPages={setPages}
            activePage={activePage}
            setActivePage={setActivePage}
            onOpenSignatureModal={() => setActiveModal('signature')}
            onUploadPdf={handleUploadPdf}
            pdfFileName={pdfFileName}
          />
        )}

        {activeTab === 'convert' && (
          <ConvertView
            setActiveTab={setActiveTab}
            onOpenModal={(modal) => setActiveModal(modal)}
          />
        )}

        {activeTab === 'ai' && (
          <AiAssistantView />
        )}

        {activeTab === 'organize' && (
          <OrganizeView
            pages={pages}
            setPages={setPages}
            elements={elements}
            setActiveTab={setActiveTab}
            setActivePage={setActivePage}
          />
        )}
      </main>

      {/* Toolkit Modals */}
      <SignatureModal
        isOpen={activeModal === 'signature'}
        onClose={() => setActiveModal(null)}
        onSaveSignature={handleSaveSignature}
      />

      <MergeModal
        isOpen={activeModal === 'merge'}
        onClose={() => setActiveModal(null)}
      />

      <SplitModal
        isOpen={activeModal === 'split'}
        onClose={() => setActiveModal(null)}
      />

      <ProtectModal
        isOpen={activeModal === 'protect'}
        onClose={() => setActiveModal(null)}
      />

      <WatermarkModal
        isOpen={activeModal === 'watermark'}
        onClose={() => setActiveModal(null)}
      />

      <CompressModal
        isOpen={activeModal === 'compress'}
        onClose={() => setActiveModal(null)}
      />

      <OcrModal
        isOpen={activeModal === 'ocr'}
        onClose={() => setActiveModal(null)}
      />

      <CompareModal
        isOpen={activeModal === 'compare'}
        onClose={() => setActiveModal(null)}
      />

    </div>
  );
}

export default App;
