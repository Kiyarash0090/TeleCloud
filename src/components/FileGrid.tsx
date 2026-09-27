import React from 'react';
import { FolderOpen, Upload, Plus } from 'lucide-react';
import { TelegramFile } from '../types';
import { FileCard } from './FileCard';
import { useTheme } from '../context/ThemeContext';
import { useTelegram } from '../context/TelegramContext';

export function FileGrid({ files }: { files: TelegramFile[] }) {
  const { t } = useTheme();
  const { setIsUploadModalOpen } = useTelegram();

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center bg-white/50 dark:bg-[#18191d]/50 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex items-center justify-center mb-4">
          <FolderOpen className="w-8 h-8" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-1">
          {t('noFilesFound')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mb-5">
          {t('noFilesDesc')}
        </p>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>{t('upload')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-4.5">
      {files.map((file) => (
        <FileCard key={file.id} file={file} />
      ))}
    </div>
  );
}
