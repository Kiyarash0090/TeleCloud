import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Bookmark, MessageSquare, Radio, Bot, Users, Check, Loader2, RefreshCw, Lock, Archive } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTelegram } from '../context/TelegramContext';
import { TelegramChat } from '../types';

interface ChatSelectorModalProps {
  onClose: () => void;
}

export const ChatSelectorModal: React.FC<ChatSelectorModalProps> = ({ onClose }) => {
  const { lang } = useTheme();
  const { activePeer, setActivePeer, setActiveTab, isDemoMode } = useTelegram();

  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const fetchChats = useCallback(async (forceRefresh = false) => {
    if (isDemoMode) {
      setChats([
        { id: 'me', title: lang === 'fa' ? 'پیام‌های ذخیره‌شده (Saved Messages)' : 'Saved Messages', type: 'saved', username: 'me', isPrivate: true, canUpload: true, canDelete: true, isAdmin: true },
        { id: '-1001548293849', title: lang === 'fa' ? 'کانال فیلم و سریال (Movies Channel)' : 'Movies & Media Channel', type: 'channel', username: 'telecloud_movies', isPrivate: false, canUpload: false, canDelete: false, isAdmin: false },
        { id: '-1001928374650', title: lang === 'fa' ? 'کانال خصوصی پروژه (Private VIP)' : 'Private Project Channel', type: 'channel', username: '', isPrivate: true, canUpload: true, canDelete: true, isAdmin: true },
        { id: '-948271625', title: lang === 'fa' ? 'گروه خصوصی تیم (Team Group)' : 'Private Team Group', type: 'group', username: '', isPrivate: true, canUpload: true, canDelete: true, isAdmin: true },
        { id: '-1001847592038', title: lang === 'fa' ? 'آرشیو موزیک (Music Vault)' : 'Music Archive Bot Vault', type: 'bot', username: 'music_bot', isPrivate: false, canUpload: true, canDelete: true, isAdmin: false },
        { id: '184920491', title: lang === 'fa' ? 'گفتگوی شخصی (John Doe)' : 'John Doe (PV)', type: 'user', username: 'johndoe', isPrivate: false, canUpload: true, canDelete: true, isAdmin: false },
        { id: '294817263', title: lang === 'fa' ? 'علی محمدی (پی‌وی بدون آیدی)' : 'Ali Mohammadi (Private PV)', type: 'user', username: '', isPrivate: true, canUpload: true, canDelete: true, isAdmin: false },
      ]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetch(`/api/telegram/chats${forceRefresh ? '?refresh=1' : ''}`);
      const data = await res.json();
      if (data.success) {
        setChats(data.chats || []);
      }
    } catch (e) {
      console.error('Failed to fetch chats:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isDemoMode, lang]);

  useEffect(() => {
    fetchChats(false);
  }, [fetchChats]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchChats(true);
    };
    window.addEventListener('telecloud-pull-refresh', handleGlobalRefresh);
    return () => window.removeEventListener('telecloud-pull-refresh', handleGlobalRefresh);
  }, [fetchChats]);

  const listRef = React.useRef<HTMLDivElement>(null);
  const pullStartYRef = React.useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!listRef.current || listRef.current.scrollTop > 2 || isLoading || isRefreshing) return;
    pullStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartYRef.current === null || !listRef.current) return;
    if (listRef.current.scrollTop > 2) {
      pullStartYRef.current = null;
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - pullStartYRef.current;
    if (delta > 0) {
      setPullDistance(Math.min(90, delta * 0.45));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (pullStartYRef.current === null) return;
    pullStartYRef.current = null;
    if (pullDistance >= 52 && !isRefreshing && !isLoading) {
      setPullDistance(48);
      fetchChats(true).finally(() => setPullDistance(0));
    } else {
      setPullDistance(0);
    }
  };

  const handleSelectChat = (chat: TelegramChat) => {
    setActiveTab('files');
    setActivePeer(chat.id, chat.title, chat);
    onClose();
  };

  const counts = React.useMemo(() => {
    return {
      all: chats.length,
      user: chats.filter((c) => c.type === 'user' || c.type === 'service').length,
      group: chats.filter((c) => c.type === 'group' || c.type === 'supergroup').length,
      channel: chats.filter((c) => c.type === 'channel').length,
      private: chats.filter((c) => c.type !== 'saved' && !c.username).length,
      bot: chats.filter((c) => c.type === 'bot').length,
    };
  }, [chats]);

  const filteredChats = chats.filter((chat) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      chat.title.toLowerCase().includes(q) ||
      (chat.username && chat.username.toLowerCase().includes(q)) ||
      chat.id.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedTypeFilter === 'all') return true;
    if (selectedTypeFilter === 'saved') return chat.type === 'saved';
    if (selectedTypeFilter === 'user') return chat.type === 'user' || chat.type === 'service';
    if (selectedTypeFilter === 'group') return chat.type === 'group' || chat.type === 'supergroup';
    if (selectedTypeFilter === 'channel') return chat.type === 'channel';
    if (selectedTypeFilter === 'private') return chat.type !== 'saved' && !chat.username;
    if (selectedTypeFilter === 'bot') return chat.type === 'bot';

    return true;
  });

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'saved':
        return <Bookmark className="w-5 h-5 text-blue-500" />;
      case 'channel':
        return <Radio className="w-5 h-5 text-purple-500" />;
      case 'bot':
        return <Bot className="w-5 h-5 text-emerald-500" />;
      case 'group':
      case 'supergroup':
        return <Users className="w-5 h-5 text-amber-500" />;
      default:
        return <MessageSquare className="w-5 h-5 text-sky-500" />;
    }
  };

  const getChatTypeLabel = (chat: TelegramChat) => {
    const hasPublicUsername = Boolean(chat.username && chat.username !== 'me');
    switch (chat.type) {
      case 'saved':
        return lang === 'fa' ? 'فضای ابری شخصی' : 'Personal Cloud';
      case 'channel':
        return hasPublicUsername
          ? (lang === 'fa' ? 'کانال عمومی' : 'Public Channel')
          : (lang === 'fa' ? 'کانال خصوصی' : 'Private Channel');
      case 'group':
      case 'supergroup':
        return hasPublicUsername
          ? (lang === 'fa' ? 'گروه عمومی' : 'Public Group')
          : (lang === 'fa' ? 'گروه خصوصی' : 'Private Group');
      case 'bot':
        return lang === 'fa' ? 'ربات' : 'Bot';
      default:
        return lang === 'fa' ? 'پی‌وی (شخصی)' : 'Direct Chat (PV)';
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/65 dark:bg-black/75 sm:backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#11141C] w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200/80 dark:border-white/[0.08] shadow-2xl shadow-slate-900/20 dark:shadow-black/70 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[85dvh] flex flex-col"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                {lang === 'fa' ? 'انتخاب چت، گروه، کانال یا پی‌وی' : 'Select Chat, Group, Channel or PV'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {lang === 'fa'
                  ? 'شامل تمام پی‌وی‌ها، گروه‌ها و کانال‌های خصوصی و عمومی اکانت شما'
                  : 'Includes all your private & public channels, groups, bots, and PVs'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center active:scale-90 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 sm:px-6 space-y-3 bg-[#F4F6FA]/85 dark:bg-[#090B10]/60 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'fa' ? 'جستجو در نام چت، آیدی یا شماره شناسه...' : 'Search by chat name, @username, or ID...'}
              className="w-full h-10 ps-10 pe-4 bg-white dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-sky-400 transition"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {[
              { id: 'all', label: lang === 'fa' ? 'همه' : 'All', count: counts.all },
              { id: 'user', label: lang === 'fa' ? 'پی‌وی‌ها' : 'PVs', count: counts.user },
              { id: 'group', label: lang === 'fa' ? 'گروه‌ها' : 'Groups', count: counts.group },
              { id: 'channel', label: lang === 'fa' ? 'کانال‌ها' : 'Channels', count: counts.channel },
              { id: 'private', label: lang === 'fa' ? 'خصوصی (بدون آیدی)' : 'Private Only', count: counts.private },
              { id: 'bot', label: lang === 'fa' ? 'ربات‌ها' : 'Bots', count: counts.bot },
              { id: 'saved', label: lang === 'fa' ? 'سیو مسیج' : 'Saved' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTypeFilter(tab.id)}
                className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTypeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#171B26] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232938] border border-slate-200/80 dark:border-white/[0.08]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      selectedTypeFilter === tab.id
                        ? 'text-blue-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    · {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div
          ref={listRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 overscroll-y-contain"
        >
          {(pullDistance > 0 || isRefreshing) && (
            <div
              className="flex items-center justify-center overflow-hidden transition-all duration-150"
              style={{ height: isRefreshing ? 44 : pullDistance }}
            >
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#171B26] border border-slate-200/80 dark:border-white/[0.08] shadow-md flex items-center justify-center">
                <RefreshCw
                  className={`w-4 h-4 text-blue-600 dark:text-sky-400 ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                  style={
                    !isRefreshing
                      ? { transform: `rotate(${Math.round(pullDistance * 4)}deg)` }
                      : undefined
                  }
                />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {lang === 'fa' ? 'در حال استخراج تمام پی‌وی‌ها، گروه‌ها و کانال‌های خصوصی و عمومی...' : 'Extracting all your PVs, private groups & channels...'}
              </p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs font-medium">
              {lang === 'fa' ? 'هیچ چتی با این مشخصات یافت نشد' : 'No chats found matching your query'}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = activePeer === chat.id;
              const isPrivateNoUsername = chat.type !== 'saved' && !chat.username;
              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-500/10 border-blue-300 dark:border-sky-500/40 shadow-2xs'
                      : 'bg-white dark:bg-[#171B26]/80 border-slate-200/80 dark:border-white/[0.07] hover:border-blue-400/70 dark:hover:border-sky-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F4F6FA] dark:bg-[#11141C] border border-slate-200/50 dark:border-white/[0.06] flex items-center justify-center shrink-0">
                      {getChatIcon(chat.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate" dir="auto">
                          {chat.title}
                        </h4>
                        <span
                          className={`text-[11px] font-medium inline-flex items-center gap-1 ${
                            chat.type === 'saved'
                              ? 'text-blue-600 dark:text-sky-400'
                              : isPrivateNoUsername
                              ? 'text-violet-600 dark:text-violet-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {isPrivateNoUsername && <Lock className="w-3 h-3" />}
                          <span>{getChatTypeLabel(chat)}</span>
                        </span>
                        {chat.isAdmin && chat.type !== 'saved' && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            · {lang === 'fa' ? 'ادمین' : 'Admin'}
                          </span>
                        )}
                        {chat.canUpload === false && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            · {lang === 'fa' ? 'فقط خواندنی' : 'Read-Only'}
                          </span>
                        )}
                        {chat.isArchived && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium inline-flex items-center gap-0.5">
                            · <Archive className="w-3 h-3" />
                            <span>{lang === 'fa' ? 'آرشیو' : 'Archived'}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-mono tabular-nums mt-0.5" dir="ltr">
                        {chat.username && chat.username !== 'me'
                          ? `@${chat.username}`
                          : chat.type === 'saved'
                          ? 'Saved Messages'
                          : `Private · ID: ${chat.id}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono tabular-nums text-[10px] font-bold">
                        {chat.unreadCount}
                      </span>
                    ) : null}

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

