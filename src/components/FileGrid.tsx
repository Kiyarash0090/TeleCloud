import React from 'react';
import { FolderOpen, Upload, Star, SearchX, RotateCcw } from 'lucide-react';
import { TelegramFile } from '../types';
import { FileCard } from './FileCard';
import { useTheme } from '../context/ThemeContext';
import { useTelegram } from '../context/TelegramContext';

export function FileGrid({ files }: { files: TelegramFile[] }) {
  const { t, lang } = useTheme();
  const {
    activeTab,
    setIsUploadModalOpen,
    canUploadInActiveChat,
    activeFolder,
    setActiveFolderId,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedExtension,
    setSelectedExtension,
  } = useTelegram();

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedExtension ||
    (selectedCategory !== 'all' && activeTab === 'files' && !activeFolder)
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedExtension(null);
    setSelectedCategory('all');
  };

  if (files.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center bg-white dark:bg-[#11141C] rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08]">
          <div className="w-14 h-14 rounded-2xl bg-[#F4F6FA] dark:bg-[#171B26] text-slate-500 dark:text-slate-400 flex items-center justify-center mb-4 border border-slate-200/70 dark:border-white/[0.07]">
            <SearchX className="w-7 h-7" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {lang === 'fa' ? 'فایلی مطابق با جستجو یا فیلتر یافت نشد' : 'No matching files found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-5">
            {lang === 'fa'
              ? 'عبارت جستجو یا فیلترهای انتخاب‌شده را تغییر دهید یا آن‌ها را پاک کنید.'
              : 'Try adjusting your search term or clear active category and format filters.'}
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-600/20 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'fa' ? 'پاک کردن فیلترها' : 'Reset Filters'}</span>
          </button>
        </div>
      );
    }

    if (activeFolder) {
      return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center bg-white dark:bg-[#11141C] rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08]">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-sky-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center mb-4">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {t('folderEmpty')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-5">
            {t('folderEmptyDesc')}
          </p>
          <button
            onClick={() => setActiveFolderId(null)}
            className="px-4 py-2 rounded-xl bg-[#F4F6FA] hover:bg-slate-200/80 dark:bg-[#171B26] dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-200 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
          >
            {t('exitFolder')}
          </button>
        </div>
      );
    }

    if (activeTab === 'favorites') {
      return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center bg-white dark:bg-[#11141C] rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08]">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <Star className="w-7 h-7 fill-amber-500/20" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {t('noFavoritesFound')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            {t('noFavoritesDesc')}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center bg-white dark:bg-[#11141C] rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08]">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-sky-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center mb-4">
          <FolderOpen className="w-7 h-7" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          {t('noFilesFound')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-5">
          {t('noFilesDesc')}
        </p>
        {canUploadInActiveChat && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-600/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{t('upload')}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4">
      {files.map((file) => (
        <FileCard key={`${file.originPeer || 'me'}_${file.id}`} file={file} />
      ))}
    </div>
  );
}
