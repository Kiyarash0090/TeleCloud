import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { SavedTelegramAccount } from '../types';

const AVATAR_GRADIENTS = [
  'from-blue-600 to-sky-400',
  'from-emerald-500 to-teal-400',
  'from-violet-600 to-indigo-400',
  'from-rose-500 to-orange-400',
  'from-amber-500 to-yellow-400',
  'from-cyan-600 to-blue-400',
];

function getAvatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function AccountSwitcherDrawer() {
  const {
    accounts,
    user,
    activeAccountId,
    switchAccount,
    setIsLoginModalOpen,
    isSwitchingAccount,
    isConnected,
    isDemoMode,
    isAccountDrawerOpen,
    setIsAccountDrawerOpen,
  } = useTelegram();
  const { lang } = useTheme();

  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isAccountDrawerOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 160);
      return () => clearTimeout(timer);
    }
  }, [isAccountDrawerOpen, shouldRender]);

  const requestClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsAccountDrawerOpen(false);
    }, 150);
  }, [setIsAccountDrawerOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAccountDrawerOpen) {
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAccountDrawerOpen, requestClose]);

  if (!shouldRender) return null;

  // Ensure current connected user is always represented in the list
  const displayAccounts: SavedTelegramAccount[] =
    accounts.length > 0
      ? accounts
      : isConnected && user
      ? [
          {
            id: String(user.id),
            user,
            encryptedToken: '',
            addedAt: Date.now(),
            lastActiveAt: Date.now(),
          },
        ]
      : [];

  const handleSelectAccount = async (accountId: string) => {
    if (switchingId || isSwitchingAccount) return;
    const isCurrentActive =
      (accountId === String(user?.id) || accountId === activeAccountId) &&
      isConnected &&
      !isDemoMode;

    if (isCurrentActive) {
      requestClose();
      return;
    }

    setSwitchingId(accountId);
    try {
      await switchAccount(accountId);
    } finally {
      setSwitchingId(null);
      requestClose();
    }
  };

  const handleAddAccountClick = () => {
    requestClose();
    setTimeout(() => {
      setIsLoginModalOpen(true);
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-50 select-none">
      {/* Dimmed backdrop - adapts to Light & Dark mode */}
      <div
        onClick={requestClose}
        className={`fixed inset-0 bg-slate-900/25 dark:bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Floating Compact Telegram-Style Account Popover Menu with Light & Dark Theme Support */}
      <div
        className={`fixed bottom-16 end-3 sm:end-8 w-64 sm:w-72 bg-white/95 dark:bg-[#232524]/95 backdrop-blur-2xl text-slate-800 dark:text-[#ececec] rounded-3xl border border-slate-200/90 dark:border-zinc-700/60 shadow-[0_18px_48px_rgba(15,23,42,0.18)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.55)] overflow-hidden z-50 flex flex-col account-popover-origin transition-colors duration-200 ${
          isClosing ? 'account-popover-exit' : 'account-popover-enter'
        }`}
      >
        {/* Top Header Row: "افزودن حساب کاربری" with circular (+) icon */}
        <button
          onClick={handleAddAccountClick}
          className="w-full flex items-center justify-between p-3.5 px-4 hover:bg-slate-100/80 active:bg-slate-200/60 dark:hover:bg-white/5 dark:active:bg-white/10 transition-colors cursor-pointer text-start group"
        >
          <span className="text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
            {lang === 'fa' ? 'افزودن حساب کاربری' : 'Add Account'}
          </span>
          <div className="w-6 h-6 rounded-full border-[1.8px] border-blue-600 dark:border-zinc-300 group-hover:border-blue-700 dark:group-hover:border-white bg-blue-50/50 dark:bg-transparent flex items-center justify-center text-blue-600 dark:text-zinc-200 group-hover:scale-105 transition-all shrink-0">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </button>

        {/* Separator Line */}
        <div className="h-px bg-slate-200/80 dark:bg-zinc-700/50 w-full" />

        {/* Accounts List */}
        <div className="max-h-72 overflow-y-auto py-1.5 no-scrollbar">
          {displayAccounts.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-400 font-medium">
              {lang === 'fa' ? 'هیچ حسابی ذخیره نشده است' : 'No accounts saved'}
            </div>
          ) : (
            displayAccounts.map((acc) => {
              const isActive =
                (String(acc.id) === String(user?.id) || String(acc.id) === String(activeAccountId)) &&
                isConnected &&
                !isDemoMode;
              const isSwitchingThis = switchingId === acc.id;
              const accUser = acc.user;
              const fullName =
                `${accUser.firstName || ''} ${accUser.lastName || ''}`.trim() || 'Telegram User';
              const photo = accUser.photoUrl;
              const gradientClass = getAvatarGradient(String(acc.id || fullName));

              return (
                <button
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc.id)}
                  disabled={isSwitchingThis || isSwitchingAccount}
                  className={`w-full flex items-center justify-between gap-3 py-2.5 px-4 hover:bg-slate-100/80 active:bg-slate-200/60 dark:hover:bg-white/5 dark:active:bg-white/10 transition-all cursor-pointer text-start ${
                    isActive
                      ? 'bg-blue-50/80 dark:bg-white/[0.05]'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar with Smart Active Ring & Small Blue Checkmark Badge */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr ${gradientClass} text-white flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                          isActive
                            ? 'ring-2 ring-blue-500 dark:ring-sky-400 ring-offset-2 ring-offset-white dark:ring-offset-[#232524] shadow-sm shadow-blue-500/25'
                            : 'border border-slate-200 dark:border-zinc-600/60'
                        }`}
                      >
                        {photo && !failedPhotos[acc.id] ? (
                          <img
                            src={photo}
                            alt={fullName}
                            onError={() =>
                              setFailedPhotos((prev) => ({ ...prev, [acc.id]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{fullName[0]?.toUpperCase() || 'U'}</span>
                        )}
                      </div>

                      {/* Small Blue Checkmark Badge on Active Avatar */}
                      {isSwitchingThis ? (
                        <div className="absolute -bottom-1 -end-1 w-4 h-4 rounded-full bg-blue-600 dark:bg-sky-500 text-white ring-2 ring-white dark:ring-[#232524] flex items-center justify-center shadow-xs">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        </div>
                      ) : isActive ? (
                        <div className="absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full bg-blue-600 dark:bg-sky-500 text-white ring-2 ring-white dark:ring-[#232524] flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                        </div>
                      ) : null}
                    </div>

                    {/* Account Name */}
                    <span
                      className={`text-sm truncate transition-colors ${
                        isActive
                          ? 'font-bold text-blue-600 dark:text-white'
                          : 'font-medium text-slate-700 dark:text-zinc-200'
                      }`}
                    >
                      {fullName}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
