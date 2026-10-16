import React from 'react';
import {
  X,
  Plus,
  Folder,
  Check,
  FolderPlus,
  Sparkles,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { getFolderColor, getFolderIcon } from '../utils/folderHelpers';
import { formatFileSize } from '../utils/formatters';

export function AddToFolderModal() {
  const {
    isAddToFolderModalOpen,
    setIsAddToFolderModalOpen,
    targetFilesForFolder,
    folders,
    addFilesToFolder,
    removeFilesFromFolder,
    setIsFolderModalOpen,
    setFolderToEdit,
  } = useTelegram();
  const { t, lang } = useTheme();

  if (!isAddToFolderModalOpen || targetFilesForFolder.length === 0) return null;

  const handleClose = () => {
    setIsAddToFolderModalOpen(false);
  };

  const handleOpenCreateFolder = () => {
    setIsAddToFolderModalOpen(false);
    setFolderToEdit(null);
    setIsFolderModalOpen(true);
  };

  const isSingle = targetFilesForFolder.length === 1;
  const singleFile = isSingle ? targetFilesForFolder[0] : null;

  const handleToggleFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    if (navigator.vibrate) navigator.vibrate(15);

    if (isSingle && singleFile) {
      const alreadyIn = folder.files.some((f) => f.id === singleFile.id);
      if (alreadyIn) {
        removeFilesFromFolder(folderId, [singleFile.id]);
      } else {
        addFilesToFolder(folderId, [singleFile]);
      }
    } else {
      // Multi-file batch add
      const existingIds = new Set(folder.files.map((f) => f.id));
      const allAlreadyIn = targetFilesForFolder.every((f) => existingIds.has(f.id));
      if (allAlreadyIn) {
        removeFilesFromFolder(
          folderId,
          targetFilesForFolder.map((f) => f.id)
        );
      } else {
        addFilesToFolder(folderId, targetFilesForFolder);
      }
    }
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-[#18191d] border-t sm:border border-slate-200/80 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 animate-in slide-in-from-bottom-4 duration-200 flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Mobile drag handle */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {t('addToFolder')}
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium truncate">
                {isSingle && singleFile
                  ? singleFile.filename
                  : lang === 'fa'
                  ? `${targetFilesForFolder.length} فایل انتخاب شده`
                  : `${targetFilesForFolder.length} selected files`}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target File Preview Snippet */}
        {isSingle && singleFile && (
          <div className="my-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {singleFile.thumbnailUrl ? (
                <img
                  src={singleFile.thumbnailUrl}
                  alt={singleFile.filename}
                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 font-bold text-xs">
                  {singleFile.filename.split('.').pop()?.toUpperCase() || 'FILE'}
                </div>
              )}
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                  {singleFile.filename}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatFileSize(singleFile.size)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-1.5 min-h-[140px]">
          {folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2.5">
                <Folder className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1">
                {t('noFoldersYet')}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-3 max-w-xs">
                {t('noFoldersDesc')}
              </p>
              <button
                type="button"
                onClick={handleOpenCreateFolder}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{t('createFolder')}</span>
              </button>
            </div>
          ) : (
            folders.map((folder) => {
              const colorConfig = getFolderColor(folder.color);
              const FolderIcon = getFolderIcon(folder.icon);

              const isInFolder = isSingle && singleFile
                ? folder.files.some((f) => f.id === singleFile.id)
                : targetFilesForFolder.every((tf) =>
                    folder.files.some((f) => f.id === tf.id)
                  );

              return (
                <div
                  key={folder.id}
                  onClick={() => handleToggleFolder(folder.id)}
                  className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                    isInFolder
                      ? `${colorConfig.borderClass} ${colorConfig.bgClass} shadow-2xs`
                      : 'border-slate-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isInFolder
                          ? 'bg-white dark:bg-zinc-800 shadow-2xs'
                          : colorConfig.bgClass
                      } ${colorConfig.textClass}`}
                    >
                      <FolderIcon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {folder.name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                        {folder.files.length} {lang === 'fa' ? 'فایل' : 'files'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Indicator Button */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      isInFolder
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300'
                    }`}
                  >
                    {isInFolder ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleOpenCreateFolder}
            className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 text-blue-600 dark:text-sky-400 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('newFolder')}</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
