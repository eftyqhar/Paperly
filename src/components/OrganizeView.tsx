import React, { useState } from 'react';
import { 
  RotateCw, 
  Trash2, 
  Copy, 
  Plus, 
  Download, 
  CheckSquare, 
  Square, 
  Eye,
  FileText
} from 'lucide-react';
import type { PdfPageInfo, CanvasElement, ActiveTab } from '../types/pdf';
import { exportElementsToPdf } from '../utils/pdfEngine';
import { generateBlankPageDataUrl } from '../utils/pdfTemplates';
import confetti from 'canvas-confetti';

interface OrganizeViewProps {
  pages: PdfPageInfo[];
  setPages: React.Dispatch<React.SetStateAction<PdfPageInfo[]>>;
  elements: CanvasElement[];
  setActiveTab: (tab: ActiveTab) => void;
  setActivePage: (p: number) => void;
}

export const OrganizeView: React.FC<OrganizeViewProps> = ({
  pages,
  setPages,
  elements,
  setActiveTab,
  setActivePage,
}) => {
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  const toggleSelectPage = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum]
    );
  };

  const selectAll = () => {
    if (selectedPages.length === pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(pages.map((p) => p.pageNumber));
    }
  };

  const rotateSelected = (deg: number) => {
    const targets = selectedPages.length > 0 ? selectedPages : pages.map((p) => p.pageNumber);
    setPages((prev) =>
      prev.map((p) =>
        targets.includes(p.pageNumber)
          ? { ...p, rotation: (p.rotation + deg + 360) % 360 }
          : p
      )
    );
  };

  const deleteSelected = () => {
    if (pages.length <= 1) {
      alert('A document must have at least one page.');
      return;
    }
    const newPages = pages
      .filter((p) => !selectedPages.includes(p.pageNumber))
      .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    setPages(newPages);
    setSelectedPages([]);
  };

  const duplicateSelected = () => {
    let currentPages = [...pages];
    selectedPages.forEach((num) => {
      const pageToDup = currentPages.find((p) => p.pageNumber === num);
      if (pageToDup) {
        currentPages.push({
          ...pageToDup,
          pageNumber: currentPages.length + 1,
        });
      }
    });
    setPages(currentPages);
    setSelectedPages([]);
  };

  const movePage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= pages.length) return;
    const reordered = [...pages];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setPages(reordered.map((p, idx) => ({ ...p, pageNumber: idx + 1 })));
  };

  const handleExport = () => {
    exportElementsToPdf(pages, elements, 'Paperly_Organized.pdf');
    confetti({ particleCount: 40, spread: 60 });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Organize PDF Pages
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Reorder, rotate, delete or duplicate pages with drag-and-drop ease.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50"
          >
            {selectedPages.length === pages.length ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            Select All ({selectedPages.length})
          </button>

          <button
            onClick={() => rotateSelected(90)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-500" /> Rotate 90°
          </button>

          <button
            onClick={duplicateSelected}
            disabled={selectedPages.length === 0}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-40"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-500" /> Duplicate
          </button>

          <button
            onClick={deleteSelected}
            disabled={selectedPages.length === 0}
            className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 hover:bg-rose-100 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Download className="w-3.5 h-3.5" /> Save Organized PDF
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-8">
        {pages.map((p, idx) => {
          const isSelected = selectedPages.includes(p.pageNumber);
          return (
            <div
              key={p.pageNumber}
              className={`relative group bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col items-center shadow-sm hover:shadow-md ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {/* Checkbox indicator */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectPage(p.pageNumber);
                }}
                className="absolute top-3 left-3 z-10 p-1 bg-white/90 dark:bg-slate-800/90 rounded-md shadow-xs border border-slate-200 dark:border-slate-700"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Hover Actions */}
              <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePage(p.pageNumber);
                    setActiveTab('edit');
                  }}
                  title="Open in Editor"
                  className="p-1.5 bg-white dark:bg-slate-800 border rounded-lg text-slate-600 hover:text-blue-600 shadow-xs"
                >
                  <Eye className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPages((prev) =>
                      prev.map((item) =>
                        item.pageNumber === p.pageNumber
                          ? { ...item, rotation: (item.rotation + 90) % 360 }
                          : item
                      )
                    );
                  }}
                  title="Rotate 90°"
                  className="p-1.5 bg-white dark:bg-slate-800 border rounded-lg text-slate-600 hover:text-blue-600 shadow-xs"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>

              {/* Page Sheet Preview */}
              <div
                onClick={() => toggleSelectPage(p.pageNumber)}
                className="w-full aspect-[1/1.4] bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col justify-between overflow-hidden my-2 shadow-xs transition-transform"
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
                  <div className="w-full h-full flex flex-col justify-between text-[6px] pointer-events-none opacity-80 scale-[0.95]">
                    <div>
                      <span className="font-bold text-blue-600">DeepLogic</span>
                      <h4 className="font-extrabold text-slate-900 dark:text-white mt-1 text-[8px] leading-tight">
                        Project Proposal
                      </h4>
                    </div>
                    <div className="w-16 h-18 bg-blue-100 dark:bg-blue-900/60 rounded self-end overflow-hidden my-auto">
                      <img
                        src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=150&q=80"
                        alt="thumb"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[5px] text-slate-400">Acme Corporation</div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <FileText className="w-8 h-8 opacity-40" />
                    <span className="text-[11px] font-medium text-slate-400">
                      Page Content
                    </span>
                  </div>
                )}
              </div>

              {/* Page Number & Reorder buttons */}
              <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 pt-1">
                <span>Page {p.pageNumber}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      movePage(idx, idx - 1);
                    }}
                    disabled={idx === 0}
                    className="p-1 hover:text-blue-600 disabled:opacity-20 text-[10px]"
                  >
                    ◀
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      movePage(idx, idx + 1);
                    }}
                    disabled={idx === pages.length - 1}
                    className="p-1 hover:text-blue-600 disabled:opacity-20 text-[10px]"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Page Card */}
        <div
          onClick={() => {
            const next = pages.length + 1;
            const w = pages[0]?.width || 595;
            const h = pages[0]?.height || 842;
            setPages([
              ...pages,
              {
                pageNumber: next,
                width: w,
                height: h,
                rotation: 0,
                renderedImageUrl: generateBlankPageDataUrl(w, h, next),
              },
            ]);
          }}
          className="aspect-[1/1.4] border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors my-auto"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold">Add Blank Page</span>
        </div>
      </div>
    </div>
  );
};

export default OrganizeView;
