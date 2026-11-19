import React, { useRef, useEffect } from 'react';
import {
  Search,
  Moon,
  Sun,
  LayoutGrid,
  List,
  Globe,
  Menu,
  X,
  Plus,
  ChevronRight,
  Star,
  Lock,
  Download,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTelegram } from '../context/TelegramContext';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function Header({ onToggleMobileMenu }: { onToggleMobileMenu?: () => void }) {
  const { isDark, toggleTheme, lang, setLang, t } = useTheme();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const {
    activeTab,
    setActiveTab,
    selectedCategory,
    setSelectedCategory,
    selectedExtension,
    setSelectedExtension,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    setIsUploadModalOpen,
    canUploadInActiveChat,
    webLogout,
    filteredFiles,
    activeFolder,
    setActiveFolderId,
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
    <header
      data-header="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="shrink-0 sticky top-0 z-40 w-full h-14 md:h-[60px] border-b border-slate-200/85 dark:border-white/[0.075] bg-white/90 dark:bg-[#11141C]/90 backdrop-blur-xl px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-2.5 sm:gap-5 transition-colors select-none"
    >
      {/* Zone 1: Mobile Menu Trigger & Desktop Brand / Breadcrumb Trail */}
      <div className="flex items-center gap-2 shrink-0 md:min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-95 md:hidden shrink-0 transition-all cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 min-w-0">
          <button
            onClick={() => {
              setActiveTab('files');
              setActiveFolderId(null);
              setSelectedCategory('all');
              setSelectedExtension(null);
            }}
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-2.5 cursor-pointer shrink-0 whitespace-nowrap rounded-lg py-1 px-1.5 -ms-1.5"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#171B26] border border-slate-200/70 dark:border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0 p-1">
              <img src="/favicon-96x96.png" alt={t('appName')} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-slate-100 text-[15px]">
              {t('appName')}
            </span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0 rtl:rotate-180" />

          {activeTab === 'account' ? (
            <span className="font-semibold text-blue-600 dark:text-sky-400 truncate whitespace-nowrap">
              {t('accountDetails')}
            </span>
          ) : activeTab === 'favorites' ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-amber-600 dark:text-amber-400 truncate flex items-center gap-1.5 whitespace-nowrap">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                <span>{t('favorites')}</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums whitespace-nowrap">
                · {filteredFiles.length}
              </span>
            </div>
          ) : activeFolder ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate whitespace-nowrap max-w-[160px]">
                {activeFolder.name}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums whitespace-nowrap">
                · {filteredFiles.length}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate whitespace-nowrap">
                {getCategoryLabel()}
              </span>
              {selectedExtension && (
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-sky-400 whitespace-nowrap">
                  / {selectedExtension}
                </span>
              )}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums whitespace-nowrap">
                · {filteredFiles.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Zone 2: Center Search Input */}
      <div className="flex-1 max-w-xl min-w-0">
        <div className="relative group flex items-center">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-sky-400 absolute start-3.5 pointer-events-none transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-10 ps-10 pe-9 md:pe-16 bg-[#ECEFF5]/80 dark:bg-[#171B26] border border-slate-200/75 dark:border-white/[0.075] hover:border-slate-300/80 dark:hover:border-white/[0.14] focus:border-blue-500 dark:focus:border-sky-400 focus:bg-white dark:focus:bg-[#11141C] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 dark:focus:ring-sky-400/15 transition-all"
          />
          <div className="absolute end-2.5 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] rounded-md pointer-events-none">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Zone 3: Primary Action & Compact Workspace Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {canUploadInActiveChat && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-600/20 active:scale-[0.98] transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
            title={t('upload')}
          >
            <Plus className="w-4 h-4 stroke-[2.25]" />
            <span className="hidden lg:inline">{t('upload')}</span>
          </button>
        )}

        {/* Segmented View Mode Switcher */}
        <div className="h-10 flex items-center bg-[#ECEFF5]/90 dark:bg-[#171B26] p-1 rounded-xl border border-slate-200/75 dark:border-white/[0.07]">
          <button
            onClick={() => {
              setViewMode('grid');
              if (activeTab === 'account') setActiveTab('files');
            }}
            className={`w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-[#232938] text-blue-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
            className={`w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center ${
              viewMode === 'list'
                ? 'bg-white dark:bg-[#232938] text-blue-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title={t('viewList')}
            aria-label={t('viewList')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Utility Group */}
        <div className="hidden sm:flex items-center gap-1 ps-1 border-s border-slate-200/80 dark:border-white/[0.08]">
          <button
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            className="inline-flex items-center gap-1.5 px-2.5 h-10 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
            title={t('language')}
          >
            <Globe className="w-4 h-4 text-slate-400 dark:text-slate-400" />
            <span className="uppercase font-mono text-[11px]">{lang === 'fa' ? 'EN' : 'فا'}</span>
          </button>

          <button
            onClick={(e) => toggleTheme(e)}
            className="flex w-10 h-10 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-90 transition-all duration-150 cursor-pointer overflow-hidden"
            title={isDark ? t('lightMode') : t('darkMode')}
            aria-label={isDark ? t('lightMode') : t('darkMode')}
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 theme-icon-spring theme-icon-sun" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 theme-icon-spring theme-icon-moon" />
              )}
            </div>
          </button>
        </div>

        {/* PWA Install Button */}
        {!isInstalled && (isInstallable || isIOS) && (
          <button
            onClick={() => {
              if (isIOS) {
                window.dispatchEvent(new CustomEvent('telecloud-show-ios-guide'));
              } else {
                install();
              }
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 h-10 rounded-xl bg-blue-50 dark:bg-sky-500/10 text-blue-600 dark:text-sky-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-sky-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            title={lang === 'fa' ? 'نصب اپلیکیشن مستقل' : 'Install App'}
          >
            <Download className="w-4 h-4" />
            <span className="hidden xl:inline">{lang === 'fa' ? 'نصب برنامه' : 'Install'}</span>
          </button>
        )}

        {/* Lock / Master Logout */}
        <button
          onClick={webLogout}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
          title={lang === 'fa' ? 'قفل برنامه و خروج' : 'Lock Application'}
          aria-label="Lock App"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
