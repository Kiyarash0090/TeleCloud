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
    activePeer,
    user,
    isConnected,
    isDemoMode,
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
    <div className="md:hidden fixed bottom-3 inset-x-3 max-w-md mx-auto z-30 bg-white/75 dark:bg-[#16171b]/75 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-3xl px-1.5 py-1.5 flex items-center justify-around shadow-[0_10px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] select-none transition-all">
      {/* 1. All Files / Drive Home */}
      <button
        onClick={handleGoFiles}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all active:scale-95 cursor-pointer min-h-[42px] ${
          activeTab === 'files'
            ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/80 dark:bg-sky-500/15'
            : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-700 dark:hover:text-zinc-200'
        }`}
      >
        <Folder className={`w-4.5 h-4.5 ${activeTab === 'files' ? 'fill-blue-500/20' : ''}`} />
        <span className="text-[10px] mt-0.5 font-semibold truncate">{t('allFiles')}</span>
      </button>

      {/* 2. Favorites / Starred */}
      <button
        onClick={handleGoFavorites}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all active:scale-95 cursor-pointer min-h-[42px] ${
          activeTab === 'favorites'
            ? 'text-amber-500 dark:text-amber-400 font-bold bg-amber-50/80 dark:bg-amber-500/15'
            : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-amber-500 dark:hover:text-amber-400'
        }`}
      >
        <div className="relative">
          <Star className={`w-4.5 h-4.5 ${activeTab === 'favorites' ? 'fill-amber-500 text-amber-500' : ''}`} />
          {favoriteFileIds.length > 0 && (
            <span className="absolute -top-1 -end-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center">
              {favoriteFileIds.length > 99 ? '99+' : favoriteFileIds.length}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-semibold truncate">{t('favorites')}</span>
      </button>

      {/* 3. Center Hero Action: Instant Upload (Only in Saved Messages) */}
      {(!activePeer || activePeer === 'me') && (
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            aria-label={t('upload')}
            className="w-11 h-11 -my-1 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 text-white shadow-lg shadow-blue-500/35 flex items-center justify-center active:scale-90 transition-transform border-2 border-white/60 dark:border-white/10 cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* 4. Telegram Link Inspector */}
      <button
        onClick={() => setIsTelegramLinkModalOpen(true)}
        className="flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-sky-400 font-medium transition-all active:scale-95 cursor-pointer min-h-[42px]"
      >
        <Link2 className="w-4.5 h-4.5 text-blue-500" />
        <span className="text-[10px] mt-0.5 font-semibold truncate">
          {lang === 'fa' ? 'لینک به فایل' : 'Link to File'}
        </span>
      </button>

      {/* 4. Account Information / Profile Page */}
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
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer min-h-[42px] ${
          isAccountDrawerOpen
            ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-500/15 scale-105'
            : activeTab === 'account'
            ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/80 dark:bg-sky-500/15'
            : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-700 dark:hover:text-zinc-200'
        }`}
      >
        <div className="relative">
          {isConnected && user ? (
            <div
              className={`w-5 h-5 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-bold text-[10px] transition-transform duration-200 ${
                isAccountDrawerOpen ? 'ring-2 ring-sky-400 scale-110' : ''
              }`}
            >
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <span>{user.firstName?.[0] || 'U'}</span>
              )}
            </div>
          ) : (
            <User className={`w-4.5 h-4.5 ${activeTab === 'account' || isAccountDrawerOpen ? 'fill-blue-500/20' : ''}`} />
          )}

          {user?.isPremium && (
            <div className="absolute -top-1 -end-1 w-2.5 h-2.5 bg-amber-400 rounded-full flex items-center justify-center">
              <Star className="w-1.5 h-1.5 text-slate-900 fill-current" />
            </div>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-semibold truncate">{t('account')}</span>
      </button>
    </div>
  );
}


