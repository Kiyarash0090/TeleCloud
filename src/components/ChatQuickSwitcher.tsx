import React, { useRef, useEffect } from 'react';
import {
  Bookmark,
  Radio,
  Users,
  MessageSquare,
  Bot,
  Search,
  Lock,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { TelegramChat } from '../types';

export function ChatQuickSwitcher() {
  const {
    activePeer,
    setActivePeer,
    setActiveTab,
    setIsChatSelectorOpen,
    chats,
    isLoadingChats,
    quickFilter,
    setQuickFilter,
    filteredChats,
  } = useTelegram();
  const { lang } = useTheme();

  const stripRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const strip = stripRef.current;
    const chip = activeChipRef.current;
    if (strip && chip) {
      const targetLeft = chip.offsetLeft - strip.clientWidth / 2 + chip.offsetWidth / 2;
      strip.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
    }
  }, [activePeer, quickFilter, filteredChats.length]);

  const handleSelectChat = (chat: TelegramChat) => {
    setActiveTab('files');
    setActivePeer(chat.id, chat.title, chat);
  };

  const getChipIcon = (chat: TelegramChat, isSelected: boolean) => {
    const iconClass = `w-3.5 h-3.5 shrink-0 ${
      isSelected
        ? 'text-white'
        : chat.type === 'saved'
        ? 'text-blue-600 dark:text-sky-400'
        : chat.type === 'channel'
        ? 'text-violet-500'
        : chat.type === 'group' || chat.type === 'supergroup'
        ? 'text-amber-500'
        : chat.type === 'bot'
        ? 'text-emerald-500'
        : 'text-sky-500'
    }`;

    switch (chat.type) {
      case 'saved':
        return <Bookmark className={iconClass} />;
      case 'channel':
        return <Radio className={iconClass} />;
      case 'group':
      case 'supergroup':
        return <Users className={iconClass} />;
      case 'bot':
        return <Bot className={iconClass} />;
      default:
        return <MessageSquare className={iconClass} />;
    }
  };

  const isSavedMessages = !activePeer || activePeer === 'me';

  return (
    <div
      data-chat-switcher="true"
      className="mb-2.5 sm:mb-3 rounded-2xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.075] shadow-[var(--shadow-card)] p-2 sm:p-2.5 select-none"
    >
      {/* Top Row: Segmented Chat Filter Tabs + All Chats Search Trigger */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-[#ECEFF5]/90 dark:bg-[#171B26] overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: lang === 'fa' ? 'همه' : 'All' },
            { id: 'channel', label: lang === 'fa' ? 'کانال‌ها' : 'Channels' },
            { id: 'group', label: lang === 'fa' ? 'گروه‌ها' : 'Groups' },
            { id: 'user', label: lang === 'fa' ? 'پی‌وی و ربات' : 'PVs & Bots' },
          ].map((tab) => {
            const active = quickFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQuickFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#232938] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsChatSelectorOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#ECEFF5]/90 dark:bg-[#171B26] hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-colors active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          title={lang === 'fa' ? 'جستجو در همه چت‌ها' : 'Search all chats'}
        >
          <Search className="w-3 h-3 shrink-0" />
          <span>{lang === 'fa' ? 'همه چت‌ها' : 'All Chats'}</span>
          {chats.length > 1 && (
            <span className="font-mono tabular-nums text-[10px] opacity-75">
              {chats.length}
            </span>
          )}
        </button>
      </div>

      {/* Horizontal Scrollable Chats Strip (Left-to-Right tab order like Telegram) */}
      <div
        ref={stripRef}
        dir="ltr"
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {filteredChats.slice(0, 60).map((chat) => {
          const isSelected =
            (chat.id === 'me' && isSavedMessages) || activePeer === chat.id;
          const isPrivateNoUsername = chat.type !== 'saved' && !chat.username;
          const displayTitle =
            chat.id === 'me' || chat.type === 'saved'
              ? lang === 'fa'
                ? 'سیو مسیج'
                : 'Saved'
              : chat.title;

          return (
            <button
              key={chat.id}
              ref={isSelected ? (el) => { activeChipRef.current = el; } : undefined}
              type="button"
              onClick={() => handleSelectChat(chat)}
              className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                  : 'bg-[#F4F6FA] dark:bg-[#171B26] hover:bg-slate-200/70 dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-300 border-slate-200/75 dark:border-white/[0.06]'
              }`}
            >
              {getChipIcon(chat, isSelected)}
              <span className="truncate max-w-[120px] sm:max-w-[155px]" dir="auto">
                {displayTitle}
              </span>
              {isPrivateNoUsername && (
                <Lock
                  className={`w-2.5 h-2.5 shrink-0 ${
                    isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
              )}
              {chat.unreadCount && chat.unreadCount > 0 ? (
                <span
                  className={`text-[10px] font-mono tabular-nums font-bold ${
                    isSelected
                      ? 'text-blue-100'
                      : 'text-blue-600 dark:text-sky-400'
                  }`}
                >
                  · {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </span>
              ) : null}
            </button>
          );
        })}

        {filteredChats.length === 0 && !isLoadingChats && (
          <div className="text-xs text-slate-400 dark:text-slate-500 py-1 px-2">
            {lang === 'fa' ? 'موردی در این بخش یافت نشد' : 'No chats found in this tab'}
          </div>
        )}
      </div>
    </div>
  );
}
