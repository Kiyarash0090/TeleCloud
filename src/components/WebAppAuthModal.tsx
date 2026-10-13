import React, { useState } from 'react';
import {
  Lock,
  Key,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Globe,
  Settings,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';

export function WebAppAuthModal() {
  const {
    isAppConfigured,
    webLogin,
    webSetup,
    serverDefaultApiId,
    hasServerDefaultApiHash,
  } = useTelegram();
  const { t, lang, setLang, isDark, toggleTheme } = useTheme();

  // Mode: if app is not configured yet, force setup mode; otherwise login mode
  const [isSetupMode, setIsSetupMode] = useState(!isAppConfigured);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Optional Telegram API setup on first run
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiId, setApiId] = useState(serverDefaultApiId ? String(serverDefaultApiId) : '');
  const [apiHash, setApiHash] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError(lang === 'fa' ? 'لطفاً نام کاربری را وارد کنید.' : 'Please enter a username.');
      return;
    }

    if (!password) {
      setError(lang === 'fa' ? 'لطفاً رمز عبور را وارد کنید.' : 'Please enter a password.');
      return;
    }

    if (isSetupMode) {
      if (cleanUsername.length < 2) {
        setError(lang === 'fa' ? 'نام کاربری باید حداقل ۲ کاراکتر باشد.' : 'Username must be at least 2 characters.');
        return;
      }
      if (password.length < 4) {
        setError(lang === 'fa' ? 'رمز عبور باید حداقل ۴ کاراکتر باشد.' : 'Password must be at least 4 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError(lang === 'fa' ? 'رمز عبور و تکرار آن یکسان نیستند.' : 'Passwords do not match.');
        return;
      }

      setIsLoading(true);
      const res = await webSetup(
        cleanUsername,
        password,
        apiId.trim() || undefined,
        apiHash.trim() || undefined
      );
      if (!res.success) {
        setError(res.error || (lang === 'fa' ? 'خطا در ثبت اطلاعات.' : 'Setup failed.'));
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
      const ok = await webLogin(cleanUsername, password);
      if (!ok) {
        setError(
          lang === 'fa'
            ? 'نام کاربری یا رمز عبور اشتباه است.'
            : 'Invalid username or password.'
        );
      }
      setIsLoading(false);
    }
  };

  const isRtl = lang === 'fa';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md my-auto bg-white dark:bg-[#18191c] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 relative transition-all">
        {/* Top Controls: Language & Theme */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-800/50 flex items-center justify-center text-blue-600 dark:text-sky-400 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-blue-600 dark:text-sky-400">
              TeleCloud Security
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language switch */}
            <button
              type="button"
              onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              {lang === 'fa' ? 'English' : 'فارسی'}
            </button>

            {/* Theme switch */}
            <button
              type="button"
              onClick={(e) => toggleTheme(e)}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shadow-lg mb-3.5 overflow-hidden p-2.5">
            <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-contain" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100">
            {isSetupMode ? t('webAuthSetupTitle') : t('webAuthTitle')}
          </h2>

          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 max-w-xs leading-relaxed">
            {isSetupMode
              ? (lang === 'fa'
                  ? 'برای امنیت فضای ابری، لطفاً نام کاربری و رمز عبور اصلی برنامه را تعیین کنید.'
                  : 'Set your master username & password to protect your Telegram cloud vault.')
              : (lang === 'fa'
                  ? 'لطفاً نام کاربری و رمز عبور خود را برای ورود به درایو وارد نمایید.'
                  : 'Enter your master username and password to access your cloud vault.')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs text-center font-medium animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              {t('usernameLabel')}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isSetupMode ? (lang === 'fa' ? 'مثال: admin یا نام دلخواه' : 'e.g. admin or your name') : 'admin'}
              className="w-full h-11 px-4 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 caret-blue-600 dark:caret-sky-400 outline-none focus:border-blue-500 dark:focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              {t('passwordLabel')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-4 pe-11 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 caret-blue-600 dark:caret-sky-400 outline-none focus:border-blue-500 dark:focus:border-sky-500 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Setup mode only) */}
          {isSetupMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                {t('confirmPasswordLabel')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 pe-11 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 caret-blue-600 dark:caret-sky-400 outline-none focus:border-blue-500 dark:focus:border-sky-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 end-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Optional Telegram API Credentials Collapsible (in Setup mode) */}
          {isSetupMode && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowApiSettings(!showApiSettings)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    {lang === 'fa' ? 'تنظیمات پیش‌فرض API تلگرام (اختیاری)' : 'Default Telegram API Credentials (Optional)'}
                  </span>
                </div>
                {showApiSettings ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showApiSettings && (
                <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/90 dark:border-zinc-800 space-y-3 animate-in fade-in duration-150">
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    {lang === 'fa'
                      ? 'اگر مایلید می‌توانید شناسه API ID و API Hash رسمی تلگرام خود را همینجا تنظیم کنید تا برای تمام اکانت‌ها خودکار استفاده شود (یا بعداً در فرم ورود تلگرام وارد نمایید).'
                      : 'Optionally save your Telegram API ID & Hash so you don\'t have to re-enter them on every login (from my.telegram.org).'}
                  </p>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                      {t('apiIdLabel')}
                    </label>
                    <input
                      type="text"
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value)}
                      placeholder="1234567"
                      className="w-full h-10 px-3.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                      {t('apiHashLabel')}
                    </label>
                    <input
                      type="text"
                      value={apiHash}
                      onChange={(e) => setApiHash(e.target.value)}
                      placeholder="a1b2c3d4e5f6..."
                      className="w-full h-10 px-3.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-3 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 hover:from-blue-700 hover:via-sky-600 hover:to-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <ArrowRight className="w-4.5 h-4.5 rtl:rotate-180" />
            )}
            <span>
              {isSetupMode ? t('completeSetupBtn') : t('loginAppBtn')}
            </span>
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800/80 text-center">
          <p className="text-[11px] text-slate-400 dark:text-zinc-500">
            {lang === 'fa'
              ? 'تله‌کلاد • درایو ابری نامحدود با امنیت سشن درون‌حافظه‌ای'
              : 'TeleCloud • Unlimited Cloud Drive with In-Memory Security'}
          </p>
        </div>
      </div>
    </div>
  );
}
