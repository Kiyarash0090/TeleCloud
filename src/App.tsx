import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { FolderModal } from './components/FolderModal';
import { AddToFolderModal } from './components/AddToFolderModal';
import { getFolderColor, getFolderIcon } from './utils/folderHelpers';
import {
  RotateCw,
  UploadCloud,
  LogOut,
  Loader2,
  Edit3,
  X,
} from 'lucide-react';

function TeleCloudApp() {
  const {
    activeTab,
    isWebAuthProtected,
    isWebAuthenticated,
    isWebAuthLoading,
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
    filteredChats,
    switchToNextChat,
    chatSlideDirection,
    chatTransitionId,
    isSelectionMode,
    activeFolder,
    setActiveFolderId,
    setFolderToEdit,
    setIsFolderModalOpen,
  } = useTelegram();

  const { addFilesToQueue } = useQueue();
  const { t, lang } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceDragging, setIsWorkspaceDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeGestureTypeRef = useRef<'pull' | 'horizontal' | null>(null);
  const horizontalSwipeDeltaRef = useRef<number>(0);
  const canHorizontalSwipeRef = useRef<boolean>(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [isSwipeSnapping, setIsSwipeSnapping] = useState(false);
  const tabViewportRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const ghostHostRef = useRef<HTMLDivElement>(null);
  const ghostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingStartOffsetRef = useRef<number>(0);

  useEffect(() => {
    const handleBeforeChatSwitch = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{ direction: 'left' | 'right'; startOffsetX?: number }>
      ).detail;
      if (!detail) return;
      const startOffset = detail.startOffsetX || 0;
      incomingStartOffsetRef.current = startOffset;

      const contentEl = tabContentRef.current;
      const ghostHost = ghostHostRef.current;
      if (!contentEl || !ghostHost) return;

      if (ghostTimerRef.current) {
        clearTimeout(ghostTimerRef.current);
        ghostTimerRef.current = null;
      }

      const clone = contentEl.cloneNode(true) as HTMLElement;
      clone.style.transform = `translate3d(${startOffset}px, 0, 0)`;
      clone.style.transition = 'none';
      clone.style.willChange = 'transform, opacity';

      ghostHost.innerHTML = '';
      ghostHost.appendChild(clone);

      const targetX = detail.direction === 'left' ? '-100%' : '100%';
      const startOpacity = Math.max(0.7, 1 - Math.abs(startOffset) / 480);

      clone.animate(
        [
          { transform: `translate3d(${startOffset}px, 0, 0)`, opacity: startOpacity },
          { transform: `translate3d(${targetX}, 0, 0)`, opacity: 0.35 },
        ],
        {
          duration: 240,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );

      ghostTimerRef.current = setTimeout(() => {
        if (ghostHostRef.current) {
          ghostHostRef.current.innerHTML = '';
        }
        ghostTimerRef.current = null;
      }, 250);
    };

    window.addEventListener('telecloud-before-chat-switch', handleBeforeChatSwitch);
    return () => {
      window.removeEventListener('telecloud-before-chat-switch', handleBeforeChatSwitch);
      if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (chatTransitionId === 0) return;
    const contentEl = tabContentRef.current;
    if (!contentEl || !chatSlideDirection) return;

    const startOffset = incomingStartOffsetRef.current;
    incomingStartOffsetRef.current = 0;

    contentEl.getAnimations().forEach((a) => a.cancel());

    const fromX =
      chatSlideDirection === 'left'
        ? startOffset
          ? `calc(100% + ${startOffset}px)`
          : '100%'
        : startOffset
        ? `calc(-100% + ${startOffset}px)`
        : '-100%';

    contentEl.animate(
      [
        { transform: `translate3d(${fromX}, 0, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ],
      {
        duration: 240,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );
  }, [chatTransitionId, chatSlideDirection]);

  const handleMainTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (
      isLoginModalOpen ||
      isUploadModalOpen ||
      isChatSelectorOpen ||
      isTelegramLinkModalOpen ||
      isAccountDrawerOpen ||
      isMobileMenuOpen ||
      activeVideo ||
      activeImage ||
      activeDoc ||
      isSelectionMode ||
      isPullRefreshing
    ) {
      return;
    }

    const target = e.target as HTMLElement | null;
    const isExcludedFromHorizontal = Boolean(
      activeFolder ||
      target?.closest(
        'header, [data-header], [data-chat-switcher], [data-quick-filters], [data-no-swipe], button, input, select, textarea, .overflow-x-auto, [role="tablist"], [role="tab"]'
      )
    );
    canHorizontalSwipeRef.current = !isExcludedFromHorizontal;

    const touch = e.touches[0];
    if (!touch) return;
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    setIsSwipeSnapping(false);
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    swipeGestureTypeRef.current = null;
    horizontalSwipeDeltaRef.current = 0;
  };

  const handleMainTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    const el = mainScrollRef.current;
    if (!start || !el || isPullRefreshing) return;

    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (!swipeGestureTypeRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        if (el.scrollTop <= 2 && deltaY > 0 && !isLoading) {
          swipeGestureTypeRef.current = 'pull';
        } else {
          touchStartRef.current = null;
          return;
        }
      } else if (
        canHorizontalSwipeRef.current &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.2 &&
        Math.abs(deltaX) > 10 &&
        activeTab === 'files' &&
        !activeFolder &&
        filteredChats.length > 1
      ) {
        swipeGestureTypeRef.current = 'horizontal';
        setIsSwipeSnapping(false);
      }
    }

    if (swipeGestureTypeRef.current === 'pull') {
      if (el.scrollTop > 2) {
        touchStartRef.current = null;
        swipeGestureTypeRef.current = null;
        setPullDistance(0);
        return;
      }
      if (deltaY > 6) {
        const damped = Math.min(96, (deltaY - 6) * 0.45);
        setPullDistance(damped);
      } else {
        setPullDistance(0);
      }
    } else if (swipeGestureTypeRef.current === 'horizontal') {
      horizontalSwipeDeltaRef.current = deltaX;
      setSwipeOffsetX(deltaX);
    }
  };

  const handleMainTouchEnd = async () => {
    const gestureType = swipeGestureTypeRef.current;
    const currentDelta = horizontalSwipeDeltaRef.current;
    const startTime = touchStartRef.current?.time || Date.now();

    touchStartRef.current = null;
    swipeGestureTypeRef.current = null;
    horizontalSwipeDeltaRef.current = 0;
    canHorizontalSwipeRef.current = true;

    if (gestureType === 'pull') {
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
    } else if (gestureType === 'horizontal') {
      const elapsed = Math.max(16, Date.now() - startTime);
      const velocity = Math.abs(currentDelta) / elapsed;
      const shouldSwitch =
        filteredChats.length > 1 &&
        !activeFolder &&
        (Math.abs(currentDelta) >= 48 || (Math.abs(currentDelta) >= 22 && velocity >= 0.35));

      if (shouldSwitch) {
        setSwipeOffsetX(0);
        setIsSwipeSnapping(false);
        switchToNextChat(currentDelta < 0 ? 'next' : 'prev', currentDelta);
      } else if (currentDelta !== 0) {
        setIsSwipeSnapping(true);
        setSwipeOffsetX(0);
        if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
        snapTimerRef.current = setTimeout(() => {
          setIsSwipeSnapping(false);
          snapTimerRef.current = null;
        }, 220);
      } else {
        setSwipeOffsetX(0);
        setIsSwipeSnapping(false);
      }
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

  // Hibernate server connection when user leaves tab/window to save server resources
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/telegram/client-idle');
        } else {
          fetch('/api/telegram/client-idle', { method: 'POST', keepalive: true }).catch(() => {});
        }
      } else if (document.visibilityState === 'visible') {
        fetch('/api/telegram/client-active', { method: 'POST' }).catch(() => {});
      }
    };

    const handlePageHide = () => {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/telegram/client-idle');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const isSavedMessages = !activePeer || activePeer === 'me';
  const targetDisplayTitle = isSavedMessages
    ? lang === 'fa'
      ? 'پیام‌های ذخیره‌شده'
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

  if (isWebAuthLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#090B10] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-[#11141C] flex items-center justify-center mb-4 p-2.5 border border-white/[0.08] shadow-2xl">
          <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
      </div>
    );
  }

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
    <div className="h-dvh flex flex-col bg-[#F4F6FA] dark:bg-[#090B10] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200 overflow-hidden">
      {/* Top Responsive Header */}
      <Header onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

      <div className="flex-1 min-h-0 w-full flex overflow-hidden">
        {/* Desktop Sidebar (hidden on mobile) */}
        <Sidebar className="hidden md:flex" />

        {/* Mobile Sidebar Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div 
              className="fixed inset-0 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-72 max-w-[85vw] h-full bg-white dark:bg-[#11141C] shadow-2xl flex flex-col animate-in slide-in-from-start duration-200">
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
          className={`flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto overflow-x-hidden overscroll-y-contain relative ${
            activeAudio ? 'pb-44 md:pb-32' : 'pb-24 md:pb-14'
          }`}
        >
          {/* Pull-to-Refresh Indicator */}
          {(pullDistance > 0 || isPullRefreshing) && (
            <div
              className="flex items-center justify-center overflow-hidden transition-all duration-150 pointer-events-none"
              style={{ height: isPullRefreshing ? 48 : pullDistance }}
            >
              <div
                className={`w-9 h-9 rounded-full bg-white dark:bg-[#171B26] border border-slate-200/90 dark:border-white/[0.08] shadow-md flex items-center justify-center transition-transform ${
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

          {/* Full Workspace Drag & Drop Active Overlay */}
          {canUploadInActiveChat && isWorkspaceDragging && (
            <div className="absolute inset-3 z-50 bg-blue-600/10 dark:bg-sky-500/10 backdrop-blur-md border-2 border-dashed border-blue-500 dark:border-sky-400 rounded-3xl flex flex-col items-center justify-center text-center p-8 transition-all animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 mb-4 animate-bounce">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-blue-700 dark:text-sky-300 mb-1.5">
                {lang === 'fa'
                  ? `فایل‌ها را اینجا رها کنید تا به «${targetDisplayTitle}» ارسال شوند`
                  : `Drop files to upload to "${targetDisplayTitle}"`}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md font-medium">
                {lang === 'fa' 
                  ? 'فایل‌های شما به طور خودکار در صف آپلود بدون دیسک قرار می‌گیرند.' 
                  : 'Your files will be automatically queued for zero-disk RAM streaming to Telegram.'}
              </p>
            </div>
          )}

          {activeTab === 'account' ? (
            <AccountPage />
          ) : (
            <div className="max-w-[1600px] mx-auto">
              {/* Active Folder Header Banner */}
              {activeFolder && (
                <div className="mb-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.075] shadow-[var(--shadow-card)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const colorConfig = getFolderColor(activeFolder.color);
                      const FolderIcon = getFolderIcon(activeFolder.icon);
                      return (
                        <div
                          className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center shrink-0 ${colorConfig.bgClass} ${colorConfig.textClass}`}
                        >
                          <FolderIcon className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {activeFolder.name}
                        </h2>
                        <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                          · {activeFolder.files.length} {lang === 'fa' ? 'فایل' : 'files'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                        {lang === 'fa' ? 'پوشه اختصاصی شما' : 'Custom user folder'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setFolderToEdit(activeFolder);
                        setIsFolderModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#F4F6FA] hover:bg-slate-200/80 dark:bg-[#171B26] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 whitespace-nowrap"
                      title={t('editFolder')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('editFolder')}</span>
                    </button>

                    <button
                      onClick={() => setActiveFolderId(null)}
                      className="p-1.5 rounded-xl bg-[#F4F6FA] hover:bg-rose-50 dark:bg-[#171B26] dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer active:scale-90"
                      title={t('exitFolder')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Channels & Chats Switcher Bar */}
              {activeTab === 'files' && !activeFolder && <ChatQuickSwitcher />}

              {/* Sliding Tab Content Viewport (Telegram-style horizontal page transition) */}
              <div ref={tabViewportRef} className="relative overflow-x-clip px-1 -mx-1">
                {/* Outgoing tab ghost during directional slide */}
                <div
                  ref={ghostHostRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 px-1 overflow-hidden z-10"
                />

                {/* Active tab content with live finger-follow drag */}
                <div
                  ref={tabContentRef}
                  style={
                    swipeOffsetX !== 0 || isSwipeSnapping
                      ? {
                          transform: `translate3d(${swipeOffsetX}px, 0, 0)`,
                          opacity: Math.max(0.72, 1 - Math.abs(swipeOffsetX) / 480),
                          transition: isSwipeSnapping
                            ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease'
                            : 'none',
                          willChange: 'transform, opacity',
                        }
                      : undefined
                  }
                >
                  {/* Category & Format Filters */}
                  <QuickFilters />

                  {/* Background refresh progress bar */}
                  {isLoading && files.length > 0 && !isPullRefreshing && activeTab === 'files' && (
                    <div className="w-full h-0.5 bg-blue-500/10 dark:bg-sky-400/10 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-blue-600 dark:bg-sky-400 rounded-full animate-pulse w-full" />
                    </div>
                  )}

                  {/* Cold Load Skeleton Placeholders */}
                  {isLoading && files.length === 0 && !isPullRefreshing && activeTab === 'files' ? (
                    viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/75 dark:border-white/[0.06] overflow-hidden animate-pulse"
                          >
                            <div className="aspect-16/10 w-full bg-[#ECEFF5] dark:bg-[#171B26]" />
                            <div className="p-3 space-y-2">
                              <div className="h-3.5 w-3/4 rounded-md bg-[#ECEFF5] dark:bg-[#171B26]" />
                              <div className="h-2.5 w-1/2 rounded-md bg-[#ECEFF5] dark:bg-[#171B26]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-[#11141C] rounded-2xl border border-slate-200/75 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.05] overflow-hidden animate-pulse">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 p-3.5">
                            <div className="w-9.5 h-9.5 rounded-xl bg-[#ECEFF5] dark:bg-[#171B26] shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3.5 w-48 max-w-full rounded bg-[#ECEFF5] dark:bg-[#171B26]" />
                              <div className="h-2.5 w-28 rounded bg-[#ECEFF5] dark:bg-[#171B26]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <>
                      <div key={activePeer}>
                        {viewMode === 'grid' ? (
                          <FileGrid files={filteredFiles} />
                        ) : (
                          <FileList files={filteredFiles} />
                        )}
                      </div>

                      {/* Infinite Scroll Sentinel & Channel Pagination Bar */}
                      {hasMoreFiles && activeTab === 'files' && (
                        <div
                          ref={loadMoreSentinelRef}
                          className="mt-6 mb-2 flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.075] shadow-[var(--shadow-card)]"
                        >
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                            {isLoadingMore && (
                              <RotateCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                            )}
                            <span>
                              {isLoadingMore
                                ? lang === 'fa'
                                  ? `در حال دریافت فایل‌های بیشتر... (${files.length} فایل تا اینجا)`
                                  : `Loading more files... (${files.length} loaded)`
                                : lang === 'fa'
                                ? `${files.length} فایل نمایش داده شده (فایل‌های قدیمی‌تر موجود است)`
                                : `${files.length} files displayed (more available)`}
                            </span>
                          </div>

                          <button
                            onClick={() => loadMoreFiles()}
                            disabled={isLoadingMore}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap"
                          >
                            {isLoadingMore && (
                              <RotateCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                            )}
                            <span>{lang === 'fa' ? 'بارگذاری دسته بعدی' : 'Load Next Batch'}</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
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

      <FolderModal />
      <AddToFolderModal />

      <AccountSwitcherDrawer />
      <PWAInstallBanner />

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
