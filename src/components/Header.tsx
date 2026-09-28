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



  const searchInputRef = useRef<HTMLInputElement>(null);

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
    <header className="shrink-0 sticky top-0 z-40 w-full h-14 md:h-16 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-[#131418]/95 backdrop-blur-xl px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2.5 sm:gap-3.5 transition-colors select-none">
      {/* Start: Mobile Menu Button & Desktop Breadcrumbs */}
      <div className="flex items-center gap-2 shrink-0 md:min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/70 text-slate-700 dark:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-zinc-700 active:scale-95 md:hidden shrink-0 transition-all cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Desktop Breadcrumbs Trail */}
        <div className="hidden md:flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-zinc-400 min-w-0">
          <button
            onClick={() => {
              setActiveTab('files');
              setSelectedCategory('all');
              setSelectedExtension(null);
            }}
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
              <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{t('appName')}</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-600 shrink-0 rtl:rotate-180" />

          {activeTab === 'account' ? (
            <span className="font-bold text-blue-600 dark:text-sky-400 truncate">
              {t('accountDetails')}
            </span>
          ) : activeTab === 'favorites' ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-amber-600 dark:text-amber-400 truncate flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                <span>{t('favorites')}</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono tabular-nums">
                ({filteredFiles.length})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {getCategoryLabel()}
              </span>
              {selectedExtension && (
                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 font-mono text-xs font-bold">
                  {selectedExtension}
                </span>
              )}
              <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono tabular-nums">
                ({filteredFiles.length})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Unified Inline Search Bar (Mobile & Desktop) */}
      <div className="flex-1 max-w-xl min-w-0">
        <div className="relative group flex items-center">
          <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-blue-500 absolute start-3 pointer-events-none transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-9 md:h-10 ps-9 pe-8 md:pe-14 bg-slate-100 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/70 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <div className="absolute end-2.5 flex items-center gap-1">
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

      {/* End Controls: View Switcher, Language, Theme */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* View Mode Switcher */}
        <div className="h-9 md:h-10 flex items-center bg-slate-100 dark:bg-zinc-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-zinc-700/70">
          <button
            onClick={() => {
              setViewMode('grid');
              if (activeTab === 'account') setActiveTab('files');
            }}
            className={`w-7 h-7 md:w-8 md:h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-400 shadow-xs font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
            title={t('viewGrid')}
            aria-label={t('viewGrid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setViewMode('list');
              if (activeTab === 'account') setActiveTab('files');
            }}
            className={`w-7 h-7 md:w-8 md:h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              viewMode === 'list'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-400 shadow-xs font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
            title={t('viewList')}
            aria-label={t('viewList')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 h-9 md:h-10 rounded-xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/70 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer"
          title={t('language')}
        >
          <Globe className="w-3.5 h-3.5 text-blue-500" />
          <span className="uppercase font-mono text-[11px]">{lang === 'fa' ? 'EN' : 'فا'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={(e) => toggleTheme(e)}
          className="hidden sm:flex w-9 h-9 md:w-10 md:h-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/70 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-700 active:scale-90 transition-all cursor-pointer group/theme overflow-hidden"
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
