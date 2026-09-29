import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Timer,
  Pause,
} from 'lucide-react';
import { useQueue } from '../context/QueueContext';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../utils/formatters';

const COMPLETED_DISMISS_MS = 5500;
const FAILED_DISMISS_MS = 8500;
const TICK_INTERVAL_MS = 80;

export const UploadQueueWidget: React.FC = () => {
  const {
    queue,
    cancelUpload,
    retryUpload,
    removeTask,
    clearCompleted,
    totalActiveCount,
  } = useQueue();
  const { activeAudio, refreshFiles } = useTelegram();
  const { lang } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Server background remote tasks polling state
  const [remoteTasks, setRemoteTasks] = useState<any[]>([]);
  const dismissedRemoteIdsRef = useRef<Set<string>>(new Set());
  const notifiedCompletedRemoteIdsRef = useRef<Set<string>>(new Set());

  // Per-task elapsed auto-dismiss timer (ms)
  const elapsedRef = useRef<Record<string, number>>({});
  const [elapsedMap, setElapsedMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchRemoteTasks = async () => {
      try {
        const res = await fetch('/api/telegram/remote-uploads');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.tasks)) {
            const now = Date.now();
            let shouldRefreshFiles = false;

            const activeOrRecent = data.tasks.filter((t: any) => {
              if (!t || !t.id) return false;
              if (t.status === 'running') {
                dismissedRemoteIdsRef.current.delete(t.id);
                return true;
              }
              if (dismissedRemoteIdsRef.current.has(t.id)) {
                return false;
              }
              if (
                t.status === 'completed' &&
                !notifiedCompletedRemoteIdsRef.current.has(t.id)
              ) {
                notifiedCompletedRemoteIdsRef.current.add(t.id);
                shouldRefreshFiles = true;
              }
              return t.startedAt ? now - t.startedAt < 120000 : true;
            });

            if (isMounted) {
              setRemoteTasks(activeOrRecent);
              if (shouldRefreshFiles) {
                refreshFiles();
              }
            }
          }
        }
      } catch {
        // ignore fetch error
      }
    };

    fetchRemoteTasks();
    const interval = setInterval(fetchRemoteTasks, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refreshFiles]);

  const handleDismissRemoteTask = useCallback((taskId: string) => {
    dismissedRemoteIdsRef.current.add(taskId);
    delete elapsedRef.current[taskId];
    setRemoteTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleCancelRemoteTask = async (taskId: string) => {
    try {
      await fetch(`/api/telegram/cancel-remote-upload/${taskId}`, { method: 'POST' });
      handleDismissRemoteTask(taskId);
    } catch {}
  };

  const handleDismissLocalTask = useCallback(
    (taskId: string) => {
      delete elapsedRef.current[taskId];
      removeTask(taskId);
    },
    [removeTask]
  );

  const handleClearAllFinished = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      for (const t of remoteTasks) {
        if (t.status !== 'running') {
          dismissedRemoteIdsRef.current.add(t.id);
          delete elapsedRef.current[t.id];
        }
      }
      for (const q of queue) {
        if (q.status !== 'uploading' && q.status !== 'queued') {
          delete elapsedRef.current[q.id];
        }
      }
      setRemoteTasks((prev) => prev.filter((t) => t.status === 'running'));
      clearCompleted();
      setElapsedMap({ ...elapsedRef.current });
    },
    [remoteTasks, queue, clearCompleted]
  );

  // Auto-dismiss countdown timer tick (pauses on hover/touch)
  useEffect(() => {
    const finishedRemote = remoteTasks.filter((t) => t.status !== 'running');
    const finishedLocal = queue.filter(
      (t) => t.status !== 'uploading' && t.status !== 'queued'
    );

    // Reset timer for any active/retried tasks
    for (const t of remoteTasks) {
      if (t.status === 'running' && elapsedRef.current[t.id]) {
        delete elapsedRef.current[t.id];
      }
    }
    for (const t of queue) {
      if ((t.status === 'uploading' || t.status === 'queued') && elapsedRef.current[t.id]) {
        delete elapsedRef.current[t.id];
      }
    }

    if (finishedRemote.length === 0 && finishedLocal.length === 0) {
      return;
    }

    if (isPaused) {
      return;
    }

    const timer = setInterval(() => {
      let changed = false;
      const remoteToDismiss: string[] = [];
      const localToDismiss: string[] = [];

      for (const t of finishedRemote) {
        const duration =
          t.status === 'completed' ? COMPLETED_DISMISS_MS : FAILED_DISMISS_MS;
        const nextElapsed = (elapsedRef.current[t.id] || 0) + TICK_INTERVAL_MS;
        elapsedRef.current[t.id] = nextElapsed;
        changed = true;
        if (nextElapsed >= duration) {
          remoteToDismiss.push(t.id);
        }
      }

      for (const t of finishedLocal) {
        const duration =
          t.status === 'completed' ? COMPLETED_DISMISS_MS : FAILED_DISMISS_MS;
        const nextElapsed = (elapsedRef.current[t.id] || 0) + TICK_INTERVAL_MS;
        elapsedRef.current[t.id] = nextElapsed;
        changed = true;
        if (nextElapsed >= duration) {
          localToDismiss.push(t.id);
        }
      }

      if (remoteToDismiss.length > 0) {
        for (const id of remoteToDismiss) {
          dismissedRemoteIdsRef.current.add(id);
          delete elapsedRef.current[id];
        }
        setRemoteTasks((prev) =>
          prev.filter((t) => !remoteToDismiss.includes(t.id))
        );
      }

      if (localToDismiss.length > 0) {
        for (const id of localToDismiss) {
          delete elapsedRef.current[id];
          removeTask(id);
        }
      }

      if (changed) {
        setElapsedMap({ ...elapsedRef.current });
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [remoteTasks, queue, isPaused, removeTask]);

  const activeRemoteCount = remoteTasks.filter((t) => t.status === 'running').length;
  const combinedActiveCount = totalActiveCount + activeRemoteCount;

  if (queue.length === 0 && remoteTasks.length === 0) return null;

  const finishedRemoteTasks = remoteTasks.filter((t) => t.status !== 'running');
  const finishedLocalTasks = queue.filter(
    (t) => t.status !== 'uploading' && t.status !== 'queued'
  );
  const totalFinishedCount = finishedRemoteTasks.length + finishedLocalTasks.length;
  const hasAnyError =
    finishedRemoteTasks.some((t) => t.status === 'failed') ||
    finishedLocalTasks.some((t) => t.status === 'failed' || t.status === 'cancelled');

  // Compute overall header countdown when all tasks are finished
  let maxRemainingMs = 0;
  let maxTotalMs = COMPLETED_DISMISS_MS;
  if (combinedActiveCount === 0 && totalFinishedCount > 0) {
    for (const t of finishedRemoteTasks) {
      const dur = t.status === 'completed' ? COMPLETED_DISMISS_MS : FAILED_DISMISS_MS;
      const rem = Math.max(0, dur - (elapsedMap[t.id] || 0));
      if (rem > maxRemainingMs) {
        maxRemainingMs = rem;
        maxTotalMs = dur;
      }
    }
    for (const t of finishedLocalTasks) {
      const dur = t.status === 'completed' ? COMPLETED_DISMISS_MS : FAILED_DISMISS_MS;
      const rem = Math.max(0, dur - (elapsedMap[t.id] || 0));
      if (rem > maxRemainingMs) {
        maxRemainingMs = rem;
        maxTotalMs = dur;
      }
    }
  }

  const headerRemainingPercent =
    combinedActiveCount === 0 && totalFinishedCount > 0
      ? Math.max(0, Math.min(100, (maxRemainingMs / maxTotalMs) * 100))
      : 0;
  const headerRemainingSec = Math.max(1, Math.ceil(maxRemainingMs / 1000));

  // Position dynamically so it never collides with MobileBottomNav or AudioPlayerBar
  const bottomPositionClass = activeAudio
    ? 'bottom-[154px] md:bottom-28'
    : 'bottom-[84px] md:bottom-6';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className={`fixed ${bottomPositionClass} inset-x-2.5 sm:inset-x-auto sm:end-4 z-40 sm:w-96 bg-white/95 dark:bg-[#1b1c20]/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 dark:border-zinc-800/90 shadow-[0_16px_44px_rgba(15,23,42,0.18)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.65)] overflow-hidden transition-all duration-200 select-none animate-in fade-in slide-in-from-bottom-3`}
    >
      {/* Header (CSS selector 1) */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="relative px-3.5 py-2.5 sm:px-4 sm:py-3 bg-slate-900/95 dark:bg-zinc-900 text-white flex items-center justify-between cursor-pointer overflow-hidden"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {combinedActiveCount > 0 ? (
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            </div>
          ) : hasAnyError ? (
            <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          )}

          <div className="min-w-0 flex flex-col">
            <span className="text-xs font-bold truncate leading-snug">
              {lang === 'fa'
                ? combinedActiveCount > 0
                  ? `در حال پردازش ${combinedActiveCount} تسک ابری...`
                  : hasAnyError
                  ? 'پایان عملیات با خطا'
                  : 'عملیات‌های ابری تکمیل شد'
                : combinedActiveCount > 0
                ? `Processing ${combinedActiveCount} cloud task(s)...`
                : hasAnyError
                ? 'Task finished with error'
                : 'Cloud task(s) complete'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Countdown Timer Pill when all tasks finished */}
          {combinedActiveCount === 0 && totalFinishedCount > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 text-[11px] font-mono tabular-nums text-slate-200"
              title={
                lang === 'fa'
                  ? isPaused
                    ? 'تایمر متوقف شده (نشانگر روی اعلان است)'
                    : `بسته شدن خودکار تا ${headerRemainingSec} ثانیه دیگر`
                  : isPaused
                  ? 'Timer paused while hovering'
                  : `Auto-dismiss in ${headerRemainingSec}s`
              }
            >
              {isPaused ? (
                <Pause className="w-3 h-3 text-amber-300 shrink-0" />
              ) : (
                <Timer className="w-3 h-3 text-emerald-300 animate-pulse shrink-0" />
              )}
              <span>{headerRemainingSec}s</span>
            </div>
          )}

          {totalFinishedCount > 0 && combinedActiveCount === 0 && (
            <button
              onClick={handleClearAllFinished}
              className="text-[11px] text-slate-200 hover:text-white hover:bg-rose-500/30 border border-white/10 px-2.5 py-0.5 rounded-lg bg-white/10 font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {lang === 'fa' ? 'پاک کردن' : 'Clear'}
            </button>
          )}

          <button
            type="button"
            className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Header Bottom Auto-Dismiss Timer Bar */}
        {combinedActiveCount === 0 && totalFinishedCount > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/10 overflow-hidden pointer-events-none">
            <div
              className={`h-full transition-all duration-100 ease-linear ${
                hasAnyError
                  ? 'bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400'
                  : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400'
              }`}
              style={{ width: `${headerRemainingPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Task List (CSS selector 2 parent) */}
      {!isCollapsed && (
        <div className="max-h-56 sm:max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80">
          {/* 1. Remote Server Background Transfer Tasks */}
          {remoteTasks.map((task) => {
            const isFinished = task.status !== 'running';
            const totalDuration =
              task.status === 'completed' ? COMPLETED_DISMISS_MS : FAILED_DISMISS_MS;
            const elapsed = elapsedMap[task.id] || 0;
            const remainingMs = Math.max(0, totalDuration - elapsed);
            const remainingPercent = isFinished
              ? Math.max(0, Math.min(100, (remainingMs / totalDuration) * 100))
              : 100;
            const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));

            return (
              <div
                key={task.id}
                className={`relative p-2.5 sm:p-3.5 flex flex-col gap-1.5 transition-colors ${
                  task.status === 'completed'
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/15'
                    : task.status === 'failed'
                    ? 'bg-rose-50/40 dark:bg-rose-950/15'
                    : 'bg-blue-50/40 dark:bg-sky-950/20'
                }`}
              >
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
                      <span className="flex items-center gap-0.5 text-[10px] font-mono tabular-nums font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300/40 px-1.5 py-0.5 rounded-md">
                        <Zap className="w-3 h-3 fill-current" />
                        <span>{task.speed}</span>
                      </span>
                    )}

                    <span
                      dir="ltr"
                      className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400 dir-ltr inline-block"
                    >
                      {task.status === 'running'
                        ? `${task.progress}%`
                        : formatFileSize(task.totalSize || task.loadedSize)}
                    </span>

                    {isFinished && (
                      <span
                        dir="ltr"
                        className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-zinc-500 px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80"
                        title={
                          lang === 'fa'
                            ? `حذف خودکار تا ${remainingSec} ثانیه دیگر`
                            : `Auto-dismiss in ${remainingSec}s`
                        }
                      >
                        {remainingSec}s
                      </span>
                    )}

                    {task.status === 'running' ? (
                      <button
                        type="button"
                        onClick={() => handleCancelRemoteTask(task.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title={lang === 'fa' ? 'لغو انتقال' : 'Cancel'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDismissRemoteTask(task.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                        title={lang === 'fa' ? 'بستن اعلان' : 'Dismiss'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Phase Info */}
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                  <span
                    className={`font-bold ${
                      task.status === 'completed'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : task.status === 'failed'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-blue-600 dark:text-sky-400'
                    }`}
                  >
                    {task.phase === 'downloading'
                      ? lang === 'fa'
                        ? 'فاز ۱: دریافت از سرور...'
                        : 'Phase 1: Downloading...'
                      : task.phase === 'uploading'
                      ? lang === 'fa'
                        ? 'فاز ۲: ارسال به تلگرام...'
                        : 'Phase 2: Sending to Telegram...'
                      : task.status === 'completed'
                      ? lang === 'fa'
                        ? 'با موفقیت در تلگرام ذخیره شد'
                        : 'Saved to Telegram'
                      : lang === 'fa'
                      ? 'خطا در انتقال'
                      : 'Failed'}
                  </span>

                  <span
                    dir="ltr"
                    className="font-mono tabular-nums dir-ltr inline-block"
                  >
                    {formatFileSize(task.loadedSize)} /{' '}
                    {formatFileSize(task.totalSize || task.loadedSize)}
                  </span>
                </div>

                {/* Progress Bar for Running Task */}
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

                {/* Per-Item Auto-Dismiss Countdown Timer Bar */}
                {isFinished && (
                  <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-slate-200/60 dark:bg-zinc-800/80 overflow-hidden pointer-events-none">
                    <div
                      className={`h-full transition-all duration-100 ease-linear ${
                        task.status === 'completed'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-rose-500 to-amber-500'
                      }`}
                      style={{ width: `${remainingPercent}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. Standard Local Upload Queue */}
          {queue.map((task) => {
            const isFinished =
              task.status !== 'uploading' && task.status !== 'queued';
            const totalDuration =
              task.status === 'completed' ? COMPLETED_DISMISS_MS : FAILED_DISMISS_MS;
            const elapsed = elapsedMap[task.id] || 0;
            const remainingMs = Math.max(0, totalDuration - elapsed);
            const remainingPercent = isFinished
              ? Math.max(0, Math.min(100, (remainingMs / totalDuration) * 100))
              : 100;
            const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));

            return (
              <div
                key={task.id}
                className={`relative p-2.5 sm:p-3.5 flex flex-col gap-1.5 transition-colors ${
                  task.status === 'completed'
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                    : task.status === 'failed' || task.status === 'cancelled'
                    ? 'bg-rose-50/30 dark:bg-rose-950/10'
                    : ''
                }`}
              >
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
                    <div className="min-w-0 flex flex-col">
                      <span
                        className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate"
                        title={task.name}
                        dir="auto"
                      >
                        {task.name}
                      </span>
                      {task.targetChatTitle && (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate" dir="auto">
                          {lang === 'fa' ? `مقصد: ${task.targetChatTitle}` : `To: ${task.targetChatTitle}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {task.status === 'uploading' && task.speed && (
                      <span className="text-[10px] font-mono tabular-nums text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                        {task.speed}
                      </span>
                    )}
                    <span
                      dir="ltr"
                      className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400 dir-ltr inline-block"
                    >
                      {task.status === 'uploading'
                        ? `${task.progress}%`
                        : formatFileSize(task.size)}
                    </span>

                    {isFinished && (
                      <span
                        dir="ltr"
                        className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-zinc-500 px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80"
                        title={
                          lang === 'fa'
                            ? `حذف خودکار تا ${remainingSec} ثانیه دیگر`
                            : `Auto-dismiss in ${remainingSec}s`
                        }
                      >
                        {remainingSec}s
                      </span>
                    )}

                    {(task.status === 'uploading' || task.status === 'queued') && (
                      <button
                        type="button"
                        onClick={() => cancelUpload(task.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title={lang === 'fa' ? 'لغو آپلود' : 'Cancel'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(task.status === 'failed' || task.status === 'cancelled') && (
                      <button
                        type="button"
                        onClick={() => retryUpload(task.id)}
                        className="p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                        title={lang === 'fa' ? 'تلاش مجدد' : 'Retry'}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isFinished && (
                      <button
                        type="button"
                        onClick={() => handleDismissLocalTask(task.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                        title={lang === 'fa' ? 'بستن اعلان' : 'Dismiss'}
                      >
                        <X className="w-3.5 h-3.5" />
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

                {/* Per-Item Auto-Dismiss Countdown Timer Bar */}
                {isFinished && (
                  <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-slate-200/60 dark:bg-zinc-800/80 overflow-hidden pointer-events-none">
                    <div
                      className={`h-full transition-all duration-100 ease-linear ${
                        task.status === 'completed'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-rose-500 to-amber-500'
                      }`}
                      style={{ width: `${remainingPercent}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
