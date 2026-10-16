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

  // Auto-scroll the active channel tab into view smoothly
  useEffect(() => {
    if (activeChipRef.current && stripRef.current) {
      activeChipRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activePeer, quickFilter, filteredChats.length]);

  const handleSelectChat = (chat: TelegramChat) => {
    setActiveTab('files');
    setActivePeer(chat.id, chat.title, chat);
  };

  const getChipIcon = (chat: TelegramChat, isSelected: boolean) => {
    const iconClass = `w-3 h-3 shrink-0 ${
      isSelected
        ? 'text-white'
        : chat.type === 'saved'
        ? 'text-blue-500'
        : chat.type === 'channel'
        ? 'text-purple-500'
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
      className="mb-2 sm:mb-2.5 rounded-xl bg-white/90 dark:bg-[#18191d]/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 p-1.5 sm:p-2 shadow-2xs select-none"
    >
      {/* Compact Top Row: Category Tabs + Search Button */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: lang === 'fa' ? 'همه' : 'All' },
            { id: 'channel', label: lang === 'fa' ? 'کانال‌ها' : 'Channels' },
            { id: 'group', label: lang === 'fa' ? 'گروه‌ها' : 'Groups' },
            { id: 'user', label: lang === 'fa' ? 'پی‌وی و ربات' : 'PVs & Bots' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQuickFilter(tab.id as any)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 transition cursor-pointer ${
                quickFilter === tab.id
                  ? 'bg-blue-600/15 text-blue-600 dark:text-sky-400 border border-blue-500/30'
                  : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsChatSelectorOpen(true)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-600 dark:text-zinc-300 text-[10px] font-bold transition active:scale-95 cursor-pointer shrink-0"
          title={lang === 'fa' ? 'جستجو در همه چت‌ها' : 'Search all chats'}
        >
          <Search className="w-2.5 h-2.5 shrink-0" />
          <span>{lang === 'fa' ? 'جستجو' : 'Search'}</span>
          {chats.length > 1 && (
            <span className="px-1 rounded bg-black/10 dark:bg-white/10 font-mono text-[9px]">
              {chats.length}
            </span>
          )}
        </button>
      </div>

      {/* Horizontal Scrollable Channels Strip */}
      <div
        ref={stripRef}
        className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth"
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
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-all active:scale-95 cursor-pointer border ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white border-transparent shadow-2xs font-bold'
                  : 'bg-slate-50/90 dark:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/70 dark:border-zinc-700/60'
              }`}
            >
              {getChipIcon(chat, isSelected)}
              <span className="truncate max-w-[110px] sm:max-w-[145px]" dir="auto">
                {displayTitle}
              </span>
              {isPrivateNoUsername && (
                <Lock
                  className={`w-2.5 h-2.5 shrink-0 ${
                    isSelected ? 'text-white/80' : 'text-slate-400 dark:text-zinc-500'
                  }`}
                />
              )}
              {chat.unreadCount && chat.unreadCount > 0 ? (
                <span
                  className={`px-1 py-0.1 rounded-full text-[8px] font-mono font-bold ${
                    isSelected
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </span>
              ) : null}
            </button>
          );
        })}

        {filteredChats.length === 0 && !isLoadingChats && (
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 py-0.5 px-1.5">
            {lang === 'fa' ? 'موردی در این تب یافت نشد' : 'No items found in this tab'}
          </div>
        )}
      </div>
    </div>
  );
}
