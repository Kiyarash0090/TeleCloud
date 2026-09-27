import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Copy,
  Check,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../utils/formatters';

export function MultiSelectBar() {
  const {
    files,
    filteredFiles,
    selectedFileIds,
    isSelectionMode,
    selectAllFiltered,
    clearSelection,
    deleteMultipleFiles,
    activeAudio,
  } = useTelegram();
  const { lang } = useTheme();

  const [copiedBatch, setCopiedBatch] = useState(false);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isSelectionMode) return null;

  const selectedFiles = files.filter((f) => selectedFileIds.includes(f.id));
  const totalSelectedSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  const allFilteredSelected =
    filteredFiles.length > 0 &&
    filteredFiles.every((f) => selectedFileIds.includes(f.id));

  const handleBatchCopyLinks = () => {
    const links = selectedFiles
      .map((f) =>
        f.directUrl.startsWith('http')
          ? f.directUrl
          : `${window.location.origin}${f.directUrl}`
      )
      .join('\n');

    navigator.clipboard.writeText(links);
    setCopiedBatch(true);
    if (navigator.vibrate) navigator.vibrate(25);
    setTimeout(() => setCopiedBatch(false), 2200);
  };

  const handleBatchDelete = async () => {
    if (!confirmBatchDelete) {
      setConfirmBatchDelete(true);
      if (navigator.vibrate) navigator.vibrate(30);
      setTimeout(() => setConfirmBatchDelete(false), 3500);
      return;
    }

    setIsDeleting(true);
    await deleteMultipleFiles(selectedFileIds);
    setIsDeleting(false);
    setConfirmBatchDelete(false);
  };

  return (
    <div
      className={`fixed inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 transition-all duration-200 animate-in slide-in-from-bottom-4 fade-in ${
        activeAudio
          ? 'bottom-[8.75rem] md:bottom-24'
          : 'bottom-[4.5rem] md:bottom-6'
      }`}
    >
      <div className="bg-slate-900/95 dark:bg-zinc-900/95 backdrop-blur-xl text-white border border-white/15 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-2xl flex items-center justify-between gap-2 sm:gap-4 max-w-xl mx-auto">
        {/* Left: Selection count & Select All toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={selectAllFiltered}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 transition text-xs font-bold shrink-0 cursor-pointer"
            title={lang === 'fa' ? 'انتخاب همه' : 'Select All'}
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-sky-400" />
            ) : (
              <Square className="w-4 h-4 text-zinc-300" />
            )}
            <span className="hidden xs:inline">
              {allFilteredSelected
                ? lang === 'fa'
                  ? 'لغو همه'
                  : 'Deselect'
                : lang === 'fa'
                ? 'همه'
                : 'All'}
            </span>
          </button>

          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-white truncate">
              {lang === 'fa'
                ? `${selectedFileIds.length} فایل انتخاب شد`
                : `${selectedFileIds.length} selected`}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono truncate">
              {formatFileSize(totalSelectedSize)}
            </div>
          </div>
        </div>

        {/* Right: Batch Actions (Copy Links, Delete, Cancel) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Batch Copy Download Links */}
          <button
            onClick={handleBatchCopyLinks}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              copiedBatch
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25'
            }`}
          >
            {copiedBatch ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'fa' ? 'کپی شد!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'fa' ? 'کپی لینک‌ها' : 'Copy Links'}</span>
              </>
            )}
          </button>

          {/* Batch Delete */}
          <button
            onClick={handleBatchDelete}
            disabled={isDeleting}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              confirmBatchDelete
                ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
            }`}
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {isDeleting
                ? lang === 'fa'
                  ? 'در حال حذف...'
                  : 'Deleting...'
                : confirmBatchDelete
                ? lang === 'fa'
                  ? 'تأیید حذف؟'
                  : 'Confirm?'
                : lang === 'fa'
                ? 'حذف'
                : 'Delete'}
            </span>
          </button>

          {/* Clear Selection */}
          <button
            onClick={clearSelection}
            aria-label="Cancel selection"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition active:scale-90 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
