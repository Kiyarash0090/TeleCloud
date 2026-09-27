import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Send,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Loader2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  UserPlus,
  Edit3,
} from 'lucide-react';
import { useTelegram, useBackHandler } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';

export function TelegramLoginModal({ onClose }: { onClose: () => void }) {
  const {
    accounts,
    sharedApiCreds,
    saveSharedApiCreds,
    addOrUpdateAccount,
    connectDemoMode,
  } = useTelegram();
  const { t, lang } = useTheme();

  const isAddingAdditional = accounts.length > 0;

  const [activeTab, setActiveTab] = useState<'phone' | 'session'>('phone');
  const [step, setStep] = useState<'request' | 'verify'>('request');

  // Form fields (pre-filled from shared API credentials if available)
  const [apiId, setApiId] = useState(sharedApiCreds?.apiId || '');
  const [apiHash, setApiHash] = useState(sharedApiCreds?.apiHash || '');
  const [isEditingApiCreds, setIsEditingApiCreds] = useState<boolean>(
    !(sharedApiCreds?.apiId && sharedApiCreds?.apiHash)
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [sessionString, setSessionString] = useState('');

  // States
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorHelp, setErrorHelp] = useState<string | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [showApiGuide, setShowApiGuide] = useState(false);

  useBackHandler(activeTab === 'phone' && step === 'verify', () => {
    setStep('request');
    setErrorMsg(null);
  });
  useBackHandler(showApiGuide, () => setShowApiGuide(false));

  // Sync shared credentials if loaded
  useEffect(() => {
    if (sharedApiCreds?.apiId && sharedApiCreds?.apiHash) {
      if (!apiId) setApiId(sharedApiCreds.apiId);
      if (!apiHash) setApiHash(sharedApiCreds.apiHash);
    }
  }, [sharedApiCreds]);

  // Check if server has default credentials configured
  useEffect(() => {
    fetch('/api/auth/web-status')
      .then((r) => r.json())
      .then((data) => {
        if (data.defaultApiId && !apiId) {
          setApiId(String(data.defaultApiId));
        }
      })
      .catch(() => {});
  }, []);

  // Send Code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanApiId = apiId.trim();
    const cleanApiHash = apiHash.trim();
    let cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+') && /^\d+$/.test(cleanPhone)) {
      cleanPhone = `+${cleanPhone}`;
    }

    if (!cleanApiId || !cleanApiHash || !cleanPhone) {
      setErrorMsg(
        lang === 'fa'
          ? 'لطفاً شناسه API ID، API Hash و شماره موبایل را وارد نمایید.'
          : 'Please enter API ID, API Hash, and Phone Number.'
      );
      setIsEditingApiCreds(true);
      return;
    }

    if (!/^\d+$/.test(cleanApiId)) {
      setErrorMsg(
        lang === 'fa'
          ? 'شناسه API ID باید فقط شامل اعداد باشد (مثال: 12345678).'
          : 'API ID must be digits only (e.g. 12345678).'
      );
      setIsEditingApiCreds(true);
      return;
    }

    if (cleanApiHash.length < 10) {
      setErrorMsg(
        lang === 'fa'
          ? 'کد API Hash باید رشته معتبر از my.telegram.org باشد.'
          : 'API Hash must be a valid string from my.telegram.org.'
      );
      setIsEditingApiCreds(true);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setErrorHelp(null);

    try {
      const res = await fetch('/api/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiId: cleanApiId,
          apiHash: cleanApiHash,
          phoneNumber: cleanPhone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        saveSharedApiCreds(cleanApiId, cleanApiHash);
        setStep('verify');
      } else {
        setErrorMsg(data.error || 'Failed to send verification code');
        if (data.help) setErrorHelp(data.help);
        if (data.code === 'API_ID_INVALID') {
          setIsEditingApiCreds(true);
          setShowApiGuide(true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Code and Sign In
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = phoneCode.trim();
    if (!cleanCode) {
      setErrorMsg(
        lang === 'fa' ? 'لطفاً کد تایید را وارد کنید' : 'Please enter the verification code'
      );
      return;
    }

    if (needs2FA && !password2FA.trim()) {
      setErrorMsg(
        lang === 'fa'
          ? 'لطفاً رمز تایید دو مرحله‌ای (2FA) را وارد کنید'
          : 'Please enter your Two-Step Verification (2FA) password'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setErrorHelp(null);

    try {
      const res = await fetch('/api/telegram/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneCode: cleanCode, password: password2FA }),
      });

      const data = await res.json();
      if (data.needs2FA) {
        setNeeds2FA(true);
        setErrorMsg(
          lang === 'fa'
            ? `رمز تایید دو مرحله‌ای (2FA) برای این حساب فعال است. لطفاً آن را وارد کنید.${data.hint ? ` (راهنما: ${data.hint})` : ''}`
            : `2-Step Verification password (2FA) is required for this account.${data.hint ? ` (Hint: ${data.hint})` : ''}`
        );
      } else if (data.success && data.user) {
        saveSharedApiCreds(apiId.trim(), apiHash.trim());
        addOrUpdateAccount(
          data.user,
          data.encryptedToken || '',
          apiId.trim(),
          apiHash.trim()
        );
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to sign in');
        if (data.help) setErrorHelp(data.help);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification error');
    } finally {
      setIsLoading(false);
    }
  };

  // Session String Login
  const handleSessionLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiId.trim() || !apiHash.trim() || !sessionString.trim()) {
      setErrorMsg(
        lang === 'fa'
          ? 'شناسه API ID، API Hash و رشته Session الزامی هستند.'
          : 'API ID, API Hash, and Session String are required.'
      );
      setIsEditingApiCreds(true);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setErrorHelp(null);

    try {
      const res = await fetch('/api/telegram/session-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiId: apiId.trim(),
          apiHash: apiHash.trim(),
          sessionString: sessionString.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        saveSharedApiCreds(apiId.trim(), apiHash.trim());
        addOrUpdateAccount(
          data.user,
          data.encryptedToken || '',
          apiId.trim(),
          apiHash.trim()
        );
        onClose();
      } else {
        setErrorMsg(data.error || 'Invalid session');
        if (data.help) setErrorHelp(data.help);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Session login error');
    } finally {
      setIsLoading(false);
    }
  };

  const hasSharedCreds = Boolean(apiId.trim() && apiHash.trim());

  const renderApiCredentialsSection = () => {
    if (hasSharedCreds && !isEditingApiCreds) {
      return (
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                {t('sharedApiCredsActive')}
              </div>
              <div className="text-[11px] font-mono text-emerald-700/80 dark:text-emerald-400/80 truncate">
                API ID: {apiId.trim()} • Hash: {apiHash.trim().slice(0, 6)}••••
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingApiCreds(true)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-sky-400 border border-slate-200/80 dark:border-zinc-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
            <span>{t('editApiCreds')}</span>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-700/60">
        {hasSharedCreds && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
              {lang === 'fa' ? 'تنظیمات مشترک API تلگرام' : 'Shared Telegram API Credentials'}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingApiCreds(false)}
              className="text-[11px] text-blue-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
            >
              {lang === 'fa' ? 'بستن ویرایش' : 'Done'}
            </button>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            {t('apiIdLabel')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 12345678"
            value={apiId}
            onChange={(e) => setApiId(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl bg-white hover:bg-white focus:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 caret-blue-600 dark:caret-sky-400 outline-none focus:border-blue-500 dark:focus:border-sky-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            {t('apiHashLabel')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 0123456789abcdef0123456789abcdef"
            value={apiHash}
            onChange={(e) => setApiHash(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl bg-white hover:bg-white focus:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 caret-blue-600 dark:caret-sky-400 outline-none focus:border-blue-500 dark:focus:border-sky-500 transition"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e1f20] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 max-h-[92dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-7">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pb-3">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shadow-md overflow-hidden p-1.5 shrink-0">
              {isAddingAdditional ? (
                <UserPlus className="w-5 h-5 text-blue-600 dark:text-sky-400" />
              ) : (
                <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-contain" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100">
                {isAddingAdditional ? t('addAnotherAccountTitle') : t('loginTitle')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400">
                {isAddingAdditional ? t('addAnotherAccountSubtitle') : t('loginSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connected Accounts Summary Pill if adding another account */}
        {accounts.length > 0 && (
          <div className="mt-3.5 flex items-center gap-2 px-3 py-2 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-sky-300">
            <span className="font-bold shrink-0">
              {lang === 'fa'
                ? `${accounts.length} اکانت متصل:`
                : `${accounts.length} connected:`}
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {accounts.map((acc) => (
                <span
                  key={acc.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-blue-200/60 dark:border-zinc-700 font-semibold text-slate-700 dark:text-zinc-200 shrink-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {acc.user.firstName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center gap-2 my-4 p-1 bg-slate-100 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/50 dark:border-zinc-700/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('phone');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'phone'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-300 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            {t('phoneLoginTab')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('session');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'session'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-300 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            {t('sessionLoginTab')}
          </button>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3.5 mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs space-y-1.5 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{errorMsg}</div>
            </div>
            {errorHelp && (
              <div className="text-[11px] text-rose-700/90 dark:text-rose-300/90 pl-6 rtl:pl-0 rtl:pr-6 leading-relaxed">
                {errorHelp}
              </div>
            )}
          </div>
        )}

        {/* Expandable API ID Guide (Only shown when editing API credentials or no shared creds yet) */}
        {(!hasSharedCreds || isEditingApiCreds) && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowApiGuide(!showApiGuide)}
              className="w-full p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-blue-700 dark:text-sky-300 text-xs font-medium flex items-center justify-between hover:bg-blue-100/80 dark:hover:bg-blue-900/40 transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                {lang === 'fa'
                  ? 'راهنمای دریافت رایگان API ID و API Hash (در ۳۰ ثانیه)'
                  : 'How to get free API ID & API Hash (in 30s)'}
              </span>
              {showApiGuide ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showApiGuide && (
              <div className="p-3.5 mt-2 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 space-y-2 animate-in fade-in">
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-[11px]">
                  <li>
                    وارد سایت رسمی{' '}
                    <a
                      href="https://my.telegram.org"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-sky-400 font-bold underline inline-flex items-center gap-0.5"
                    >
                      my.telegram.org <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    شوید.
                  </li>
                  <li>شماره موبایل خود را وارد کرده و کد تایید ارسالی در تلگرام را بزنید.</li>
                  <li>
                    روی گزینه <strong>API development tools</strong> کلیک کنید.
                  </li>
                  <li>
                    یک نام دلخواه (مثلاً{' '}
                    <code className="bg-slate-200 dark:bg-zinc-700 px-1 rounded font-mono">
                      TeleCloud
                    </code>
                    ) بنویسید و Create App را بزنید.
                  </li>
                  <li>
                    کد <strong>api_id</strong> (فقط عدد) و <strong>api_hash</strong> تولید شده را
                    در کادرهای زیر کپی کنید.
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Phone + OTP Flow */}
        {activeTab === 'phone' && (
          <>
            {step === 'request' ? (
              <form onSubmit={handleSendCode} className="space-y-3.5">
                {renderApiCredentialsSection()}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    {t('phoneNumberLabel')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    autoFocus={hasSharedCreds && !isEditingApiCreds}
                    placeholder="+989123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 caret-blue-600 dark:caret-sky-400 outline-none focus:border-blue-500 dark:focus:border-sky-500 transition dir-ltr"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{t('requestCodeBtn')}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    {t('enterCodeLabel')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="12345"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm font-mono tracking-widest text-center text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 caret-blue-600 dark:caret-sky-400 outline-none focus:border-blue-500 dark:focus:border-sky-500 transition"
                  />
                </div>

                {needs2FA && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      {t('enterPasswordLabel')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      autoFocus
                      placeholder="Your 2FA Password"
                      value={password2FA}
                      onChange={(e) => setPassword2FA(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 caret-blue-600 dark:caret-sky-400 outline-none focus:border-blue-500 dark:focus:border-sky-500 transition"
                    />
                  </div>
                )}

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700/50">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>
                      {lang === 'fa'
                        ? 'ذخیره امن نشست برای جابجایی سریع بین اکانت‌ها'
                        : 'Save encrypted session for fast multi-account switching'}
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">AES-256</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{t('submitCodeBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setErrorMsg(null);
                  }}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300 underline cursor-pointer"
                >
                  {lang === 'fa' ? 'تغییر شماره یا کلیدهای API' : 'Change phone number or credentials'}
                </button>
              </form>
            )}
          </>
        )}

        {/* Tab 2: StringSession Login */}
        {activeTab === 'session' && (
          <form onSubmit={handleSessionLogin} className="space-y-3.5">
            {renderApiCredentialsSection()}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                {t('sessionStringLabel')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="1BVts..."
                value={sessionString}
                onChange={(e) => setSessionString(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 caret-blue-600 dark:caret-sky-400 outline-none focus:border-blue-500 dark:focus:border-sky-500 resize-none transition dir-ltr"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700/50">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>
                  {lang === 'fa'
                    ? 'ذخیره امن نشست برای جابجایی سریع بین اکانت‌ها'
                    : 'Save encrypted session for fast multi-account switching'}
                </span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">AES-256</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              <span>{t('sessionLoginBtn')}</span>
            </button>
          </form>
        )}

        {/* Quick Demo Mode Vault Button */}
        {!isAddingAdditional && (
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800 text-center">
            <p className="text-[11px] text-slate-500 dark:text-zinc-500 mb-2">
              {lang === 'fa'
                ? 'می‌خواهید ابتدا بدون وارد کردن اکانت، تمامی پلیرها و فایل‌های نمونه را تست کنید؟'
                : 'Want to test all players, download links, and queue features first?'}
            </p>
            <button
              type="button"
              onClick={connectDemoMode}
              className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t('demoModeBtn')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

