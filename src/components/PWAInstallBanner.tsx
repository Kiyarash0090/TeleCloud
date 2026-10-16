import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTheme } from '../context/ThemeContext';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { lang } = useTheme();
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('telecloud_pwa_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  React.useEffect(() => {
    const handleShowIOS = () => setShowIOSGuide(true);
    window.addEventListener('telecloud-show-ios-guide', handleShowIOS);
    return () => window.removeEventListener('telecloud-show-ios-guide', handleShowIOS);
  }, []);

  // If already installed, hide completely
  if (isInstalled) {
    return null;
  }

  // If dismissed and guide is not open, hide banner
  if (isDismissed && !showIOSGuide) {
    return null;
  }

  // Only show if browser supports install or is iOS Safari
  if (!isInstallable && !isIOS && !showIOSGuide) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('telecloud_pwa_dismissed', 'true');
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 bg-white/95 dark:bg-[#18191d]/95 backdrop-blur-xl border border-blue-500/25 dark:border-blue-400/20 shadow-2xl rounded-2xl p-3.5 transition-all animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25 mt-0.5">
            <Smartphone className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {lang === 'fa' ? 'نصب اپلیکیشن مستقل TeleCloud' : 'Install TeleCloud App'}
              </h4>
              <button
                onClick={handleDismiss}
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              {lang === 'fa'
                ? 'اجرای تمام‌صفحه بدون نوار آدرس مرورگر، سرعت بالاتر و آیکون مستقیم روی گوشی.'
                : 'Full-screen app with no browser address bar and direct launcher icon.'}
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/30 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isInstalling
                    ? (lang === 'fa' ? 'در حال آماده‌سازی...' : 'Preparing...')
                    : (lang === 'fa' ? 'نصب روی گوشی / سیستم' : 'Install App')}
                </span>
              </button>

              <button
                onClick={handleDismiss}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 text-[11px] font-medium transition cursor-pointer"
              >
                {lang === 'fa' ? 'بعداً' : 'Later'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Safari Guided Install Sheet */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#18191d] p-5 shadow-2xl border border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-500" />
                <span>{lang === 'fa' ? 'نصب روی آیفون / آیپد (iOS)' : 'Install on iPhone / iPad'}</span>
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600 dark:text-zinc-300">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  ۱
                </div>
                <p className="mt-0.5 leading-relaxed">
                  {lang === 'fa' ? (
                    <>در نوار پایین یا بالای مرورگر Safari، دکمه اشتراک‌گذاری <Share className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" /> (Share) را بزنید.</>
                  ) : (
                    <>In Safari toolbar, tap the <Share className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" /> <strong>Share</strong> button.</>
                  )}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  ۲
                </div>
                <p className="mt-0.5 leading-relaxed">
                  {lang === 'fa' ? (
                    <>کمی به پایین اسکرول کرده و گزینه <PlusSquare className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" /> <strong>Add to Home Screen</strong> (افزودن به صفحه اصلی) را انتخاب کنید.</>
                  ) : (
                    <>Scroll down and tap <PlusSquare className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" /> <strong>Add to Home Screen</strong>.</>
                  )}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <p className="mt-0.5 leading-relaxed font-medium text-emerald-600 dark:text-emerald-400">
                  {lang === 'fa'
                    ? 'برنامه به صورت مستقل و تمام‌صفحه مانند اپ بومی اجرا خواهد شد.'
                    : 'The app will launch as a standalone application without browser tabs.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition active:scale-95 cursor-pointer"
            >
              {lang === 'fa' ? 'متوجه شدم' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
