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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 dark:bg-black/85 sm:backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#11141C] w-full max-w-4xl h-[92dvh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/[0.08] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/70 dark:border-white/[0.07] bg-[#F4F6FA]/85 dark:bg-[#171B26]/85 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate" dir="auto">
                {file.filename}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                {formatFileSize(file.size)} · {formatDate(file.date, lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopy}
              title={textContent ? 'Copy Content' : t('copyDirectLink')}
              className="w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            <a
              href={fileUrl}
              download={file.filename}
              title={t('directDownload')}
              className="w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-[#090B10] overflow-hidden flex flex-col">
          {isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              className="w-full h-full border-0"
              title={file.filename}
            />
          ) : isText ? (
            <div className="flex-1 p-4 sm:p-5 overflow-auto font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-blue-500 selection:text-white">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                  Loading document stream...
                </div>
              ) : (
                textContent
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F4F6FA] dark:bg-[#171B26] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-center mb-3.5 text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1" dir="auto">
                {file.filename}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                {lang === 'fa'
                  ? 'این فرمت فایل آماده دانلود مستقیم است.'
                  : 'This file format is ready for direct download and streaming.'}
              </p>
              <a
                href={fileUrl}
                download={file.filename}
                className="min-h-[40px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm shadow-blue-600/20 flex items-center gap-2 transition active:scale-95"
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
