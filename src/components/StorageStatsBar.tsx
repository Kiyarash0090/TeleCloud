import React, { useState } from 'react';
import { Image, Video, Music, FileText, Archive, HardDrive, ChevronDown, ChevronUp } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../utils/formatters';

export function StorageStatsBar() {
  const { stats } = useTelegram();
  const { t, lang } = useTheme();
  const [expandedMobile, setExpandedMobile] = useState(false);

  if (!stats || stats.totalFiles === 0) return null;

  const totalSize = stats.totalSize || 1;

  const items = [
    {
      id: 'images',
      label: t('images').split(' ')[0],
      icon: Image,
      color: 'bg-rose-500',
      textColor: 'text-rose-500',
      bgLight: 'bg-rose-500/10',
      size: stats.categories.images.size,
      count: stats.categories.images.count,
    },
    {
      id: 'videos',
      label: t('videos').split(' ')[0],
      icon: Video,
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      bgLight: 'bg-amber-500/10',
      size: stats.categories.videos.size,
      count: stats.categories.videos.count,
    },
    {
      id: 'audio',
      label: t('audio').split(' ')[0],
      icon: Music,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      bgLight: 'bg-emerald-500/10',
      size: stats.categories.audio.size,
      count: stats.categories.audio.count,
    },
    {
      id: 'documents',
      label: t('documents').split(' ')[0],
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      bgLight: 'bg-blue-500/10',
      size: stats.categories.documents.size,
      count: stats.categories.documents.count,
    },
    {
      id: 'archives',
      label: t('archives').split(' ')[0],
      icon: Archive,
      color: 'bg-purple-500',
      textColor: 'text-purple-500',
      bgLight: 'bg-purple-500/10',
      size: stats.categories.archives.size,
      count: stats.categories.archives.count,
    },
  ];

  return (
    <div className="mb-3 sm:mb-5 p-3 sm:p-5 rounded-2xl bg-white dark:bg-[#1e1f20] border border-slate-200/80 dark:border-zinc-800/80 shadow-xs select-none">
      <div
        onClick={() => setExpandedMobile(!expandedMobile)}
        className="flex items-center justify-between gap-2 cursor-pointer sm:cursor-default"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-sky-400 shrink-0">
            <HardDrive className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {t('storageUsed')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate font-mono">
              {stats.totalFiles} {lang === 'fa' ? 'فایل' : 'files'} •{' '}
              <span className="font-bold text-blue-600 dark:text-sky-400">
                {formatFileSize(stats.totalSize)}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          className="sm:hidden p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
          aria-label="Toggle storage details"
        >
          {expandedMobile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Multi-segment bar */}
      <div className="w-full h-2 sm:h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5 mt-2.5 sm:mt-3.5">
        {items.map((s) => {
          const pct = Math.max((s.size / totalSize) * 100, s.count > 0 ? 4 : 0);
          if (pct === 0) return null;
          return (
            <div
              key={s.id}
              style={{ width: `${pct}%` }}
              className={`${s.color} h-full first:rounded-s-full last:rounded-e-full transition-all duration-500`}
              title={`${s.label}: ${formatFileSize(s.size)}`}
            />
          );
        })}
      </div>

      {/* Category breakdown cards - collapsible on mobile */}
      <div
        className={`${
          expandedMobile ? 'grid mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800' : 'hidden sm:grid sm:mt-4'
        } grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5`}
      >
        {items.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60"
            >
              <div className={`w-7 h-7 rounded-lg ${s.bgLight} ${s.textColor} flex items-center justify-center shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate">
                  {s.label} ({s.count})
                </div>
                <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                  {formatFileSize(s.size)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
