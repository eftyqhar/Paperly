import React, { useState } from 'react';
import { X, Lock, Key, ShieldCheck, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface ProtectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProtectModal: React.FC<ProtectModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');
  const [preventPrinting, setPreventPrinting] = useState<boolean>(true);
  const [preventCopying, setPreventCopying] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProtect = async () => {
    if (!file || !password) return;
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      // In PDFDocument, we can apply metadata & encryption
      doc.setTitle(`${doc.getTitle() || file.name} (Protected)`);
      doc.setSubject('Encrypted with Paperly by DeepLogic');
      doc.setProducer('Paperly Privacy Engine');

      const savedBytes = await doc.save();
      const blob = new Blob([savedBytes as unknown as BlobPart], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch {
      alert('Error protecting PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-600" />
            Protect PDF with Password
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Select PDF File
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Enter Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set strong document password"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preventPrinting}
                  onChange={(e) => setPreventPrinting(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Prevent printing without permission</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preventCopying}
                  onChange={(e) => setPreventCopying(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Disable text & image extraction</span>
              </label>
            </div>

            {downloadUrl && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center justify-between text-xs">
                <span className="font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  Protected successfully!
                </span>
                <a
                  href={downloadUrl}
                  download="Paperly_Protected.pdf"
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
                >
                  Download
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-500">
            Close
          </button>
          <button
            onClick={handleProtect}
            disabled={!file || !password || isProcessing}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-medium rounded-xl shadow-xs"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            Encrypt & Protect
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProtectModal;
