import React from 'react';
import {
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
  ChevronDown,
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
    <div data-quick-filters="true" className="mb-3 sm:mb-4 select-none">
      {/* Unboxed Clean Workspace Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-1 px-0.5">
        {/* Left: Unboxed Metadata Summary & Interactive Format Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0 font-medium pe-2.5 border-e border-slate-200/90 dark:border-white/[0.08]">
            <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {filteredFiles.length} {lang === 'fa' ? 'فایل' : 'files'}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-mono tabular-nums text-[11px] dir-ltr inline-block" dir="ltr">
              {formatFileSize(totalFilteredSize)}
            </span>

            {activeTab === 'favorites' && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  {lang === 'fa' ? 'همه چت‌ها' : 'All Chats'}
                </span>
              </>
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
                    ? 'کلیک برای بارگذاری دسته بعدی فایل‌ها'
                    : 'Click to load next batch of files'
                }
                className="ms-1 text-[11px] font-semibold text-blue-600 dark:text-sky-400 hover:underline transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {isLoadingMore
                  ? lang === 'fa'
                    ? 'در حال دریافت...'
                    : 'Loading...'
                  : lang === 'fa'
                  ? '+ دریافت بیشتر'
                  : '+ Load more'}
              </button>
            )}
          </div>

          {/* Interactive Extension Filter Buttons */}
          {availableExtensions.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {availableExtensions.map((ext) => {
                const active = selectedExtension === ext;
                return (
                  <button
                    key={ext}
                    onClick={() => setSelectedExtension(active ? null : ext)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all duration-150 shrink-0 cursor-pointer active:scale-95 ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.075] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-white/15'
                    }`}
                  >
                    {ext.toUpperCase()}
                  </button>
                );
              })}

              {selectedExtension && (
                <button
                  onClick={() => setSelectedExtension(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition cursor-pointer"
                  title="Clear format filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Multi-Select & Sort Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={selectAllFiltered}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 whitespace-nowrap ${
              isSelectionMode
                ? 'bg-blue-600/10 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/25'
                : 'bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.075] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/15'
            }`}
            title="Toggle Selection"
          >
            {isSelectionMode ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            <span className="tabular-nums">
              {isSelectionMode
                ? lang === 'fa'
                  ? `${selectedFileIds.length} انتخاب`
                  : `${selectedFileIds.length} selected`
                : lang === 'fa'
                ? 'انتخاب گروهی'
                : 'Select'}
            </span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute start-2.5 pointer-events-none" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label={t('sortBy')}
              className="ps-8 pe-7 py-1.5 min-h-[34px] text-xs font-semibold rounded-xl bg-white dark:bg-[#11141C] border border-slate-200/80 dark:border-white/[0.075] hover:border-slate-300 dark:hover:border-white/15 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none transition-colors"
            >
              <option value="date_desc">{t('newest')}</option>
              <option value="date_asc">{t('oldest')}</option>
              <option value="size_desc">{t('largest')}</option>
              <option value="size_asc">{t('smallest')}</option>
              <option value="name_asc">{t('nameAsc')}</option>
              <option value="name_desc">{t('nameDesc')}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute end-2.5 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
