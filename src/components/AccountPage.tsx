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
  Phone,
  AtSign,
  Hash,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Server,
  Star,
  CheckCircle2,
  UserPlus,
  Lock,
  Key,
  Loader2,
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
    setIsLoginModalOpen,
    connectDemoMode,
    webAppUsername,
    webUpdateCredentials,
    webLogout,
    serverDefaultApiId,
    hasServerDefaultApiHash,
  } = useTelegram();

  const { t, lang, setLang, isDark, toggleTheme } = useTheme();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);

  // In-app Master Security & Credentials State
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [editApiId, setEditApiId] = useState(serverDefaultApiId ? String(serverDefaultApiId) : '');
  const [editApiHash, setEditApiHash] = useState('');
  const [securityStatus, setSecurityStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityStatus(null);

    if (!currentPassword) {
      setSecurityStatus({
        type: 'error',
        message: lang === 'fa' ? 'لطفاً رمز عبور فعلی خود را وارد کنید.' : 'Please enter your current password.',
      });
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setSecurityStatus({
          type: 'error',
          message: lang === 'fa' ? 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' : 'New password must be at least 4 characters.',
        });
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setSecurityStatus({
          type: 'error',
          message: lang === 'fa' ? 'رمز عبور جدید و تکرار آن یکسان نیستند.' : 'New passwords do not match.',
        });
        return;
      }
    }

    if (newUsername && newUsername.trim().length < 2) {
      setSecurityStatus({
        type: 'error',
        message: lang === 'fa' ? 'نام کاربری باید حداقل ۲ کاراکتر باشد.' : 'Username must be at least 2 characters.',
      });
      return;
    }

    setIsSavingSecurity(true);
    const res = await webUpdateCredentials(
      currentPassword,
      newUsername.trim() || undefined,
      newPassword || undefined,
      editApiId.trim() || undefined,
      editApiHash.trim() || undefined
    );

    if (res.success) {
      setSecurityStatus({
        type: 'success',
        message: lang === 'fa' ? 'مشخصات امنیتی با موفقیت بروزرسانی شد.' : 'Credentials updated successfully.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setSecurityStatus({
        type: 'error',
        message: res.error || (lang === 'fa' ? 'خطا در بروزرسانی اطلاعات.' : 'Failed to update credentials.'),
      });
    }
    setIsSavingSecurity(false);
  };

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
      ? 'تله‌کلاد: مدیریت ابری فایل‌های تلگرام. فضای ابری نامحدود و امن بدون اشغال حافظه دیسک.'
      : 'TeleCloud Vault: Unlimited personal cloud storage powered by Telegram Saved Messages.',
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

  const isRtl = lang === 'fa';
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  // Real proportional storage bar segments
  const totalSize = stats?.totalSize || 0;
  const storageSegments = [
    { key: 'videos', size: stats?.categories?.videos?.size || 0, color: 'bg-amber-500', label: t('videos') },
    { key: 'images', size: stats?.categories?.images?.size || 0, color: 'bg-rose-500', label: t('images') },
    { key: 'audio', size: stats?.categories?.audio?.size || 0, color: 'bg-emerald-500', label: t('audio') },
    { key: 'documents', size: stats?.categories?.documents?.size || 0, color: 'bg-blue-500', label: t('documents') },
    { key: 'archives', size: stats?.categories?.archives?.size || 0, color: 'bg-violet-500', label: t('archives') },
    { key: 'other', size: stats?.categories?.other?.size || 0, color: 'bg-slate-400 dark:bg-slate-600', label: t('other') },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-200 pb-6">
      {/* Top Header Bar / Navigation */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] p-3 sm:p-3.5 rounded-2xl shadow-[var(--shadow-card)]">
        <button
          onClick={() => setActiveTab('files')}
          className="flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F4F6FA] hover:bg-slate-200/80 dark:bg-[#171B26] dark:hover:bg-[#232938] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <BackIcon className="w-4 h-4 shrink-0" />
          <span>{t('backToFiles')}</span>
        </button>

        <div className="flex items-center gap-2">
          {(isConnected || isDemoMode) ? (
            <>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-semibold active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title={t('addAccount')}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t('addAccount')}</span>
              </button>
              <button
                onClick={disconnectTelegram}
                className="flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title={t('disconnect')}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t('disconnect')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <User className="w-4 h-4 shrink-0" />
              <span>{t('connectTelegram')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Guest Connect Prompt Banner if not connected */}
      {!isConnected && !isDemoMode && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11141C] border border-blue-200/80 dark:border-blue-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 text-center sm:text-start">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {lang === 'fa' ? 'در حال مشاهده پیش‌نمایش پروفایل' : 'Viewing Profile Preview'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'fa' ? 'برای همگام‌سازی واقعی اطلاعات اکانت تلگرام خود، وارد شوید.' : 'Connect your Telegram account to load your live profile details.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm shadow-blue-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              {t('connectTelegram')}
            </button>
            <button
              onClick={connectDemoMode}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-200/80 dark:hover:bg-[#232938] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              {t('demoModeBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Profile Hero Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#131E3A] to-[#1D4ED8] border border-slate-800/40 dark:border-white/10 text-white p-6 sm:p-8 shadow-lg shadow-slate-900/10 dark:shadow-black/40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.16),transparent_55%)]"
        />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-start">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md border border-white/25 overflow-hidden flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shadow-xl">
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
              <div className="absolute -bottom-1.5 -end-1.5 p-1.5 rounded-full bg-amber-400 text-slate-950 shadow-md ring-2 ring-[#131E3A]">
                <Star className="w-3.5 h-3.5 fill-current" />
              </div>
            )}
            {isConnected && !activeUser.isPremium && (
              <div className="absolute -bottom-1.5 -end-1.5 p-1 rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-[#131E3A]">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Name & Basic Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
                {activeUser.firstName} {activeUser.lastName || ''}
              </h1>
              {activeUser.isPremium && (
                <span className="inline-flex items-center gap-1 text-amber-300 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Telegram Premium</span>
                </span>
              )}
              {isDemoMode && (
                <span className="inline-flex items-center gap-1 text-sky-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('demoModeActive')}</span>
                </span>
              )}
            </div>

            {activeUser.username && (
              <p className="text-sm font-mono text-slate-300 font-medium">
                @{activeUser.username}
              </p>
            )}

            {/* Quick copy actions */}
            <div className="pt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {activeUser.id && (
                <button
                  onClick={() => handleCopy(activeUser.id, 'id')}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 active:scale-95 text-xs font-mono tabular-nums font-medium transition-all cursor-pointer"
                >
                  <Hash className="w-3.5 h-3.5 text-sky-300" />
                  <span>ID: {activeUser.id}</span>
                  {copiedField === 'id' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-300 opacity-80" />
                  )}
                </button>
              )}

              {activeUser.username && (
                <button
                  onClick={() => handleCopy(`@${activeUser.username}`, 'username')}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 active:scale-95 text-xs font-mono font-medium transition-all cursor-pointer"
                >
                  <AtSign className="w-3.5 h-3.5 text-sky-300" />
                  <span>@{activeUser.username}</span>
                  {copiedField === 'username' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-300 opacity-80" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Biography Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <FileText className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <span>{t('bio')}</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
          {activeUser.bio ? (
            activeUser.bio
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic">
              {t('noBio')}
            </span>
          )}
        </p>
      </div>

      {/* Detailed Account Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Numeric ID */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
              {t('numericId')}
            </span>
            <p className="text-sm font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 truncate">
              {activeUser.id || t('notSet')}
            </p>
          </div>
          {activeUser.id && (
            <button
              onClick={() => handleCopy(activeUser.id, 'numericId')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#171B26] dark:hover:bg-[#232938] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer"
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
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              {t('username')}
            </span>
            <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
              {activeUser.username ? `@${activeUser.username}` : t('notSet')}
            </p>
          </div>
          {activeUser.username && (
            <button
              onClick={() => handleCopy(`@${activeUser.username}`, 'usernameField')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#171B26] dark:hover:bg-[#232938] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer"
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
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {t('phoneNumber')}
            </span>
            <p className="text-sm font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 dir-ltr truncate">
              {activeUser.phone || t('notSet')}
            </p>
          </div>
          {activeUser.phone && (
            <button
              onClick={() => handleCopy(activeUser.phone || '', 'phone')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#171B26] dark:hover:bg-[#232938] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer"
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
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {t('telegramPremium')}
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {activeUser.isPremium ? (
                <span className="text-amber-500 flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-500" />
                  {t('premiumActive')}
                </span>
              ) : (
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {t('standardUser')}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 5. Data Center (DC) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              {t('dataCenter')}
            </span>
            <p className="text-sm font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
              DC {activeUser.dcId || 2} · {activeUser.dcId === 4 ? 'Miami, USA' : activeUser.dcId === 5 ? 'Singapore' : 'Amsterdam, NL'}
            </p>
          </div>
        </div>

        {/* 6. Security Protocol */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {t('sessionSecurity')}
            </span>
            <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {t('ramOnlyEncrypted')}
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Storage Usage Summary */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <HardDrive className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('storageUsed')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {stats?.totalFiles || 0} {t('allFiles')}
              </p>
            </div>
          </div>
          <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-sky-400 font-mono tabular-nums">
            {formatFileSize(stats?.totalSize || 0)}
          </span>
        </div>

        {/* Multi-color Proportional Storage Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-[#171B26] rounded-full overflow-hidden flex gap-0.5">
          {totalSize > 0 ? (
            storageSegments.map((seg) => {
              const pct = (seg.size / totalSize) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={seg.key}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                  className={`h-full ${seg.color} first:rounded-s-full last:rounded-e-full transition-all duration-300`}
                  title={`${seg.label}: ${formatFileSize(seg.size)}`}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-slate-200/60 dark:bg-white/[0.05] rounded-full" />
          )}
        </div>

        {/* Category Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] border border-slate-200/60 dark:border-white/[0.06] text-center">
            <ImageIcon className="w-4 h-4 text-rose-500 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{t('images')}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5 block">
              {stats?.categories.images.count || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] border border-slate-200/60 dark:border-white/[0.06] text-center">
            <Video className="w-4 h-4 text-amber-500 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{t('videos')}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5 block">
              {stats?.categories.videos.count || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] border border-slate-200/60 dark:border-white/[0.06] text-center">
            <Music className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{t('audio')}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5 block">
              {stats?.categories.audio.count || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] border border-slate-200/60 dark:border-white/[0.06] text-center">
            <FileText className="w-4 h-4 text-blue-500 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{t('documents')}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5 block">
              {stats?.categories.documents.count || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] border border-slate-200/60 dark:border-white/[0.06] text-center">
            <Archive className="w-4 h-4 text-violet-500 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{t('archives')}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5 block">
              {stats?.categories.archives.count || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F4F6FA] dark:bg-[#171B26] border border-slate-200/60 dark:border-white/[0.06] text-center">
            <File className="w-4 h-4 text-slate-500 dark:text-slate-400 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{t('other')}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5 block">
              {stats?.categories.other.count || 0}
            </span>
          </div>
        </div>
      </div>

      {/* In-App Master Security & Settings Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {lang === 'fa' ? 'امنیت و گذرواژه ورود به برنامه' : 'Master App Security & Credentials'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'fa'
                  ? `کاربر مدیر: ${webAppUsername || 'admin'} · تنظیم درون‌برنامه‌ای`
                  : `Master User: ${webAppUsername || 'admin'} · In-App Setup`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingSecurity(!isEditingSecurity)}
              className="flex-1 sm:flex-initial min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#171B26] dark:hover:bg-[#232938] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>{isEditingSecurity ? (lang === 'fa' ? 'بستن فرم' : 'Close Form') : t('changePasswordBtn')}</span>
            </button>

            <button
              type="button"
              onClick={webLogout}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/25 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title={lang === 'fa' ? 'قفل برنامه و خروج از حساب وب' : 'Lock Application'}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'قفل برنامه' : 'Lock App'}</span>
            </button>
          </div>
        </div>

        {/* Change Credentials & API Config Form */}
        {isEditingSecurity && (
          <form onSubmit={handleSaveSecurity} className="pt-4 border-t border-slate-100 dark:border-white/[0.06] space-y-3.5 animate-in fade-in duration-200">
            {securityStatus && (
              <div
                className={`p-3 rounded-xl text-xs font-medium text-center ${
                  securityStatus.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-300'
                }`}
              >
                {securityStatus.message}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('currentPasswordLabel')} *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-[#171B26] dark:hover:bg-[#1C212E] dark:focus:bg-[#1C212E] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-sky-400 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('newUsernameLabel')}
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={webAppUsername || 'admin'}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-[#171B26] dark:hover:bg-[#1C212E] dark:focus:bg-[#1C212E] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-sky-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('newPasswordLabel')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-[#171B26] dark:hover:bg-[#1C212E] dark:focus:bg-[#1C212E] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-sky-400 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('confirmPasswordLabel')}
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-[#171B26] dark:hover:bg-[#1C212E] dark:focus:bg-[#1C212E] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-sky-400 transition font-mono"
                />
              </div>
            </div>

            {/* Optional Telegram Default API configuration */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                {lang === 'fa' ? 'تنظیمات پیش‌فرض کلیدهای API تلگرام در سرور (اختیاری):' : 'Server Default Telegram API Keys (Optional):'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editApiId}
                  onChange={(e) => setEditApiId(e.target.value)}
                  placeholder={serverDefaultApiId ? String(serverDefaultApiId) : 'API ID (e.g. 1234567)'}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-sky-400 transition"
                />
                <input
                  type="text"
                  value={editApiHash}
                  onChange={(e) => setEditApiHash(e.target.value)}
                  placeholder={hasServerDefaultApiHash ? '•••••••••••••••• (ثبت شده)' : 'API Hash (e.g. a1b2c3...)'}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-sky-400 transition"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingSecurity}
                className="min-h-[40px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-600/20 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingSecurity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{lang === 'fa' ? 'ذخیره تغییرات درون‌برنامه‌ای' : 'Save In-App Credentials'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Preferences / Customization Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.08] shadow-[var(--shadow-card)] space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {lang === 'fa' ? 'تنظیمات و شخصی‌سازی' : 'Preferences & Theme'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Theme Toggle */}
          <button
            onClick={(e) => toggleTheme(e)}
            className="flex items-center justify-between min-h-[56px] p-3.5 rounded-xl bg-[#F4F6FA] hover:bg-slate-100 dark:bg-[#171B26] dark:hover:bg-[#1C212E] border border-slate-200/70 dark:border-white/[0.07] active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </div>
              <div className="text-start">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  {isDark ? t('lightMode') : t('darkMode')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 dark:text-sky-400 font-mono">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            className="flex items-center justify-between min-h-[56px] p-3.5 rounded-xl bg-[#F4F6FA] hover:bg-slate-100 dark:bg-[#171B26] dark:hover:bg-[#1C212E] border border-slate-200/70 dark:border-white/[0.07] active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="text-start">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  {t('language')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'fa' ? 'تغییر زبان به English' : 'Switch to Persian (فارسی)'}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
              {lang === 'fa' ? 'فارسی' : 'English'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
