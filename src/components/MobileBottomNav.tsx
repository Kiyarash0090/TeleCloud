import React, { useRef } from 'react';
import {
  Folder,
  Plus,
  User,
  Star,
  Link2,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';

export function MobileBottomNav() {
  const {
    activeTab,
    setActiveTab,
    setSelectedCategory,
    setSelectedExtension,
    setIsUploadModalOpen,
    setIsTelegramLinkModalOpen,
    isAccountDrawerOpen,
    setIsAccountDrawerOpen,
    canUploadInActiveChat,
    user,
    isConnected,
    favoriteFileIds,
  } = useTelegram();
  const { t, lang } = useTheme();

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef<boolean>(false);

  const handleAccountTouchStart = () => {
    isLongPressActiveRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(50); } catch {}
      }
      setIsAccountDrawerOpen(true);
    }, 380);
  };

  const handleAccountTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleGoFiles = () => {
    setActiveTab('files');
    setSelectedCategory('all');
    setSelectedExtension(null);
  };

  const handleGoFavorites = () => {
    setActiveTab('favorites');
    setSelectedCategory('all');
    setSelectedExtension(null);
  };

  const handleGoAccount = (e: React.MouseEvent) => {
    if (isLongPressActiveRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActiveRef.current = false;
      return;
    }
    setActiveTab('account');
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-2.5 inset-x-3 max-w-md mx-auto z-30 bg-white/90 dark:bg-[#11141C]/92 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-1.5 py-1 flex items-center justify-around shadow-[0_12px_32px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.65)] select-none"
    >
      {/* 1. All Files */}
      <button
        onClick={handleGoFiles}
        className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer min-h-[44px] ${
          activeTab === 'files'
            ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/80 dark:bg-sky-500/12'
            : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Folder className={`w-4.5 h-4.5 ${activeTab === 'files' ? 'fill-blue-500/15' : ''}`} />
        <span className="text-[10px] mt-0.5 truncate">{t('allFiles')}</span>
      </button>

      {/* 2. Favorites */}
      <button
        onClick={handleGoFavorites}
        className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer min-h-[44px] ${
          activeTab === 'favorites'
            ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50/80 dark:bg-amber-500/12'
            : 'text-slate-500 dark:text-slate-400 font-medium hover:text-amber-500 dark:hover:text-amber-400'
        }`}
      >
        <div className="relative">
          <Star className={`w-4.5 h-4.5 ${activeTab === 'favorites' ? 'fill-amber-500 text-amber-500' : ''}`} />
          {favoriteFileIds.length > 0 && (
            <span className="absolute -top-1 -end-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-slate-950 font-mono text-[9px] font-bold flex items-center justify-center tabular-nums">
              {favoriteFileIds.length > 99 ? '99+' : favoriteFileIds.length}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 truncate">{t('favorites')}</span>
      </button>

      {/* 3. Primary Upload Action */}
      {canUploadInActiveChat && (
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            aria-label={t('upload')}
            className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center justify-center active:scale-90 transition-transform cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[2.25]" />
          </button>
        </div>
      )}

      {/* 4. Telegram Link Inspector */}
      <button
        onClick={() => setIsTelegramLinkModalOpen(true)}
        className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 font-medium transition-all duration-150 active:scale-95 cursor-pointer min-h-[44px]"
      >
        <Link2 className="w-4.5 h-4.5 text-blue-600 dark:text-sky-400" />
        <span className="text-[10px] mt-0.5 truncate">
          {lang === 'fa' ? 'لینک به فایل' : 'Link'}
        </span>
      </button>

      {/* 5. Account */}
      <button
        onClick={handleGoAccount}
        onTouchStart={handleAccountTouchStart}
        onTouchEnd={handleAccountTouchEnd}
        onTouchCancel={handleAccountTouchEnd}
        onMouseDown={handleAccountTouchStart}
        onMouseUp={handleAccountTouchEnd}
        onMouseLeave={handleAccountTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsAccountDrawerOpen(true);
        }}
        className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer min-h-[44px] ${
          isAccountDrawerOpen || activeTab === 'account'
            ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/80 dark:bg-sky-500/12'
            : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <div className="relative">
          {isConnected && user ? (
            <div
              className={`w-5 h-5 rounded-full overflow-hidden bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] transition-transform duration-150 ${
                isAccountDrawerOpen ? 'ring-2 ring-sky-400 scale-105' : ''
              }`}
            >
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <span>{user.firstName?.[0] || 'U'}</span>
              )}
            </div>
          ) : (
            <User className={`w-4.5 h-4.5 ${activeTab === 'account' || isAccountDrawerOpen ? 'fill-blue-500/15' : ''}`} />
          )}

          {user?.isPremium && (
            <div className="absolute -top-1 -end-1 w-2.5 h-2.5 bg-amber-400 rounded-full flex items-center justify-center">
              <Star className="w-1.5 h-1.5 text-slate-900 fill-current" />
            </div>
          )}
        </div>
        <span className="text-[10px] mt-0.5 truncate">{t('account')}</span>
      </button>
    </nav>
  );
}
