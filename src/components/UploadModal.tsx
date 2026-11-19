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
      className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-black/80 sm:backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#11141C] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200/80 dark:border-white/[0.08] shadow-2xl shadow-slate-900/20 dark:shadow-black/70 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90dvh] flex flex-col"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                {t('upload')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                <Cpu className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">{t('zeroDiskNotice')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center active:scale-90 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6">
          {/* Connection & Destination Status Banner */}
          {isConnected ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs">
              <div className="flex items-center gap-2 font-medium min-w-0">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate" dir="auto">
                  {lang === 'fa'
                    ? `آپلود مستقیم به: ${targetDisplayTitle}`
                    : `Direct upload to: ${targetDisplayTitle}`}
                </span>
              </div>
              <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                2 GB
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
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
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shrink-0 transition-colors active:scale-95 text-center cursor-pointer"
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
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-9 text-center cursor-pointer transition-colors active:scale-[0.99] ${
              isDragging
                ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-500/10'
                : 'border-slate-300/90 dark:border-white/[0.12] hover:border-blue-400 dark:hover:border-sky-400/50 bg-[#F4F6FA] dark:bg-[#171B26]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5">
              {t('dragDropText')}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
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
