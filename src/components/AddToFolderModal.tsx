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
      className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-[#11141C] border-t sm:border border-slate-200/80 dark:border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 animate-in slide-in-from-bottom-4 duration-200 flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Mobile drag handle */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20 mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.07]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {t('addToFolder')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate tabular-nums">
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
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#171B26] flex items-center justify-center transition active:scale-90 cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target File Preview Snippet */}
        {isSingle && singleFile && (
          <div className="my-3 p-2.5 rounded-2xl bg-slate-50/90 dark:bg-[#171B26] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {singleFile.thumbnailUrl ? (
                <img
                  src={singleFile.thumbnailUrl}
                  alt={singleFile.filename}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  {singleFile.filename.split('.').pop()?.toUpperCase() || 'FILE'}
                </div>
              )}
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 truncate" dir="auto">
                  {singleFile.filename}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums" dir="ltr">
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
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center mb-2.5">
                <Folder className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                {t('noFoldersYet')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3.5 max-w-xs">
                {t('noFoldersDesc')}
              </p>
              <button
                type="button"
                onClick={handleOpenCreateFolder}
                className="min-h-[40px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm shadow-blue-600/20 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
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
                  className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] min-h-[56px] ${
                    isInFolder
                      ? `${colorConfig.borderClass} ${colorConfig.bgClass} shadow-2xs`
                      : 'border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-[#171B26]/80 hover:bg-slate-50 dark:hover:bg-[#1C212E]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isInFolder
                          ? 'bg-white dark:bg-[#11141C] shadow-2xs'
                          : colorConfig.bgClass
                      } ${colorConfig.textClass}`}
                    >
                      <FolderIcon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {folder.name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {folder.files.length} {lang === 'fa' ? 'فایل' : 'files'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Indicator Button */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      isInFolder
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-[#11141C] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
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
        <div className="pt-3 border-t border-slate-200/70 dark:border-white/[0.07] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleOpenCreateFolder}
            className="flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-500/10 hover:bg-blue-100/80 dark:hover:bg-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('newFolder')}</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="min-h-[40px] px-4 rounded-xl bg-slate-100 dark:bg-[#171B26] hover:bg-slate-200 dark:hover:bg-[#1C212E] border border-slate-200/70 dark:border-white/[0.06] text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
