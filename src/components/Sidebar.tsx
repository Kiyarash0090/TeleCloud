import React, { useState } from 'react';
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
  Globe,
  Sun,
  Moon,
  CheckCircle2,
  ArrowRight,
  LogOut,
  UploadCloud,
  MessageSquare,
  ChevronDown,
  UserPlus,
  Loader2,
  Users,
  Link2,
  Info,
  Star,
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
    setIsLoginModalOpen,
    setIsTelegramLinkModalOpen,
    user,
    accounts,
    activeAccountId,
    isSwitchingAccount,
    switchAccount,
    removeAccount,
    isConnected,
    isDemoMode,
    activePeer,
    activeChatTitle,
    setIsChatSelectorOpen,
    favoriteFileIds,
  } = useTelegram();


  const { t, lang, setLang, isDark, toggleTheme } = useTheme();

  const [isAccountListOpen, setIsAccountListOpen] = useState(false);
  const [switchingTargetId, setSwitchingTargetId] = useState<string | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});

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

  const handleSwitchAccount = async (accountId: string) => {
    if (isSwitchingAccount) return false;
    setSwitchingTargetId(accountId);
    const ok = await switchAccount(accountId);
    setSwitchingTargetId(null);
    if (ok) {
      setIsAccountListOpen(false);
      setActiveTab('files');
      onClose?.();
    }
    return ok;
  };

  const handleRemoveAccount = async (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation();
    await removeAccount(accountId);
  };

  const handleAddAccount = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsLoginModalOpen(true);
    onClose?.();
  };

  const userName =
    user?.firstName ||
    (isDemoMode
      ? lang === 'fa'
        ? 'اکانت دمو'
        : 'Demo Account'
      : lang === 'fa'
      ? 'کاربر مهمان'
      : 'Guest');
  const userPhoto =
    user?.photoUrl ||
    (isConnected && user?.id
      ? `/api/telegram/profile-photo?uid=${encodeURIComponent(user.id)}`
      : null);

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
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                    title="Connected & Synced"
                  />
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

        {/* ================================================================= */}
        {/* Multi-Account Switcher & Add Account Section (Top of Sidebar)     */}
        {/* ================================================================= */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between px-1.5 mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>{t('accounts')}</span>
              {accounts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-sky-400 font-mono text-[10px]">
                  {accounts.length}
                </span>
              )}
            </span>

            <button
              onClick={handleAddAccount}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 px-1.5 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
              title={t('addAccount')}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addAccount')}</span>
            </button>
          </div>

          <div className="rounded-2xl bg-slate-50/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/90 overflow-hidden transition-all shadow-2xs">
            {/* Active Account Trigger Row */}
            <div
              onClick={() => {
                if (accounts.length > 0 || isConnected || isDemoMode) {
                  setIsAccountListOpen((prev) => !prev);
                } else {
                  handleAddAccount();
                }
              }}
              className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white overflow-hidden flex items-center justify-center font-bold text-xs shadow-xs">
                    {userPhoto && !failedPhotos[user?.id || 'active'] ? (
                      <img
                        src={userPhoto}
                        alt={userName}
                        onError={() =>
                          setFailedPhotos((prev) => ({ ...prev, [user?.id || 'active']: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{userName[0]?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                      isConnected
                        ? 'bg-emerald-500'
                        : isDemoMode
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                      {userName} {user?.lastName || ''}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono truncate block dir-ltr text-start">
                    {user?.username
                      ? `@${user.username}`
                      : user?.phone
                      ? user.phone
                      : isConnected
                      ? 'Telegram Connected'
                      : isDemoMode
                      ? t('demoModeActive')
                      : t('connectTelegram')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('account');
                    onClose?.();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
                  title={lang === 'fa' ? 'اطلاعات اکانت' : 'Account Info'}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                {isSwitchingAccount ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isAccountListOpen ? 'rotate-180 text-blue-500' : ''
                    }`}
                  />
                )}
              </div>
            </div>

            {/* Collapsible Multi-Account List */}
            {isAccountListOpen && (
              <div className="border-t border-slate-200/70 dark:border-zinc-800/80 p-1.5 space-y-1 bg-white/60 dark:bg-zinc-950/40 animate-in slide-in-from-top-1 duration-150">
                {accounts.map((acc) => {
                  const isCurrent =
                    isConnected &&
                    !isDemoMode &&
                    (activeAccountId === acc.id || user?.id === acc.id);
                  const isTargetSwitching = switchingTargetId === acc.id;
                  const accPhoto =
                    acc.user.photoUrl ||
                    `/api/telegram/profile-photo?uid=${encodeURIComponent(acc.id)}`;
                  const accName =
                    `${acc.user.firstName || ''} ${acc.user.lastName || ''}`.trim() ||
                    'Telegram User';

                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleSwitchAccount(acc.id)}
                      className={`group flex items-center justify-between gap-2 p-2 rounded-xl text-xs transition cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600/10 dark:bg-sky-500/15 text-blue-700 dark:text-sky-300 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-sky-400 overflow-hidden flex items-center justify-center font-bold text-[11px] shrink-0">
                          {!failedPhotos[acc.id] ? (
                            <img
                              src={accPhoto}
                              alt={accName}
                              onError={() =>
                                setFailedPhotos((prev) => ({ ...prev, [acc.id]: true }))
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{accName[0]?.toUpperCase() || 'U'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs leading-tight">{accName}</div>
                          <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate dir-ltr text-start">
                            {acc.user.username
                              ? `@${acc.user.username}`
                              : acc.user.phone || `ID: ${acc.id}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isTargetSwitching ? (
                          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                        ) : isCurrent ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : null}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCurrent) {
                              setActiveTab('account');
                              onClose?.();
                            } else {
                              handleSwitchAccount(acc.id).then((ok) => {
                                if (ok) {
                                  setActiveTab('account');
                                  onClose?.();
                                }
                              });
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition active:scale-90 cursor-pointer"
                          title={lang === 'fa' ? 'اطلاعات اکانت' : 'Account Info'}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, acc.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title={t('removeAccount')}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Another Account Button inside Dropdown */}
                <button
                  type="button"
                  onClick={handleAddAccount}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-sky-400 text-xs font-bold transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('addAccount')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat / Channel / Bot Switcher Button */}
        <button
          onClick={() => {
            setIsChatSelectorOpen(true);
            onClose?.();
          }}
          className="w-full mb-3 py-2.5 px-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs flex items-center justify-between transition-all border border-slate-200/80 dark:border-zinc-700/80 cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="truncate">
              {activeChatTitle || (lang === 'fa' ? 'پیام‌های ذخیره‌شده' : 'Saved Messages')}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {/* Primary Desktop Upload Action (Strictly in Saved Messages) */}
        {!activePeer || activePeer === 'me' ? (
          <button
            onClick={() => {
              setIsUploadModalOpen(true);
              onClose?.();
            }}
            className="w-full mb-2.5 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            <UploadCloud className="w-5 h-5 stroke-[2.2]" />
            <span>{t('upload')}</span>
          </button>
        ) : (
          <div className="w-full mb-2.5 py-2.5 px-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center gap-2">
            <span>
              {lang === 'fa' ? 'حالت فقط خواندنی (بدون آپلود)' : 'Read-Only Mode (No Upload)'}
            </span>
          </div>
        )}

        {/* Telegram Link Inspector Quick Trigger */}
        <button
          onClick={() => {
            setIsTelegramLinkModalOpen(true);
            onClose?.();
          }}
          className="w-full mb-2 py-2.5 px-3.5 rounded-2xl bg-blue-50/80 dark:bg-sky-950/30 hover:bg-blue-100 dark:hover:bg-sky-900/40 text-blue-600 dark:text-sky-400 font-bold text-xs border border-blue-200/70 dark:border-sky-800/50 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
        >
          <Link2 className="w-4 h-4" />
          <span>{t('telegramLinkInspector')}</span>
        </button>




        {/* Favorites Navigation Item */}
        <button
          onClick={() => {
            setActiveTab('favorites');
            setSelectedCategory('all');
            setSelectedExtension(null);
            onClose?.();
          }}
          className={`w-full mb-3 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-[0.99] ${
            activeTab === 'favorites'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-2xs'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-amber-600 dark:hover:text-amber-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <Star
              className={`w-4 h-4 shrink-0 text-amber-500 ${
                activeTab === 'favorites' ? 'fill-amber-500' : ''
              }`}
            />
            <span className="truncate">{t('favorites')}</span>
          </div>
          {favoriteFileIds.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
              {favoriteFileIds.length}
            </span>
          )}
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
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-600 dark:text-sky-400' : 'opacity-70'
                    }`}
                  />
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
            <span>
              {stats?.totalFiles || 0} {lang === 'fa' ? 'فایل ابری' : 'cloud files'}
            </span>
            <span className="text-emerald-500 font-semibold">
              {lang === 'fa' ? 'نامحدود' : 'Unlimited'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

