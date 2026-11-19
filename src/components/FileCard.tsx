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
  Star,
  FolderPlus,
  FolderMinus,
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
    openAddToFolderModal,
    activeFolder,
    removeFilesFromFolder,
  } = useTelegram();
  const { t, lang } = useTheme();
  const canDeleteThisFile = activeTab === 'files' && canDeleteFile(file);

  const [copied, setCopied] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
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
    const clampedX = Math.max(12, Math.min(e.clientX, window.innerWidth - 216));
    const clampedY = Math.max(12, Math.min(e.clientY, window.innerHeight - 330));
    setContextMenuPos({ x: clampedX, y: clampedY });
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
        return <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />;
      case 'videos':
        return <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-0.5" />;
      case 'audio':
        return <Music className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />;
      case 'documents':
        return <FileText className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />;
      case 'archives':
        return <Archive className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />;
      default:
        return <File className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />;
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
        className={`group relative rounded-2xl border transition-all duration-150 overflow-hidden flex flex-col cursor-pointer select-none ${
          isSelected
            ? 'bg-blue-50/75 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/50 shadow-sm scale-[0.99]'
            : 'bg-white dark:bg-[#11141C] border-slate-200/80 dark:border-white/[0.075] shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:border-blue-500/40 dark:hover:border-sky-400/35 hover:shadow-[var(--shadow-card-hover)]'
        }`}
      >
        {/* Thumbnail Preview Area */}
        <div className={`relative aspect-16/10 w-full overflow-hidden flex items-center justify-center ${colors.bg}`}>
          {file.thumbnailUrl && !thumbFailed ? (
            <img
              src={file.thumbnailUrl}
              alt={file.filename}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setThumbFailed(true)}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200 pointer-events-none"
            />
          ) : (
            <div className={`w-14 h-14 rounded-2xl bg-white/85 dark:bg-[#171B26]/85 border border-white/40 dark:border-white/[0.06] backdrop-blur-xs flex items-center justify-center shadow-2xs ${colors.text} transition-transform duration-200 group-hover:scale-105`}>
              {renderCategoryIcon()}
            </div>
          )}

          {/* Selection Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectFile(file.id);
              if (navigator.vibrate) navigator.vibrate(15);
            }}
            aria-label="Select file"
            className={`absolute top-2.5 start-2.5 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer ${
              isSelected
                ? 'bg-blue-600 text-white shadow-sm opacity-100'
                : isSelectionMode
                ? 'bg-slate-950/60 backdrop-blur-md border-2 border-white/80 text-transparent opacity-100'
                : 'bg-slate-950/50 backdrop-blur-md border border-white/70 text-transparent opacity-0 group-hover:opacity-100 hover:scale-105'
            }`}
          >
            <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
          </button>

          {/* Extension Label */}
          {ext && !isSelectionMode && (
            <span className="absolute top-2.5 start-2.5 group-hover:opacity-0 transition-opacity px-1.5 py-0.5 rounded-md bg-slate-950/65 backdrop-blur-md text-white text-[9px] font-mono font-bold tracking-wider uppercase pointer-events-none">
              {ext}
            </span>
          )}

          {/* Duration Label */}
          {Boolean(file.duration && file.duration > 0) && (
            <span className="absolute bottom-2 end-2 px-1.5 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-md text-white text-[10px] font-mono font-medium tabular-nums pointer-events-none group-hover:opacity-0 sm:group-hover:opacity-0 transition-opacity">
              {formatDuration(file.duration!)}
            </span>
          )}

          {/* Top Actions: Star & Mobile Overflow */}
          {!isSelectionMode && (
            <div className="absolute top-2.5 end-2.5 z-20 flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(file);
                  if (navigator.vibrate) navigator.vibrate(20);
                }}
                title={isFav ? t('removeFromFavorites') : t('addToFavorites')}
                aria-label="Toggle favorite"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer ${
                  isFav
                    ? 'bg-amber-400 text-slate-950 shadow-sm opacity-100'
                    : 'bg-slate-950/50 backdrop-blur-md text-white/90 sm:opacity-0 sm:group-hover:opacity-100 hover:text-amber-300'
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
                className="sm:hidden w-7 h-7 rounded-lg bg-slate-950/50 backdrop-blur-md text-white flex items-center justify-center active:scale-90"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Desktop Hover Glass Action Dock */}
          {!isSelectionMode && (
            <div className="hidden sm:flex absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 items-end justify-center p-2.5">
              <div className="flex items-center gap-0.5 p-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 shadow-xl">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen();
                  }}
                  title={t('preview')}
                  className="w-8 h-8 rounded-lg text-white hover:bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  {file.category === 'videos' || file.category === 'audio' ? (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-sky-400" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                  )}
                </button>

                <button
                  onClick={handleCopyLink}
                  title={t('copyDirectLink')}
                  className="w-8 h-8 rounded-lg text-white hover:bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <a
                  href={file.downloadUrl}
                  download={file.filename}
                  onClick={(e) => e.stopPropagation()}
                  title={t('directDownload')}
                  className="w-8 h-8 rounded-lg text-white hover:bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                </a>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareModalFile(file);
                  }}
                  title={t('shareFile')}
                  className="w-8 h-8 rounded-lg text-white hover:bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openAddToFolderModal(file);
                  }}
                  title={t('addToFolder')}
                  className="w-8 h-8 rounded-lg text-white hover:bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>

                {canDeleteThisFile && (
                  <button
                    onClick={handleDelete}
                    title={confirmDelete ? (lang === 'fa' ? 'تأیید حذف؟' : 'Confirm?') : t('deleteFile')}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer ${
                      confirmDelete
                        ? 'bg-rose-600 text-white'
                        : 'text-rose-400 hover:bg-rose-500/20'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer / Unboxed Metadata */}
        <div className="p-3 flex-1 flex flex-col justify-between gap-1">
          <div>
            <h4
              className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors"
              title={file.filename}
            >
              {file.filename}
            </h4>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
              <span className="font-mono tabular-nums dir-ltr inline-block" dir="ltr">
                {formatFileSize(file.size)}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="truncate">{formatDate(file.date, lang).split(',')[0]}</span>
            </div>

            {Boolean(file.originChatTitle && activeTab === 'favorites') && (
              <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate">
                {file.originChatTitle}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Right-Click Context Menu */}
      {contextMenuPos && (
        <div
          style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px` }}
          className="fixed z-50 min-w-[196px] bg-white dark:bg-[#171B26] border border-slate-200/90 dark:border-white/[0.1] rounded-2xl shadow-2xl p-1.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setContextMenuPos(null);
              handleOpen();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-sky-500/10 hover:text-blue-600 dark:hover:text-sky-400 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{t('preview')} / {t('play')}</span>
          </button>

          <button
            onClick={(e) => {
              handleCopyLink(e);
              setContextMenuPos(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t('copyDirectLink')}</span>
          </button>

          <a
            href={file.downloadUrl}
            download={file.filename}
            onClick={() => setContextMenuPos(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('directDownload')}</span>
          </a>

          <button
            onClick={() => {
              setContextMenuPos(null);
              setShareModalFile(file);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t('shareFile')}</span>
          </button>

          <button
            onClick={() => {
              setContextMenuPos(null);
              toggleFavorite(file);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer"
          >
            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500 text-amber-500' : 'text-amber-500'}`} />
            <span>{isFav ? t('removeFromFavorites') : t('addToFavorites')}</span>
          </button>

          <button
            onClick={() => {
              setContextMenuPos(null);
              openAddToFolderModal(file);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-sky-500/10 hover:text-blue-600 dark:hover:text-sky-400 transition cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>{t('addToFolder')}</span>
          </button>

          {activeFolder && (
            <button
              onClick={() => {
                setContextMenuPos(null);
                removeFilesFromFolder(activeFolder.id, [file.id]);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
            >
              <FolderMinus className="w-3.5 h-3.5" />
              <span>{t('removeFromFolder')}</span>
            </button>
          )}

          <div className="h-px bg-slate-100 dark:bg-white/[0.06] my-1" />

          <button
            onClick={() => {
              setContextMenuPos(null);
              toggleSelectFile(file.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <span>{isSelected ? (lang === 'fa' ? 'لغو انتخاب' : 'Deselect') : (lang === 'fa' ? 'انتخاب فایل' : 'Select')}</span>
          </button>

          {canDeleteThisFile && (
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
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
            className="w-full bg-white dark:bg-[#11141C] rounded-t-3xl p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-white/[0.08] shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />

            <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {file.filename}
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums mt-0.5">
                  {formatFileSize(file.size)} · {formatDate(file.date, lang)}
                </p>
              </div>
              <button
                onClick={() => setShowMobileActions(false)}
                className="w-9 h-9 rounded-full bg-[#F4F6FA] dark:bg-[#171B26] text-slate-500 flex items-center justify-center shrink-0"
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
                className="flex items-center gap-2.5 p-3 min-h-[44px] rounded-2xl bg-blue-50 dark:bg-sky-500/10 text-blue-600 dark:text-sky-400"
              >
                <Play className="w-4 h-4" />
                <span>{t('play')} / {t('preview')}</span>
              </button>

              <button
                onClick={(e) => {
                  handleCopyLink(e);
                  setTimeout(() => setShowMobileActions(false), 600);
                }}
                className="flex items-center gap-2.5 p-3 min-h-[44px] rounded-2xl bg-[#F4F6FA] dark:bg-[#171B26] text-slate-700 dark:text-slate-200"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (lang === 'fa' ? 'کپی شد!' : 'Copied!') : t('copyLink')}</span>
              </button>

              <a
                href={file.downloadUrl}
                download={file.filename}
                onClick={() => setShowMobileActions(false)}
                className="flex items-center gap-2.5 p-3 min-h-[44px] rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <Download className="w-4 h-4" />
                <span>{t('directDownload')}</span>
              </a>

              <button
                onClick={() => {
                  setShowMobileActions(false);
                  setShareModalFile(file);
                }}
                className="flex items-center gap-2.5 p-3 min-h-[44px] rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              >
                <Share2 className="w-4 h-4" />
                <span>{t('shareFile')}</span>
              </button>

              <button
                onClick={() => {
                  toggleFavorite(file);
                  setTimeout(() => setShowMobileActions(false), 250);
                }}
                className={`col-span-2 flex items-center justify-center gap-2.5 p-3 min-h-[44px] rounded-2xl transition ${
                  isFav
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                    : 'bg-[#F4F6FA] dark:bg-[#171B26] text-slate-700 dark:text-slate-200'
                }`}
              >
                <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500 text-amber-500' : 'text-amber-500'}`} />
                <span>{isFav ? t('removeFromFavorites') : t('addToFavorites')}</span>
              </button>

              <button
                onClick={() => {
                  setShowMobileActions(false);
                  openAddToFolderModal(file);
                }}
                className="col-span-2 flex items-center justify-center gap-2.5 p-3 min-h-[44px] rounded-2xl bg-blue-50 dark:bg-sky-500/10 text-blue-600 dark:text-sky-400"
              >
                <FolderPlus className="w-4 h-4" />
                <span>{t('addToFolder')}</span>
              </button>

              {activeFolder && (
                <button
                  onClick={() => {
                    setShowMobileActions(false);
                    removeFilesFromFolder(activeFolder.id, [file.id]);
                  }}
                  className="col-span-2 flex items-center justify-center gap-2.5 p-3 min-h-[44px] rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                >
                  <FolderMinus className="w-4 h-4" />
                  <span>{t('removeFromFolder')}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowMobileActions(false);
                  toggleSelectFile(file.id);
                }}
                className="col-span-2 flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-2xl bg-[#F4F6FA] dark:bg-[#171B26] text-slate-700 dark:text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span>
                  {lang === 'fa' ? 'انتخاب چندگانه' : 'Select Multiple Files'}
                </span>
              </button>

              {canDeleteThisFile && (
                <button
                  onClick={handleDelete}
                  className="col-span-2 flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
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
