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
  } = useTelegram();
  const { t, lang } = useTheme();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
    if (activeTab === 'favorites') {
      return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center bg-white/60 dark:bg-[#1e1f20]/60 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mb-4">
            <Star className="w-8 h-8 fill-amber-500/20" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-1">
            {t('noFavoritesFound')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md">
            {t('noFavoritesDesc')}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center bg-white/60 dark:bg-[#1e1f20]/60 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex items-center justify-center mb-4">
          <FolderOpen className="w-8 h-8" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-1">
          {t('noFilesFound')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mb-5">
          {t('noFilesDesc')}
        </p>
        {canUploadInActiveChat && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
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
        return <ImageIcon className="w-5 h-5" />;
      case 'videos':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      case 'documents':
        return <FileText className="w-5 h-5" />;
      case 'archives':
        return <Archive className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const allSelected = files.length > 0 && files.every(f => selectedFileIds.includes(f.id));

  return (
    <div className="bg-white dark:bg-[#1e1f20] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden select-none">
      {/* Mobile Compact List View */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/70">
        {files.map((file) => {
          const colors = getFileColor(file.category);
          const ext = getFileExtension(file.filename);
          const isSelected = selectedFileIds.includes(file.id);
          const isFav = isFavorite(file);
          return (
            <div
              key={`${file.originPeer || 'me'}_${file.id}`}
              onClick={() => handleRowClick(file)}
              onTouchStart={(e) => handleTouchStart(e, file.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onContextMenu={(e) => {
                if ('ontouchstart' in window) e.preventDefault();
              }}
              className={`flex items-center justify-between gap-2.5 p-2.5 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-blue-950/30'
                  : 'active:bg-slate-50 dark:active:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {isSelectionMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectFile(file.id);
                    }}
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'border-2 border-slate-300 dark:border-zinc-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                )}

                <div className={`w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                  {file.thumbnailUrl ? (
                    <img src={file.thumbnailUrl} alt={file.filename} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    renderIcon(file.category)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate">
                    {file.filename}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                    {ext && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold">
                        {ext}
                      </span>
                    )}
                    <span>{formatFileSize(file.size)}</span>
                    {Boolean(file.duration && file.duration > 0) && <span>• {formatDuration(file.duration!)}</span>}
                    {Boolean(file.originChatTitle && activeTab === 'favorites') && (
                      <span className="text-amber-600 dark:text-amber-400 font-sans font-medium truncate">
                        • {file.originChatTitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isSelectionMode && (
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      toggleFavorite(file);
                      if (navigator.vibrate) navigator.vibrate(20);
                    }}
                    title={isFav ? t('removeFromFavorites') : t('addToFavorites')}
                    className={`p-2 rounded-xl transition active:scale-90 ${
                      isFav
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                        : 'text-slate-400 hover:text-amber-500'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => handleCopy(e, file)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 active:scale-90"
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
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 active:scale-90"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setShareModalFile(file)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 active:scale-90"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  {activeTab === 'files' && canDeleteFile(file) && (
                    <button
                      onClick={(e) => handleRowDelete(e, file.id)}
                      title={confirmDeleteId === file.id ? (lang === 'fa' ? 'تأیید حذف؟' : 'Confirm?') : t('deleteFile')}
                      className={`p-2 rounded-xl transition active:scale-90 ${
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

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 bg-slate-50/50 dark:bg-zinc-900/40">
              <th className="py-3.5 ps-5 pe-2 w-10">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                    allSelected
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 dark:border-zinc-700 hover:border-blue-500'
                  }`}
                >
                  {allSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              </th>
              <th className="py-3.5 px-3 text-start">{t('allFiles')}</th>
              <th className="py-3.5 px-4 text-start">{t('fileType')}</th>
              <th className="py-3.5 px-4 text-start">{t('storageUsed')}</th>
              <th className="py-3.5 px-4 text-start">{t('modifiedDate')}</th>
              <th className="py-3.5 px-5 text-end">{t('viewDetails')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-xs">
            {files.map((file) => {
              const colors = getFileColor(file.category);
              const ext = getFileExtension(file.filename);
              const isSelected = selectedFileIds.includes(file.id);
              const isFav = isFavorite(file);
              return (
                <tr
                  key={`${file.originPeer || 'me'}_${file.id}`}
                  onClick={() => handleRowClick(file)}
                  className={`transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/25'
                      : 'hover:bg-slate-50/80 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <td className="py-3 ps-5 pe-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleSelectFile(file.id)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 dark:border-zinc-700 opacity-50 group-hover:opacity-100 hover:border-blue-500'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                        {file.thumbnailUrl ? (
                          <img src={file.thumbnailUrl} alt={file.filename} className="w-full h-full object-cover" />
                        ) : (
                          renderIcon(file.category)
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs lg:max-w-md">
                        <p className="font-bold text-slate-800 dark:text-zinc-100 truncate">
                          {file.filename}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          {Boolean(file.duration && file.duration > 0) && (
                            <span className="font-mono">{formatDuration(file.duration!)}</span>
                          )}
                          {Boolean(file.originChatTitle && activeTab === 'favorites') && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium truncate">
                              {file.originChatTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${colors.badge}`}>
                      {ext || file.category}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-zinc-400">
                    {formatFileSize(file.size)}
                  </td>

                  <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">
                    {formatDate(file.date, lang)}
                  </td>

                  <td className="py-3 px-5 text-end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpen(file)}
                        title={t('play')}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-950/40 transition"
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
                        className={`p-2 rounded-xl transition cursor-pointer ${
                          isFav
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => handleCopy(e, file)}
                        title={t('copyDirectLink')}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-950/40 transition"
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
                        className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => setShareModalFile(file)}
                        title={t('shareFile')}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {activeTab === 'files' && canDeleteFile(file) && (
                        <button
                          onClick={(e) => handleRowDelete(e, file.id)}
                          title={confirmDeleteId === file.id ? (lang === 'fa' ? 'تأیید حذف؟' : 'Confirm?') : t('deleteFile')}
                          className={`p-2 rounded-xl transition cursor-pointer ${
                            confirmDeleteId === file.id
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
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
