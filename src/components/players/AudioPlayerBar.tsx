import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  RotateCcw,
  RotateCw,
  Download,
  Copy,
  Check,
  X,
  Music,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  ListMusic,
  ChevronUp,
  ChevronDown,
  Share2,
  Disc3,
} from 'lucide-react';
import { useTelegram, useBackHandler } from '../../context/TelegramContext';
import { formatDuration, formatFileSize, getFileExtension } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

export function AudioPlayerBar() {
  const {
    activeTab,
    files,
    favoriteFiles,
    activeVideo,
    activeAudio,
    setActiveAudio,
    isPlayingAudio,
    setIsPlayingAudio,
    setShareModalFile,
  } = useTelegram();
  const { t, lang } = useTheme();

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const expandedProgressBarRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [showRemainingTime, setShowRemainingTime] = useState(false);

  useBackHandler(Boolean(activeAudio && isMobileExpanded), () => setIsMobileExpanded(false));
  useBackHandler(Boolean(activeAudio && showPlaylist), () => setShowPlaylist(false));
  useBackHandler(Boolean(activeAudio && showSpeedMenu), () => setShowSpeedMenu(false));

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);

  // Touch swipe state on mini-bar (Swipe Left/Right = Next/Prev track, Swipe Up = Expand)
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);

  // Filter audio files for playlist
  const sourceList = activeTab === 'favorites' ? favoriteFiles : files;
  const audioFiles = sourceList.filter((f) => f.category === 'audio');
  const currentIndex = activeAudio
    ? audioFiles.findIndex(
        (f) => f.id === activeAudio.id && (f.originPeer || 'me') === (activeAudio.originPeer || 'me')
      )
    : -1;

  const effectiveDuration =
    activeAudio?.duration && activeAudio.duration > 0
      ? activeAudio.duration
      : duration > 0
      ? duration
      : 0;

  const progressPercent =
    effectiveDuration > 0
      ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))
      : 0;

  const handleNextTrack = useCallback(() => {
    if (audioFiles.length <= 1) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * audioFiles.length);
      setActiveAudio(audioFiles[randomIndex]);
    } else if (currentIndex < audioFiles.length - 1) {
      setActiveAudio(audioFiles[currentIndex + 1]);
    } else if (repeatMode === 'all') {
      setActiveAudio(audioFiles[0]);
    }
  }, [audioFiles, isShuffle, currentIndex, repeatMode, setActiveAudio]);

  const handlePrevTrack = useCallback(() => {
    if (audioFiles.length <= 1) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else if (currentIndex > 0) {
      setActiveAudio(audioFiles[currentIndex - 1]);
    } else if (repeatMode === 'all') {
      setActiveAudio(audioFiles[audioFiles.length - 1]);
    }
  }, [audioFiles, currentTime, currentIndex, repeatMode, setActiveAudio]);

  const skipTime = useCallback(
    (seconds: number) => {
      if (!audioRef.current) return;
      const maxDur = effectiveDuration || audioRef.current.duration || 100;
      const target = Math.max(0, Math.min(maxDur, currentTime + seconds));
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    },
    [currentTime, effectiveDuration]
  );

  useEffect(() => {
    if (activeAudio && audioRef.current) {
      setHasError(false);
      setCurrentTime(0);
      setBufferedPercent(0);
      setDuration(activeAudio.duration && activeAudio.duration > 0 ? activeAudio.duration : 0);
      const url = activeAudio.directUrl.startsWith('http')
        ? activeAudio.directUrl
        : `${window.location.origin}${activeAudio.directUrl}`;
      audioRef.current.src = url;
      audioRef.current.playbackRate = playbackRate;
      if (!activeVideo) {
        audioRef.current
          .play()
          .then(() => setIsPlayingAudio(true))
          .catch(() => {
            setIsPlayingAudio(false);
          });
      } else {
        setIsPlayingAudio(false);
      }
    }
  }, [activeAudio]);

  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const fadeOutAndPause = useCallback((onComplete?: () => void) => {
    if (!audioRef.current || audioRef.current.paused) {
      if (onComplete) onComplete();
      return;
    }
    clearFadeTimer();
    const startVolume = audioRef.current.volume;
    const targetConfiguredVolume = isMuted ? 0 : volume;
    const durationMs = 450;
    const stepMs = 25;
    const totalSteps = Math.floor(durationMs / stepMs);
    let currentStep = 0;

    fadeTimerRef.current = setInterval(() => {
      currentStep++;
      if (audioRef.current) {
        const factor = Math.max(0, 1 - currentStep / totalSteps);
        audioRef.current.volume = Math.max(0, startVolume * factor);
      }
      if (currentStep >= totalSteps) {
        clearFadeTimer();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.volume = targetConfiguredVolume;
        }
        if (onComplete) onComplete();
      }
    }, stepMs);
  }, [clearFadeTimer, isMuted, volume]);

  const playAndFadeIn = useCallback(() => {
    if (!audioRef.current || !audioRef.current.src) return;
    clearFadeTimer();
    const targetVolume = isMuted ? 0 : volume;
    audioRef.current.volume = 0;
    audioRef.current
      .play()
      .then(() => {
        setIsPlayingAudio(true);
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
        const durationMs = 450;
        const stepMs = 25;
        const totalSteps = Math.floor(durationMs / stepMs);
        let currentStep = 0;

        fadeTimerRef.current = setInterval(() => {
          currentStep++;
          if (audioRef.current) {
            const factor = Math.min(1, currentStep / totalSteps);
            audioRef.current.volume = Math.min(targetVolume, targetVolume * factor);
          }
          if (currentStep >= totalSteps) {
            clearFadeTimer();
            if (audioRef.current) {
              audioRef.current.volume = targetVolume;
            }
          }
        }, stepMs);
      })
      .catch(() => {
        setIsPlayingAudio(false);
      });
  }, [clearFadeTimer, isMuted, volume, setIsPlayingAudio]);

  useEffect(() => {
    return () => clearFadeTimer();
  }, [clearFadeTimer]);

  // Pause audio automatically with smooth fade-out when a video is opened or sync with global isPlayingAudio
  useEffect(() => {
    if (!audioRef.current || !activeAudio) return;

    if (activeVideo) {
      fadeOutAndPause(() => {
        if (isPlayingAudio) {
          setIsPlayingAudio(false);
        }
      });
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      return;
    }

    if (!isPlayingAudio && !audioRef.current.paused) {
      fadeOutAndPause();
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else if (isPlayingAudio && audioRef.current.paused && audioRef.current.src) {
      playAndFadeIn();
    }
  }, [activeVideo, isPlayingAudio, activeAudio, fadeOutAndPause, playAndFadeIn, setIsPlayingAudio]);

  // Native Mobile/Desktop MediaSession API integration (Lock Screen & Notification Controls)
  useEffect(() => {
    if (!activeAudio || typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeAudio.filename,
        artist: 'TeleCloud Stream',
        album: formatFileSize(activeAudio.size),
        artwork: activeAudio.thumbnailUrl
          ? [{ src: activeAudio.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().then(() => setIsPlayingAudio(true)).catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlayingAudio(false);
      });
      navigator.mediaSession.setActionHandler(
        'previoustrack',
        audioFiles.length > 1 ? handlePrevTrack : null
      );
      navigator.mediaSession.setActionHandler(
        'nexttrack',
        audioFiles.length > 1 ? handleNextTrack : null
      );
      navigator.mediaSession.setActionHandler('seekbackward', () => skipTime(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => skipTime(10));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    } catch {
      // Ignore unsupported mediaSession actions on older browsers
    }
  }, [activeAudio, audioFiles.length, handlePrevTrack, handleNextTrack, skipTime, setIsPlayingAudio]);

  if (!activeAudio) return null;

  const ext = getFileExtension(activeAudio.filename);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => {
          setIsPlayingAudio(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || isDraggingSeek) return;
    setCurrentTime(audioRef.current.currentTime);

    if (audioRef.current.buffered.length > 0) {
      const bufferedEnd = audioRef.current.buffered.end(audioRef.current.buffered.length - 1);
      const total = effectiveDuration || 1;
      setBufferedPercent(Math.min(100, (bufferedEnd / total) * 100));
    }

    const aDur = audioRef.current.duration;
    if ((!duration || duration <= 0) && aDur && !isNaN(aDur) && isFinite(aDur)) {
      setDuration(aDur);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const aDur = audioRef.current.duration;
      if (aDur && !isNaN(aDur) && isFinite(aDur) && aDur > 0) {
        setDuration(aDur);
      } else if (activeAudio.duration && activeAudio.duration > 0) {
        setDuration(activeAudio.duration);
      }
      setHasError(false);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (currentIndex < audioFiles.length - 1 || repeatMode === 'all' || isShuffle) {
      handleNextTrack();
    } else {
      setIsPlayingAudio(false);
    }
  };

  // Calculate time from mouse/touch event on a specific progress bar element
  const calculateTimeFromElement = (clientX: number, element: HTMLDivElement | null) => {
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percent = rect.width > 0 ? clickX / rect.width : 0;
    return percent * (effectiveDuration || 100);
  };

  const handleScrubMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    barElement: HTMLDivElement | null
  ) => {
    e.stopPropagation();
    setIsDraggingSeek(true);
    const target = calculateTimeFromElement(e.clientX, barElement);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newTarget = calculateTimeFromElement(moveEvent.clientX, barElement);
      if (audioRef.current) audioRef.current.currentTime = newTarget;
      setCurrentTime(newTarget);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      setIsDraggingSeek(false);
      const finalTarget = calculateTimeFromElement(upEvent.clientX, barElement);
      if (audioRef.current) audioRef.current.currentTime = finalTarget;
      setCurrentTime(finalTarget);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleScrubTouchStart = (
    e: React.TouchEvent<HTMLDivElement>,
    barElement: HTMLDivElement | null
  ) => {
    e.stopPropagation();
    if (!e.touches[0]) return;
    setIsDraggingSeek(true);
    const target = calculateTimeFromElement(e.touches[0].clientX, barElement);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleScrubTouchMove = (
    e: React.TouchEvent<HTMLDivElement>,
    barElement: HTMLDivElement | null
  ) => {
    e.stopPropagation();
    if (!e.touches[0]) return;
    const target = calculateTimeFromElement(e.touches[0].clientX, barElement);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleScrubTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingSeek(false);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = rect.width > 0 ? clickX / rect.width : 0;
    setHoverTime(percent * (effectiveDuration || 100));
    setHoverPosition(clickX);
  };

  // Touch gestures on Track Info area (Swipe Left/Right for Next/Prev, Swipe Up/Down for Expand/Collapse)
  const handleTrackTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setSwipeOffsetX(0);
  };

  const handleTrackTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      const canSwipe = audioFiles.length > 1;
      setSwipeOffsetX(canSwipe ? Math.max(-60, Math.min(60, dx * 0.5)) : dx * 0.15);
    }
  };

  const handleTrackTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch) {
      setSwipeOffsetX(0);
      return;
    }
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Vertical swipe up/down toggles expanded mobile view
    if (Math.abs(dy) > 35 && Math.abs(dy) > Math.abs(dx)) {
      if (dy < -35 && !isMobileExpanded) {
        if (navigator.vibrate) navigator.vibrate(15);
        setIsMobileExpanded(true);
      } else if (dy > 35 && isMobileExpanded) {
        if (navigator.vibrate) navigator.vibrate(15);
        setIsMobileExpanded(false);
      }
      setSwipeOffsetX(0);
      return;
    }

    // Horizontal swipe switches tracks
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) && audioFiles.length > 1) {
      if (navigator.vibrate) navigator.vibrate(15);
      if (dx < 0) {
        handleNextTrack();
      } else {
        handlePrevTrack();
      }
    }

    setSwipeOffsetX(0);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
    if (!newMuted && volume === 0) {
      setVolume(0.5);
      audioRef.current.volume = 0.5;
    }
  };

  const changeSpeed = (s: number) => {
    setPlaybackRate(s);
    setShowSpeedMenu(false);
    if (audioRef.current) {
      audioRef.current.playbackRate = s;
    }
  };

  const cycleRepeatMode = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const handleCopyLink = () => {
    const fullUrl = activeAudio.directUrl.startsWith('http')
      ? activeAudio.directUrl
      : `${window.location.origin}${activeAudio.directUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const closePlayer = () => {
    if (audioRef.current) audioRef.current.pause();
    setActiveAudio(null);
    setIsPlayingAudio(false);
    setIsMobileExpanded(false);
    setShowPlaylist(false);
  };

  return (
    <div className="fixed bottom-[74px] md:bottom-5 inset-x-0 md:max-w-4xl md:mx-auto z-40 px-2.5 sm:px-4 animate-in slide-in-from-bottom-4 duration-300 select-none">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={() => {
          setHasError(true);
          setIsPlayingAudio(false);
        }}
        onEnded={handleEnded}
      />

      {/* Playlist Queue Dropup Panel (Glassmorphic) */}
      {showPlaylist && (
        <div className="mb-2 bg-white/75 dark:bg-[#121316]/75 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/60 dark:border-white/15 p-3 max-h-60 sm:max-h-72 overflow-y-auto flex flex-col gap-1 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 ring-1 ring-black/5 dark:ring-white/5">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-zinc-200 font-bold">
            <span className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-emerald-500" />
              <span>
                {lang === 'fa'
                  ? `لیست پخش صوتی (${audioFiles.length} قطعه)`
                  : `Audio Queue (${audioFiles.length} tracks)`}
              </span>
            </span>
            <button
              onClick={() => setShowPlaylist(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            {audioFiles.map((file, idx) => {
              const isCurrent = file.id === activeAudio.id;
              return (
                <button
                  key={file.id}
                  onClick={() => {
                    setActiveAudio(file);
                    setShowPlaylist(false);
                  }}
                  className={`flex items-center justify-between gap-3 p-2 rounded-xl text-start transition ${
                    isCurrent
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
                      : 'hover:bg-white/50 dark:hover:bg-white/[0.07] text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-5 text-center text-[11px] text-slate-400 dark:text-zinc-500 font-mono shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold" dir="auto">
                        {file.filename}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 dark:text-zinc-400 shrink-0">
                    {Boolean(file.duration && file.duration > 0) && (
                      <span>{formatDuration(file.duration!)}</span>
                    )}
                    {isCurrent && isPlayingAudio && (
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 h-3 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="w-0.5 h-2 bg-emerald-500 rounded-full animate-pulse delay-75" />
                        <span className="w-0.5 h-3 bg-emerald-500 rounded-full animate-pulse delay-150" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Expanded Deck (Glassmorphic) */}
      {isMobileExpanded && (
        <div className="md:hidden mb-2 bg-white/80 dark:bg-[#121316]/80 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.25)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.65)] border border-white/60 dark:border-white/15 p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200 ring-1 ring-black/5 dark:ring-white/5">
          {/* Top Handle & Quick Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setIsMobileExpanded(false)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-zinc-400 active:scale-95"
            >
              <ChevronDown className="w-4 h-4" />
              <span>{lang === 'fa' ? 'جمع کردن پلیر' : 'Minimize'}</span>
            </button>

            <div className="flex items-center gap-1">
              {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                    playbackRate === s
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Full-Width Scrub Bar */}
          <div className="flex flex-col gap-1">
            <div
              ref={expandedProgressBarRef}
              onMouseDown={(e) => handleScrubMouseDown(e, expandedProgressBarRef.current)}
              onTouchStart={(e) => handleScrubTouchStart(e, expandedProgressBarRef.current)}
              onTouchMove={(e) => handleScrubTouchMove(e, expandedProgressBarRef.current)}
              onTouchEnd={handleScrubTouchEnd}
              className="relative w-full h-6 flex items-center cursor-pointer touch-none"
            >
              <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-slate-300 dark:bg-zinc-700 rounded-full transition-all duration-150"
                  style={{ width: `${bufferedPercent}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div
                className="absolute w-4 h-4 bg-white rounded-full shadow-md border-2 border-emerald-500 -translate-x-1/2 pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-zinc-500 px-0.5">
              <span>{formatDuration(currentTime)}</span>
              <button
                onClick={() => setShowRemainingTime((prev) => !prev)}
                className="hover:text-slate-700 dark:hover:text-zinc-300"
              >
                {showRemainingTime && effectiveDuration > 0
                  ? `-${formatDuration(Math.max(0, effectiveDuration - currentTime))}`
                  : formatDuration(effectiveDuration)}
              </button>
            </div>
          </div>

          {/* Full Transport Controls Row */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2.5 rounded-xl transition active:scale-90 ${
                isShuffle
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 dark:text-zinc-500'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrevTrack}
              disabled={audioFiles.length <= 1 && currentTime <= 3}
              className="p-2.5 rounded-xl text-slate-700 dark:text-zinc-200 active:scale-90 transition disabled:opacity-30"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={() => skipTime(-10)}
              className="p-2.5 rounded-xl text-slate-500 dark:text-zinc-400 active:scale-90 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={hasError}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center active:scale-95 transition"
            >
              {isPlayingAudio ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => skipTime(10)}
              className="p-2.5 rounded-xl text-slate-500 dark:text-zinc-400 active:scale-90 transition"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleNextTrack}
              disabled={audioFiles.length <= 1}
              className="p-2.5 rounded-xl text-slate-700 dark:text-zinc-200 active:scale-90 transition disabled:opacity-30"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeatMode}
              className={`p-2.5 rounded-xl transition active:scale-90 ${
                repeatMode !== 'off'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 dark:text-zinc-500'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Bottom Utility Actions Row */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] font-semibold">
            <button
              onClick={() => setShowPlaylist((prev) => !prev)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition active:scale-95 ${
                showPlaylist
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? `لیست (${audioFiles.length})` : `Queue (${audioFiles.length})`}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 active:scale-95 transition"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{isCopied ? (lang === 'fa' ? 'کپی شد' : 'Copied') : t('copyLink')}</span>
            </button>

            <button
              onClick={() => setShareModalFile(activeAudio)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 active:scale-95 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'اشتراک' : 'Share'}</span>
            </button>

            <a
              href={activeAudio.downloadUrl}
              download={activeAudio.filename}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'دانلود' : 'Save'}</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Floating Dock Bar (Glassmorphic) */}
      <div className="bg-white/75 dark:bg-[#121316]/75 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.65)] border border-white/65 dark:border-white/15 ring-1 ring-black/5 dark:ring-white/5 overflow-visible relative transition-all">
        {/* Top Interactive Scrub Bar */}
        <div
          ref={progressBarRef}
          onMouseDown={(e) => handleScrubMouseDown(e, progressBarRef.current)}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onTouchStart={(e) => handleScrubTouchStart(e, progressBarRef.current)}
          onTouchMove={(e) => handleScrubTouchMove(e, progressBarRef.current)}
          onTouchEnd={handleScrubTouchEnd}
          className="relative w-full h-3.5 flex items-center cursor-pointer group/bar px-3 sm:px-5 pt-1 touch-none"
        >
          <div className="w-full h-1 group-hover/bar:h-1.5 bg-slate-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden transition-all relative">
            <div
              className="absolute inset-y-0 left-0 bg-slate-300/80 dark:bg-zinc-700/80 rounded-full transition-all duration-150"
              style={{ width: `${bufferedPercent}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div
            className="w-3 h-3 bg-white rounded-full shadow-md border-2 border-emerald-500 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none absolute -translate-x-1/2"
            style={{ left: `calc(${progressPercent}% )` }}
          />

          {hoverTime !== null && (
            <div
              className="hidden sm:block absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 dark:bg-zinc-900 text-white font-mono text-[10px] pointer-events-none shadow-lg border border-white/10"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>

        {/* Main Content Row */}
        <div className="px-3 pb-2.5 pt-1 sm:px-4 sm:pb-3 sm:pt-1.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Start Zone: Artwork/Visualizer + Track Title & Metadata (Swipeable on mobile) */}
          <div
            onTouchStart={handleTrackTouchStart}
            onTouchMove={handleTrackTouchMove}
            onTouchEnd={handleTrackTouchEnd}
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileExpanded((prev) => !prev);
              }
            }}
            style={{
              transform: swipeOffsetX ? `translateX(${swipeOffsetX}px)` : undefined,
            }}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer md:cursor-default transition-transform duration-150"
          >
            {/* Album Cover or Rotating Studio Icon */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500/15 via-teal-500/15 to-cyan-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 relative overflow-hidden">
              {activeAudio.thumbnailUrl ? (
                <img
                  src={activeAudio.thumbnailUrl}
                  alt={activeAudio.filename}
                  className="w-full h-full object-cover"
                />
              ) : isPlayingAudio && !hasError ? (
                <Disc3 className="w-5 h-5 sm:w-6 sm:h-6 animate-[spin_4s_linear_infinite]" />
              ) : (
                <Music className="w-5 h-5" />
              )}

              {/* Subtle Live Equalizer Overlay */}
              {isPlayingAudio && !hasError && (
                <div className="absolute inset-x-2 bottom-1 flex items-end justify-center gap-0.5 h-2.5 pointer-events-none">
                  <span className="w-0.5 bg-emerald-500 rounded-full h-full animate-[bounce_0.6s_infinite_alternate]" />
                  <span className="w-0.5 bg-emerald-500 rounded-full h-2/3 animate-[bounce_0.45s_infinite_alternate_0.1s]" />
                  <span className="w-0.5 bg-emerald-500 rounded-full h-4/5 animate-[bounce_0.7s_infinite_alternate_0.2s]" />
                </div>
              )}
            </div>

            {/* Track Title & Unboxed Metadata */}
            <div className="min-w-0 flex-1">
              <h4
                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate"
                dir="auto"
                title={activeAudio.filename}
              >
                {activeAudio.filename}
              </h4>

              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate mt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRemainingTime((prev) => !prev);
                  }}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  {formatDuration(currentTime)} /{' '}
                  {showRemainingTime && effectiveDuration > 0
                    ? `-${formatDuration(Math.max(0, effectiveDuration - currentTime))}`
                    : formatDuration(effectiveDuration)}
                </button>
                <span aria-hidden="true">·</span>
                <span>{formatFileSize(activeAudio.size)}</span>
                {ext && (
                  <>
                    <span className="hidden sm:inline" aria-hidden="true">
                      ·
                    </span>
                    <span className="hidden sm:inline uppercase">{ext}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center Zone: Transport Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Shuffle (Desktop) */}
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2 rounded-xl transition hidden md:flex ${
                isShuffle
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              onClick={handlePrevTrack}
              disabled={audioFiles.length <= 1 && currentTime <= 3}
              className="flex p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white transition disabled:opacity-30 active:scale-90 cursor-pointer"
              title={lang === 'fa' ? 'قبلی' : 'Previous'}
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* -10s */}
            <button
              onClick={() => skipTime(-10)}
              className="flex p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-zinc-300 dark:hover:text-white transition active:scale-90 cursor-pointer"
              title="-10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Primary Play / Pause Button */}
            <button
              onClick={togglePlay}
              disabled={hasError}
              aria-label={isPlayingAudio ? 'Pause' : 'Play'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center active:scale-90 transition hover:brightness-105 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isPlayingAudio ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* +10s */}
            <button
              onClick={() => skipTime(10)}
              className="flex p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-zinc-300 dark:hover:text-white transition active:scale-90 cursor-pointer"
              title="+10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Next Track */}
            <button
              onClick={handleNextTrack}
              disabled={audioFiles.length <= 1}
              className="flex p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white transition disabled:opacity-30 active:scale-90 cursor-pointer"
              title={lang === 'fa' ? 'بعدی' : 'Next'}
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Repeat Mode (Desktop) */}
            <button
              onClick={cycleRepeatMode}
              className={`p-2 rounded-xl transition hidden md:flex ${
                repeatMode !== 'off'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
              title="Repeat"
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* End Zone: Studio Tools & Expand/Close */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Speed Selector (Desktop) */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1.5 rounded-xl text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10 text-xs font-mono font-bold transition border border-transparent hover:border-white/20"
                title={lang === 'fa' ? 'سرعت پخش' : 'Playback Speed'}
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full end-0 mb-2 w-24 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-2xl border border-white/60 dark:border-white/15 p-1.5 z-50 text-xs flex flex-col gap-0.5 ring-1 ring-black/5 dark:ring-white/5">
                  {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`px-2.5 py-1.5 rounded-xl text-center font-mono transition ${
                        playbackRate === s
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
                          : 'hover:bg-white/60 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume Control (Large Screens) */}
            <div className="hidden lg:flex items-center gap-1.5 group/vol px-1">
              <button
                onClick={toggleMute}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Playlist Queue Button */}
            {audioFiles.length > 1 && (
              <button
                onClick={() => setShowPlaylist(!showPlaylist)}
                className={`hidden sm:flex p-2 rounded-xl transition ${
                  showPlaylist
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
                title={lang === 'fa' ? 'لیست پخش' : 'Playlist'}
              >
                <ListMusic className="w-4 h-4" />
              </button>
            )}

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              title={t('copyDirectLink')}
              className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Download */}
            <a
              href={activeAudio.downloadUrl}
              download={activeAudio.filename}
              title={t('directDownload')}
              className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Mobile Expand / Collapse Toggle Button */}
            <button
              onClick={() => setIsMobileExpanded((prev) => !prev)}
              aria-label="Toggle expanded player"
              className={`md:hidden p-2 rounded-xl transition active:scale-90 ${
                isMobileExpanded
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-700 dark:text-zinc-400'
              }`}
            >
              {isMobileExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>

            {/* Close Player */}
            <button
              onClick={closePlayer}
              aria-label="Close audio player"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
