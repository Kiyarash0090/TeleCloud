import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  UploadCloud,
  RotateCcw,
} from 'lucide-react';
import { useQueue } from '../context/QueueContext';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../utils/formatters';

export const UploadQueueWidget: React.FC = () => {
  const { queue, cancelUpload, retryUpload, clearCompleted, totalActiveCount } = useQueue();
  const { activeAudio } = useTelegram();
  const { lang } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (queue.length === 0) return null;

  const completedCount = queue.filter((t) => t.status === 'completed').length;

  // Position dynamically so it never collides with MobileBottomNav or AudioPlayerBar
  const bottomPositionClass = activeAudio
    ? 'bottom-[136px] md:bottom-24'
    : 'bottom-[68px] md:bottom-5';

  return (
    <div
      className={`fixed ${bottomPositionClass} inset-x-2.5 sm:inset-x-auto sm:end-4 z-40 sm:w-96 bg-white dark:bg-[#1e1f20] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all duration-200 select-none`}
    >
      {/* Header */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-slate-900 dark:bg-zinc-800 text-white flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {totalActiveCount > 0 ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
          ) : (
            <UploadCloud className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-bold truncate">
            {lang === 'fa'
              ? totalActiveCount > 0
                ? `در حال آپلود ${totalActiveCount} فایل در سیو مسیج...`
                : `${completedCount} فایل آپلود شد`
              : totalActiveCount > 0
              ? `Uploading ${totalActiveCount} file(s)...`
              : `${completedCount} upload(s) complete`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {completedCount > 0 && totalActiveCount === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearCompleted();
              }}
              className="text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded-lg bg-white/10 font-medium"
            >
              {lang === 'fa' ? 'پاک کردن' : 'Clear'}
            </button>
          )}
          <button className="p-1 text-slate-300 hover:text-white">
            {isCollapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Task List */}
      {!isCollapsed && (
        <div className="max-h-48 sm:max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80">
          {queue.map((task) => (
            <div key={task.id} className="p-2.5 sm:p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {task.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                  )}
                  {task.status === 'queued' && (
                    <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0 ms-1" />
                  )}
                  {task.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  {(task.status === 'failed' || task.status === 'cancelled') && (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span
                    className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate"
                    title={task.name}
                    dir="auto"
                  >
                    {task.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {task.status === 'uploading' && task.speed && (
                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                      {task.speed}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                    {task.status === 'uploading'
                      ? `${task.progress}%`
                      : formatFileSize(task.size)}
                  </span>

                  {(task.status === 'uploading' || task.status === 'queued') && (
                    <button
                      onClick={() => cancelUpload(task.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg"
                      title={lang === 'fa' ? 'لغو آپلود' : 'Cancel'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {(task.status === 'failed' || task.status === 'cancelled') && (
                    <button
                      onClick={() => retryUpload(task.id)}
                      className="p-1 text-blue-500 hover:text-blue-600 rounded-lg"
                      title={lang === 'fa' ? 'تلاش مجدد' : 'Retry'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {(task.status === 'uploading' || task.status === 'queued') && (
                <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}

              {task.error && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400 leading-tight">
                  {task.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
