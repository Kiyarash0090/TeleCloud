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
    activePeer,
    activeChatTitle,
    canUploadInActiveChat,
  } = useTelegram();
  const { t, lang } = useTheme();

  const isSavedMessages = !activePeer || activePeer === 'me';
  const targetPeerToSend = canUploadInActiveChat ? (activePeer || 'me') : 'me';
  const targetDisplayTitle =
    targetPeerToSend === 'me'
      ? lang === 'fa'
        ? 'سیو مسیج'
        : 'Saved Messages'
      : activeChatTitle || targetPeerToSend;

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
          telegramLink: extractedMedia.telegramLink || linkInput.trim(),
          peerParam: extractedMedia.peerParam,
          targetPeer: targetPeerToSend,
          messageId: extractedMedia.id,
          isDirectUrl: Boolean(extractedMedia.isDirectUrl),
          isDemoFallback: Boolean(extractedMedia.isDemoFallback),
          totalSize: extractedMedia.size || 0,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-white dark:bg-[#11141C] rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-slate-900/20 dark:shadow-black/70 border-t sm:border border-slate-200/80 dark:border-white/[0.08] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-0.5">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {t('telegramLinkInspector')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'fa' ? 'استخراج فایل از لینک مستقیم وب یا پست تلگرام و ارسال به فضای ابری' : 'Download file from direct web URL or Telegram link to cloud storage'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
          
          {/* Link Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{lang === 'fa' ? 'ورود لینک مستقیم فایل یا پست تلگرام:' : 'Direct Download URL or Telegram Link:'}</span>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
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
                className="w-full h-12 ps-3.5 pe-26 bg-slate-50 dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] focus:border-blue-500 dark:focus:border-sky-400 focus:bg-white dark:focus:bg-[#1C212E] rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all dir-ltr text-start"
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
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleInspectLink()}
                  disabled={isLoading || !linkInput.trim()}
                  className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
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
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Extracted Media Preview Box */}
          {extractedMedia && (
            <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] space-y-4 animate-in fade-in zoom-in-98 duration-200">
              
              {/* Media Title & Source Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs shrink-0">
                    {getMediaIcon(extractedMedia.category)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {extractedMedia.filename}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                      <span dir="ltr" className="font-mono dir-ltr inline-block">{formatFileSize(extractedMedia.size)}</span>
                      {extractedMedia.duration && (
                        <>
                          <span>·</span>
                          <span>{formatDuration(extractedMedia.duration)}</span>
                        </>
                      )}
                      {extractedMedia.chatTitle && (
                        <>
                          <span>·</span>
                          <span className="text-blue-600 dark:text-sky-400 truncate max-w-[120px] font-sans">
                            {extractedMedia.chatTitle}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-semibold uppercase text-blue-600 dark:text-sky-400 shrink-0">
                  {extractedMedia.isDirectUrl ? (lang === 'fa' ? 'لینک مستقیم' : 'Direct Link') : extractedMedia.category}
                </span>
              </div>

              {/* Visual Media Viewer Card */}
              {extractedMedia.category === 'images' ? (
                <div
                  onClick={handlePlayOrView}
                  className="relative group rounded-xl overflow-hidden bg-slate-950 aspect-video max-h-64 flex items-center justify-center cursor-pointer border border-slate-200/60 dark:border-white/[0.08]"
                >
                  <img
                    src={extractedMedia.directUrl}
                    alt={extractedMedia.filename}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-[#11141C]/90 text-slate-900 dark:text-slate-100 font-semibold text-xs shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                      {lang === 'fa' ? 'مشاهده کامل تصویر' : 'View Full Image'}
                    </span>
                  </div>
                </div>
              ) : extractedMedia.category === 'videos' ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-64 flex items-center justify-center border border-slate-200/60 dark:border-white/[0.08]">
                  <video
                    src={extractedMedia.directUrl}
                    controls
                    poster={extractedMedia.thumbnailUrl || undefined}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : extractedMedia.category === 'audio' ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Music className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {extractedMedia.filename}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                        {formatDuration(extractedMedia.duration || 0)} · {formatFileSize(extractedMedia.size)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePlayOrView}
                    className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center justify-center active:scale-90 transition cursor-pointer shrink-0"
                    title={t('play')}
                  >
                    <Play className="w-4.5 h-4.5 fill-current" />
                  </button>
                </div>
              ) : null}

              {/* Caption Section */}
              {extractedMedia.caption && (
                <div className="p-3 rounded-xl bg-white dark:bg-[#11141C] border border-slate-200/70 dark:border-white/[0.07] relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                      {lang === 'fa' ? 'توضیحات پست (Caption)' : 'Caption'}
                    </span>
                    <button
                      onClick={() => handleCopyText(extractedMedia.caption, 'caption')}
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
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
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto font-sans">
                    {extractedMedia.caption}
                  </p>
                </div>
              )}

              {/* REAL-TIME PROGRESS & SPEED TRACKER CARD */}
              {isSavingToSaved && remoteTask && (
                <div className="p-4 rounded-xl bg-[#0F172A] dark:bg-[#11141C] text-white border border-blue-500/30 shadow-lg space-y-3 animate-in fade-in zoom-in-98 duration-150">
                  
                  {/* Phase & Live Speed Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Activity className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-100 truncate">
                        {remoteTask.phase === 'downloading'
                          ? (lang === 'fa' ? 'فاز ۱ از ۲: دریافت فایل از سرور مقصد...' : 'Phase 1/2: Downloading from source...')
                          : (lang === 'fa' ? `فاز ۲ از ۲: ارسال سریع به «${targetDisplayTitle}»...` : `Phase 2/2: Streaming to "${targetDisplayTitle}"...`)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono tabular-nums text-[11px] font-semibold">
                        <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                        <span>{remoteTask.speed}</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCancelRemoteTransfer}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/30 text-rose-200 font-semibold text-[11px] active:scale-95 transition cursor-pointer"
                        title={lang === 'fa' ? 'لغو انتقال آنلاین' : 'Cancel transfer'}
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-300" />
                        <span>{lang === 'fa' ? 'لغو' : 'Cancel'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(3, remoteTask.progress)}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-300"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300">
                      <span dir="ltr" className="font-mono dir-ltr inline-block">
                        {formatFileSize(remoteTask.loadedSize)} / {formatFileSize(remoteTask.totalSize || remoteTask.loadedSize)}
                      </span>
                      <span className="font-bold text-white text-xs">{remoteTask.progress}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Direct Transfer Button */}
              {!isSavingToSaved && (
                <div className="pt-1">
                  <button
                    onClick={handleSaveToSavedMessages}
                    className="w-full min-h-[44px] py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-4.5 h-4.5 text-emerald-300 stroke-[3]" />
                        <span className="text-emerald-100">
                          {lang === 'fa'
                            ? `فایل با موفقیت در «${targetDisplayTitle}» ذخیره شد!`
                            : `File successfully sent to "${targetDisplayTitle}"!`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4.5 h-4.5 stroke-[2.2]" />
                        <span>
                          {lang === 'fa'
                            ? `ارسال مستقیم محتوا به «${targetDisplayTitle}»`
                            : `Send Content Directly to "${targetDisplayTitle}"`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Action Toolbar Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  onClick={handleDownloadFile}
                  className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-white dark:bg-[#11141C] hover:bg-slate-100 dark:hover:bg-[#1C212E] active:scale-[0.98] border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                  <span>{t('downloadMedia')}</span>
                </button>

                <button
                  onClick={() => handleCopyText(extractedMedia.downloadUrl || extractedMedia.directUrl, 'download')}
                  className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-white dark:bg-[#11141C] hover:bg-slate-100 dark:hover:bg-[#1C212E] active:scale-[0.98] border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedType === 'download' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-500">{lang === 'fa' ? 'لینک کپی شد!' : 'Link Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                      <span>{t('copyTelegramLink')}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePlayOrView}
                  className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-slate-100 dark:bg-[#232938] hover:bg-slate-200 dark:hover:bg-[#2C3444] text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
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
