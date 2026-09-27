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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTelegram } from '../context/TelegramContext';

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
    filteredFiles,
  } = useTelegram();

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

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
    <header className="shrink-0 sticky top-0 z-40 w-full h-14 lg:h-16 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#131418]/90 backdrop-blur-xl px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-3 transition-colors select-none">
      {/* Mobile Full-Width Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-x-0 top-0 h-14 bg-white dark:bg-[#131418] z-50 px-3 flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 sm:hidden animate-in fade-in duration-150">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-blue-500 absolute start-3 pointer-events-none" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full ps-9 pe-8 py-2 bg-slate-100 dark:bg-zinc-800 border border-blue-500/40 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 absolute end-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setMobileSearchOpen(false)}
            className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 rounded-xl active:scale-95 transition-transform shrink-0"
          >
            {t('close')}
          </button>
        </div>
      )}



      {/* Left: Mobile Menu Trigger & Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ms-1 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
          title="Menu"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Cloud className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm sm:text-base bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent hidden sm:inline-block">
            TeleCloud
          </span>
        </div>
      </div>

      {/* Center: Desktop Global Search Bar */}
      <div className="hidden sm:block flex-1 max-w-lg lg:max-w-xl mx-2">
        <div className="relative group">
          <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-blue-500 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full ps-10 pe-16 py-2 bg-slate-100/90 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/60 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs"
          />
          <div className="absolute end-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 dark:text-zinc-500 bg-white/80 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 rounded-md pointer-events-none">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls: View Switcher, Upload, Refresh, Language, Theme, Account */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-800/90 p-0.5 sm:p-1 rounded-xl border border-slate-200/70 dark:border-zinc-700/70 shadow-2xs">
          <button
            onClick={() => {
              setViewMode('grid');
              if (activeTab !== 'files') setActiveTab('files');
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-400 shadow-xs font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'
            }`}
            title={t('viewGrid')}
            aria-label={t('viewGrid')}
          >
            <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => {
              setViewMode('list');
              if (activeTab !== 'files') setActiveTab('files');
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center ${
              viewMode === 'list'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-400 shadow-xs font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'
            }`}
            title={t('viewList')}
            aria-label={t('viewList')}
          >
            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Refresh Files Button */}
        <button
          onClick={refreshFiles}
          disabled={isLoading}
          className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          title="Refresh Files"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
          title={t('language')}
        >
          <Globe className="w-3.5 h-3.5 text-blue-500" />
          <span className="uppercase font-mono">{lang === 'fa' ? 'EN' : 'فا'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={(e) => toggleTheme(e)}
          className="hidden sm:flex p-2 min-w-[36px] min-h-[36px] items-center justify-center rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer group/theme overflow-hidden"
          title={isDark ? t('lightMode') : t('darkMode')}
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 theme-icon-spring theme-icon-sun animate-in zoom-in-50 spin-in-180 duration-500" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 dark:text-zinc-200 theme-icon-spring theme-icon-moon animate-in zoom-in-50 spin-in-[-180deg] duration-500" />
            )}
          </div>
        </button>


      </div>
    </header>
  );
}
