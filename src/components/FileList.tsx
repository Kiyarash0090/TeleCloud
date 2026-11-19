import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  File,
  Download,
  Trash2,
  Share2,
  Copy,
  Check,
  Play,
  Eye,
  FolderOpen,
  Upload,
  Star,
  SearchX,
  RotateCcw,
} from 'lucide-react';
import { TelegramFile } from '../types';
import { formatFileSize, formatDate, formatDuration, getFileExtension, getFileColor } from '../utils/formatters';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';

export function FileList({ files }: { files: TelegramFile[] }) {
  const {
    activeTab,
    setActiveVideo,
    setActiveAudio,
    setIsPlayingAudio,
    setActiveImage,
    setActiveDoc,
    setShareModalFile,
    deleteFile,
    canDeleteFile,
    canUploadInActiveChat,
    setIsUploadModalOpen,
    selectedFileIds,
    isSelectionMode,
    toggleSelectFile,
    selectAllFiltered,
    toggleFavorite,
    isFavorite,
    activeFolder,
    setActiveFolderId,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedExtension,
    setSelectedExtension,
  } = useTelegram();
  const { t, lang } = useTheme();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  const handleRowDelete = async (e: React.MouseEvent, fileId: number) => {
    e.stopPropagation();
    if (confirmDeleteId !== fileId) {
      setConfirmDeleteId(fileId);
      setTimeout(() => {
        setConfirmDeleteId((prev) => (prev === fileId ? null : prev));
      }, 3000);
      return;
    }
    setConfirmDeleteId(null);
    await deleteFile(fileId);
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

  const handleOpen = (file: TelegramFile) => {
    if (file.category === 'videos') {
      setActiveVideo(file);
    } else if (file.category === 'audio') {
      setActiveAudio(file);
      setIsPlayingAudio(true);
    } else if (file.category === 'images') {
      setActiveImage(file);
    } else if (file.category === 'documents') {
      setActiveDoc(file);
    } else {
      setShareModalFile(file);
    }
  };

  const handleRowClick = (file: TelegramFile) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (isSelectionMode) {
      toggleSelectFile(file.id);
      if (navigator.vibrate) navigator.vibrate(15);
      return;
    }
    handleOpen(file);
  };

  const handleTouchStart = (e: React.TouchEvent, fileId: number) => {
    if (e.touches.length !== 1) return;
    longPressTriggeredRef.current = false;
    touchStartPosRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      toggleSelectFile(fileId);
      if (navigator.vibrate) navigator.vibrate(35);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!longPressTimerRef.current || e.touches.length !== 1) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCopy = (e: React.MouseEvent, file: TelegramFile) => {
    e.stopPropagation();
    const url = file.directUrl.startsWith('http')
      ? file.directUrl
      : `${window.location.origin}${file.directUrl}`;
    navigator.clipboard.writeText(url);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderIcon = (category: string) => {
    switch (category) {
      case 'images':
        return <ImageIcon className="w-4.5 h-4.5" />;
      case 'videos':
        return <Video className="w-4.5 h-4.5" />;
      case 'audio':
        return <Music className="w-4.5 h-4.5" />;
      case 'documents':
        return <FileText className="w-4.5 h-4.5" />;
      case 'archives':
        return <Archive className="w-4.5 h-4.5" />;
      default:
        return <File className="w-4.5 h-4.5" />;
    }
  };

  const allSelected = files.length > 0 && files.every((f) => selectedFileIds.includes(f.id));

  return (
    <div className="bg-white dark:bg-[#11141C] rounded-2xl border border-slate-200/80 dark:border-white/[0.075] shadow-[var(--shadow-card)] overflow-hidden select-none">
      {/* Mobile Compact List View */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-white/[0.05]">
        {files.map((file) => {
          const colors = getFileColor(file.category);
          const ext = getFileExtension(file.filename);
          const isSelected = selectedFileIds.includes(file.id);
          const isFav = isFavorite(file);
          const thumbKey = `${file.originPeer || 'me'}_${file.id}`;

          return (
            <div
              key={thumbKey}
              onClick={() => handleRowClick(file)}
              onTouchStart={(e) => handleTouchStart(e, file.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onContextMenu={(e) => {
                if ('ontouchstart' in window) e.preventDefault();
              }}
              className={`flex items-center justify-between gap-2.5 p-3 min-h-[60px] transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-blue-950/30'
                  : 'active:bg-slate-50 dark:active:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {isSelectionMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectFile(file.id);
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                )}

                <div className={`w-10.5 h-10.5 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                  {file.thumbnailUrl && !failedThumbs[thumbKey] ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.filename}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedThumbs((prev) => ({ ...prev, [thumbKey]: true }))}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    renderIcon(file.category)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {file.filename}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums mt-0.5">
                    {ext && <span className="font-bold text-slate-500 dark:text-slate-400">{ext}</span>}
                    {ext && <span aria-hidden="true">·</span>}
                    <span dir="ltr">{formatFileSize(file.size)}</span>
                    {Boolean(file.duration && file.duration > 0) && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{formatDuration(file.duration!)}</span>
                      </>
                    )}
                    {Boolean(file.originChatTitle && activeTab === 'favorites') && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-sans font-medium truncate">
                          {file.originChatTitle}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!isSelectionMode && (
                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      toggleFavorite(file);
                      if (navigator.vibrate) navigator.vibrate(20);
                    }}
                    title={isFav ? t('removeFromFavorites') : t('addToFavorites')}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-90 ${
                      isFav
                        ? 'text-amber-500'
                        : 'text-slate-400 hover:text-amber-500'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => handleCopy(e, file)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 active:scale-90"
                  >
                    {copiedId === file.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={file.downloadUrl}
                    download={file.filename}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-600 active:scale-90"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setShareModalFile(file)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 active:scale-90"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  {activeTab === 'files' && canDeleteFile(file) && (
                    <button
                      onClick={(e) => handleRowDelete(e, file.id)}
                      title={confirmDeleteId === file.id ? (lang === 'fa' ? 'تأیید حذف؟' : 'Confirm?') : t('deleteFile')}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-90 ${
                        confirmDeleteId === file.id
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-rose-600'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop High-Density Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/[0.06] text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-[#F4F6FA]/90 dark:bg-[#171B26]/80">
              <th className="py-3 ps-5 pe-2 w-10">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  aria-label="Select all"
                  className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition cursor-pointer ${
                    allSelected
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600 hover:border-blue-500'
                  }`}
                >
                  {allSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              </th>
              <th className="py-3 px-3 text-start">{t('allFiles')}</th>
              <th className="py-3 px-4 text-start">{t('fileType')}</th>
              <th className="py-3 px-4 text-start">{t('storageUsed')}</th>
              <th className="py-3 px-4 text-start">{t('modifiedDate')}</th>
              <th className="py-3 px-5 text-end">{t('viewDetails')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05] text-xs">
            {files.map((file) => {
              const colors = getFileColor(file.category);
              const ext = getFileExtension(file.filename);
              const isSelected = selectedFileIds.includes(file.id);
              const isFav = isFavorite(file);
              const thumbKey = `${file.originPeer || 'me'}_${file.id}`;

              return (
                <tr
                  key={thumbKey}
                  onClick={() => handleRowClick(file)}
                  className={`transition-colors duration-150 cursor-pointer group ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/25'
                      : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.025]'
                  }`}
                >
                  <td className="py-2.5 ps-5 pe-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleSelectFile(file.id)}
                      aria-label="Select row"
                      className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 dark:border-slate-600 opacity-50 group-hover:opacity-100 hover:border-blue-500'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9.5 h-9.5 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                        {file.thumbnailUrl && !failedThumbs[thumbKey] ? (
                          <img
                            src={file.thumbnailUrl}
                            alt={file.filename}
                            referrerPolicy="no-referrer"
                            onError={() => setFailedThumbs((prev) => ({ ...prev, [thumbKey]: true }))}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          renderIcon(file.category)
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs lg:max-w-md">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                          {file.filename}
                        </p>
                        {(Boolean(file.duration && file.duration > 0) || Boolean(file.originChatTitle && activeTab === 'favorites')) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {Boolean(file.duration && file.duration > 0) && (
                              <span className="font-mono tabular-nums">{formatDuration(file.duration!)}</span>
                            )}
                            {Boolean(file.originChatTitle && activeTab === 'favorites') && (
                              <span className="text-amber-600 dark:text-amber-400 font-medium truncate">
                                {file.originChatTitle}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-4">
                    <span className="font-mono text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                      {ext || file.category}
                    </span>
                  </td>

                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-300" dir="ltr">
                    {formatFileSize(file.size)}
                  </td>

                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                    {formatDate(file.date, lang)}
                  </td>

                  <td className="py-2.5 px-5 text-end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5 sm:opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpen(file)}
                        title={t('play')}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-500/10 transition cursor-pointer"
                      >
                        {file.category === 'videos' || file.category === 'audio' ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          toggleFavorite(file);
                          if (navigator.vibrate) navigator.vibrate(20);
                        }}
                        title={isFav ? t('removeFromFavorites') : t('addToFavorites')}
                        className={`p-2 rounded-lg transition cursor-pointer ${
                          isFav
                            ? 'text-amber-500'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => handleCopy(e, file)}
                        title={t('copyDirectLink')}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-500/10 transition cursor-pointer"
                      >
                        {copiedId === file.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <a
                        href={file.downloadUrl}
                        download={file.filename}
                        title={t('directDownload')}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => setShareModalFile(file)}
                        title={t('shareFile')}
                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {activeTab === 'files' && canDeleteFile(file) && (
                        <button
                          onClick={(e) => handleRowDelete(e, file.id)}
                          title={confirmDeleteId === file.id ? (lang === 'fa' ? 'تأیید حذف؟' : 'Confirm?') : t('deleteFile')}
                          className={`p-2 rounded-lg transition cursor-pointer ${
                            confirmDeleteId === file.id
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
