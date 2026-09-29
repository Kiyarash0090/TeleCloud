import React, { useState, useRef, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TelegramProvider, useTelegram, useBackHandler } from './context/TelegramContext';
import { QueueProvider, useQueue } from './context/QueueContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
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
import { ChatQuickSwitcher } from './components/ChatQuickSwitcher';
import { TelegramLinkModal } from './components/TelegramLinkModal';
import { AccountSwitcherDrawer } from './components/AccountSwitcherDrawer';
import { RotateCw, UploadCloud, LogOut } from 'lucide-react';

function TeleCloudApp() {
  const {
    activeTab,
    isWebAuthProtected,
    isWebAuthenticated,
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
    isTelegramLinkModalOpen,
    setIsTelegramLinkModalOpen,
    isAccountDrawerOpen,
    setIsAccountDrawerOpen,
    activePeer,
    activeChatTitle,
    canUploadInActiveChat,
    actionError,
    showExitToast,
    files,
    hasMoreFiles,
    isLoadingMore,
    loadMoreFiles,
    refreshFiles,
    fetchFullUser,
  } = useTelegram();

  const { addFilesToQueue } = useQueue();
  const { t, lang } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceDragging, setIsWorkspaceDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const pullStartRef = useRef<{ x: number; y: number } | null>(null);
  const isPullLockedHorizontalRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const handleMainTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const el = mainScrollRef.current;
    if (!el || el.scrollTop > 2 || isPullRefreshing || isLoading) return;
    const touch = e.touches[0];
    if (!touch) return;
    pullStartRef.current = { x: touch.clientX, y: touch.clientY };
    isPullLockedHorizontalRef.current = false;
  };

  const handleMainTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const start = pullStartRef.current;
    const el = mainScrollRef.current;
    if (!start || !el || isPullRefreshing) return;

    if (el.scrollTop > 2) {
      pullStartRef.current = null;
      setPullDistance(0);
      return;
    }

    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (!isPullLockedHorizontalRef.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isPullLockedHorizontalRef.current = true;
      pullStartRef.current = null;
      setPullDistance(0);
      return;
    }

    if (isPullLockedHorizontalRef.current) return;

    if (deltaY > 6) {
      const damped = Math.min(96, (deltaY - 6) * 0.45);
      setPullDistance(damped);
    } else {
      setPullDistance(0);
    }
  };

  const handleMainTouchEnd = async () => {
    if (!pullStartRef.current) return;
    pullStartRef.current = null;

    if (pullDistance >= 54 && !isPullRefreshing) {
      setIsPullRefreshing(true);
      setPullDistance(52);
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try {
          window.navigator.vibrate(25);
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('telecloud-pull-refresh'));
      try {
        await Promise.all([
          refreshFiles(true),
          fetchFullUser(),
        ]);
      } finally {
        setIsPullRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMoreFiles || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          loadMoreFiles();
        }
      },
      { rootMargin: '320px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreFiles, isLoading, isLoadingMore, loadMoreFiles]);

  const isSavedMessages = !activePeer || activePeer === 'me';
  const targetDisplayTitle = isSavedMessages
    ? lang === 'fa'
      ? 'سیو مسیج'
      : 'Saved Messages'
    : activeChatTitle || activePeer;

  // Register back handlers for top-level modals & mobile drawer
  useBackHandler(isMobileMenuOpen, () => setIsMobileMenuOpen(false));
  useBackHandler(Boolean(activeVideo && !isVideoPiP), () => setActiveVideo(null));
  useBackHandler(Boolean(activeImage), () => setActiveImage(null));
  useBackHandler(Boolean(activeDoc), () => setActiveDoc(null));
  useBackHandler(Boolean(shareModalFile), () => setShareModalFile(null));
  useBackHandler(isLoginModalOpen, () => setIsLoginModalOpen(false));
  useBackHandler(Boolean(isUploadModalOpen && canUploadInActiveChat), () => setIsUploadModalOpen(false));
  useBackHandler(isChatSelectorOpen, () => setIsChatSelectorOpen(false));
  useBackHandler(isTelegramLinkModalOpen, () => setIsTelegramLinkModalOpen(false));
  useBackHandler(isAccountDrawerOpen, () => setIsAccountDrawerOpen(false));

  if (isWebAuthProtected && !isWebAuthenticated) {
    return <WebAppAuthModal />;
  }

  const handleWorkspaceDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canUploadInActiveChat) return;
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
    if (!canUploadInActiveChat) return;
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
    if (!canUploadInActiveChat) return;
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

        {/* Main Workspace Area with Drag and Drop & Pull-to-Refresh Handlers */}
        <main
          ref={mainScrollRef}
          onTouchStart={handleMainTouchStart}
          onTouchMove={handleMainTouchMove}
          onTouchEnd={handleMainTouchEnd}
          onTouchCancel={handleMainTouchEnd}
          onDragEnter={handleWorkspaceDragEnter}
          onDragOver={handleWorkspaceDragOver}
          onDragLeave={handleWorkspaceDragLeave}
          onDrop={handleWorkspaceDrop}
          className={`flex-1 p-2.5 sm:p-5 md:p-7 overflow-y-auto overflow-x-hidden overscroll-y-contain relative ${
            activeAudio ? 'pb-44 md:pb-32' : 'pb-24 md:pb-14'
          }`}
        >
          {/* Standard Native-Style Pull-to-Refresh Indicator (No extra text) */}
          {(pullDistance > 0 || isPullRefreshing) && (
            <div
              className="flex items-center justify-center overflow-hidden transition-all duration-150 pointer-events-none"
              style={{ height: isPullRefreshing ? 48 : pullDistance }}
            >
              <div
                className={`w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 shadow-md flex items-center justify-center transition-transform ${
                  pullDistance >= 54 || isPullRefreshing ? 'scale-100' : 'scale-90 opacity-85'
                }`}
              >
                <RotateCw
                  className={`w-4.5 h-4.5 text-blue-600 dark:text-sky-400 ${
                    isPullRefreshing ? 'animate-spin' : ''
                  }`}
                  style={
                    !isPullRefreshing
                      ? { transform: `rotate(${Math.round(pullDistance * 4.2)}deg)` }
                      : undefined
                  }
                />
              </div>
            </div>
          )}
          {/* Full Workspace Drag & Drop Active Overlay (In any writable chat) */}
          {canUploadInActiveChat && isWorkspaceDragging && (
            <div className="absolute inset-2 z-50 bg-blue-600/10 dark:bg-blue-500/15 backdrop-blur-md border-4 border-dashed border-blue-500 dark:border-blue-400 rounded-3xl flex flex-col items-center justify-center text-center p-8 transition-all animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
              <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-4 animate-bounce">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300 mb-2">
                {lang === 'fa'
                  ? `فایل‌ها را اینجا رها کنید تا به «${targetDisplayTitle}» ارسال شوند`
                  : `Drop files to upload to "${targetDisplayTitle}"`}
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
              {/* Quick Channels & Chats Switcher Bar (Main Page & Mobile) */}
              {activeTab === 'files' && <ChatQuickSwitcher />}

              {/* Category & Format Filters */}
              <QuickFilters />

              {/* Loading Spinner */}
              {isLoading && activeTab === 'files' ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <RotateCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    {lang === 'fa'
                      ? 'در حال دریافت فایل‌ها از تلگرام...'
                      : 'Streaming files from Telegram...'}
                  </p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <FileGrid files={filteredFiles} />
                  ) : (
                    <FileList files={filteredFiles} />
                  )}

                  {/* Infinite Scroll Sentinel & Channel Pagination Bar */}
                  {hasMoreFiles && activeTab === 'files' && (
                    <div
                      ref={loadMoreSentinelRef}
                      className="mt-6 mb-2 flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-white/70 dark:bg-[#18191d]/70 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-md shadow-2xs"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300">
                        {isLoadingMore ? (
                          <RotateCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                        <span>
                          {isLoadingMore
                            ? lang === 'fa'
                              ? `در حال دریافت فایل‌های بیشتر... (${files.length} فایل تا اینجا)`
                              : `Loading more files... (${files.length} loaded so far)`
                            : lang === 'fa'
                            ? `${files.length} فایل نمایش داده شده (فایل‌های قدیمی‌تر در چت موجود است)`
                            : `${files.length} files displayed (more available in chat)`}
                        </span>
                      </div>

                      <button
                        onClick={() => loadMoreFiles()}
                        disabled={isLoadingMore}
                        className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {isLoadingMore ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : null}
                        <span>{lang === 'fa' ? 'بارگذاری دسته بعدی' : 'Load Next Batch'}</span>
                      </button>
                    </div>
                  )}
                </>
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

      {isUploadModalOpen && canUploadInActiveChat && (
        <UploadModal onClose={() => setIsUploadModalOpen(false)} />
      )}

      {isChatSelectorOpen && (
        <ChatSelectorModal onClose={() => setIsChatSelectorOpen(false)} />
      )}

      {isTelegramLinkModalOpen && (
        <TelegramLinkModal onClose={() => setIsTelegramLinkModalOpen(false)} />
      )}

      <AccountSwitcherDrawer />

      {/* Action / Permission Error Floating Toast */}
      {actionError && (
        <div className="fixed bottom-24 md:bottom-10 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-rose-600/95 text-white backdrop-blur-xl border border-white/20 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-bold max-w-md text-center">
            <span>{actionError}</span>
          </div>
        </div>
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
  const { refreshFiles, activePeer, activeChatTitle, canUploadInActiveChat } = useTelegram();
  return (
    <QueueProvider
      onUploadSuccess={refreshFiles}
      activePeer={activePeer}
      activeChatTitle={activeChatTitle}
      canUpload={canUploadInActiveChat}
    >
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
