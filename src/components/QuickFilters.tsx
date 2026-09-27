import React from 'react';
import {
  Folder,
  Image,
  Video,
  Music,
  FileText,
  Archive,
  ArrowUpDown,
  Filter,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
  X,
} from 'lucide-react';
import { FileCategory, SortOption } from '../types';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../utils/formatters';

export function QuickFilters() {
  const {
    selectedCategory,
    setSelectedCategory,
    selectedExtension,
    setSelectedExtension,
    availableExtensions,
    sortOption,
    setSortOption,
    filteredFiles,
    stats,
    isSelectionMode,
    selectAllFiltered,
    selectedFileIds,
    clearSelection,
  } = useTelegram();
  const { t, lang } = useTheme();

  const pills: {
    id: FileCategory;
    label: string;
    icon: React.ElementType;
    count?: number;
  }[] = [
    { id: 'all', label: t('allFiles'), icon: Folder, count: stats?.totalFiles },
    { id: 'images', label: t('images').split(' ')[0], icon: Image, count: stats?.categories.images.count },
    { id: 'videos', label: t('videos').split(' ')[0], icon: Video, count: stats?.categories.videos.count },
    { id: 'audio', label: t('audio').split(' ')[0], icon: Music, count: stats?.categories.audio.count },
    { id: 'documents', label: t('documents').split(' ')[0], icon: FileText, count: stats?.categories.documents.count },
    { id: 'archives', label: t('archives').split(' ')[0], icon: Archive, count: stats?.categories.archives.count },
  ];

  const totalFilteredSize = filteredFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="mb-4 sm:mb-5 flex flex-col gap-2.5 select-none">
      {/* Mobile Category Carousel (Hidden on Desktop since Sidebar has full navigation) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-2.5 px-2.5 scroll-smooth">
        {pills.map((p) => {
          const Icon = p.icon;
          const active = selectedCategory === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setSelectedCategory(p.id);
                setSelectedExtension(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer active:scale-95 ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-slate-400 dark:text-zinc-400'}`} />
              <span>{p.label}</span>
              {p.count !== undefined && p.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  {p.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop & Mobile Main Toolbar Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 py-2 px-3 sm:px-4 rounded-2xl bg-white/75 dark:bg-[#18191d]/75 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
        {/* Left: Summary & Format Extension Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {/* File count & total size */}
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300 shrink-0 font-medium pe-2 border-e border-slate-200 dark:border-zinc-800">
            <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {filteredFiles.length} {lang === 'fa' ? 'فایل' : 'files'}
            </span>
            <span className="text-slate-300 dark:text-zinc-700" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-zinc-400 text-[11px]">
              {formatFileSize(totalFilteredSize)}
            </span>
          </div>

          {/* Extension filter chips */}
          {availableExtensions.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-zinc-500 ps-1">
                <Filter className="w-3 h-3 text-blue-500" />
                <span>{lang === 'fa' ? 'پسوند:' : 'Format:'}</span>
              </span>

              {availableExtensions.map((ext) => {
                const active = selectedExtension === ext;
                return (
                  <button
                    key={ext}
                    onClick={() => setSelectedExtension(active ? null : ext)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition shrink-0 cursor-pointer active:scale-95 border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-100/80 dark:bg-zinc-800/80 border-slate-200/70 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-zinc-700/80'
                    }`}
                  >
                    {ext.toUpperCase()}
                  </button>
                );
              })}

              {selectedExtension && (
                <button
                  onClick={() => setSelectedExtension(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Clear format filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Multi-select trigger & Sort Selector */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Multi-select toggle button */}
          <button
            onClick={selectAllFiltered}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
              isSelectionMode
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 border border-blue-500/30'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
            title="Toggle Selection"
          >
            {isSelectionMode ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            <span>
              {isSelectionMode
                ? lang === 'fa'
                  ? `${selectedFileIds.length} انتخاب‌شده`
                  : `${selectedFileIds.length} selected`
                : lang === 'fa'
                ? 'انتخاب گروهی'
                : 'Select'}
            </span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute start-2.5 pointer-events-none" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label={t('sortBy')}
              className="ps-8 pe-6 py-1.5 min-h-[32px] text-xs font-bold rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200/70 dark:border-zinc-700/70 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
            >
              <option value="date_desc">{t('newest')}</option>
              <option value="date_asc">{t('oldest')}</option>
              <option value="size_desc">{t('largest')}</option>
              <option value="size_asc">{t('smallest')}</option>
              <option value="name_asc">{t('nameAsc')}</option>
              <option value="name_desc">{t('nameDesc')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
