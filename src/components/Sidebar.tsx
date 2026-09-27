import React from 'react';
import {
  Folder,
  Image,
  Video,
  Music,
  FileText,
  Archive,
  File,
  Plus,
  HardDrive,
  X,
  Cloud,
  Globe,
  Sun,
  Moon,

  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  LogOut,
  UploadCloud,
} from 'lucide-react';
import { FileCategory } from '../types';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../utils/formatters';

export function Sidebar({ onClose, className }: { onClose?: () => void; className?: string }) {
  const {
    activeTab,
    setActiveTab,
    selectedCategory,
    setSelectedCategory,
    setSelectedExtension,
    stats,
    setIsUploadModalOpen,
    user,
    isConnected,
    isDemoMode,
    disconnectTelegram,
  } = useTelegram();
  const { t, lang, setLang, isDark, toggleTheme } = useTheme();

  const categories: { id: FileCategory; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'all', label: t('allFiles'), icon: Folder, count: stats?.totalFiles },
    { id: 'images', label: t('images'), icon: Image, count: stats?.categories.images.count },
    { id: 'videos', label: t('videos'), icon: Video, count: stats?.categories.videos.count },
    { id: 'audio', label: t('audio'), icon: Music, count: stats?.categories.audio.count },
    { id: 'documents', label: t('documents'), icon: FileText, count: stats?.categories.documents.count },
    { id: 'archives', label: t('archives'), icon: Archive, count: stats?.categories.archives.count },
    { id: 'other', label: t('other'), icon: File, count: stats?.categories.other.count },
  ];

  const handleSelectCategory = (id: FileCategory) => {
    setActiveTab('files');
    setSelectedCategory(id);
    setSelectedExtension(null);
    onClose?.();
  };

  const handleSelectAccount = () => {
    setActiveTab('account');
    onClose?.();
  };

  const userName = user?.firstName || (isDemoMode ? (lang === 'fa' ? 'اکانت دمو' : 'Demo Account') : (lang === 'fa' ? 'کاربر مهمان' : 'Guest'));
  const userPhoto = user?.photoUrl || (isConnected ? '/api/telegram/profile-photo' : null);

  return (
    <aside
      className={`relative w-64 lg:w-72 h-full bg-white dark:bg-[#131418] border-e border-slate-200/80 dark:border-zinc-800/80 p-4 lg:p-5 flex-col justify-between shrink-0 select-none ${className || ''}`}
    >
      {/* Top Header & Navigation */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {/* Brand & Mobile Close */}
        <div className="flex items-center justify-between md:justify-center pb-4 mb-4 border-b border-slate-100 dark:border-zinc-800/80 md:hidden">
          <div
            onClick={() => {
              setActiveTab('files');
              setSelectedCategory('all');
              setSelectedExtension(null);
              onClose?.();
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden p-1.5">
              <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="md:hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm lg:text-base text-slate-900 dark:text-white tracking-tight leading-tight">
                  {t('appName')}
                </span>
                {isConnected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Connected & Synced" />
                )}
              </div>
              <span className="text-[11px] text-blue-600 dark:text-sky-400 font-medium">
                Telegram Saved Messages
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 md:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Desktop Upload Action */}
        <button
          onClick={() => {
            setIsUploadModalOpen(true);
            onClose?.();
          }}
          className="w-full mb-5 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
        >
          <UploadCloud className="w-5 h-5 stroke-[2.2]" />
          <span>{t('upload')}</span>
        </button>

        {/* Section Label */}
        <div className="px-2 mb-2 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
          {lang === 'fa' ? 'دسته‌بندی فایل‌ها' : 'Storage Categories'}
        </div>

        {/* Navigation Categories */}
        <nav className="space-y-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === 'files' && selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-[0.99] ${
                  isActive
                    ? 'bg-blue-600/10 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-sky-400' : 'opacity-70'}`} />
                  <span className="truncate">{cat.label}</span>
                </div>
                {cat.count !== undefined && cat.count > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-lg font-mono tabular-nums font-bold ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-700 dark:text-sky-300'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>


      </div>

      {/* Bottom Area: Storage Metrics & User Card */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-3">
        {/* Mobile Language & Theme Switcher in drawer */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>{lang === 'fa' ? 'English' : 'فارسی'}</span>
          </button>
          <button
            onClick={(e) => toggleTheme(e)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 active:scale-95 transition-all group/sideTheme cursor-pointer overflow-hidden"
          >
            <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 theme-icon-spring theme-icon-sun animate-in zoom-in-50 spin-in-180 duration-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300 theme-icon-spring theme-icon-moon animate-in zoom-in-50 spin-in-[-180deg] duration-500" />
              )}
            </div>
            <span>{isDark ? t('lightMode') : t('darkMode')}</span>
          </button>
        </div>

        {/* Storage Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" />
              {t('storageUsed')}
            </span>
            <span className="text-xs font-black text-blue-600 dark:text-sky-400 font-mono tabular-nums">
              {formatFileSize(stats?.totalSize || 0)}
            </span>
          </div>

          <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden flex">
            <div style={{ width: '45%' }} className="h-full bg-blue-500" title="Videos" />
            <div style={{ width: '25%' }} className="h-full bg-emerald-500" title="Images" />
            <div style={{ width: '15%' }} className="h-full bg-amber-500" title="Audio" />
            <div style={{ width: '15%' }} className="h-full bg-purple-500" title="Docs" />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 font-mono">
            <span>{stats?.totalFiles || 0} {lang === 'fa' ? 'فایل ابری' : 'cloud files'}</span>
            <span className="text-emerald-500 font-semibold">{lang === 'fa' ? 'نامحدود' : 'Unlimited'}</span>
          </div>
        </div>

        {/* Telegram User Mini-Card */}
        <div
          onClick={handleSelectAccount}
          className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-blue-400/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 overflow-hidden flex items-center justify-center font-bold text-xs shrink-0">
              {userPhoto ? (
                <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                {userName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate block">
                {user?.username ? `@${user.username}` : (isConnected ? 'Telegram User' : (isDemoMode ? 'Demo Mode' : 'Guest'))}
              </span>
            </div>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0" />
        </div>
      </div>
    </aside>
  );
}
