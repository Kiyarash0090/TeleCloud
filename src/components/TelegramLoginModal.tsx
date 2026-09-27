import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  Key, 
  Phone, 
  Lock, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Info, 
  ExternalLink,
  Loader2,
  Code,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';

export function TelegramLoginModal({ onClose }: { onClose: () => void }) {
  const { checkTelegramStatus, connectDemoMode } = useTelegram();
  const { t, lang } = useTheme();

  const [activeTab, setActiveTab] = useState<'phone' | 'session'>('phone');
  const [step, setStep] = useState<'request' | 'verify'>('request');

  // Form fields
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
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

  // Check if server has default credentials configured
  useEffect(() => {
    fetch('/api/auth/web-status')
      .then(r => r.json())
      .then(data => {
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
      setErrorMsg(lang === 'fa' ? 'لطفاً شناسه API ID، API Hash و شماره موبایل را وارد نمایید.' : 'Please enter API ID, API Hash, and Phone Number.');
      return;
    }

    if (!/^\d+$/.test(cleanApiId)) {
      setErrorMsg(lang === 'fa' ? 'شناسه API ID باید فقط شامل اعداد باشد (مثال: 12345678).' : 'API ID must be digits only (e.g. 12345678).');
      return;
    }

    if (cleanApiHash.length < 10) {
      setErrorMsg(lang === 'fa' ? 'کد API Hash باید رشته معتبر از my.telegram.org باشد.' : 'API Hash must be a valid string from my.telegram.org.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setErrorHelp(null);

    try {
      const res = await fetch('/api/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiId: cleanApiId, apiHash: cleanApiHash, phoneNumber: cleanPhone }),
      });

      const data = await res.json();
      if (data.success) {
        setStep('verify');
      } else {
        setErrorMsg(data.error || 'Failed to send verification code');
        if (data.help) setErrorHelp(data.help);
        if (data.code === 'API_ID_INVALID') setShowApiGuide(true);
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
      setErrorMsg(lang === 'fa' ? 'لطفاً کد تایید را وارد کنید' : 'Please enter the verification code');
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
        setErrorMsg(lang === 'fa' ? 'رمز تایید دو مرحله‌ای (2FA) برای این حساب فعال است. لطفاً آن را وارد کنید.' : '2-Step Verification password (2FA) is required for this account.');
      } else if (data.success) {
        if (rememberMe && data.encryptedToken) {
          localStorage.setItem('telecloud_encrypted_session', data.encryptedToken);
        }
        await checkTelegramStatus();
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
      setErrorMsg(lang === 'fa' ? 'شناسه API ID، API Hash و رشته Session الزامی هستند.' : 'API ID, API Hash, and Session String are required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setErrorHelp(null);

    try {
      const res = await fetch('/api/telegram/session-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiId: apiId.trim(), apiHash: apiHash.trim(), sessionString: sessionString.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        if (rememberMe && data.encryptedToken) {
          localStorage.setItem('telecloud_encrypted_session', data.encryptedToken);
        }
        await checkTelegramStatus();
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
              <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100">
                {t('loginTitle')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400">
                {t('loginSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 my-4 p-1 bg-slate-100 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/50 dark:border-zinc-700/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('phone');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
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
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
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

        {/* Expandable API ID Guide */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowApiGuide(!showApiGuide)}
            className="w-full p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-blue-700 dark:text-sky-300 text-xs font-medium flex items-center justify-between hover:bg-blue-100/80 dark:hover:bg-blue-900/40 transition"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              {lang === 'fa' ? 'راهنمای دریافت رایگان API ID و API Hash (در ۳۰ ثانیه)' : 'How to get free API ID & API Hash (in 30s)'}
            </span>
            {showApiGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
                <li>روی گزینه <strong>API development tools</strong> کلیک کنید.</li>
                <li>یک نام دلخواه (مثلاً <code className="bg-slate-200 dark:bg-zinc-700 px-1 rounded font-mono">TeleCloud</code>) بنویسید و Create App را بزنید.</li>
                <li>کد <strong>api_id</strong> (فقط عدد) و <strong>api_hash</strong> تولید شده را در کادرهای زیر کپی کنید.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Tab 1: Phone + OTP Flow */}
        {activeTab === 'phone' && (
          <>
            {step === 'request' ? (
              <form onSubmit={handleSendCode} className="space-y-3.5">
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
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
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
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    {t('phoneNumberLabel')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+989123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-sm font-mono tracking-widest text-center text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
                  />
                </div>

                {needs2FA && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      {t('enterPasswordLabel')}
                    </label>
                    <input
                      type="password"
                      placeholder="Your 2FA Password"
                      value={password2FA}
                      onChange={(e) => setPassword2FA(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
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
                    <span>{lang === 'fa' ? 'مرا به خاطر بسپار (ذخیره امن رمزنگاری‌شده)' : 'Remember Me (Encrypted Session)'}</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">AES-256</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{t('submitCodeBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setErrorMsg(null);
                  }}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300 underline"
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                {t('apiIdLabel')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="12345678"
                value={apiId}
                onChange={(e) => setApiId(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                {t('apiHashLabel')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="0123456789abcdef0123456789abcdef"
                value={apiHash}
                onChange={(e) => setApiHash(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
              />
            </div>

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
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 resize-none transition"
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
                <span>{lang === 'fa' ? 'مرا به خاطر بسپار (ذخیره امن رمزنگاری‌شده)' : 'Remember Me (Encrypted Session)'}</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">AES-256</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              <span>{t('sessionLoginBtn')}</span>
            </button>
          </form>
        )}

        {/* Quick Demo Mode Vault Button */}
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 mb-2">
            {lang === 'fa' 
              ? 'می‌خواهید ابتدا بدون وارد کردن اکانت، تمامی پلیرها و فایل‌های نمونه را تست کنید؟' 
              : 'Want to test all players, download links, and queue features first?'}
          </p>
          <button
            type="button"
            onClick={connectDemoMode}
            className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{t('demoModeBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
