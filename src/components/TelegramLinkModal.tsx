import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Link2,
  Copy,
  Download,
  Play,
  Check,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Loader2,
  AlertCircle,
  Clipboard,
  Send,
  Zap,
  Activity,
  ArrowUpRight,
  Cloud,
  XCircle,
} from 'lucide-react';
import { useTelegram, useBackHandler } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize, formatDuration } from '../utils/formatters';
import { TelegramFile } from '../types';


export interface TelegramLinkModalProps {
  onClose: () => void;
  initialLink?: string;
}

export function TelegramLinkModal({ onClose, initialLink = '' }: TelegramLinkModalProps) {
  const {
    setActiveVideo,
    setActiveAudio,
    setActiveImage,
    setActiveDoc,
    refreshFiles,
  } = useTelegram();
  const { t, lang } = useTheme();

  const [linkInput, setLinkInput] = useState(initialLink);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedMedia, setExtractedMedia] = useState<any | null>(null);
  const [copiedType, setCopiedType] = useState<'download' | 'original' | 'caption' | null>(null);
  const [isSavingToSaved, setIsSavingToSaved] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Real-time transfer metrics state
  const [remoteTask, setRemoteTask] = useState<{
    id: string;
    filename: string;
    totalSize: number;
    loadedSize: number;
    progress: number;
    speed: string;
    phase: string;
    status: string;
    error?: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<any>(null);

  useBackHandler(true, onClose);

  useEffect(() => {
    if (initialLink) {
      handleInspectLink(initialLink);
    } else {
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [initialLink]);

  const handleInspectLink = async (targetLink?: string) => {
    const linkToFetch = targetLink !== undefined ? targetLink : linkInput;
    if (!linkToFetch || !linkToFetch.trim()) {
      setError(lang === 'fa' ? 'لطفاً لینک پیام یا لینک مستقیم دانلود را وارد کنید.' : 'Please enter a Telegram or direct download link.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedMedia(null);
    setSaveSuccess(false);
    setRemoteTask(null);

    try {
      const res = await fetch('/api/telegram/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: linkToFetch.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || (lang === 'fa' ? 'خطا در بررسی لینک' : 'Failed to inspect link'));
      }

      setExtractedMedia(data.media);
    } catch (err: any) {
      setError(err.message || (lang === 'fa' ? 'امکان دریافت رسانه وجود ندارد.' : 'Unable to fetch media from link.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setLinkInput(text);
          handleInspectLink(text);
        }
      }
    } catch (e) {
      // Ignore clipboard permission errors
    }
  };

  const handleCopyText = (text: string, type: 'download' | 'original' | 'caption') => {
    try {
      const fullUrl = text.startsWith('/') ? `${window.location.origin}${text}` : text;
      navigator.clipboard.writeText(fullUrl);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (e) {
      // Fallback
    }
  };

  const handleDownloadFile = () => {
    if (!extractedMedia) return;
    const downloadUrl = extractedMedia.downloadUrl.startsWith('/')
      ? `${window.location.origin}${extractedMedia.downloadUrl}`
      : extractedMedia.downloadUrl;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = extractedMedia.filename || 'telegram_media';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePlayOrView = () => {
    if (!extractedMedia) return;

    const mediaFile: TelegramFile = {
      id: extractedMedia.id || Date.now(),
      filename: extractedMedia.filename,
      caption: extractedMedia.caption || '',
      mimeType: extractedMedia.mimeType,
      size: extractedMedia.size,
      category: extractedMedia.category,
      hasThumb: Boolean(extractedMedia.hasThumb),
      date: extractedMedia.date || Date.now(),
      duration: extractedMedia.duration,
      width: extractedMedia.width,
      height: extractedMedia.height,
      directUrl: extractedMedia.directUrl,
      downloadUrl: extractedMedia.downloadUrl,
      thumbnailUrl: extractedMedia.thumbnailUrl,
    };

    if (extractedMedia.category === 'videos') {
      setActiveVideo(mediaFile);
    } else if (extractedMedia.category === 'audio') {
      setActiveAudio(mediaFile);
    } else if (extractedMedia.category === 'images') {
      setActiveImage(mediaFile);
    } else {
      setActiveDoc(mediaFile);
    }
    onClose();
  };

  const handleSaveToSavedMessages = async () => {
    if (!extractedMedia) return;
    setIsSavingToSaved(true);
    setSaveSuccess(false);
    setError(null);
    setRemoteTask(null);

    try {
      const res = await fetch('/api/telegram/start-remote-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: extractedMedia.directUrl,
          filename: extractedMedia.filename,
          caption: extractedMedia.caption || extractedMedia.filename,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.taskId) {
        throw new Error(data.error || (lang === 'fa' ? 'خطا در شروع ارسال فایل' : 'Failed to start remote transfer'));
      }

      const taskId = data.taskId;

      // Start real-time polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/telegram/remote-upload-status/${taskId}`);
          const statusData = await statusRes.json();

          if (statusRes.ok && statusData.success && statusData.task) {
            const taskInfo = statusData.task;
            setRemoteTask(taskInfo);

            if (taskInfo.status === 'completed') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setIsSavingToSaved(false);
              setSaveSuccess(true);
              refreshFiles();
              setTimeout(() => {
                setSaveSuccess(false);
                setRemoteTask(null);
              }, 4000);
            } else if (taskInfo.status === 'failed') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setIsSavingToSaved(false);
              setError(taskInfo.error || (lang === 'fa' ? 'خطا در دریافت و ارسال فایل' : 'Remote transfer failed'));
              setRemoteTask(null);
            }
          }
        } catch (e) {
          // ignore transient poll error
        }
      }, 300);

    } catch (e: any) {
      setError(e.message || (lang === 'fa' ? 'خطا در برقراری ارتباط با سرور' : 'Connection error'));
      setIsSavingToSaved(false);
    }
  };

  const handleCancelRemoteTransfer = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (remoteTask) {
      try {
        await fetch(`/api/telegram/cancel-remote-upload/${remoteTask.id}`, { method: 'POST' });
      } catch (e) {}
    }
    setIsSavingToSaved(false);
    setRemoteTask(null);
    setError(lang === 'fa' ? 'انتقال آنلاین فایل با موفقیت لغو شد.' : 'Remote transfer cancelled.');
  };

  const getMediaIcon = (category: string) => {

    switch (category) {
      case 'videos':
        return <Video className="w-5 h-5 text-amber-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-emerald-500" />;
      case 'images':
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-white dark:bg-[#18191d] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-zinc-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {t('telegramLinkInspector')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                {lang === 'fa' ? 'استخراج فایل از لینک مستقیم وب یا پست تلگرام و ارسال به فضای ابری' : 'Download file from direct web URL or Telegram link to cloud storage'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Link Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span>{lang === 'fa' ? 'ورود لینک مستقیم فایل یا پست تلگرام:' : 'Direct Download URL or Telegram Link:'}</span>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-bold text-[11px] cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'جای‌گذاری از حافظه' : 'Paste from clipboard'}</span>
              </button>
            </label>

            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInspectLink()}
                placeholder={t('enterTelegramLink')}
                className="w-full ps-3.5 pe-24 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-800 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dir-ltr text-start"
              />

              <div className="absolute end-1.5 flex items-center gap-1">
                {linkInput && (
                  <button
                    onClick={() => {
                      setLinkInput('');
                      setExtractedMedia(null);
                      setError(null);
                      setRemoteTask(null);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleInspectLink()}
                  disabled={isLoading || !linkInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{t('inspectLinkBtn')}</span>
                  )}
                </button>
              </div>
            </div>


          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Extracted Media Preview Box */}
          {extractedMedia && (
            <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 space-y-4 animate-in fade-in zoom-in-98 duration-200">
              
              {/* Media Title & Source Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 shadow-2xs shrink-0">
                    {getMediaIcon(extractedMedia.category)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {extractedMedia.filename}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                      <span dir="ltr" className="font-mono dir-ltr inline-block">{formatFileSize(extractedMedia.size)}</span>
                      {extractedMedia.duration && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(extractedMedia.duration)}</span>
                        </>
                      )}
                      {extractedMedia.chatTitle && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 dark:text-sky-400 truncate max-w-[120px]">
                            {extractedMedia.chatTitle}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 text-[10px] font-mono font-bold uppercase shrink-0">
                  {extractedMedia.isDirectUrl ? (lang === 'fa' ? 'لینک مستقیم' : 'Direct Link') : extractedMedia.category}
                </span>
              </div>

              {/* Visual Media Viewer Card */}
              {extractedMedia.category === 'images' ? (
                <div
                  onClick={handlePlayOrView}
                  className="relative group rounded-2xl overflow-hidden bg-slate-900 aspect-video max-h-64 flex items-center justify-center cursor-pointer border border-slate-200/60 dark:border-zinc-800 shadow-md"
                >
                  <img
                    src={extractedMedia.directUrl}
                    alt={extractedMedia.filename}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-slate-900 dark:text-white font-bold text-xs shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                      {lang === 'fa' ? 'مشاهده کامل تصویر' : 'View Full Image'}
                    </span>
                  </div>
                </div>
              ) : extractedMedia.category === 'videos' ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-64 flex items-center justify-center border border-slate-200/60 dark:border-zinc-800 shadow-md">
                  <video
                    src={extractedMedia.directUrl}
                    controls
                    poster={extractedMedia.thumbnailUrl || undefined}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : extractedMedia.category === 'audio' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                      <Music className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {extractedMedia.filename}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatDuration(extractedMedia.duration || 0)} • {formatFileSize(extractedMedia.size)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePlayOrView}
                    className="p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-90 transition cursor-pointer shrink-0"
                    title={t('play')}
                  >
                    <Play className="w-5 h-5 fill-current" />
                  </button>
                </div>
              ) : null}

              {/* Caption Section */}
              {extractedMedia.caption && (
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/60 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                      {lang === 'fa' ? 'توضیحات پست (Caption)' : 'Caption'}
                    </span>
                    <button
                      onClick={() => handleCopyText(extractedMedia.caption, 'caption')}
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      {copiedType === 'caption' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">{t('copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{lang === 'fa' ? 'کپی متن' : 'Copy caption'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto font-sans">
                    {extractedMedia.caption}
                  </p>
                </div>
              )}

              {/* REAL-TIME PROGRESS & SPEED TRACKER CARD */}
              {isSavingToSaved && remoteTask && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/90 via-sky-900/90 to-indigo-900/90 text-white border border-blue-400/40 shadow-xl space-y-3 animate-in fade-in zoom-in-98 duration-150">
                  
                  {/* Phase & Live Speed Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-sky-300 animate-pulse shrink-0" />
                      <span className="text-xs font-bold text-sky-100">
                        {remoteTask.phase === 'downloading'
                          ? (lang === 'fa' ? 'فاز ۱ از ۲: دریافت فایل از سرور مقصد...' : 'Phase 1/2: Downloading from source...')
                          : (lang === 'fa' ? 'فاز ۲ از ۲: ارسال سریع به سیو مسیج تلگرام...' : 'Phase 2/2: Streaming to Telegram Saved Messages...')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/25 border border-sky-400/30 text-amber-300 font-mono text-[11px] font-bold">
                        <Zap className="w-3 h-3 text-amber-300 fill-amber-300 animate-bounce" />
                        <span>{remoteTask.speed}</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCancelRemoteTransfer}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/40 text-rose-200 font-bold text-[11px] active:scale-95 transition cursor-pointer"
                        title={lang === 'fa' ? 'لغو انتقال آنلاین' : 'Cancel transfer'}
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-300" />
                        <span>{lang === 'fa' ? 'لغو' : 'Cancel'}</span>
                      </button>
                    </div>

                  </div>

                  {/* Progress Bar Container */}
                  <div className="space-y-1.5">
                    <div className="w-full h-3.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10 relative">
                      <div
                        style={{ width: `${Math.max(3, remoteTask.progress)}%` }}
                        className="h-full bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 rounded-full transition-all duration-300 shadow-md relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-sky-200">
                      <span dir="ltr" className="font-mono dir-ltr inline-block">
                        {formatFileSize(remoteTask.loadedSize)} / {formatFileSize(remoteTask.totalSize || remoteTask.loadedSize)}
                      </span>
                      <span className="font-extrabold text-white text-xs">{remoteTask.progress}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Direct Transfer Button */}
              {!isSavingToSaved && (
                <div className="pt-1">
                  <button
                    onClick={handleSaveToSavedMessages}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-sky-400 active:scale-98 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-300 stroke-[3]" />
                        <span className="text-emerald-100">{lang === 'fa' ? 'فایل با موفقیت در سیو مسیج تلگرام ذخیره شد!' : 'File successfully sent to Saved Messages!'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 stroke-[2.2]" />
                        <span>{lang === 'fa' ? 'ارسال مستقیم محتوا به سیو مسیج تلگرام' : 'Send Content Directly to Saved Messages'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Action Toolbar Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                
                {/* 1. Direct Download Button */}
                <button
                  onClick={handleDownloadFile}
                  className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-98 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>{t('downloadMedia')}</span>
                </button>

                {/* 2. Copy Direct Streaming Link */}
                <button
                  onClick={() => handleCopyText(extractedMedia.downloadUrl || extractedMedia.directUrl, 'download')}
                  className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-98 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedType === 'download' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-500">{lang === 'fa' ? 'لینک کپی شد!' : 'Link Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-blue-500" />
                      <span>{t('copyTelegramLink')}</span>
                    </>
                  )}
                </button>

                {/* 3. Play or Fullscreen Preview */}
                <button
                  onClick={handlePlayOrView}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{lang === 'fa' ? 'پخش آنلاین' : 'Play / View'}</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
