import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  UploadCloud,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useQueue } from '../context/QueueContext';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../utils/formatters';

export const UploadQueueWidget: React.FC = () => {
  const { queue, cancelUpload, retryUpload, clearCompleted, totalActiveCount } = useQueue();
  const { activeAudio, refreshFiles } = useTelegram();
  const { lang } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Server background remote tasks polling state
  const [remoteTasks, setRemoteTasks] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchRemoteTasks = async () => {
      try {
        const res = await fetch('/api/telegram/remote-uploads');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.tasks)) {
            // Filter running tasks or tasks completed within last 15 seconds
            const now = Date.now();
            const activeOrRecent = data.tasks.filter((t: any) => 
              t.status === 'running' || (t.startedAt && now - t.startedAt < 60000)
            );
            if (isMounted) setRemoteTasks(activeOrRecent);
          }
        }
      } catch (e) {
        // ignore fetch error
      }
    };

    fetchRemoteTasks();
    const interval = setInterval(fetchRemoteTasks, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleCancelRemoteTask = async (taskId: string) => {
    try {
      await fetch(`/api/telegram/cancel-remote-upload/${taskId}`, { method: 'POST' });
      setRemoteTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (e) {}
  };

  const activeRemoteCount = remoteTasks.filter((t) => t.status === 'running').length;
  const combinedActiveCount = totalActiveCount + activeRemoteCount;

  if (queue.length === 0 && remoteTasks.length === 0) return null;

  const completedCount = queue.filter((t) => t.status === 'completed').length + remoteTasks.filter((t) => t.status === 'completed').length;

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
          {combinedActiveCount > 0 ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
          ) : (
            <UploadCloud className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-bold truncate">
            {lang === 'fa'
              ? combinedActiveCount > 0
                ? `در حال پردازش ${combinedActiveCount} تسک ابری...`
                : `عملیات‌های ابری تکمیل شد`
              : combinedActiveCount > 0
              ? `Processing ${combinedActiveCount} cloud task(s)...`
              : `Cloud task(s) complete`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {completedCount > 0 && combinedActiveCount === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearCompleted();
                setRemoteTasks([]);
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
        <div className="max-h-56 sm:max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80">
          
          {/* 1. Remote Server Background Transfer Tasks */}
          {remoteTasks.map((task) => (
            <div key={task.id} className="p-2.5 sm:p-3 flex flex-col gap-1.5 bg-blue-50/40 dark:bg-sky-950/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {task.status === 'running' && (
                    <Loader2 className="w-4 h-4 text-sky-500 animate-spin shrink-0" />
                  )}
                  {task.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  {task.status === 'failed' && (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span
                    className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate"
                    title={task.filename}
                  >
                    {task.filename}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {task.status === 'running' && task.speed && (
                    <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300/40 px-1.5 py-0.5 rounded-full">
                      <Zap className="w-3 h-3 fill-current" />
                      <span>{task.speed}</span>
                    </span>
                  )}

                  <span dir="ltr" className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 dir-ltr inline-block">
                    {task.status === 'running'
                      ? `${task.progress}%`
                      : formatFileSize(task.totalSize || task.loadedSize)}
                  </span>

                  {task.status === 'running' && (
                    <button
                      onClick={() => handleCancelRemoteTask(task.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                      title={lang === 'fa' ? 'لغو انتقال' : 'Cancel'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Phase Info */}
              <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                <span className="text-blue-600 dark:text-sky-400 font-bold">
                  {task.phase === 'downloading'
                    ? (lang === 'fa' ? 'فاز ۱: دریافت از سرور...' : 'Phase 1: Downloading...')
                    : task.phase === 'uploading'
                    ? (lang === 'fa' ? 'فاز ۲: ارسال به تلگرام...' : 'Phase 2: Sending to Telegram...')
                    : task.status === 'completed'
                    ? (lang === 'fa' ? 'ارسال شد' : 'Completed')
                    : (lang === 'fa' ? 'خطا در انتقال' : 'Failed')}
                </span>

                <span dir="ltr" className="font-mono dir-ltr inline-block">
                  {formatFileSize(task.loadedSize)} / {formatFileSize(task.totalSize || task.loadedSize)}
                </span>
              </div>

              {/* Progress Bar */}
              {task.status === 'running' && (
                <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.max(2, task.progress)}%` }}
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

          {/* 2. Standard Local Upload Queue */}
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
                  <span dir="ltr" className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 dir-ltr inline-block">
                    {task.status === 'uploading'
                      ? `${task.progress}%`
                      : formatFileSize(task.size)}
                  </span>

                  {(task.status === 'uploading' || task.status === 'queued') && (
                    <button
                      onClick={() => cancelUpload(task.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                      title={lang === 'fa' ? 'لغو آپلود' : 'Cancel'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {(task.status === 'failed' || task.status === 'cancelled') && (
                    <button
                      onClick={() => retryUpload(task.id)}
                      className="p-1 text-blue-500 hover:text-blue-600 rounded-lg cursor-pointer"
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
