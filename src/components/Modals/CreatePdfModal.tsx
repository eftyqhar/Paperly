import React, { useState } from 'react';
import { 
  X, 
  FilePlus, 
  FileText, 
  Receipt, 
  Briefcase, 
  Award, 
  Layout, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import type { PageSizePreset, PageOrientation, TemplateId, CreatePdfOptions } from '../../utils/pdfTemplates';
import { PAGE_SIZES } from '../../utils/pdfTemplates';

interface CreatePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (options: CreatePdfOptions) => void;
}

export const CreatePdfModal: React.FC<CreatePdfModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [templateId, setTemplateId] = useState<TemplateId>('blank');
  const [fileName, setFileName] = useState<string>('New_Document.pdf');
  const [pageSize, setPageSize] = useState<PageSizePreset>('a4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [pageCount, setPageCount] = useState<number>(1);

  if (!isOpen) return null;

  const templates: {
    id: TemplateId;
    title: string;
    description: string;
    icon: React.ElementType;
    badge?: string;
    defaultOrientation?: PageOrientation;
  }[] = [
    {
      id: 'blank',
      title: 'Blank Page',
      description: 'Start with an empty canvas ready for text, images, and shapes.',
      icon: FileText,
      badge: 'Popular',
    },
    {
      id: 'proposal',
      title: 'Project Proposal',
      description: 'Modern business proposal with DeepLogic header and roadmap.',
      icon: Briefcase,
    },
    {
      id: 'invoice',
      title: 'Professional Invoice',
      description: 'Itemized billing table, invoice header, and payment totals.',
      icon: Receipt,
    },
    {
      id: 'resume',
      title: 'Modern Resume / CV',
      description: 'Clean resume with experience, skills, and contact info.',
      icon: Layout,
    },
    {
      id: 'certificate',
      title: 'Award Certificate',
      description: 'Elegant certificate with border and signature lines.',
      icon: Award,
      defaultOrientation: 'landscape',
    },
  ];

  const handleSelectTemplate = (t: typeof templates[0]) => {
    setTemplateId(t.id);
    if (t.defaultOrientation) {
      setOrientation(t.defaultOrientation);
    }
    // Auto-update default file name
    if (t.id === 'blank') setFileName('New_Document.pdf');
    else if (t.id === 'proposal') setFileName('Project_Proposal.pdf');
    else if (t.id === 'invoice') setFileName('Invoice_INV-2026.pdf');
    else if (t.id === 'resume') setFileName('My_Resume.pdf');
    else if (t.id === 'certificate') setFileName('Certificate_Of_Achievement.pdf');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let safeName = fileName.trim();
    if (!safeName) safeName = 'New_Document';
    if (!safeName.toLowerCase().endsWith('.pdf')) safeName += '.pdf';

    onCreate({
      fileName: safeName,
      pageSize,
      orientation,
      pageCount: Math.max(1, Math.min(20, pageCount)),
      templateId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Create New PDF
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Start from a blank canvas or choose a pre-formatted template
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Template Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-3">
              1. Choose Starter Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {templates.map((t) => {
                const Icon = t.icon;
                const isSelected = templateId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className={`relative p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50/50'
                    }`}
                  >
                    {t.badge && (
                      <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded-md">
                        {t.badge}
                      </span>
                    )}
                    <div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${
                        isSelected 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {t.title}
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Document Setup */}
          <div className="border-t border-slate-200/80 dark:border-slate-800 pt-5 space-y-4">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              2. Document Settings
            </label>

            {/* File Name */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Document Name
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Document_Name.pdf"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Page Size */}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Page Size
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as PageSizePreset)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  {Object.entries(PAGE_SIZES).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Orientation
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      orientation === 'portrait'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      orientation === 'landscape'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              {/* Page Count */}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Initial Pages
                </label>
                <select
                  value={pageCount}
                  onChange={(e) => setPageCount(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  <option value={1}>1 Page</option>
                  <option value={2}>2 Pages</option>
                  <option value={3}>3 Pages</option>
                  <option value={4}>4 Pages</option>
                  <option value={5}>5 Pages</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Create PDF</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CreatePdfModal;
