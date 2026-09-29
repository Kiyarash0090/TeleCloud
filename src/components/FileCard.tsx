import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Music,
  FileText,
  Archive,
  File,
  Image as ImageIcon,
  Download,
  Trash2,
  Share2,
  Copy,
  Check,
  MoreVertical,
  Eye,
  X,
  CheckCircle2,
  ExternalLink,
  Star,
} from 'lucide-react';
import { TelegramFile } from '../types';
import { formatFileSize, formatDate, formatDuration, getFileExtension, getFileColor } from '../utils/formatters';
import { useTelegram, useBackHandler } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';

export function FileCard({ file }: { file: TelegramFile }) {
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
    selectedFileIds,
    isSelectionMode,
    toggleSelectFile,
    toggleFavorite,
    isFavorite,
  } = useTelegram();
  const { t, lang } = useTheme();
  const canDeleteThisFile = activeTab === 'files' && canDeleteFile(file);

  const [copied, setCopied] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  useBackHandler(showMobileActions, () => setShowMobileActions(false));
  useBackHandler(Boolean(contextMenuPos), () => setContextMenuPos(null));

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isSelected = selectedFileIds.includes(file.id);
  const ext = getFileExtension(file.filename);
  const colors = getFileColor(file.category);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenuPos) return;
    const handleClick = () => setContextMenuPos(null);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleClick);
    };
  }, [contextMenuPos]);

  const handleOpen = () => {
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

  const handleCardClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (isSelectionMode) {
      toggleSelectFile(file.id);
      if (navigator.vibrate) navigator.vibrate(15);
      return;
    }
    handleOpen();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    longPressTriggeredRef.current = false;
    touchStartPosRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      toggleSelectFile(file.id);
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

  const handleContextMenu = (e: React.MouseEvent) => {
    if ('ontouchstart' in window) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = file.directUrl.startsWith('http')
      ? file.directUrl
      : `${window.location.origin}${file.directUrl}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await deleteFile(file.id);
    setShowMobileActions(false);
    setContextMenuPos(null);
  };

  const renderCategoryIcon = () => {
    switch (file.category) {
      case 'images':
        return <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10" />;
      case 'videos':
        return <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-0.5" />;
      case 'audio':
        return <Music className="w-8 h-8 sm:w-10 sm:h-10" />;
      case 'documents':
        return <FileText className="w-8 h-8 sm:w-10 sm:h-10" />;
      case 'archives':
        return <Archive className="w-8 h-8 sm:w-10 sm:h-10" />;
      default:
        return <File className="w-8 h-8 sm:w-10 sm:h-10" />;
    }
  };

  const isFav = isFavorite(file);

  return (
    <>
      <div
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={handleContextMenu}
        className={`group relative rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col cursor-pointer select-none ${
          isSelected
            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/70 shadow-md scale-[0.99]'
            : 'bg-white dark:bg-[#18191d] border-slate-200/80 dark:border-zinc-800/80 hover:border-blue-400/60 dark:hover:border-sky-500/50 shadow-2xs hover:shadow-lg'
        }`}
      >
        {/* Thumbnail Container */}
        <div className={`relative aspect-16/10 w-full overflow-hidden flex items-center justify-center ${colors.bg}`}>
          {file.thumbnailUrl ? (
            <img
              src={file.thumbnailUrl}
              alt={file.filename}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
            />
          ) : (
            <div className={`${colors.text} transition-transform duration-300 group-hover:scale-110 opacity-90`}>
              {renderCategoryIcon()}
            </div>
          )}

          {/* Selection Checkbox (Visible in selection mode or on hover) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectFile(file.id);
              if (navigator.vibrate) navigator.vibrate(15);
            }}
            aria-label="Select file"
            className={`absolute top-2 start-2 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer ${
              isSelected
                ? 'bg-blue-600 text-white shadow-md scale-105 opacity-100'
                : isSelectionMode
                ? 'bg-black/60 backdrop-blur-md border-2 border-white/80 text-transparent opacity-100'
                : 'bg-black/45 backdrop-blur-md border border-white/70 text-transparent opacity-0 group-hover:opacity-100 hover:scale-110'
            }`}
          >
            <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
          </button>

          {/* Extension Badge (Shifts when checkbox is hovered) */}
          {ext && !isSelectionMode && (
            <span className="absolute top-2 start-2 group-hover:opacity-0 transition-opacity px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[9px] font-mono font-bold tracking-wider uppercase pointer-events-none">
              {ext}
            </span>
          )}

          {/* Duration Badge */}
          {Boolean(file.duration && file.duration > 0) && (
            <span className="absolute bottom-2 end-2 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-medium pointer-events-none">
              {formatDuration(file.duration!)}
            </span>
          )}

          {/* Top Actions: Star / Bookmark & Mobile 3-Dot */}
          {!isSelectionMode && (
            <div className="absolute top-2 end-2 z-20 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(file);
                  if (navigator.vibrate) navigator.vibrate(20);
                }}
                title={isFav ? t('removeFromFavorites') : t('addToFavorites')}
                aria-label="Toggle favorite"
                className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer ${
                  isFav
                    ? 'bg-amber-400 text-slate-950 shadow-md scale-105 opacity-100 ring-1 ring-amber-300/50'
                    : 'bg-black/50 backdrop-blur-md text-white/90 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 hover:text-amber-300'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-slate-950 stroke-slate-950' : 'fill-none stroke-current'}`} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileActions(true);
                }}
                aria-label="Actions"
                className="sm:hidden w-6.5 h-6.5 rounded-lg bg-black/50 backdrop-blur-md text-white flex items-center justify-center active:scale-90"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Desktop Hover Floating Glass Actions Overlay */}
          {!isSelectionMode && (
            <div className="hidden sm:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-1.5 p-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpen();
                }}
                title={t('preview')}
                className="w-9 h-9 rounded-xl bg-white/95 text-slate-900 hover:bg-white hover:scale-110 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
              >
                {file.category === 'videos' || file.category === 'audio' ? (
                  <Play className="w-4 h-4 fill-current ml-0.5 text-blue-600" />
                ) : (
                  <Eye className="w-4 h-4 text-blue-600" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(file);
                  if (navigator.vibrate) navigator.vibrate(20);
                }}
                title={isFav ? t('removeFromFavorites') : t('addToFavorites')}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer ${
                  isFav
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 hover:scale-110'
                    : 'bg-white/95 text-slate-900 hover:bg-white hover:scale-110'
                }`}
              >
                <Star className={`w-4 h-4 ${isFav ? 'fill-slate-950 stroke-slate-950' : 'text-amber-500'}`} />
              </button>

              <button
                onClick={handleCopyLink}
                title={t('copyDirectLink')}
                className="w-9 h-9 rounded-xl bg-white/95 text-slate-900 hover:bg-white hover:scale-110 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-700" />}
              </button>

              <a
                href={file.downloadUrl}
                download={file.filename}
                onClick={(e) => e.stopPropagation()}
                title={t('directDownload')}
                className="w-9 h-9 rounded-xl bg-white/95 text-slate-900 hover:bg-white hover:scale-110 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
              </a>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShareModalFile(file);
                }}
                title={t('shareFile')}
                className="w-9 h-9 rounded-xl bg-white/95 text-slate-900 hover:bg-white hover:scale-110 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
              </button>

              {canDeleteThisFile && (
                <button
                  onClick={handleDelete}
                  title={confirmDelete ? (lang === 'fa' ? 'تأیید حذف؟' : 'Confirm?') : t('deleteFile')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer ${
                    confirmDelete
                      ? 'bg-rose-600 text-white hover:bg-rose-500 scale-110'
                      : 'bg-white/95 text-rose-600 hover:bg-rose-50 hover:scale-110'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card Body / Metadata */}
        <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between gap-1.5">
          <div>
            <h4
              className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors"
              title={file.filename}
            >
              {file.filename}
            </h4>

            {/* Zero-Pill Clean Unboxed Metadata */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">
              <span className="font-mono tabular-nums dir-ltr inline-block" dir="ltr">{formatFileSize(file.size)}</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-zinc-700">·</span>
              <span className="truncate">{formatDate(file.date, lang).split(',')[0]}</span>
            </div>

            {Boolean(file.originChatTitle && activeTab === 'favorites') && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="truncate">{file.originChatTitle}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Native-style Right-Click Context Menu */}
      {contextMenuPos && (
        <div
          style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px` }}
          className="fixed z-50 min-w-[180px] bg-white dark:bg-[#1f2024] border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-1.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setContextMenuPos(null);
              handleOpen();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-sky-400 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{t('preview')} / {t('play')}</span>
          </button>

          <button
            onClick={(e) => {
              handleCopyLink(e);
              setContextMenuPos(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t('copyDirectLink')}</span>
          </button>

          <a
            href={file.downloadUrl}
            download={file.filename}
            onClick={() => setContextMenuPos(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('directDownload')}</span>
          </a>

          <button
            onClick={() => {
              setContextMenuPos(null);
              setShareModalFile(file);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t('shareFile')}</span>
          </button>

          <button
            onClick={() => {
              setContextMenuPos(null);
              toggleFavorite(file);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer"
          >
            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500 text-amber-500' : 'text-amber-500'}`} />
            <span>{isFav ? t('removeFromFavorites') : t('addToFavorites')}</span>
          </button>

          <div className="h-[1px] bg-slate-100 dark:bg-zinc-800 my-1" />

          <button
            onClick={() => {
              setContextMenuPos(null);
              toggleSelectFile(file.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <span>{isSelected ? (lang === 'fa' ? 'لغو انتخاب' : 'Deselect') : (lang === 'fa' ? 'انتخاب فایل' : 'Select')}</span>
          </button>

          {canDeleteThisFile && (
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmDelete ? (lang === 'fa' ? 'حذف قطعی؟' : 'Confirm?') : t('deleteFile')}</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile Bottom Sheet Menu */}
      {showMobileActions && (
        <div
          onClick={() => setShowMobileActions(false)}
          className="sm:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white dark:bg-[#1e1f20] rounded-t-3xl p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 mx-auto mb-3" />

            <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {file.filename}
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {formatFileSize(file.size)} • {formatDate(file.date, lang)}
                </p>
              </div>
              <button
                onClick={() => setShowMobileActions(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                onClick={() => {
                  setShowMobileActions(false);
                  handleOpen();
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400"
              >
                <Play className="w-4 h-4" />
                <span>{t('play')} / {t('preview')}</span>
              </button>

              <button
                onClick={(e) => {
                  handleCopyLink(e);
                  setTimeout(() => setShowMobileActions(false), 600);
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (lang === 'fa' ? 'کپی شد!' : 'Copied!') : t('copyLink')}</span>
              </button>

              <a
                href={file.downloadUrl}
                download={file.filename}
                onClick={() => setShowMobileActions(false)}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
              >
                <Download className="w-4 h-4" />
                <span>{t('directDownload')}</span>
              </a>

              <button
                onClick={() => {
                  setShowMobileActions(false);
                  setShareModalFile(file);
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
              >
                <Share2 className="w-4 h-4" />
                <span>{t('shareFile')}</span>
              </button>

              <button
                onClick={() => {
                  toggleFavorite(file);
                  setTimeout(() => setShowMobileActions(false), 250);
                }}
                className={`col-span-2 flex items-center justify-center gap-2.5 p-3 rounded-2xl transition ${
                  isFav
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold'
                }`}
              >
                <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500 text-amber-500' : 'text-amber-500'}`} />
                <span>{isFav ? t('removeFromFavorites') : t('addToFavorites')}</span>
              </button>

              <button
                onClick={() => {
                  setShowMobileActions(false);
                  toggleSelectFile(file.id);
                }}
                className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span>
                  {lang === 'fa' ? 'انتخاب چندگانه (Multi-Select)' : 'Select Multiple Files'}
                </span>
              </button>

              {canDeleteThisFile && (
                <button
                  onClick={handleDelete}
                  className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{confirmDelete ? t('deleteConfirm') : t('deleteFile')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
