import React, { useState, useEffect } from 'react';
import { X, Search, Bookmark, MessageSquare, Radio, Bot, Users, Check, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTelegram } from '../context/TelegramContext';
import { TelegramChat } from '../types';

interface ChatSelectorModalProps {
  onClose: () => void;
}

export const ChatSelectorModal: React.FC<ChatSelectorModalProps> = ({ onClose }) => {
  const { t, lang } = useTheme();
  const { activePeer, setActivePeer, refreshFiles, isDemoMode } = useTelegram();

  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (isDemoMode) {
      setChats([
        { id: 'me', title: lang === 'fa' ? 'پیام‌های ذخیره‌شده (Saved Messages)' : 'Saved Messages', type: 'saved', username: 'me' },
        { id: '-1001548293849', title: lang === 'fa' ? 'کانال فیلم و سریال (Movies Channel)' : 'Movies & Media Channel', type: 'channel', username: 'telecloud_movies' },
        { id: '-1001847592038', title: lang === 'fa' ? 'آرشیو موزیک (Music Vault)' : 'Music Archive Bot Vault', type: 'bot', username: 'music_bot' },
        { id: '184920491', title: lang === 'fa' ? 'گفتگوی شخصی (John Doe)' : 'John Doe (PV)', type: 'user', username: 'johndoe' },
      ]);
      setIsLoading(false);
      return;
    }

    const fetchChats = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/telegram/chats');
        const data = await res.json();
        if (data.success) {
          setChats(data.chats || []);
        }
      } catch (e) {
        console.error('Failed to fetch chats:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [isDemoMode, lang]);

  const handleSelectChat = (chat: TelegramChat) => {
    setActivePeer(chat.id, chat.title);
    refreshFiles();
    onClose();
  };

  const filteredChats = chats.filter((chat) => {
    const matchesSearch =
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.username && chat.username.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedTypeFilter === 'all') return true;
    if (selectedTypeFilter === 'saved') return chat.type === 'saved';
    if (selectedTypeFilter === 'channel') return chat.type === 'channel';
    if (selectedTypeFilter === 'bot') return chat.type === 'bot';
    if (selectedTypeFilter === 'user') return chat.type === 'user' || chat.type === 'group' || chat.type === 'supergroup';

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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1e1f20] w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[85dvh] flex flex-col"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {lang === 'fa' ? 'انتخاب چت، کانال یا ربات' : 'Select Chat, Channel or Bot'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                {lang === 'fa'
                  ? 'منبع فایل‌ها و محتوای ابری تله‌کلاد را تغییر دهید'
                  : 'Switch your TeleCloud storage source chat or channel'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 sm:px-6 space-y-3 bg-slate-50/50 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'fa' ? 'جستجو در چت‌ها، کانال‌ها، ربات‌ها...' : 'Search chats, channels, bots...'}
              className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: lang === 'fa' ? 'همه' : 'All' },
              { id: 'saved', label: lang === 'fa' ? 'پیام‌های ذخیره‌شده' : 'Saved' },
              { id: 'channel', label: lang === 'fa' ? 'کانال‌ها' : 'Channels' },
              { id: 'bot', label: lang === 'fa' ? 'ربات‌ها' : 'Bots' },
              { id: 'user', label: lang === 'fa' ? 'پی‌وی و گروه‌ها' : 'Chats & Groups' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                  selectedTypeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                {lang === 'fa' ? 'در حال استخراج چت‌ها و کانال‌های تلگرام...' : 'Extracting your Telegram chats & channels...'}
              </p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-zinc-500 text-xs font-medium">
              {lang === 'fa' ? 'هیچ چتی با این مشخصات یافت نشد' : 'No chats found matching your query'}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = activePeer === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
                      : 'bg-white dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-700/80 flex items-center justify-center shrink-0">
                      {getChatIcon(chat.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate" dir="auto">
                          {chat.title}
                        </h4>
                        {chat.type === 'saved' ? (
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-medium">
                            {lang === 'fa' ? 'خواندن و آپلود' : 'Read & Upload'}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-medium">
                            {lang === 'fa' ? 'فقط خواندنی' : 'Read-Only'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate font-mono">
                        {chat.username ? `@${chat.username}` : `ID: ${chat.id}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold">
                        {chat.unreadCount}
                      </span>
                    ) : null}

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
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
