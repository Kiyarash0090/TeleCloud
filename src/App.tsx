import React, { useState, useRef } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TelegramProvider, useTelegram, useBackHandler } from './context/TelegramContext';
import { QueueProvider, useQueue } from './context/QueueContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { StorageStatsBar } from './components/StorageStatsBar';
import { QuickFilters } from './components/QuickFilters';
import { FileGrid } from './components/FileGrid';
import { FileList } from './components/FileList';
import { VideoPlayerModal } from './components/players/VideoPlayerModal';
import { AudioPlayerBar } from './components/players/AudioPlayerBar';
import { ImageViewerModal } from './components/players/ImageViewerModal';
import { DocumentViewerModal } from './components/players/DocumentViewerModal';
import { ShareModal } from './components/ShareModal';
import { TelegramLoginModal } from './components/TelegramLoginModal';
import { UploadModal } from './components/UploadModal';
import { UploadQueueWidget } from './components/UploadQueueWidget';
import { MultiSelectBar } from './components/MultiSelectBar';
import { WebAppAuthModal } from './components/WebAppAuthModal';
import { AccountPage } from './components/AccountPage';
import { ChatSelectorModal } from './components/ChatSelectorModal';
import { Cloud, Sparkles, RotateCw, UploadCloud, LogOut } from 'lucide-react';

function TeleCloudApp() {
  const {
    activeTab,
    isWebAuthProtected,
    isWebAuthenticated,
    isConnected,
    isDemoMode,
    isLoading,
    filteredFiles,
    viewMode,
    activeVideo,
    setActiveVideo,
    isVideoPiP,
    activeAudio,
    activeImage,
    setActiveImage,
    activeDoc,
    setActiveDoc,
    shareModalFile,
    setShareModalFile,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isChatSelectorOpen,
    setIsChatSelectorOpen,
    activePeer,
    connectDemoMode,
    showExitToast,
  } = useTelegram();

  const { addFilesToQueue } = useQueue();
  const { t, lang } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceDragging, setIsWorkspaceDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const isSavedMessages = !activePeer || activePeer === 'me';

  // Register back handlers for top-level modals & mobile drawer
  useBackHandler(isMobileMenuOpen, () => setIsMobileMenuOpen(false));
  useBackHandler(Boolean(activeVideo && !isVideoPiP), () => setActiveVideo(null));
  useBackHandler(Boolean(activeImage), () => setActiveImage(null));
  useBackHandler(Boolean(activeDoc), () => setActiveDoc(null));
  useBackHandler(Boolean(shareModalFile), () => setShareModalFile(null));
  useBackHandler(isLoginModalOpen, () => setIsLoginModalOpen(false));
  useBackHandler(Boolean(isUploadModalOpen && isSavedMessages), () => setIsUploadModalOpen(false));
  useBackHandler(isChatSelectorOpen, () => setIsChatSelectorOpen(false));

  if (isWebAuthProtected && !isWebAuthenticated) {
    return <WebAppAuthModal />;
  }

  const handleWorkspaceDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSavedMessages) return;
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsWorkspaceDragging(true);
    }
  };

  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleWorkspaceDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSavedMessages) return;
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsWorkspaceDragging(false);
    }
  };

  const handleWorkspaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsWorkspaceDragging(false);
    if (!isSavedMessages) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-[#f8fafd] dark:bg-[#131314] text-slate-800 dark:text-[#e3e3e3] font-sans antialiased transition-colors duration-200 overflow-hidden">
      {/* Top Responsive Header */}
      <Header onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

      <div className="flex-1 min-h-0 w-full flex overflow-hidden">
        {/* Desktop Sidebar (hidden on mobile) */}
        <Sidebar className="hidden md:flex" />

        {/* Mobile Sidebar Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-72 max-w-[85vw] h-full bg-white dark:bg-[#141418] shadow-2xl flex flex-col animate-in slide-in-from-start duration-200">
              <Sidebar className="flex w-full h-full border-e-0" onClose={() => setIsMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Workspace Area with Drag and Drop Handlers */}
        <main
          onDragEnter={handleWorkspaceDragEnter}
          onDragOver={handleWorkspaceDragOver}
          onDragLeave={handleWorkspaceDragLeave}
          onDrop={handleWorkspaceDrop}
          className={`flex-1 p-2.5 sm:p-5 md:p-7 overflow-y-auto overflow-x-hidden relative ${
            activeAudio ? 'pb-40 md:pb-28' : 'pb-24 md:pb-14'
          }`}
        >
          {/* Full Workspace Drag & Drop Active Overlay (Only in Saved Messages) */}
          {isSavedMessages && isWorkspaceDragging && (
            <div className="absolute inset-2 z-50 bg-blue-600/10 dark:bg-blue-500/15 backdrop-blur-md border-4 border-dashed border-blue-500 dark:border-blue-400 rounded-3xl flex flex-col items-center justify-center text-center p-8 transition-all animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
              <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-4 animate-bounce">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300 mb-2">
                {lang === 'fa' ? 'فایل‌ها را اینجا رها کنید تا به سیو مسیج ارسال شوند' : 'Drop files to upload to Telegram Saved Messages'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-zinc-300 max-w-md font-medium">
                {lang === 'fa' 
                  ? 'فایل‌های شما به طور خودکار در صف آپلود بدون دیسک قرار می‌گیرند.' 
                  : 'Your files will be automatically queued for zero-disk RAM streaming to Telegram.'}
              </p>
            </div>
          )}

          {activeTab === 'account' ? (
            <AccountPage />
          ) : (
            <>
              {/* Welcome Banner if not connected to Telegram or Demo */}
              {!isConnected && !isDemoMode && (
                <div className="mb-4 sm:mb-6 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white shadow-xl shadow-blue-500/15 relative overflow-hidden">
                  <div className="relative z-10 max-w-2xl">
                    <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight mb-1.5">
                      {lang === 'fa' ? 'به تله‌کلاد خوش آمدید' : 'Welcome to TeleCloud'}
                    </h2>
                    <p className="text-xs sm:text-sm text-blue-100 leading-relaxed mb-4 sm:mb-6">
                      {t('loginSubtitle')}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-full bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <Cloud className="w-4 h-4 shrink-0" />
                        <span>{t('connectTelegram')}</span>
                      </button>

                      <button
                        onClick={connectDemoMode}
                        className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>{t('demoModeBtn')}</span>
                      </button>
                    </div>
                  </div>

                  <Cloud className=" -bottom-8 -right-8 w-44 h-44 sm:w-64 sm:h-64 text-white/10 pointer-events-none" />
                </div>
              )}

              {/* Category & Format Filters */}
              <QuickFilters />

              {/* Loading Spinner */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <RotateCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    {lang === 'fa'
                      ? 'در حال دریافت فایل‌ها از تلگرام...'
                      : 'Streaming files from Telegram...'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <FileGrid files={filteredFiles} />
              ) : (
                <FileList files={filteredFiles} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Multi-Select Floating Batch Action Bar */}
      <MultiSelectBar />

      {/* Floating Audio Player */}
      <AudioPlayerBar />

      {/* Upload Queue Progress Floating Widget */}
      <UploadQueueWidget />

      {/* Modals & Media Viewers */}
      {activeVideo && (
        <VideoPlayerModal file={activeVideo} onClose={() => setActiveVideo(null)} />
      )}

      {activeImage && (
        <ImageViewerModal file={activeImage} onClose={() => setActiveImage(null)} />
      )}

      {activeDoc && (
        <DocumentViewerModal file={activeDoc} onClose={() => setActiveDoc(null)} />
      )}

      {shareModalFile && (
        <ShareModal file={shareModalFile} onClose={() => setShareModalFile(null)} />
      )}

      {isLoginModalOpen && (
        <TelegramLoginModal onClose={() => setIsLoginModalOpen(false)} />
      )}

      {isUploadModalOpen && isSavedMessages && (
        <UploadModal onClose={() => setIsUploadModalOpen(false)} />
      )}

      {isChatSelectorOpen && (
        <ChatSelectorModal onClose={() => setIsChatSelectorOpen(false)} />
      )}

      {/* Double-Back-to-Exit Floating Toast */}
      {showExitToast && (
        <div className="fixed bottom-20 md:bottom-8 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900/95 dark:bg-zinc-900/95 text-white backdrop-blur-xl border border-white/15 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <LogOut className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              {lang === 'fa'
                ? 'برای خروج از برنامه، دوباره دکمه بازگشت را بزنید'
                : 'Press back again to exit the app'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function AppWithQueue() {
  const { refreshFiles, activePeer } = useTelegram();
  return (
    <QueueProvider onUploadSuccess={refreshFiles} activePeer={activePeer}>
      <TeleCloudApp />
    </QueueProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <TelegramProvider>
        <AppWithQueue />
      </TelegramProvider>
    </ThemeProvider>
  );
}
