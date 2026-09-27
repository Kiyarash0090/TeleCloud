import React from 'react';
import {
  Folder,
  Plus,
  User,
  Star,
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
    activePeer,
    user,
    isConnected,
    isDemoMode,
  } = useTelegram();
  const { t, lang } = useTheme();

  const handleGoFiles = () => {
    setActiveTab('files');
    setSelectedCategory('all');
    setSelectedExtension(null);
  };

  const handleGoAccount = () => {
    setActiveTab('account');
  };

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#1a1b1e]/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-zinc-800/80 px-4 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.12)] select-none">
      {/* 1. All Files / Drive Home */}
      <button
        onClick={handleGoFiles}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all active:scale-95 cursor-pointer min-h-[44px] ${
          activeTab === 'files'
            ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-sky-500/10'
            : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-700 dark:hover:text-zinc-200'
        }`}
      >
        <Folder className={`w-5 h-5 ${activeTab === 'files' ? 'fill-blue-500/20' : ''}`} />
        <span className="text-[11px] mt-1 font-semibold truncate">{t('allFiles')}</span>
      </button>

      {/* 2. Center Hero Action: Instant Upload (Only in Saved Messages) */}
      {(!activePeer || activePeer === 'me') && (
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            aria-label={t('upload')}
            className="w-13 h-13 -mt-6 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 text-white shadow-xl shadow-blue-500/40 flex items-center justify-center active:scale-90 transition-transform border-4 border-[#f8fafd] dark:border-[#131314] cursor-pointer shrink-0"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* 3. Account Information / Profile Page */}
      <button
        onClick={handleGoAccount}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all active:scale-95 cursor-pointer min-h-[44px] ${
          activeTab === 'account'
            ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-sky-500/10'
            : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-700 dark:hover:text-zinc-200'
        }`}
      >
        <div className="relative">
          {isConnected && user ? (
            <div className="w-5 h-5 rounded-md overflow-hidden bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-bold text-[10px]">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <span>{user.firstName?.[0] || 'U'}</span>
              )}
            </div>
          ) : (
            <User className={`w-5 h-5 ${activeTab === 'account' ? 'fill-blue-500/20' : ''}`} />
          )}

          {user?.isPremium && (
            <div className="absolute -top-1 -end-1 w-2.5 h-2.5 bg-amber-400 rounded-full flex items-center justify-center">
              <Star className="w-1.5 h-1.5 text-slate-900 fill-current" />
            </div>
          )}
        </div>
        <span className="text-[11px] mt-1 font-semibold truncate">{t('account')}</span>
      </button>
    </div>
  );
}

