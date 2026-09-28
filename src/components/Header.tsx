import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Moon,
  Sun,
  LayoutGrid,
  List,
  Globe,
  Cloud,
  Menu,
  X,
  Plus,
  ChevronRight,
  Folder,
  Layers,
  Sparkles,
  Link2,
  Star,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTelegram, useBackHandler } from '../context/TelegramContext';

export function Header({ onToggleMobileMenu }: { onToggleMobileMenu?: () => void }) {
  const { isDark, toggleTheme, lang, setLang, t } = useTheme();
  const {
    activeTab,
    setActiveTab,
    selectedCategory,
    setSelectedCategory,
    selectedExtension,
    setSelectedExtension,
    isConnected,
    isDemoMode,
    isLoading,
    user,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    refreshFiles,
    setIsLoginModalOpen,
    setIsUploadModalOpen,
    setIsTelegramLinkModalOpen,
    filteredFiles,
  } = useTelegram();



  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useBackHandler(mobileSearchOpen, () => setMobileSearchOpen(false));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 60);
    }
  }, [mobileSearchOpen]);

  const getCategoryLabel = () => {
    switch (selectedCategory) {
      case 'images': return t('images');
      case 'videos': return t('videos');
      case 'audio': return t('audio');
      case 'documents': return t('documents');
      case 'archives': return t('archives');
      case 'other': return t('other');
      default: return t('allFiles');
    }
  };

  return (
    <header className="shrink-0 sticky top-0 z-40 w-full h-12 sm:h-13 lg:h-15 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#131418]/90 backdrop-blur-xl px-2.5 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-3 transition-colors select-none">
      {/* Mobile Full-Width Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-x-0 top-0 h-12 bg-white dark:bg-[#131418] z-50 px-2.5 flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 sm:hidden animate-in fade-in duration-150">
          <div className="relative flex-1 flex items-center">
            <Search className="w-3.5 h-3.5 text-blue-500 absolute start-2.5 pointer-events-none" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full ps-8 pe-7 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-blue-500/40 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 absolute end-1.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setMobileSearchOpen(false)}
            className="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 rounded-lg active:scale-95 transition-transform shrink-0"
          >
            {t('close')}
          </button>
        </div>
      )}

      {/* Left: Mobile Menu Toggle & Desktop Context Breadcrumbs */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-1 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 md:hidden shrink-0 transition-all cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Mobile Logo */}
        <div
          onClick={() => setActiveTab('files')}
          className="flex md:hidden items-center gap-1 shrink-0 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shadow-xs overflow-hidden p-0.5">
            <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Desktop Breadcrumbs Trail */}
        <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-zinc-400 min-w-0">
          <button
            onClick={() => {
              setActiveTab('files');
              setSelectedCategory('all');
              setSelectedExtension(null);
            }}
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <div className="w-4.5 h-4.5 rounded-md overflow-hidden flex items-center justify-center shrink-0">
              <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{t('appName')}</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-600 shrink-0 rtl:rotate-180" />

          {activeTab === 'account' ? (
            <span className="font-bold text-blue-600 dark:text-sky-400 truncate">
              {t('accountDetails')}
            </span>
          ) : activeTab === 'favorites' ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-amber-600 dark:text-amber-400 truncate flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                <span>{t('favorites')}</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono tabular-nums">
                ({filteredFiles.length})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {getCategoryLabel()}
              </span>
              {selectedExtension && (
                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 font-mono text-[10px] font-bold">
                  {selectedExtension}
                </span>
              )}
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono tabular-nums">
                ({filteredFiles.length})
              </span>
            </div>
          )}
        </div>

        {/* Mobile Search Trigger Bar */}
        <div
          onClick={() => setMobileSearchOpen(true)}
          className="flex sm:hidden items-center gap-1.5 flex-1 min-w-0 py-1 px-2 rounded-lg bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/60 text-slate-500 dark:text-zinc-400 cursor-pointer active:scale-[0.99] transition-all"
        >
          <Search className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
          <span className="text-[11px] truncate font-medium">
            {searchQuery ? searchQuery : t('searchPlaceholder')}
          </span>
        </div>
      </div>

      {/* Center: Desktop Global Search Bar */}
      <div className="hidden sm:block flex-1 max-w-md lg:max-w-lg mx-2">
        <div className="relative group">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-focus-within:text-blue-500 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full ps-9 pe-14 py-1.5 bg-slate-100/90 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/60 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
          />
          <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-mono font-medium text-slate-400 dark:text-zinc-500 bg-white/80 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 rounded pointer-events-none">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls: View Switcher, Refresh, Language, Theme */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-800/90 p-0.5 rounded-lg border border-slate-200/70 dark:border-zinc-700/70 shadow-2xs">
          <button
            onClick={() => {
              setViewMode('grid');
              if (activeTab === 'account') setActiveTab('files');
            }}
            className={`p-1 rounded-md transition-all cursor-pointer min-h-[26px] min-w-[26px] flex items-center justify-center ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-400 shadow-xs font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'
            }`}
            title={t('viewGrid')}
            aria-label={t('viewGrid')}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setViewMode('list');
              if (activeTab === 'account') setActiveTab('files');
            }}
            className={`p-1 rounded-md transition-all cursor-pointer min-h-[26px] min-w-[26px] flex items-center justify-center ${
              viewMode === 'list'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-400 shadow-xs font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'
            }`}
            title={t('viewList')}
            aria-label={t('viewList')}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Refresh Files Button */}
        <button
          onClick={() => refreshFiles(true)}
          disabled={isLoading}
          className="p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          title={lang === 'fa' ? 'به‌روزرسانی لیست فایل‌ها' : 'Refresh Files'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
          className="hidden sm:flex items-center gap-1 px-2 py-1 min-h-[28px] rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
          title={t('language')}
        >
          <Globe className="w-3 h-3 text-blue-500" />
          <span className="uppercase font-mono text-[11px]">{lang === 'fa' ? 'EN' : 'فا'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={(e) => toggleTheme(e)}
          className="hidden sm:flex p-1.5 min-w-[28px] min-h-[28px] items-center justify-center rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer group/theme overflow-hidden"
          title={isDark ? t('lightMode') : t('darkMode')}
        >
          <div className="relative w-3.5 h-3.5 flex items-center justify-center">
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 theme-icon-spring theme-icon-sun animate-in zoom-in-50 spin-in-180 duration-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-200 theme-icon-spring theme-icon-moon animate-in zoom-in-50 spin-in-[-180deg] duration-500" />
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
