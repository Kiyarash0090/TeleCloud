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

  const displayFilename = (() => {
    try {
      return activeAudio.filename.includes('%')
        ? decodeURIComponent(activeAudio.filename)
        : activeAudio.filename;
    } catch {
      return activeAudio.filename;
    }
  })();

  return (
    <div className="fixed bottom-[88px] sm:bottom-[92px] md:bottom-6 inset-x-3 sm:inset-x-4 max-w-md sm:max-w-2xl md:max-w-4xl mx-auto z-40 animate-in slide-in-from-bottom-4 duration-300 select-none">
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

      {/* Playlist Queue Dropup Panel */}
      {showPlaylist && (
        <div className="mb-2.5 bg-white/95 dark:bg-[#11141C]/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/[0.08] p-3 max-h-60 sm:max-h-72 overflow-y-auto flex flex-col gap-1 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-200/70 dark:border-white/[0.07] text-slate-800 dark:text-slate-100 font-bold">
            <span className="flex items-center gap-2 tabular-nums">
              <ListMusic className="w-4 h-4 text-emerald-500" />
              <span>
                {lang === 'fa'
                  ? `لیست پخش صوتی (${audioFiles.length} قطعه)`
                  : `Audio Queue (${audioFiles.length} tracks)`}
              </span>
            </span>
            <button
              onClick={() => setShowPlaylist(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#171B26] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            {audioFiles.map((file, idx) => {
              const isCurrent =
                file.id === activeAudio.id &&
                (file.originPeer || 'me') === (activeAudio.originPeer || 'me');
              let cleanItemName = file.filename;
              try {
                if (cleanItemName.includes('%')) cleanItemName = decodeURIComponent(cleanItemName);
              } catch {}
              return (
                <button
                  key={`${file.originPeer || 'me'}_${file.id}`}
                  onClick={() => {
                    setActiveAudio(file);
                    setShowPlaylist(false);
                  }}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl text-start transition cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/25'
                      : 'hover:bg-slate-100/80 dark:hover:bg-[#171B26] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-5 text-center text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold" dir="auto">
                        {cleanItemName}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5" dir="ltr">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 shrink-0" dir="ltr">
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

      {/* Mobile Expanded Deck */}
      {isMobileExpanded && (
        <div className="md:hidden mb-2 bg-white/95 dark:bg-[#11141C]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/[0.08] p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Top Handle & Quick Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setIsMobileExpanded(false)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 active:scale-95 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
              <span>{lang === 'fa' ? 'جمع کردن پلیر' : 'Minimize'}</span>
            </button>

            <div className="flex items-center gap-1">
              {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono tabular-nums font-bold transition cursor-pointer ${
                    playbackRate === s
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#171B26] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Full-Width Scrub Bar */}
          <div className="flex flex-col gap-1" dir="ltr">
            <div
              ref={expandedProgressBarRef}
              onMouseDown={(e) => handleScrubMouseDown(e, expandedProgressBarRef.current)}
              onTouchStart={(e) => handleScrubTouchStart(e, expandedProgressBarRef.current)}
              onTouchMove={(e) => handleScrubTouchMove(e, expandedProgressBarRef.current)}
              onTouchEnd={handleScrubTouchEnd}
              className="relative w-full h-6 flex items-center cursor-pointer touch-none"
            >
              <div className="w-full h-2 bg-slate-200 dark:bg-[#171B26] rounded-full overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-slate-300 dark:bg-[#232938] rounded-full transition-all duration-150"
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

            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 px-0.5">
              <span>{formatDuration(currentTime)}</span>
              <button
                onClick={() => setShowRemainingTime((prev) => !prev)}
                className="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {showRemainingTime && effectiveDuration > 0
                  ? `-${formatDuration(Math.max(0, effectiveDuration - currentTime))}`
                  : formatDuration(effectiveDuration)}
              </button>
            </div>
          </div>

          {/* Full Transport Controls Row */}
          <div className="flex items-center justify-between px-2" dir="ltr">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2.5 rounded-xl transition active:scale-90 cursor-pointer ${
                isShuffle
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrevTrack}
              disabled={audioFiles.length <= 1 && currentTime <= 3}
              className="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 active:scale-90 transition disabled:opacity-30 cursor-pointer"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={() => skipTime(-10)}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 active:scale-90 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={hasError}
              className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center active:scale-95 transition cursor-pointer"
            >
              {isPlayingAudio ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => skipTime(10)}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 active:scale-90 transition cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleNextTrack}
              disabled={audioFiles.length <= 1}
              className="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 active:scale-90 transition disabled:opacity-30 cursor-pointer"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeatMode}
              className={`p-2.5 rounded-xl transition active:scale-90 cursor-pointer ${
                repeatMode !== 'off'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 dark:text-slate-500'
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
          <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-slate-200/70 dark:border-white/[0.07] text-[11px] font-semibold">
            <button
              onClick={() => setShowPlaylist((prev) => !prev)}
              className={`flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl transition active:scale-95 tabular-nums cursor-pointer ${
                showPlaylist
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-[#171B26] text-slate-600 dark:text-slate-300'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? `لیست (${audioFiles.length})` : `Queue (${audioFiles.length})`}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl bg-slate-100 dark:bg-[#171B26] text-slate-600 dark:text-slate-300 active:scale-95 transition cursor-pointer"
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
              className="flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl bg-slate-100 dark:bg-[#171B26] text-slate-600 dark:text-slate-300 active:scale-95 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'اشتراک' : 'Share'}</span>
            </button>

            <a
              href={activeAudio.downloadUrl}
              download={displayFilename}
              className="flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'دانلود' : 'Save'}</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Floating Dock Bar */}
      <div className="bg-white/95 dark:bg-[#11141C]/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-[0_14px_38px_rgba(15,23,42,0.18)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.7)] border border-slate-200/80 dark:border-white/[0.08] overflow-visible relative transition-all">
        {/* Top Interactive Scrub Bar */}
        <div
          dir="ltr"
          ref={progressBarRef}
          onMouseDown={(e) => handleScrubMouseDown(e, progressBarRef.current)}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onTouchStart={(e) => handleScrubTouchStart(e, progressBarRef.current)}
          onTouchMove={(e) => handleScrubTouchMove(e, progressBarRef.current)}
          onTouchEnd={handleScrubTouchEnd}
          className="relative w-full h-3.5 flex items-center cursor-pointer group/bar px-3.5 sm:px-5 pt-1 touch-none"
        >
          <div className="w-full h-1 group-hover/bar:h-1.5 bg-slate-200/90 dark:bg-[#171B26] rounded-full overflow-hidden transition-all relative">
            <div
              className="absolute inset-y-0 left-0 bg-slate-300 dark:bg-[#232938] rounded-full transition-all duration-150"
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
              className="hidden sm:block absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#0F172A] dark:bg-[#171B26] text-white font-mono tabular-nums text-[10px] pointer-events-none shadow-lg border border-white/10"
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
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 relative overflow-hidden">
              {activeAudio.thumbnailUrl ? (
                <img
                  src={activeAudio.thumbnailUrl}
                  alt={displayFilename}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : isPlayingAudio && !hasError ? (
                <Disc3 className="w-5 h-5 sm:w-6 sm:h-6 animate-[spin_4s_linear_infinite]" />
              ) : (
                <Music className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
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
                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate"
                dir="auto"
                title={displayFilename}
              >
                {displayFilename}
              </h4>

              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate mt-0.5" dir="ltr">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRemainingTime((prev) => !prev);
                  }}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                >
                  {formatDuration(currentTime)}
                  {effectiveDuration > 0
                    ? ` / ${
                        showRemainingTime
                          ? `-${formatDuration(Math.max(0, effectiveDuration - currentTime))}`
                          : formatDuration(effectiveDuration)
                      }`
                    : ''}
                </button>
                <span className="hidden xs:inline" aria-hidden="true">·</span>
                <span className="hidden xs:inline">{formatFileSize(activeAudio.size)}</span>
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

          {/* Center Zone: Transport Controls (Always LTR so Prev/Play/Next arrows match direction) */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0" dir="ltr">
            {/* Shuffle (Desktop) */}
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2 rounded-xl transition hidden md:flex cursor-pointer ${
                isShuffle
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              onClick={handlePrevTrack}
              disabled={audioFiles.length <= 1 && currentTime <= 3}
              className="flex p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition disabled:opacity-30 active:scale-90 cursor-pointer"
              title={lang === 'fa' ? 'قبلی' : 'Previous'}
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* -10s (Hidden on compact mobile bar, available in expanded view & desktop) */}
            <button
              onClick={() => skipTime(-10)}
              className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition active:scale-90 cursor-pointer"
              title="-10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Primary Play / Pause Button */}
            <button
              onClick={togglePlay}
              disabled={hasError}
              aria-label={isPlayingAudio ? 'Pause' : 'Play'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/25 flex items-center justify-center active:scale-90 transition disabled:opacity-50 shrink-0 cursor-pointer mx-0.5"
            >
              {isPlayingAudio ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* +10s (Hidden on compact mobile bar, available in expanded view & desktop) */}
            <button
              onClick={() => skipTime(10)}
              className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition active:scale-90 cursor-pointer"
              title="+10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Next Track */}
            <button
              onClick={handleNextTrack}
              disabled={audioFiles.length <= 1}
              className="flex p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition disabled:opacity-30 active:scale-90 cursor-pointer"
              title={lang === 'fa' ? 'بعدی' : 'Next'}
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Repeat Mode (Desktop) */}
            <button
              onClick={cycleRepeatMode}
              className={`p-2 rounded-xl transition hidden md:flex cursor-pointer ${
                repeatMode !== 'off'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
                className="px-2 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#171B26] text-xs font-mono tabular-nums font-bold transition cursor-pointer"
                title={lang === 'fa' ? 'سرعت پخش' : 'Playback Speed'}
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full end-0 mb-2 w-24 rounded-2xl bg-white/95 dark:bg-[#11141C]/95 backdrop-blur-2xl shadow-2xl border border-slate-200/80 dark:border-white/[0.08] p-1.5 z-50 text-xs flex flex-col gap-0.5">
                  {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`px-2.5 py-1.5 rounded-xl text-center font-mono tabular-nums transition cursor-pointer ${
                        playbackRate === s
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/25'
                          : 'hover:bg-slate-100 dark:hover:bg-[#171B26] text-slate-700 dark:text-slate-300'
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
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
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
                className="w-16 h-1 bg-slate-200 dark:bg-[#232938] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Playlist Queue Button */}
            {audioFiles.length > 1 && (
              <button
                onClick={() => setShowPlaylist(!showPlaylist)}
                className={`hidden sm:flex p-2 rounded-xl transition cursor-pointer ${
                  showPlaylist
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#171B26]'
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
              className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#171B26] transition cursor-pointer"
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
              className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#171B26] transition"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Mobile Expand / Collapse Toggle Button */}
            <button
              onClick={() => setIsMobileExpanded((prev) => !prev)}
              aria-label="Toggle expanded player"
              className={`md:hidden p-2 rounded-xl transition active:scale-90 cursor-pointer ${
                isMobileExpanded
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-400'
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
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition active:scale-90 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
