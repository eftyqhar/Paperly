import React, { useRef } from 'react';
import { 
  FileEdit, 
  RefreshCw, 
  Merge, 
  Split, 
  Minimize2, 
  ScanText, 
  PenTool, 
  Layers, 
  Lock, 
  Eraser, 
  Stamp, 
  GitCompare,
  Upload,
  ShieldCheck,
  Zap,
  HardDrive
} from 'lucide-react';
import type { ActiveTab } from '../types/pdf';

interface ToolsViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenModal: (modal: string) => void;
  onUploadPdf: (file: File) => void;
}

export const ToolsView: React.FC<ToolsViewProps> = ({
  setActiveTab,
  onOpenModal,
  onUploadPdf,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    {
      id: 'edit',
      title: 'Edit PDF',
      description: 'Edit text, images, add annotations and more.',
      icon: FileEdit,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60',
      action: () => setActiveTab('edit'),
    },
    {
      id: 'convert',
      title: 'Convert PDF',
      description: 'PDF to Word, Excel, PowerPoint, Images, etc.',
      icon: RefreshCw,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/50 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/60',
      action: () => setActiveTab('convert'),
    },
    {
      id: 'merge',
      title: 'Merge PDF',
      description: 'Combine multiple PDF files into one.',
      icon: Merge,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/50 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/60',
      action: () => onOpenModal('merge'),
    },
    {
      id: 'split',
      title: 'Split PDF',
      description: 'Extract pages or split into multiple files.',
      icon: Split,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/50 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/60',
      action: () => onOpenModal('split'),
    },
    {
      id: 'compress',
      title: 'Compress PDF',
      description: 'Reduce file size without losing quality.',
      icon: Minimize2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60',
      action: () => onOpenModal('compress'),
    },
    {
      id: 'ocr',
      title: 'OCR',
      description: 'Make scanned PDFs searchable.',
      icon: ScanText,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/50 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60',
      action: () => onOpenModal('ocr'),
    },
    {
      id: 'sign',
      title: 'Sign PDF',
      description: 'Add signature and fill forms.',
      icon: PenTool,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60',
      action: () => {
        setActiveTab('edit');
        setTimeout(() => onOpenModal('signature'), 300);
      },
    },
    {
      id: 'organize',
      title: 'Organize Pages',
      description: 'Reorder, rotate, delete or extract pages.',
      icon: Layers,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-950/50 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/60',
      action: () => setActiveTab('organize'),
    },
    {
      id: 'protect',
      title: 'Protect PDF',
      description: 'Add password and permissions.',
      icon: Lock,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/50 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/60',
      action: () => onOpenModal('protect'),
    },
    {
      id: 'redact',
      title: 'Redact PDF',
      description: 'Permanently remove sensitive information.',
      icon: Eraser,
      color: 'text-fuchsia-600 dark:text-fuchsia-400',
      bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-950/50 group-hover:bg-fuchsia-100 dark:group-hover:bg-fuchsia-900/60',
      action: () => {
        setActiveTab('edit');
      },
    },
    {
      id: 'watermark',
      title: 'Add Watermark',
      description: 'Add text or image watermark.',
      icon: Stamp,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/50 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/60',
      action: () => onOpenModal('watermark'),
    },
    {
      id: 'compare',
      title: 'Compare PDF',
      description: 'Find differences between two PDFs.',
      icon: GitCompare,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/50 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/60',
      action: () => onOpenModal('compare'),
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadPdf(e.target.files[0]);
      setActiveTab('edit');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-16">
      
      {/* Background Soft Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-100/50 via-sky-50/20 to-transparent dark:from-blue-950/20 dark:via-transparent rounded-full blur-3xl opacity-70" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-16">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Your complete PDF toolkit.{' '}
            <span className="block mt-1">
              Simple, powerful, and{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                private
              </span>
              .
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Edit, convert, merge, sign, annotate and do more — directly in your browser. No storage. Your files stay on your device.
          </p>

          {/* Quick upload drop trigger */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".pdf" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Upload className="w-4 h-4" />
              <span>Open PDF from Computer</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl shadow-sm transition-all"
            >
              <FileEdit className="w-4 h-4 text-blue-500" />
              <span>Explore Demo Editor</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-7 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>100% Client-side Processing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-500" />
              <span>Zero Cloud Uploads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Instant & Offline Ready</span>
            </div>
          </div>
        </div>

        {/* 12 Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={tool.action}
                className="group relative bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:border-blue-400 dark:hover:border-blue-500/50 flex flex-col items-start"
              >
                {/* Badge Icon */}
                <div className={`p-3 rounded-xl mb-4 transition-colors ${tool.bgColor}`}>
                  <Icon className={`w-5 h-5 ${tool.color}`} />
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1.5">
                  {tool.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  {tool.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default ToolsView;
