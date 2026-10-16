import React, { useState } from 'react';
import { 
  Moon, 
  Sun, 
  Download, 
  Undo2, 
  Redo2, 
  ChevronDown, 
  Maximize2,
  FileSpreadsheet,
  FileCheck2,
  Lock,
  Layers,
  Sparkles,
  GitCompare,
  Wand2,
  FilePlus
} from 'lucide-react';
import type { ActiveTab } from '../types/pdf';
import PaperlyLogo from './PaperlyLogo';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onDownload?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenModal?: (modalName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  onDownload,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = false,
  onOpenModal,
}) => {
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const isEditor = activeTab === 'edit';

  const handleMoreClick = (modal: string) => {
    setShowMoreDropdown(false);
    if (onOpenModal) {
      onOpenModal(modal);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div 
          onClick={() => setActiveTab('tools')}
          className="cursor-pointer hover:opacity-90 transition-opacity"
        >
          <PaperlyLogo size="md" />
        </div>

        {/* Navigation Tabs */}
        {!isEditor ? (
          <nav className="hidden md:flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tools'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tools
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Edit
            </button>
            <button
              onClick={() => setActiveTab('convert')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'convert'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Convert
            </button>
            <button
              onClick={() => setActiveTab('organize')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'organize'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Organize
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'ai'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              AI Assistant
            </button>

            {/* More Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-all"
              >
                More <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {showMoreDropdown && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setShowMoreDropdown(false)}
                >
                  <button 
                    onClick={() => handleMoreClick('create')}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-700/50 mb-1"
                  >
                    <FilePlus className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Create New PDF
                  </button>
                  <button 
                    onClick={() => handleMoreClick('merge')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                  >
                    <Layers className="w-4 h-4 text-purple-500" /> Merge PDF
                  </button>
                  <button 
                    onClick={() => handleMoreClick('split')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-teal-500" /> Split PDF
                  </button>
                  <button 
                    onClick={() => handleMoreClick('compress')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                  >
                    <Wand2 className="w-4 h-4 text-emerald-500" /> Compress PDF
                  </button>
                  <button 
                    onClick={() => handleMoreClick('watermark')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                  >
                    <FileCheck2 className="w-4 h-4 text-indigo-500" /> Add Watermark
                  </button>
                  <button 
                    onClick={() => handleMoreClick('protect')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                  >
                    <Lock className="w-4 h-4 text-amber-500" /> Protect PDF
                  </button>
                  <button 
                    onClick={() => handleMoreClick('compare')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5"
                  >
                    <GitCompare className="w-4 h-4 text-cyan-500" /> Compare PDF
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleMoreClick('create')}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xs transition-all cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>New PDF</span>
            </button>
          </nav>
        ) : (
          /* Editor View Subnav */
          <nav className="hidden md:flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => handleMoreClick('create')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 flex items-center gap-1.5 mr-1"
              title="Create a new PDF"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Home
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 rounded-b-none"
            >
              Edit
            </button>
            <button
              onClick={() => {}}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Annotate
            </button>
            <button
              onClick={() => setActiveTab('organize')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Page
            </button>
            <button
              onClick={() => setActiveTab('convert')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Convert
            </button>
            <button
              onClick={() => handleMoreClick('protect')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Protect
            </button>
            <button
              onClick={() => setShowMoreDropdown(!showMoreDropdown)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
            >
              More <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
          </nav>
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isEditor && (
            <>
              {/* Undo / Redo */}
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 mr-1">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  title="Undo"
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-35"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Redo"
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-35"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Download Button */}
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium text-sm shadow-sm transition-all shadow-blue-500/25"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Fullscreen / Display Mode */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            title="Toggle Fullscreen"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};

export default Header;
