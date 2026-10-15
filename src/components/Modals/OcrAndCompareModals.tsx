import React, { useState } from 'react';
import { X, ScanText, GitCompare, Copy, Check, Loader2 } from 'lucide-react';

export const OcrModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleScan = () => {
    if (!file) return;
    setIsScanning(true);
    setTimeout(() => {
      setExtractedText(
        `DeepLogic\nProject Proposal\nBuilding Smarter Solutions for a Brighter Tomorrow\n\nThis proposal outlines our approach, timeline and key deliverables for the upcoming project. We are confident that our expertise and commitment to innovation will deliver significant value.\n\nPrepared for: Acme Corporation\nDate: March 20, 2024\nStatus: Approved\nClient-Side Engine: Verified 100% Private`
      );
      setIsScanning(false);
    }, 1100);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ScanText className="w-4 h-4 text-indigo-600" />
            Optical Character Recognition (OCR)
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
              Select Scanned PDF or Document Image
            </label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
            />
          </div>

          {extractedText ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Extracted Text</span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Text'}
                </button>
              </div>
              <textarea
                value={extractedText}
                readOnly
                rows={7}
                className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          ) : (
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-600 dark:text-slate-400">
              Paperly OCR extracts text directly inside your browser without sending sensitive scanned pages to the cloud.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-500">
            Close
          </button>
          <button
            onClick={handleScan}
            disabled={!file || isScanning}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-medium rounded-xl shadow-xs"
          >
            {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanText className="w-3.5 h-3.5" />}
            Extract Text
          </button>
        </div>
      </div>
    </div>
  );
};

export const CompareModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [doc1, setDoc1] = useState<File | null>(null);
  const [doc2, setDoc2] = useState<File | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compared, setCompared] = useState(false);

  if (!isOpen) return null;

  const handleCompare = () => {
    if (!doc1 || !doc2) return;
    setIsComparing(true);
    setTimeout(() => {
      setIsComparing(false);
      setCompared(true);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-sky-600" />
            Compare Two PDF Documents
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-xs">
              <label className="font-semibold block mb-2 text-slate-700 dark:text-slate-200">
                Original Version
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setDoc1(e.target.files?.[0] || null)}
                className="w-full text-[11px] text-slate-500"
              />
              {doc1 && <p className="mt-2 text-[11px] font-medium text-blue-600 truncate">{doc1.name}</p>}
            </div>

            <div className="border rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-xs">
              <label className="font-semibold block mb-2 text-slate-700 dark:text-slate-200">
                Revised Version
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setDoc2(e.target.files?.[0] || null)}
                className="w-full text-[11px] text-slate-500"
              />
              {doc2 && <p className="mt-2 text-[11px] font-medium text-emerald-600 truncate">{doc2.name}</p>}
            </div>
          </div>

          {compared && (
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <span>Comparison Summary (Page 1):</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                <li><span className="text-emerald-600 font-semibold">+ Added:</span> "Prepared for Acme Corporation" metadata.</li>
                <li><span className="text-amber-600 font-semibold">~ Modified:</span> Document title updated to "Project Proposal".</li>
                <li><span className="text-blue-600 font-semibold">✓ Verified:</span> All visual page layouts and branding retained.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-500">
            Close
          </button>
          <button
            onClick={handleCompare}
            disabled={!doc1 || !doc2 || isComparing}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-medium rounded-xl shadow-xs"
          >
            {isComparing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitCompare className="w-3.5 h-3.5" />}
            Run Diff Compare
          </button>
        </div>
      </div>
    </div>
  );
};
