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
  LogOut,
  UploadCloud,
  MessageSquare,
  ChevronDown,
  UserPlus,
  Loader2,
  Link2,
  Info,
  Star,
  Download,
  Settings2,
} from 'lucide-react';
import { FileCategory } from '../types';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { formatFileSize } from '../utils/formatters';
import { getFolderColor, getFolderIcon } from '../utils/folderHelpers';

export function Sidebar({ onClose, className }: { onClose?: () => void; className?: string }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
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
    activeChatTitle,
    canUploadInActiveChat,
    setIsChatSelectorOpen,
    favoriteFileIds,
    folders,
    activeFolderId,
    setActiveFolderId,
    setIsFolderModalOpen,
    setFolderToEdit,
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
    setActiveFolderId(null);
    setSelectedCategory(id);
    setSelectedExtension(null);
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

  // Compute proportional storage bar segments from real stats
  const totalBytes = stats?.totalSize || 0;
  const storageSegments = totalBytes > 0 && stats
    ? [
        { key: 'videos', size: stats.categories.videos.size, color: 'bg-blue-500', label: t('videos').split(' ')[0] },
        { key: 'images', size: stats.categories.images.size, color: 'bg-rose-500', label: t('images').split(' ')[0] },
        { key: 'audio', size: stats.categories.audio.size, color: 'bg-emerald-500', label: t('audio').split(' ')[0] },
        { key: 'documents', size: stats.categories.documents.size, color: 'bg-amber-500', label: t('documents').split(' ')[0] },
        { key: 'archives', size: stats.categories.archives.size + stats.categories.other.size, color: 'bg-violet-500', label: t('archives').split(' ')[0] },
      ].filter((s) => s.size > 0)
    : [];

  return (
    <aside
      className={`relative w-64 lg:w-[272px] h-full bg-white dark:bg-[#11141C] border-e border-slate-200/85 dark:border-white/[0.075] p-3.5 sm:p-4 flex-col justify-between shrink-0 select-none ${className || ''}`}
    >
      {/* Top Scrollable Area */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {/* Mobile Brand Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-white/[0.06] md:hidden">
          <div
            onClick={() => {
              setActiveTab('files');
              setActiveFolderId(null);
              setSelectedCategory('all');
              setSelectedExtension(null);
              onClose?.();
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center overflow-hidden p-1.5">
              <img src="/favicon-96x96.png" alt={t('appName')} className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight block leading-tight">
                {t('appName')}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {t('tagline')}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-95 transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Switcher Panel */}
        <div className="mb-3">
          <div className="rounded-2xl bg-[#F4F6FA] dark:bg-[#171B26] border border-slate-200/75 dark:border-white/[0.07] overflow-hidden transition-colors">
            <div
              onClick={() => {
                if (accounts.length > 0 || isConnected || isDemoMode) {
                  setIsAccountListOpen((prev) => !prev);
                } else {
                  handleAddAccount();
                }
              }}
              className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-200/45 dark:hover:bg-white/[0.04] transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white overflow-hidden flex items-center justify-center font-bold text-xs shadow-2xs">
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
                    title={isConnected ? 'Live Connection' : isDemoMode ? 'Demo' : 'Disconnected'}
                    className={`absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#F4F6FA] dark:border-[#171B26] ${
                      isConnected
                        ? 'bg-emerald-500'
                        : isDemoMode
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block leading-snug">
                    {userName} {user?.lastName || ''}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate block dir-ltr text-start">
                    {user?.username
                      ? `@${user.username}`
                      : user?.phone
                      ? user.phone
                      : isConnected
                      ? 'Connected'
                      : isDemoMode
                      ? t('demoModeActive')
                      : t('connectTelegram')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('account');
                    onClose?.();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition cursor-pointer"
                  title={lang === 'fa' ? 'اطلاعات اکانت' : 'Account Info'}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                {isSwitchingAccount ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin mx-1" />
                ) : (
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                      isAccountListOpen ? 'rotate-180 text-blue-600 dark:text-sky-400' : ''
                    }`}
                  />
                )}
              </div>
            </div>

            {isAccountListOpen && (
              <div className="border-t border-slate-200/70 dark:border-white/[0.06] p-1.5 space-y-1 bg-white dark:bg-[#11141C] animate-in slide-in-from-top-1 duration-150">
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
                          ? 'bg-blue-600/10 dark:bg-sky-500/12 text-blue-700 dark:text-sky-300 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300'
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
                          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate dir-ltr text-start">
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
                          onClick={(e) => handleRemoveAccount(e, acc.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                          title={t('removeAccount')}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddAccount}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] text-blue-600 dark:text-sky-400 text-xs font-semibold transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('addAccount')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Primary Upload Action */}
        {canUploadInActiveChat ? (
          <button
            onClick={() => {
              setIsUploadModalOpen(true);
              onClose?.();
            }}
            className="w-full mb-2.5 h-10.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2 transition-colors duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <UploadCloud className="w-4.5 h-4.5 stroke-[2]" />
            <span>{t('upload')}</span>
          </button>
        ) : (
          <div className="w-full mb-2.5 h-10 px-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-center">
            <span>{lang === 'fa' ? 'کانال فقط خواندنی' : 'Read-Only Channel'}</span>
          </div>
        )}

        {/* Workspace Quick Triggers */}
        <div className="grid grid-cols-1 gap-1.5 mb-4 pb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
          <button
            onClick={() => {
              setIsChatSelectorOpen(true);
              onClose?.();
            }}
            className="w-full h-9.5 px-3 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/[0.05] text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
              <span className="truncate">
                {activeChatTitle || (lang === 'fa' ? 'پیام‌های ذخیره‌شده' : 'Saved Messages')}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          <button
            onClick={() => {
              setIsTelegramLinkModalOpen(true);
              onClose?.();
            }}
            className="w-full h-9.5 px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-blue-600 dark:hover:text-sky-400 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Link2 className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">{t('telegramLinkInspector')}</span>
          </button>
        </div>

        {/* Favorites Navigation */}
        <button
          onClick={() => {
            setActiveTab('favorites');
            setActiveFolderId(null);
            setSelectedCategory('all');
            setSelectedExtension(null);
            onClose?.();
          }}
          className={`w-full mb-4 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-colors duration-150 cursor-pointer ${
            activeTab === 'favorites'
              ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Star
              className={`w-4 h-4 shrink-0 text-amber-500 ${
                activeTab === 'favorites' ? 'fill-amber-500' : ''
              }`}
            />
            <span className="truncate">{t('favorites')}</span>
          </div>
          {favoriteFileIds.length > 0 && (
            <span className="text-[11px] font-mono tabular-nums text-amber-600 dark:text-amber-400 font-bold">
              {favoriteFileIds.length}
            </span>
          )}
        </button>

        {/* Custom User Folders */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {t('myFolders')}
            </span>

            <button
              onClick={() => {
                setFolderToEdit(null);
                setIsFolderModalOpen(true);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 px-1.5 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-sky-500/10 transition cursor-pointer"
              title={t('createFolder')}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('newFolder')}</span>
            </button>
          </div>

          {folders.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                setFolderToEdit(null);
                setIsFolderModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] hover:border-blue-400 dark:hover:border-sky-500/50 hover:bg-blue-50/40 dark:hover:bg-sky-500/5 transition-colors cursor-pointer flex items-center gap-2.5 text-start"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                  {t('createFolder')}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                  {lang === 'fa' ? 'سازماندهی فایل‌ها' : 'Organize files'}
                </span>
              </div>
            </button>
          ) : (
            <div className="space-y-0.5">
              {folders.map((folder) => {
                const colorConfig = getFolderColor(folder.color);
                const FolderIcon = getFolderIcon(folder.icon);
                const isActive = activeTab === 'files' && activeFolderId === folder.id;

                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setActiveTab('files');
                      setActiveFolderId(folder.id);
                      setSelectedCategory('all');
                      setSelectedExtension(null);
                      onClose?.();
                    }}
                    className={`group/folder w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? `${colorConfig.bgClass} ${colorConfig.textClass}`
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderIcon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? colorConfig.textClass : 'opacity-75 group-hover/folder:opacity-100'
                        }`}
                      />
                      <span className="truncate">{folder.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                        {folder.files.length}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToEdit(folder);
                          setIsFolderModalOpen(true);
                        }}
                        className="opacity-0 group-hover/folder:opacity-100 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        title={t('editFolder')}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Storage Categories */}
        <div className="px-2 mb-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          {lang === 'fa' ? 'دسته‌بندی فایل‌ها' : 'Categories'}
        </div>

        <nav className="space-y-0.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === 'files' && !activeFolderId && selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/10 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-600 dark:text-sky-400' : 'opacity-70'
                    }`}
                  />
                  <span className="truncate">{cat.label}</span>
                </div>
                {cat.count !== undefined && cat.count > 0 && (
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      isActive
                        ? 'text-blue-600 dark:text-sky-400 font-bold'
                        : 'text-slate-400 dark:text-slate-500'
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

      {/* Bottom Area: Storage Metrics */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
        {/* Mobile Language & Theme Switcher */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] text-xs font-semibold text-slate-700 dark:text-slate-200 active:scale-95 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>{lang === 'fa' ? 'English' : 'فارسی'}</span>
          </button>
          <button
            onClick={(e) => toggleTheme(e)}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] text-xs font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-colors cursor-pointer overflow-hidden"
          >
            <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 theme-icon-spring theme-icon-sun" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600 theme-icon-spring theme-icon-moon" />
              )}
            </div>
            <span>{isDark ? t('lightMode') : t('darkMode')}</span>
          </button>
        </div>

        {/* Mobile PWA Install option */}
        {!isInstalled && (isInstallable || isIOS) && (
          <button
            onClick={() => {
              if (isIOS) {
                window.dispatchEvent(new CustomEvent('telecloud-show-ios-guide'));
              } else {
                install();
              }
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-sky-500/10 text-blue-600 dark:text-sky-400 text-xs font-semibold transition active:scale-[0.98] cursor-pointer md:hidden"
          >
            <span className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>{lang === 'fa' ? 'نصب اپلیکیشن' : 'Install App'}</span>
            </span>
            <span className="text-[11px] font-bold">
              {lang === 'fa' ? 'نصب' : 'Get'}
            </span>
          </button>
        )}

        {/* Storage Quota Summary */}
        <div className="p-3 rounded-2xl bg-[#F4F6FA] dark:bg-[#171B26] border border-slate-200/75 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>{t('storageUsed')}</span>
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums" dir="ltr">
              {formatFileSize(totalBytes)}
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden flex gap-0.5">
            {storageSegments.length > 0 ? (
              storageSegments.map((seg) => (
                <div
                  key={seg.key}
                  style={{ width: `${Math.max(4, (seg.size / totalBytes) * 100)}%` }}
                  className={`h-full ${seg.color} first:rounded-s-full last:rounded-e-full transition-[width] duration-300`}
                  title={`${seg.label}: ${formatFileSize(seg.size)}`}
                />
              ))
            ) : (
              <div className="h-full w-0 bg-blue-500" />
            )}
          </div>

          {storageSegments.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-[10px] text-slate-500 dark:text-slate-400">
              {storageSegments.slice(0, 4).map((seg) => (
                <span key={seg.key} className="inline-flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${seg.color}`} />
                  <span>{seg.label}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.05] font-mono tabular-nums">
            <span>
              {stats?.totalFiles || 0} {lang === 'fa' ? 'فایل' : 'files'}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
              {lang === 'fa' ? 'نامحدود' : 'Unlimited'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
