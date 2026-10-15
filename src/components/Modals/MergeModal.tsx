import React, { useState } from 'react';
import { X, Merge, Upload, Trash2, ArrowUp, ArrowDown, Download, Loader2, CheckCircle } from 'lucide-react';
import { mergePdfs } from '../../utils/pdfEngine';
import confetti from 'canvas-confetti';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MergeModal: React.FC<MergeModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<{ id: string; file: File }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f) => ({
        id: Math.random().toString(),
        file: f,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target >= 0 && target < newFiles.length) {
      const temp = newFiles[index];
      newFiles[index] = newFiles[target];
      newFiles[target] = temp;
      setFiles(newFiles);
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    try {
      const mergedBytes = await mergePdfs(files.map((f) => f.file));
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } catch {
      alert('Could not merge these PDFs. Please ensure valid PDF files.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Merge className="w-4 h-4 text-purple-600" />
            Merge PDF Files
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* File Picker */}
          <label className="border-2 border-dashed border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/20 rounded-xl p-5 text-center cursor-pointer block hover:bg-purple-50/60 transition-colors">
            <Upload className="w-7 h-7 text-purple-500 mx-auto mb-2" />
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 block">
              Choose 2 or more PDF files
            </span>
            <span className="text-[11px] text-slate-400">Order them below to combine</span>
            <input type="file" multiple accept=".pdf" className="hidden" onChange={handleFiles} />
          </label>

          {/* List of files */}
          {files.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {files.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <span className="truncate max-w-[200px] font-medium text-slate-800 dark:text-slate-200">
                    {idx + 1}. {item.file.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveFile(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveFile(idx, 'down')}
                      disabled={idx === files.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {downloadUrl && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
              <span className="font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Files merged successfully!
              </span>
              <a
                href={downloadUrl}
                download="Paperly_Merged_Document.pdf"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-500">
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={files.length < 2 || isProcessing}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-medium rounded-xl shadow-xs"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Merge className="w-3.5 h-3.5" />}
            Merge {files.length > 0 ? `(${files.length})` : ''} Files
          </button>
        </div>

      </div>
    </div>
  );
};

export default MergeModal;
