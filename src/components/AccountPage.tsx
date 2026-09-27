import React, { useState, useEffect } from 'react';
import {
  User,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  HardDrive,
  Globe,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  Phone,
  AtSign,
  Hash,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Cpu,
  Server,
  Star,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../utils/formatters';

export function AccountPage() {
  const {
    user,
    isConnected,
    isDemoMode,
    setActiveTab,
    disconnectTelegram,
    stats,
    fetchFullUser,
    refreshFiles,
    setIsLoginModalOpen,
    connectDemoMode,
  } = useTelegram();

  const { t, lang, setLang, isDark, toggleTheme } = useTheme();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    setPhotoError(false);
    fetchFullUser();
  }, [fetchFullUser, user?.id]);

  const activeUser = user || {
    id: '784912034',
    firstName: lang === 'fa' ? 'کاربر' : 'TeleCloud',
    lastName: lang === 'fa' ? 'تله‌کلاد' : 'User',
    username: 'telecloud_user',
    phone: '+98 912 345 6789',
    bio: lang === 'fa' 
      ? '🚀 تله‌کلاد: مدیریت ابری فایل‌های تلگرام. فضای ابری نامحدود و امن بدون اشغال حافظه دیسک.'
      : '🚀 TeleCloud Vault: Unlimited personal cloud storage powered by Telegram Saved Messages.',
    isPremium: true,
    dcId: 4,
  };

  const photoSrc =
    activeUser.photoUrl ||
    (isConnected && activeUser.id
      ? `/api/telegram/profile-photo?uid=${encodeURIComponent(activeUser.id)}`
      : null);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchFullUser(), refreshFiles()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const isRtl = lang === 'fa';
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header Bar / Navigation */}
      <div className="flex items-center justify-between gap-3 bg-white/80 dark:bg-[#1a1b1e]/80 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-xs">
        <button
          onClick={() => setActiveTab('files')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-bold active:scale-95 transition-all cursor-pointer"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t('backToFiles')}</span>
        </button>

        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title={t('refreshProfile')}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
              <span className="hidden sm:inline">{t('refreshProfile')}</span>
            </button>
          )}

          {(isConnected || isDemoMode) ? (
            <>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-sky-400 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                title={t('addAccount')}
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('addAccount')}</span>
              </button>
              <button
                onClick={disconnectTelegram}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                title={t('disconnect')}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t('disconnect')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>{t('connectTelegram')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Guest Connect Prompt Banner if not connected */}
      {!isConnected && !isDemoMode && (
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-600/10 via-sky-500/10 to-indigo-600/10 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-center sm:text-start">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                {lang === 'fa' ? 'در حال مشاهده پیش‌نمایش پروفایل' : 'Viewing Profile Preview'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                {lang === 'fa' ? 'برای همگام‌سازی واقعی اطلاعات اکانت تلگرام خود، وارد شوید.' : 'Connect your Telegram account to load your live profile details.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              {t('connectTelegram')}
            </button>
            <button
              onClick={connectDemoMode}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold text-xs border border-slate-200 dark:border-zinc-700 active:scale-95 transition-all cursor-pointer"
            >
              {t('demoModeBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Profile Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-700 text-white p-6 sm:p-8 shadow-xl shadow-blue-500/15">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-start">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/40 overflow-hidden flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-2xl">
              {photoSrc && !photoError ? (
                <img
                  src={photoSrc}
                  alt={activeUser.firstName}
                  onError={() => setPhotoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{activeUser.firstName?.[0] || 'U'}</span>
              )}
            </div>
            {activeUser.isPremium && (
              <div className="absolute -bottom-1.5 -end-1.5 p-1.5 rounded-full bg-amber-400 text-slate-950 shadow-md">
                <Star className="w-4 h-4 fill-current" />
              </div>
            )}
            {isConnected && !activeUser.isPremium && (
              <div className="absolute -bottom-1.5 -end-1.5 p-1 rounded-full bg-emerald-500 text-white shadow-md border-2 border-white">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Name & Basic Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                {activeUser.firstName} {activeUser.lastName || ''}
              </h1>
              {activeUser.isPremium && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/40 text-amber-200 text-[11px] font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  <span>Telegram Premium</span>
                </span>
              )}
              {isDemoMode && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/40 text-amber-200 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>{t('demoModeActive')}</span>
                </span>
              )}
            </div>

            {activeUser.username && (
              <p className="text-sm font-mono text-blue-100/90 font-medium">
                @{activeUser.username}
              </p>
            )}

            {/* Quick copy chips */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {activeUser.id && (
                <button
                  onClick={() => handleCopy(activeUser.id, 'id')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-mono font-medium backdrop-blur-md transition-all cursor-pointer"
                >
                  <Hash className="w-3.5 h-3.5 text-blue-200" />
                  <span>ID: {activeUser.id}</span>
                  {copiedField === 'id' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-blue-200 opacity-75" />
                  )}
                </button>
              )}

              {activeUser.username && (
                <button
                  onClick={() => handleCopy(`@${activeUser.username}`, 'username')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-mono font-medium backdrop-blur-md transition-all cursor-pointer"
                >
                  <AtSign className="w-3.5 h-3.5 text-blue-200" />
                  <span>@{activeUser.username}</span>
                  {copiedField === 'username' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-blue-200 opacity-75" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Subtle background decoration */}
        <User className="absolute -bottom-10 -right-10 w-52 h-52 text-white/10 pointer-events-none" />
      </div>

      {/* Biography Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
          <FileText className="w-4 h-4 text-blue-500" />
          <span>{t('bio')}</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-200 leading-relaxed font-medium">
          {activeUser.bio ? (
            activeUser.bio
          ) : (
            <span className="text-slate-400 dark:text-zinc-500 italic">
              {t('noBio')}
            </span>
          )}
        </p>
      </div>

      {/* Detailed Account Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Numeric ID */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-500" />
              {t('numericId')}
            </span>
            <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              {activeUser.id || t('notSet')}
            </p>
          </div>
          {activeUser.id && (
            <button
              onClick={() => handleCopy(activeUser.id, 'numericId')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 active:scale-95 transition-all cursor-pointer"
              title={t('copyId')}
            >
              {copiedField === 'numericId' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* 2. Username */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-indigo-500" />
              {t('username')}
            </span>
            <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              {activeUser.username ? `@${activeUser.username}` : t('notSet')}
            </p>
          </div>
          {activeUser.username && (
            <button
              onClick={() => handleCopy(`@${activeUser.username}`, 'usernameField')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 active:scale-95 transition-all cursor-pointer"
              title={t('copyUsername')}
            >
              {copiedField === 'usernameField' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* 3. Phone Number */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              {t('phoneNumber')}
            </span>
            <p className="text-sm font-mono font-bold text-slate-900 dark:text-white dir-ltr">
              {activeUser.phone || t('notSet')}
            </p>
          </div>
          {activeUser.phone && (
            <button
              onClick={() => handleCopy(activeUser.phone || '', 'phone')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 active:scale-95 transition-all cursor-pointer"
            >
              {copiedField === 'phone' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* 4. Telegram Premium */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              {t('telegramPremium')}
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {activeUser.isPremium ? (
                <span className="text-amber-500 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-500" />
                  {t('premiumActive')}
                </span>
              ) : (
                <span className="text-slate-600 dark:text-zinc-300 font-medium">
                  {t('standardUser')}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 5. Data Center (DC) */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-500" />
              {t('dataCenter')}
            </span>
            <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              DC {activeUser.dcId || 2} ({activeUser.dcId === 4 ? 'Miami, USA' : activeUser.dcId === 5 ? 'Singapore' : 'Amsterdam, NL'})
            </p>
          </div>
        </div>

        {/* 6. Security Protocol */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              {t('sessionSecurity')}
            </span>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {t('ramOnlyEncrypted')}
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Storage Usage Summary */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('storageUsed')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {stats?.totalFiles || 0} {t('allFiles')}
              </p>
            </div>
          </div>
          <span className="text-base sm:text-lg font-black text-blue-600 dark:text-sky-400 font-mono">
            {formatFileSize(stats?.totalSize || 0)}
          </span>
        </div>

        {/* Multi-color Storage Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
          <div style={{ width: '35%' }} className="h-full bg-blue-500" title="Videos" />
          <div style={{ width: '25%' }} className="h-full bg-emerald-500" title="Images" />
          <div style={{ width: '15%' }} className="h-full bg-amber-500" title="Audio" />
          <div style={{ width: '15%' }} className="h-full bg-purple-500" title="Docs" />
          <div style={{ width: '10%' }} className="h-full bg-rose-500" title="Archives" />
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 text-center">
            <ImageIcon className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">{t('images')}</span>
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {stats?.categories.images.count || 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 text-center">
            <Video className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">{t('videos')}</span>
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {stats?.categories.videos.count || 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 text-center">
            <Music className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">{t('audio')}</span>
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {stats?.categories.audio.count || 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 text-center">
            <FileText className="w-4 h-4 text-purple-500 mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">{t('documents')}</span>
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {stats?.categories.documents.count || 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 text-center">
            <Archive className="w-4 h-4 text-rose-500 mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">{t('archives')}</span>
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {stats?.categories.archives.count || 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 text-center">
            <File className="w-4 h-4 text-slate-500 mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">{t('other')}</span>
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {stats?.categories.other.count || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Preferences / Customization Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
          {lang === 'fa' ? 'تنظیمات و شخصی‌سازی' : 'Preferences & Theme'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Theme Toggle */}
          <button
            onClick={(e) => toggleTheme(e)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/70 dark:border-zinc-800 active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </div>
              <div className="text-start">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {isDark ? t('lightMode') : t('darkMode')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-sky-400 font-mono">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/70 dark:border-zinc-800 active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Globe className="w-4 h-4" />
              </div>
              <div className="text-start">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {t('language')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {lang === 'fa' ? 'تغییر زبان به English' : 'Switch to Persian (فارسی)'}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase font-mono">
              {lang === 'fa' ? 'فارسی' : 'English'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
