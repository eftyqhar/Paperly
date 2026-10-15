import React, { useState } from 'react';
import { X, Split, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SplitModal: React.FC<SplitModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [range, setRange] = useState<string>('1-2');
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      try {
        const buffer = await f.arrayBuffer();
        const doc = await PDFDocument.load(buffer);
        const count = doc.getPageCount();
        setTotalPages(count);
        setRange(`1-${Math.min(count, 2)}`);
      } catch {
        setTotalPages(1);
      }
    }
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer);
      const newDoc = await PDFDocument.create();

      // Parse range e.g. "1-2" or "1, 3"
      const parts = range.split('-').map((s) => parseInt(s.trim()));
      const start = Math.max(1, parts[0] || 1);
      const end = Math.min(totalPages, parts[1] || start);

      const indices = [];
      for (let i = start; i <= end; i++) {
        indices.push(i - 1);
      }

      const copied = await newDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => newDoc.addPage(p));

      const splitBytes = await newDoc.save();
      const blob = new Blob([splitBytes as unknown as BlobPart], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch {
      alert('Could not split this PDF. Please check the range.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Split className="w-4 h-4 text-cyan-600" />
            Split PDF
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!file ? (
            <label className="border-2 border-dashed border-cyan-200 dark:border-cyan-900/50 bg-cyan-50/30 dark:bg-cyan-950/20 rounded-xl p-6 text-center cursor-pointer block hover:bg-cyan-50/60 transition-colors">
              <Upload className="w-7 h-7 text-cyan-500 mx-auto mb-2" />
              <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 block">
                Choose PDF to split
              </span>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <p className="font-semibold text-slate-800 dark:text-white truncate">{file.name}</p>
                <p className="text-slate-500 mt-0.5">Total Pages: {totalPages}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Page Range to Extract (e.g. 1-2)
                </label>
                <input
                  type="text"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {downloadUrl && (
                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-medium text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                    Pages extracted!
                  </span>
                  <a
                    href={downloadUrl}
                    download="Paperly_Extracted_Pages.pdf"
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-500">
            Close
          </button>
          {file && (
            <button
              onClick={handleSplit}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium rounded-xl shadow-xs"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Split className="w-3.5 h-3.5" />}
              Extract Pages
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplitModal;
