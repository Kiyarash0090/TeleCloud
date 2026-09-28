import React from 'react';
import {
  ArrowUpDown,
  Filter,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { SortOption } from '../types';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../utils/formatters';

export function QuickFilters() {
  const {
    activeTab,
    selectedExtension,
    setSelectedExtension,
    availableExtensions,
    sortOption,
    setSortOption,
    filteredFiles,
    isSelectionMode,
    selectAllFiltered,
    selectedFileIds,
    hasMoreFiles,
    isLoadingMore,
    loadMoreFiles,
  } = useTelegram();
  const { t, lang } = useTheme();

  const totalFilteredSize = filteredFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="mb-2.5 sm:mb-4 select-none">
      {/* Main Toolbar Row */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5 py-1.5 px-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#18191d]/80 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
        {/* Left: Summary & Format Extension Chips */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {/* File count & total size + Live Channel Sync Badge */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-zinc-300 shrink-0 font-medium pe-2 border-e border-slate-200 dark:border-zinc-800">
            <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {filteredFiles.length} {lang === 'fa' ? 'فایل' : 'files'}
            </span>
            <span className="text-slate-300 dark:text-zinc-700 text-[10px]" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-zinc-400 text-[10px] sm:text-[11px]">
              {formatFileSize(totalFilteredSize)}
            </span>

            {activeTab === 'favorites' && (
              <span className="ms-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-[9px] sm:text-[10px] font-bold">
                {lang === 'fa' ? 'همه چت‌ها و کانال‌ها' : 'All Chats'}
              </span>
            )}

            {hasMoreFiles && activeTab === 'files' && (
              <button
                onClick={() => {
                  if (!isLoadingMore) {
                    loadMoreFiles();
                  }
                }}
                disabled={isLoadingMore}
                title={
                  lang === 'fa'
                    ? 'کلیک برای بارگذاری دسته بعدی فایل‌های کانال'
                    : 'Click to load next batch of files'
                }
                className={`ms-0.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold transition cursor-pointer active:scale-95 disabled:opacity-60 ${
                  isLoadingMore
                    ? 'bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/30'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:text-blue-600 dark:hover:text-sky-400'
                }`}
              >
                {isLoadingMore ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-sky-400 animate-ping shrink-0" />
                ) : null}
                <span>
                  {isLoadingMore
                    ? lang === 'fa'
                      ? 'دریافت...'
                      : 'Loading...'
                    : lang === 'fa'
                    ? '+ بیشتر'
                    : '+ More'}
                </span>
              </button>
            )}
          </div>

          {/* Extension filter chips */}
          {availableExtensions.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="hidden lg:flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 ps-0.5">
                <Filter className="w-2.5 h-2.5 text-blue-500" />
                <span>{lang === 'fa' ? 'پسوند:' : 'Format:'}</span>
              </span>

              {availableExtensions.map((ext) => {
                const active = selectedExtension === ext;
                return (
                  <button
                    key={ext}
                    onClick={() => setSelectedExtension(active ? null : ext)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition shrink-0 cursor-pointer active:scale-95 border ${
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
                  className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Clear format filter"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Multi-select trigger & Sort Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Multi-select toggle button */}
          <button
            onClick={selectAllFiltered}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer active:scale-95 ${
              isSelectionMode
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 border border-blue-500/30'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
            title="Toggle Selection"
          >
            {isSelectionMode ? (
              <CheckSquare className="w-3 h-3 text-blue-500" />
            ) : (
              <Square className="w-3 h-3" />
            )}
            <span>
              {isSelectionMode
                ? lang === 'fa'
                  ? `${selectedFileIds.length} انتخاب`
                  : `${selectedFileIds.length} sel`
                : lang === 'fa'
                ? 'انتخاب گروهی'
                : 'Select'}
            </span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-zinc-500 absolute start-2 pointer-events-none" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label={t('sortBy')}
              className="ps-6 pe-5 py-1 min-h-[28px] text-[11px] font-bold rounded-lg bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200/70 dark:border-zinc-700/70 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
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
