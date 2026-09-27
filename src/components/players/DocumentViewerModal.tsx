import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  ExternalLink, 
  Code, 
  AlignLeft 
} from 'lucide-react';
import { TelegramFile } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

export function DocumentViewerModal({ 
  file, 
  onClose 
}: { 
  file: TelegramFile; 
  onClose: () => void;
}) {
  const { t, lang } = useTheme();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const isPdf = file.mimeType.includes('pdf') || file.filename.toLowerCase().endsWith('.pdf');
  const isText = file.mimeType.startsWith('text/') || 
    ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'sql', 'log'].some(ext => file.filename.toLowerCase().endsWith(`.${ext}`));

  const fileUrl = file.directUrl.startsWith('http')
    ? file.directUrl
    : `${window.location.origin}${file.directUrl}`;

  useEffect(() => {
    if (isText && !textContent) {
      setIsLoading(true);
      fetch(fileUrl)
        .then(res => res.text())
        .then(data => {
          setTextContent(data);
          setIsLoading(false);
        })
        .catch(() => {
          setTextContent('Could not load text content directly.');
          setIsLoading(false);
        });
    }
  }, [file, isText, fileUrl, textContent]);

  const handleCopy = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
    } else {
      navigator.clipboard.writeText(fileUrl);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xl flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white/80 dark:bg-zinc-950/75 backdrop-blur-2xl backdrop-saturate-150 w-full max-w-4xl h-[92dvh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/60 dark:border-white/15 flex flex-col overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
        
        {/* Header (Glassmorphic) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-blue-500/20 backdrop-blur-md">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">
                {file.filename}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                {formatFileSize(file.size)} • {formatDate(file.date, lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleCopy}
              title={textContent ? 'Copy Content' : t('copyDirectLink')}
              className="p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition border border-transparent hover:border-white/20"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            <a
              href={fileUrl}
              download={file.filename}
              title={t('directDownload')}
              className="p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition border border-transparent hover:border-white/20"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition border border-transparent hover:border-rose-500/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area (Glassmorphic) */}
        <div className="flex-1 bg-white/30 dark:bg-black/30 backdrop-blur-md overflow-hidden flex flex-col">
          {isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              className="w-full h-full border-0"
              title={file.filename}
            />
          ) : isText ? (
            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap selection:bg-blue-500 selection:text-white">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  Loading document stream...
                </div>
              ) : (
                textContent
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <FileText className="w-16 h-16 text-slate-400 mb-3" />
              <h4 className="text-base font-bold text-slate-800 dark:text-zinc-200 mb-1">
                {file.filename}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mb-4">
                This file format is ready for direct download and streaming.
              </p>
              <a
                href={fileUrl}
                download={file.filename}
                className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{t('directDownload')}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
