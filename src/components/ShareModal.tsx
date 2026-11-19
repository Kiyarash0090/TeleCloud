import React, { useState } from 'react';
import {
  X,
  Link2,
  Copy,
  Check,
  Send,
  ExternalLink,
  Download,
  Share2,
  QrCode,
} from 'lucide-react';
import { TelegramFile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useBackHandler } from '../context/TelegramContext';
import { formatFileSize } from '../utils/formatters';

interface ShareModalProps {
  file: TelegramFile;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ file, onClose }) => {
  const { t, lang } = useTheme();
  const [copiedStream, setCopiedStream] = useState(false);
  const [copiedDownload, setCopiedDownload] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useBackHandler(showQr, () => setShowQr(false));

  const origin = window.location.origin;
  const streamUrl = file.directUrl.startsWith('http')
    ? file.directUrl
    : `${origin}${file.directUrl}`;
  const downloadUrl = file.downloadUrl
    ? file.downloadUrl.startsWith('http')
      ? file.downloadUrl
      : `${origin}${file.downloadUrl}`
    : streamUrl;

  const copyToClipboard = async (text: string, type: 'stream' | 'download') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'stream') {
        setCopiedStream(true);
        setTimeout(() => setCopiedStream(false), 2000);
      } else {
        setCopiedDownload(true);
        setTimeout(() => setCopiedDownload(false), 2000);
      }
    } catch {
      // ignore clipboard error
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.filename,
          text: `${file.filename} (${formatFileSize(file.size)})`,
          url: downloadUrl,
        });
      } catch {
        // user cancelled
      }
    }
  };

  const telegramShareHref = `https://t.me/share/url?url=${encodeURIComponent(
    downloadUrl
  )}&text=${encodeURIComponent(file.filename)}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
    downloadUrl
  )}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#11141C] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200/80 dark:border-white/[0.08] shadow-2xl shadow-slate-900/20 dark:shadow-black/70 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90dvh] flex flex-col"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                {t('shareFile')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                {formatFileSize(file.size)} · {file.mimeType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center active:scale-90 transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
          {/* File Info Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#171B26] border border-slate-200/70 dark:border-white/[0.07] flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                dir="auto"
              >
                {file.filename}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'fa'
                  ? 'لینک مستقیم استریم و دانلود بدون اشغال دیسک سرور'
                  : 'Direct zero-disk stream & download link'}
              </p>
            </div>
            <button
              onClick={() => setShowQr((prev) => !prev)}
              className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition active:scale-95 shrink-0 cursor-pointer ${
                showQr
                  ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-sky-500/30 text-blue-600 dark:text-sky-400'
                  : 'bg-white dark:bg-[#11141C] border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300'
              }`}
              title={t('downloadQR')}
            >
              <QrCode className="w-4 h-4" />
              <span className="text-[10px] font-bold">QR</span>
            </button>
          </div>

          {/* Optional QR Code View */}
          {showQr && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] flex flex-col items-center text-center animate-in fade-in duration-150">
              <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 mb-2">
                <img
                  src={qrCodeUrl}
                  alt="Download QR Code"
                  className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                />
              </div>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                {t('downloadQR')}
              </p>
            </div>
          )}

          {/* Direct Download Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{t('copyDirectLink')}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                dir="ltr"
                value={downloadUrl}
                className="flex-1 min-w-0 h-10 px-3 text-xs font-mono rounded-xl bg-slate-100/90 dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(downloadUrl, 'download')}
                className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer ${
                  copiedDownload
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {copiedDownload ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'fa' ? 'کپی شد' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('copyLink')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Stream Link (for Media) */}
          {(file.category === 'videos' ||
            file.category === 'audio' ||
            file.category === 'images') && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                <span>
                  {lang === 'fa'
                    ? 'لینک پخش آنلاین (VLC / MX Player / مرورگر)'
                    : 'Direct Stream URL (VLC / MX Player / Browser)'}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  value={streamUrl}
                  className="flex-1 min-w-0 h-10 px-3 text-xs font-mono rounded-xl bg-slate-100/90 dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(streamUrl, 'stream')}
                  className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer ${
                    copiedStream
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 dark:bg-[#232938] hover:bg-slate-700 dark:hover:bg-[#2C3444] text-white'
                  }`}
                >
                  {copiedStream ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'fa' ? 'کپی شد' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('copyLink')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Share Actions */}
          <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="flex-1 min-h-[42px] py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#171B26] hover:bg-slate-200/80 dark:hover:bg-[#232938] text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap transition-colors active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                <span>{lang === 'fa' ? 'اشتراک‌گذاری با سایر برنامه‌ها' : 'Share via Apps'}</span>
              </button>
            )}
            <a
              href={telegramShareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[42px] py-2.5 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec4] text-white font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap shadow-sm transition-all active:scale-95"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>{lang === 'fa' ? 'ارسال در تلگرام' : 'Share on Telegram'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
