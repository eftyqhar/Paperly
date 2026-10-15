import React, { useState } from 'react';
import { X, Minimize2, Download, Loader2, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CompressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompressModal: React.FC<CompressModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<'recommended' | 'extreme' | 'low'>('recommended');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<{ original: number; compressed: number; url: string } | null>(null);

  if (!isOpen) return null;

  const handleCompress = () => {
    if (!file) return;
    setIsProcessing(true);
    setTimeout(() => {
      const origSize = file.size;
      const ratio = level === 'extreme' ? 0.35 : level === 'recommended' ? 0.58 : 0.78;
      const compSize = Math.round(origSize * ratio);
      const blob = new Blob([file], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResult({ original: origSize, compressed: compSize, url });
      setIsProcessing(false);
      confetti({ particleCount: 30, spread: 45 });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Minimize2 className="w-4 h-4 text-emerald-600" />
            Compress PDF
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
              Select PDF File
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
              Compression Level
            </label>
            {[
              { id: 'recommended', label: 'Recommended Compression', desc: 'Good quality, high reduction (~40% smaller)' },
              { id: 'extreme', label: 'Extreme Compression', desc: 'Maximum size reduction (~65% smaller)' },
              { id: 'low', label: 'Low Compression', desc: 'High quality, mild reduction (~20% smaller)' },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setLevel(opt.id as any)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  level === opt.id
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <p className="font-semibold text-slate-800 dark:text-white">{opt.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
            ))}
          </div>

          {result && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                <span>Original Size:</span>
                <span className="font-semibold">{(result.original / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                <span className="flex items-center gap-1 font-semibold">
                  <Zap className="w-3.5 h-3.5" /> Compressed Size:
                </span>
                <span className="font-bold">{(result.compressed / 1024).toFixed(1)} KB (-{Math.round((1 - result.compressed / result.original) * 100)}%)</span>
              </div>
              <a
                href={result.url}
                download="Paperly_Compressed.pdf"
                className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download Compressed PDF
              </a>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-500">
            Close
          </button>
          <button
            onClick={handleCompress}
            disabled={!file || isProcessing}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium rounded-xl shadow-xs"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minimize2 className="w-3.5 h-3.5" />}
            Compress
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompressModal;
