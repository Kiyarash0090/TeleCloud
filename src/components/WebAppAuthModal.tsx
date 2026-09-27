import React, { useState } from 'react';
import { Lock, Key, Shield, ArrowRight, Loader2, Cloud } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';

export function WebAppAuthModal() {
  const { webLogin } = useTelegram();
  const { t } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const ok = await webLogin(username, password);
    if (!ok) {
      setError('Invalid username or password. Check .env credentials.');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1e1f20] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-zinc-800 p-7 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shadow-xl mb-4 overflow-hidden p-2.5">
            <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-zinc-100">
            {t('webAuthTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            {t('webAuthSubtitle')}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              {t('usernameLabel')}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full h-11 px-4 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              {t('passwordLabel')}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-4 rounded-xl bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>{t('loginAppBtn')}</span>
          </button>
        </form>

        <p className="text-[11px] text-slate-500 dark:text-zinc-500 text-center mt-6">
          TeleCloud • Secure Telegram MTProto Gateway
        </p>
      </div>
    </div>
  );
}
