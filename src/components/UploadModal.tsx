import React, { useState, useRef } from 'react';
import { X, UploadCloud, Sparkles, Lock, Cpu, FileUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTelegram } from '../context/TelegramContext';
import { useQueue } from '../context/QueueContext';

interface UploadModalProps {
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose }) => {
  const { t, lang } = useTheme();
  const { isConnected, isDemoMode, setIsLoginModalOpen, activePeer, activeChatTitle } = useTelegram();
  const { addFilesToQueue } = useQueue();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSavedMessages = !activePeer || activePeer === 'me';
  const targetDisplayTitle = isSavedMessages
    ? lang === 'fa'
      ? 'پیام‌های ذخیره‌شده (Saved Messages)'
      : 'Saved Messages'
    : activeChatTitle || activePeer;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    addFilesToQueue(fileList);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1e1f20] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90dvh] flex flex-col"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {t('upload')}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 truncate">
                <Cpu className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">{t('zeroDiskNotice')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6">
          {/* Connection & Destination Status Banner */}
          {isConnected ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs">
              <div className="flex items-center gap-2 font-medium min-w-0">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate" dir="auto">
                  {lang === 'fa'
                    ? `آپلود مستقیم به: ${targetDisplayTitle}`
                    : `Direct upload to: ${targetDisplayTitle}`}
                </span>
              </div>
              <span className="font-mono font-bold bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md shrink-0">
                2 GB
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {isDemoMode
                    ? lang === 'fa'
                      ? `حالت دمو (${targetDisplayTitle}). برای آپلود واقعی به تلگرام متصل شوید.`
                      : `Demo mode (${targetDisplayTitle}). Connect Telegram for real uploads.`
                    : lang === 'fa'
                    ? 'ابتدا به اکانت تلگرام خود متصل شوید تا فایل‌ها ارسال شوند.'
                    : 'Connect your Telegram account to upload files.'}
                </span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  setIsLoginModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shrink-0 transition-colors active:scale-95 text-center"
              >
                {t('connectTelegram')}
              </button>
            </div>
          )}

          {/* Dropzone / Mobile File Picker Trigger */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-9 text-center cursor-pointer transition-all active:scale-[0.99] ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500/60 bg-slate-50/60 dark:bg-zinc-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
              {t('dragDropText')}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-zinc-500">
              {lang === 'fa'
                ? 'پشتیبانی از تمامی فرمت‌ها (ویدیو، موزیک، عکس، سند، فشرده) تا سقف ۲ گیگابایت'
                : 'Supports all file formats (Video, Audio, Photo, Docs, ZIP) up to 2 GB'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
