import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw,
  Copy, 
  Check, 
  Download, 
  PictureInPicture2,
  PictureInPicture,
  Sparkles,
  Film,
  Zap,
  CheckCircle2,
  Camera,
  ChevronRight,
  ChevronLeft,
  GripHorizontal
} from 'lucide-react';
import { TelegramFile } from '../../types';
import { formatDuration, formatFileSize } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';
import { useTelegram, useBackHandler } from '../../context/TelegramContext';

export function VideoPlayerModal({ 
  file, 
  onClose 
}: { 
  file: TelegramFile; 
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const { t, lang } = useTheme();
  const { files, setActiveVideo, setIsPlayingAudio, isVideoPiP, setIsVideoPiP, selectedPeer } = useTelegram();

  // Video playlist for next/prev navigation
  const videoFiles = files.filter(f => f.category === 'videos');
  const currentIndex = videoFiles.findIndex(f => f.id === file.id);

  // Determine if format typically needs transcoding
  const ext = file.filename.split('.').pop()?.toLowerCase() || '';
  const needsTranscodeByDefault = ['mkv', 'avi', 'flv', 'wmv', 'ts', 'm2ts', 'vob', '3gp', 'm4v', 'mov', 'rmvb'].includes(ext);

  const [playbackMode, setPlaybackMode] = useState<'direct' | 'transcode'>(needsTranscodeByDefault ? 'transcode' : 'direct');
  const [quality, setQuality] = useState<'auto' | '1080p' | '720p' | '480p'>('auto');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const initialDuration = (file.duration && file.duration > 0) ? file.duration : 0;
  const [duration, setDuration] = useState(initialDuration);
  const [transcodeStartTime, setTranscodeStartTime] = useState(0);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useBackHandler(showQualityMenu || showSpeedMenu, () => {
    setShowQualityMenu(false);
    setShowSpeedMenu(false);
  });
  const [isTranscodingLoading, setIsTranscodingLoading] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'left' | 'right' | null>(null);

  // Ultra-Fast Hardware-Accelerated PiP State (Zero-rerender during drag/resize)
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    const initialW = Math.min(320, window.innerWidth - 24);
    const initialH = (initialW * 10) / 16;
    return {
      x: Math.max(8, window.innerWidth - initialW - 16),
      y: Math.max(8, window.innerHeight - initialH - 85),
    };
  });
  const [pipWidth, setPipWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 320;
    return Math.min(320, Math.max(220, window.innerWidth - 24));
  });
  const [isPipInteracting, setIsPipInteracting] = useState(false);

  // Mutable refs for 120fps Direct GPU DOM updates
  const pipPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pipWidthRef = useRef<number>(320);
  const pipRafRef = useRef<number | null>(null);
  const pipInteractionTypeRef = useRef<'drag' | 'resize' | 'pinch' | null>(null);
  const pipDragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });
  const pipResizeStartRef = useRef<{ startX: number; startY: number; initialW: number; initialX: number; initialY: number; handle: string }>({
    startX: 0,
    startY: 0,
    initialW: 320,
    initialX: 0,
    initialY: 0,
    handle: 'se',
  });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartWidthRef = useRef<number>(320);

  // Keep refs in sync with current state
  useEffect(() => {
    if (pipPos) pipPosRef.current = pipPos;
  }, [pipPos]);

  useEffect(() => {
    pipWidthRef.current = pipWidth;
  }, [pipWidth]);

  // OS Native Picture-in-Picture State & Detection
  const [isNativePiPActive, setIsNativePiPActive] = useState(false);
  const isNativePiPSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleEnterPiP = () => setIsNativePiPActive(true);
    const handleLeavePiP = () => setIsNativePiPActive(false);

    videoEl.addEventListener('enterpictureinpicture', handleEnterPiP);
    videoEl.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      videoEl.removeEventListener('enterpictureinpicture', handleEnterPiP);
      videoEl.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  const toggleNativeOSPiP = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsNativePiPActive(false);
      } else if (videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
        setIsNativePiPActive(true);
      }
    } catch (err) {
      console.warn('Native OS Picture-in-Picture error:', err);
    }
  };

  // Direct GPU DOM style updater (runs inside requestAnimationFrame)
  const applyPipTransformDirect = (x: number, y: number, width: number) => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.style.width = `${width}px`;
  };

  // 120 FPS Draggable & Resizable PiP global listeners (Zero React Render Churn)
  useEffect(() => {
    if (!isVideoPiP) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!pipInteractionTypeRef.current || !containerRef.current) return;

      if (pipInteractionTypeRef.current === 'drag') {
        const dx = e.clientX - pipDragStartRef.current.startX;
        const dy = e.clientY - pipDragStartRef.current.startY;
        const pipW = pipWidthRef.current;
        const pipH = (pipW * 10) / 16;

        const maxX = window.innerWidth - pipW - 8;
        const maxY = window.innerHeight - pipH - 8;
        const newX = Math.max(8, Math.min(maxX, pipDragStartRef.current.initialX + dx));
        const newY = Math.max(8, Math.min(maxY, pipDragStartRef.current.initialY + dy));

        pipPosRef.current = { x: newX, y: newY };

        if (pipRafRef.current) cancelAnimationFrame(pipRafRef.current);
        pipRafRef.current = requestAnimationFrame(() => {
          applyPipTransformDirect(newX, newY, pipW);
        });
      } else if (pipInteractionTypeRef.current === 'resize') {
        const { startX, initialW, initialX, initialY, handle } = pipResizeStartRef.current;
        const dx = e.clientX - startX;
        const minW = Math.max(180, Math.min(240, window.innerWidth * 0.45));
        const maxW = Math.min(640, window.innerWidth - 16);

        let newW = initialW;
        let newX = initialX;
        let newY = initialY;

        if (handle === 'se') {
          newW = Math.min(maxW, Math.max(minW, initialW + dx));
        } else if (handle === 'sw') {
          newW = Math.min(maxW, Math.max(minW, initialW - dx));
          newX = initialX + (initialW - newW);
        } else if (handle === 'ne') {
          newW = Math.min(maxW, Math.max(minW, initialW + dx));
          const newH = (newW * 10) / 16;
          const initialH = (initialW * 10) / 16;
          newY = initialY - (newH - initialH);
        } else if (handle === 'nw') {
          newW = Math.min(maxW, Math.max(minW, initialW - dx));
          newX = initialX + (initialW - newW);
          const newH = (newW * 10) / 16;
          const initialH = (initialW * 10) / 16;
          newY = initialY - (newH - initialH);
        }

        const newH = (newW * 10) / 16;
        newX = Math.max(8, Math.min(window.innerWidth - newW - 8, newX));
        newY = Math.max(8, Math.min(window.innerHeight - newH - 8, newY));

        pipWidthRef.current = newW;
        pipPosRef.current = { x: newX, y: newY };

        if (pipRafRef.current) cancelAnimationFrame(pipRafRef.current);
        pipRafRef.current = requestAnimationFrame(() => {
          applyPipTransformDirect(newX, newY, newW);
        });
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      // Pinch to resize (2 fingers on mobile)
      if (e.touches.length === 2 && containerRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

        if (pinchStartDistRef.current !== null) {
          const scale = dist / pinchStartDistRef.current;
          const minW = Math.max(180, window.innerWidth * 0.45);
          const maxW = Math.min(640, window.innerWidth - 16);
          const targetW = Math.min(maxW, Math.max(minW, pinchStartWidthRef.current * scale));

          // Keep center anchor
          const currentX = pipPosRef.current.x;
          const currentY = pipPosRef.current.y;
          const deltaW = targetW - pipWidthRef.current;
          const newX = Math.max(8, Math.min(window.innerWidth - targetW - 8, currentX - deltaW / 2));
          const newH = (targetW * 10) / 16;
          const newY = Math.max(8, Math.min(window.innerHeight - newH - 8, currentY - (deltaW * 10) / 32));

          pipWidthRef.current = targetW;
          pipPosRef.current = { x: newX, y: newY };

          if (pipRafRef.current) cancelAnimationFrame(pipRafRef.current);
          pipRafRef.current = requestAnimationFrame(() => {
            applyPipTransformDirect(newX, newY, targetW);
          });
        } else {
          pinchStartDistRef.current = dist;
          pinchStartWidthRef.current = pipWidthRef.current;
        }
      }
    };

    const handleGlobalPointerUp = () => {
      if (!pipInteractionTypeRef.current) return;
      pipInteractionTypeRef.current = null;
      setIsPipInteracting(false);
      pinchStartDistRef.current = null;

      if (containerRef.current) {
        // Smart Corner Snapping (Magnet physics within 24px of edge)
        const currentX = pipPosRef.current.x;
        const currentY = pipPosRef.current.y;
        const w = pipWidthRef.current;
        const h = (w * 10) / 16;
        let snapX = currentX;
        let snapY = currentY;

        const leftDist = currentX;
        const rightDist = window.innerWidth - (currentX + w);
        const topDist = currentY;
        const bottomDist = window.innerHeight - (currentY + h);

        // Snap horizontally if close to edges
        if (leftDist < 24) snapX = 12;
        else if (rightDist < 24) snapX = window.innerWidth - w - 12;

        // Snap vertically if close to edges (accommodate bottom nav on mobile: 74px)
        const isMobileScreen = window.innerWidth < 640;
        const bottomSafety = isMobileScreen ? 84 : 16;
        if (topDist < 24) snapY = 12;
        else if (bottomDist < 36) snapY = window.innerHeight - h - bottomSafety;

        pipPosRef.current = { x: snapX, y: snapY };

        // Spring animation to settled position
        containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
        applyPipTransformDirect(snapX, snapY, w);

        // Commit to React state
        setPipPos({ x: snapX, y: snapY });
        setPipWidth(w);
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalPointerUp);
      if (pipRafRef.current) cancelAnimationFrame(pipRafRef.current);
    };
  }, [isVideoPiP]);

  const startPipDrag = (clientX: number, clientY: number) => {
    pipInteractionTypeRef.current = 'drag';
    setIsPipInteracting(true);

    if (containerRef.current) {
      containerRef.current.style.transition = 'none';
      const rect = containerRef.current.getBoundingClientRect();
      pipDragStartRef.current = {
        startX: clientX,
        startY: clientY,
        initialX: rect.left,
        initialY: rect.top,
      };
      pipPosRef.current = { x: rect.left, y: rect.top };
    }
  };

  const startPipResize = (e: React.PointerEvent | React.TouchEvent, handle: string) => {
    e.stopPropagation();
    pipInteractionTypeRef.current = 'resize';
    setIsPipInteracting(true);

    if (containerRef.current) {
      containerRef.current.style.transition = 'none';
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
      const clientY = 'touches' in e && e.touches[0] ? e.touches[0].clientY : (e as React.PointerEvent).clientY;

      pipResizeStartRef.current = {
        startX: clientX,
        startY: clientY,
        initialW: pipWidthRef.current,
        initialX: rect.left,
        initialY: rect.top,
        handle,
      };
      pipPosRef.current = { x: rect.left, y: rect.top };
    }
  };


  // Touch Swipe Gesture state: Swipe Left/Right (prev/next video) & Swipe Down (close)
  const [swipeDelta, setSwipeDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeAxisRef = useRef<'x' | 'y' | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const didSwipeMoveRef = useRef(false);

  const controlsTimeoutRef = useRef<any>(null);

  // Reset player state when switching to another video file and pause background music
  useEffect(() => {
    setIsPlayingAudio(false);
    const fileExt = file.filename.split('.').pop()?.toLowerCase() || '';
    const shouldTranscode = ['mkv', 'avi', 'flv', 'wmv', 'ts', 'm2ts', 'vob', '3gp', 'm4v', 'mov', 'rmvb'].includes(fileExt);
    setPlaybackMode(shouldTranscode ? 'transcode' : 'direct');
    setCurrentTime(0);
    setTranscodeStartTime(0);
    setBufferedPercent(0);
    setDuration(file.duration && file.duration > 0 ? file.duration : 0);
    setSwipeDelta({ x: 0, y: 0 });
    setIsSwiping(false);
  }, [file.id, setIsPlayingAudio]);

  // Compute stream URL
  const isExternalDemo = file.directUrl.startsWith('http');
  const baseUrl = isExternalDemo
    ? file.directUrl 
    : `${window.location.origin}${file.directUrl}`;

  const filePeer = (() => {
    try {
      const urlObj = new URL(baseUrl);
      return urlObj.searchParams.get('peer') || selectedPeer || 'me';
    } catch {
      return selectedPeer || 'me';
    }
  })();
  
  const transcodeUrl = !isExternalDemo && file.id && !String(file.id).startsWith('demo')
    ? `/api/telegram/transcode/${file.id}/${encodeURIComponent(file.filename)}?peer=${encodeURIComponent(filePeer)}&quality=${quality}&startTime=${transcodeStartTime}&retry=${retryAttempt}`
    : `/api/telegram/transcode/0?demoUrl=${encodeURIComponent(baseUrl)}&quality=${quality}&startTime=${transcodeStartTime}&retry=${retryAttempt}`;

  const currentVideoSrc = playbackMode === 'transcode' ? transcodeUrl : baseUrl;

  const handleNextVideo = useCallback(() => {
    if (currentIndex < videoFiles.length - 1) {
      setActiveVideo(videoFiles[currentIndex + 1]);
    }
  }, [currentIndex, videoFiles, setActiveVideo]);

  const handlePrevVideo = useCallback(() => {
    if (currentIndex > 0) {
      setActiveVideo(videoFiles[currentIndex - 1]);
    }
  }, [currentIndex, videoFiles, setActiveVideo]);

  // Auto-hide controls timer
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showQualityMenu && !showSpeedMenu && !isDraggingSeek) {
        setShowControls(false);
      }
    }, 3200);
  }, [isPlaying, showQualityMenu, showSpeedMenu, isDraggingSeek]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'm') toggleMute();
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipTime(10);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-10);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume(v => Math.min(1, v + 0.1));
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume(v => Math.max(0, v - 0.1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, transcodeStartTime, playbackMode]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      setIsPlayingAudio(false);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  };

  // Touch Swipe Handlers on Video Area
  const handleVideoTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsSwiping(true);
    swipeAxisRef.current = null;
    didSwipeMoveRef.current = false;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    setSwipeDelta({ x: 0, y: 0 });
  };

  const handleVideoTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (!swipeAxisRef.current) {
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
        swipeAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        didSwipeMoveRef.current = true;
      } else {
        return;
      }
    }

    if (swipeAxisRef.current === 'x') {
      const atBoundary =
        (dx > 0 && currentIndex <= 0) ||
        (dx < 0 && currentIndex >= videoFiles.length - 1);
      setSwipeDelta({ x: atBoundary ? dx * 0.2 : dx, y: 0 });
    } else if (swipeAxisRef.current === 'y') {
      setSwipeDelta({ x: dx * 0.15, y: dy > 0 ? dy : dy * 0.2 });
    }
  };

  const handleVideoTouchEnd = () => {
    if (!isSwiping) return;
    const elapsed = Math.max(1, Date.now() - touchStartRef.current.time);
    const velocityX = Math.abs(swipeDelta.x) / elapsed;
    const velocityY = swipeDelta.y / elapsed;

    if (swipeAxisRef.current === 'y' && (swipeDelta.y > 95 || (swipeDelta.y > 45 && velocityY > 0.45))) {
      if (navigator.vibrate) navigator.vibrate(20);
      onClose();
      return;
    }

    if (swipeAxisRef.current === 'x') {
      if ((swipeDelta.x < -60 || (swipeDelta.x < -30 && velocityX > 0.4)) && currentIndex < videoFiles.length - 1) {
        if (navigator.vibrate) navigator.vibrate(15);
        handleNextVideo();
      } else if ((swipeDelta.x > 60 || (swipeDelta.x > 30 && velocityX > 0.4)) && currentIndex > 0) {
        if (navigator.vibrate) navigator.vibrate(15);
        handlePrevVideo();
      }
    }

    setIsSwiping(false);
    swipeAxisRef.current = null;
    setSwipeDelta({ x: 0, y: 0 });
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const vTime = videoRef.current.currentTime;
    const computedCurrent = playbackMode === 'transcode' ? transcodeStartTime + vTime : vTime;
    setCurrentTime(computedCurrent);

    if (videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const total = effectiveDuration || 1;
      const computedBuffered = playbackMode === 'transcode' ? transcodeStartTime + bufferedEnd : bufferedEnd;
      setBufferedPercent(Math.min(100, (computedBuffered / total) * 100));
    }

    const vDur = videoRef.current.duration;
    if ((!duration || duration <= 1) && vDur && !isNaN(vDur) && isFinite(vDur) && vDur > 1.5) {
      setDuration(vDur);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const vDur = videoRef.current.duration;
      if ((!duration || duration <= 1) && vDur && !isNaN(vDur) && isFinite(vDur) && vDur > 1.5) {
        setDuration(vDur);
      }
      setIsTranscodingLoading(false);
    }
  };

  const handleVideoError = () => {
    if (playbackMode === 'direct') {
      setPlaybackMode('transcode');
      setIsTranscodingLoading(true);
      setTranscodeStartTime(0);
    }
  };

  const skipTime = (seconds: number) => {
    const effectiveTotal = effectiveDuration || duration || 100;
    const target = Math.max(0, Math.min(effectiveTotal, currentTime + seconds));
    performSeek(target);

    setDoubleTapFeedback(seconds > 0 ? 'right' : 'left');
    setTimeout(() => setDoubleTapFeedback(null), 650);
  };

  const performSeek = (targetTime: number) => {
    const effectiveTotal = effectiveDuration || duration || 100;
    const clampedTime = Math.max(0, Math.min(effectiveTotal, targetTime));
    
    if (playbackMode === 'transcode') {
      setTranscodeStartTime(Math.floor(clampedTime));
      setCurrentTime(clampedTime);
      setIsTranscodingLoading(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.load();
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } else {
      setCurrentTime(clampedTime);
      if (videoRef.current) {
        videoRef.current.currentTime = clampedTime;
      }
    }
    resetControlsTimeout();
  };

  const calculateTimeFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent | React.TouchEvent<HTMLDivElement> | TouchEvent) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percent = clickX / rect.width;
    const effectiveTotal = effectiveDuration || duration || 100;
    return percent * effectiveTotal;
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingSeek(true);
    const target = calculateTimeFromEvent(e);
    performSeek(target);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newTarget = calculateTimeFromEvent(moveEvent);
      setCurrentTime(newTarget);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      setIsDraggingSeek(false);
      const finalTarget = calculateTimeFromEvent(upEvent);
      performSeek(finalTarget);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDraggingSeek(true);
    const target = calculateTimeFromEvent(e);
    setCurrentTime(target);
  };

  const handleProgressTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = calculateTimeFromEvent(e);
    setCurrentTime(target);
  };

  const handleProgressTouchEnd = () => {
    setIsDraggingSeek(false);
    performSeek(currentTime);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = clickX / rect.width;
    const effectiveTotal = effectiveDuration || duration || 100;
    setHoverTime(percent * effectiveTotal);
    setHoverPosition(clickX);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    if (!newMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePiP = () => {
    setIsVideoPiP(!isVideoPiP);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `snapshot_${file.filename.replace(/\.[^/.]+$/, "")}_${Math.floor(currentTime)}s.png`;
        a.click();
        setSnapshotSuccess(true);
        setTimeout(() => setSnapshotSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Snapshot failed', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(baseUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const effectiveDuration = (file.duration && file.duration > 0) ? file.duration : (duration > 1 ? duration : 0);
  const progressPercent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0;

  const swipeDownProgress = Math.min(1, Math.max(0, swipeDelta.y / 300));
  if (isVideoPiP) {
    const initialPos = pipPos || {
      x: typeof window !== 'undefined' ? Math.max(8, window.innerWidth - pipWidth - 16) : 0,
      y: typeof window !== 'undefined' ? Math.max(8, window.innerHeight - ((pipWidth * 10) / 16) - 85) : 0,
    };

    return (
      <div 
        ref={containerRef}
        style={{
          width: `${pipWidth}px`,
          transform: `translate3d(${initialPos.x}px, ${initialPos.y}px, 0)`,
          top: 0,
          left: 0,
        }}
        className={`fixed z-50 aspect-16/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/25 bg-zinc-950/85 backdrop-blur-2xl backdrop-saturate-150 group/pip select-none flex flex-col justify-between ring-1 ring-white/10 pip-smooth-container ${
          isPipInteracting ? 'ring-2 ring-sky-400 shadow-2xl' : 'cursor-default'
        }`}
      >
        {/* Telegram-style Interactive Corner Resize Handles */}
        {/* Bottom-Right (SE) */}
        <div 
          onPointerDown={(e) => startPipResize(e, 'se')}
          title="تغییر اندازه مینی‌پلیر"
          className="absolute -bottom-1 -right-1 w-7 h-7 z-50 cursor-se-resize flex items-end justify-end p-1.5 opacity-60 hover:opacity-100 group-hover/pip:opacity-100 transition-opacity touch-none"
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-sky-400 rounded-br-sm shadow-sm" />
        </div>

        {/* Bottom-Left (SW) */}
        <div 
          onPointerDown={(e) => startPipResize(e, 'sw')}
          title="تغییر اندازه مینی‌پلیر"
          className="absolute -bottom-1 -left-1 w-7 h-7 z-50 cursor-sw-resize flex items-end justify-start p-1.5 opacity-60 hover:opacity-100 group-hover/pip:opacity-100 transition-opacity touch-none"
        >
          <div className="w-2.5 h-2.5 border-l-2 border-b-2 border-sky-400 rounded-bl-sm shadow-sm" />
        </div>

        {/* Top-Right (NE) */}
        <div 
          onPointerDown={(e) => startPipResize(e, 'ne')}
          title="تغییر اندازه مینی‌پلیر"
          className="absolute -top-1 -right-1 w-6 h-6 z-50 cursor-ne-resize flex items-start justify-end p-1.5 opacity-40 hover:opacity-100 group-hover/pip:opacity-100 transition-opacity touch-none"
        >
          <div className="w-2 h-2 border-r-2 border-t-2 border-sky-400 rounded-tr-sm shadow-sm" />
        </div>

        {/* Top-Left (NW) */}
        <div 
          onPointerDown={(e) => startPipResize(e, 'nw')}
          title="تغییر اندازه مینی‌پلیر"
          className="absolute -top-1 -left-1 w-6 h-6 z-50 cursor-nw-resize flex items-start justify-start p-1.5 opacity-40 hover:opacity-100 group-hover/pip:opacity-100 transition-opacity touch-none"
        >
          <div className="w-2 h-2 border-l-2 border-t-2 border-sky-400 rounded-tl-sm shadow-sm" />
        </div>

        {/* PiP Mini Top Bar (Draggable Glass Handle) */}
        <div 
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            startPipDrag(e.clientX, e.clientY);
          }}
          onDoubleClick={() => setIsVideoPiP(false)}
          className="absolute top-0 inset-x-0 p-2 sm:p-2.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between gap-2 z-40 text-white backdrop-blur-[2px] cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 pointer-events-none">
            <GripHorizontal className="w-3.5 h-3.5 text-white/50 shrink-0" />
            <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-xs font-bold truncate text-zinc-100">{file.filename}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
            {/* Quick Size Toggle (Mini / Normal / Large) */}
            <button
              onClick={() => {
                const nextW = pipWidth < 300 ? 380 : pipWidth < 460 ? 520 : 260;
                setPipWidth(nextW);
                if (containerRef.current) {
                  containerRef.current.style.transition = 'width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
                  pipWidthRef.current = nextW;
                  const currentX = pipPosRef.current.x;
                  const currentY = pipPosRef.current.y;
                  const maxX = window.innerWidth - nextW - 12;
                  const maxY = window.innerHeight - ((nextW * 10) / 16) - 16;
                  const clampedX = Math.max(12, Math.min(maxX, currentX));
                  const clampedY = Math.max(12, Math.min(maxY, currentY));
                  pipPosRef.current = { x: clampedX, y: clampedY };
                  applyPipTransformDirect(clampedX, clampedY, nextW);
                  setPipPos({ x: clampedX, y: clampedY });
                }
              }}
              title="تغییر سایز سریع (کوچک/متوسط/بزرگ)"
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-zinc-200 hover:text-white transition active:scale-95 cursor-pointer backdrop-blur-sm hidden xs:flex items-center text-[10px] font-mono px-2"
            >
              {Math.round(pipWidth)}px
            </button>

            {/* Native OS Picture-in-Picture Button */}
            {isNativePiPSupported && (
              <button
                onClick={toggleNativeOSPiP}
                title={lang === 'fa' ? 'شناور خارج از مرورگر (OS PiP)' : 'Pop out to OS Floating Window'}
                className={`p-1.5 rounded-lg transition active:scale-95 cursor-pointer backdrop-blur-sm ${
                  isNativePiPActive 
                    ? 'bg-sky-500 text-white ring-1 ring-white/50' 
                    : 'bg-white/15 hover:bg-white/30 text-white'
                }`}
              >
                <PictureInPicture className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Maximize back to full modal */}
            <button
              onClick={() => setIsVideoPiP(false)}
              title={lang === 'fa' ? 'بزرگ‌نمایی و بازگشت به پلیر کامل' : 'Maximize Video Player'}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition active:scale-95 cursor-pointer backdrop-blur-sm"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title={lang === 'fa' ? 'بستن ویدیو' : 'Close Video'}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-rose-600 text-white transition active:scale-95 cursor-pointer backdrop-blur-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>


        {/* Video Element Viewport */}
        <div 
          className="relative w-full h-full flex items-center justify-center cursor-pointer bg-black/40 backdrop-blur-xs"
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={currentVideoSrc}
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleVideoError}
            onWaiting={() => setIsTranscodingLoading(true)}
            onPlaying={() => {
              setIsPlaying(true);
              setIsTranscodingLoading(false);
              setIsPlayingAudio(false);
            }}
            onPlay={() => {
              setIsPlaying(true);
              setIsPlayingAudio(false);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-contain pointer-events-auto"
          />

          {/* Center Play/Pause & Skip Controls Overlay on Hover/Touch */}
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity z-30 ${
              !isPlaying
                ? 'opacity-100 bg-black/35'
                : 'opacity-100 bg-black/15 md:opacity-0 md:bg-black/40 md:group-hover/pip:opacity-100'
            }`}
          >
            <div
              className={`flex items-center gap-2.5 pointer-events-auto ${
                isPlaying ? 'md:pointer-events-none md:group-hover/pip:pointer-events-auto' : ''
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipTime(-10);
                }}
                className="p-2 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md shadow-lg hover:scale-110 active:scale-95 transition cursor-pointer flex items-center justify-center"
                title="۱۰ ثانیه عقب"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-9 h-9 rounded-full bg-white text-zinc-950 hover:bg-sky-400 hover:text-white flex items-center justify-center transition shadow-xl active:scale-95 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipTime(10);
                }}
                className="p-2 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md shadow-lg hover:scale-110 active:scale-95 transition cursor-pointer flex items-center justify-center"
                title="۱۰ ثانیه جلو"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* PiP Mini Bottom Progress Bar */}
        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-40 flex flex-col gap-0.5 pointer-events-none">
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-zinc-300 font-mono px-0.5">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(effectiveDuration)}</span>
          </div>
        </div>
      </div>
    );
  }

  const swipeScale = swipeDelta.y > 0 ? Math.max(0.8, 1 - swipeDownProgress * 0.2) : 1;
  const backdropOpacity = Math.max(0.35, 1 - swipeDownProgress * 0.65);

  return (
    <div 
      ref={containerRef}
      style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className="fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden font-sans group transition-colors backdrop-blur-2xl"
    >
      {/* Mobile Pull-Down Handle Indicator */}
      <div className="sm:hidden pt-[max(0.4rem,env(safe-area-inset-top))] flex justify-center pointer-events-none z-40">
        <div className="w-10 h-1 rounded-full bg-white/30" />
      </div>

      {/* Video element with Swipe Gestures */}
      <div 
        className="relative w-full h-full flex items-center justify-center cursor-pointer touch-none"
        onTouchStart={handleVideoTouchStart}
        onTouchMove={handleVideoTouchMove}
        onTouchEnd={handleVideoTouchEnd}
        onTouchCancel={handleVideoTouchEnd}
        onClick={() => {
          if (didSwipeMoveRef.current) {
            didSwipeMoveRef.current = false;
            return;
          }
          togglePlay();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX < rect.width / 2) {
            skipTime(-10);
          } else {
            skipTime(10);
          }
        }}
      >
        {/* Previous Video Button (Desktop / Controls Visible) */}
        {videoFiles.length > 1 && currentIndex > 0 && showControls && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevVideo();
            }}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-zinc-950/60 hover:bg-zinc-900/80 text-white backdrop-blur-2xl border border-white/15 items-center justify-center transition shadow-2xl hover:scale-110 active:scale-95 ring-1 ring-white/10"
            title={lang === 'fa' ? 'ویدیوی قبلی' : 'Previous Video'}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Video Button (Desktop / Controls Visible) */}
        {videoFiles.length > 1 && currentIndex < videoFiles.length - 1 && showControls && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextVideo();
            }}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-zinc-950/60 hover:bg-zinc-900/80 text-white backdrop-blur-2xl border border-white/15 items-center justify-center transition shadow-2xl hover:scale-110 active:scale-95 ring-1 ring-white/10"
            title={lang === 'fa' ? 'ویدیوی بعدی' : 'Next Video'}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <div
          className={`w-full h-full flex items-center justify-center ${
            isSwiping ? 'transition-none' : 'transition-transform duration-200 ease-out'
          }`}
          style={{
            transform: `translate(${swipeDelta.x}px, ${swipeDelta.y}px) scale(${swipeScale})`,
          }}
        >
          <video
            ref={videoRef}
            src={currentVideoSrc}
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleVideoError}
            onWaiting={() => setIsTranscodingLoading(true)}
            onPlaying={() => {
              setIsPlaying(true);
              setIsTranscodingLoading(false);
              setIsPlayingAudio(false);
            }}
            onPlay={() => {
              setIsPlaying(true);
              setIsPlayingAudio(false);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="max-h-full max-w-full object-contain pointer-events-auto"
          />
        </div>

        {/* Double click 10s ripple feedback */}
        {doubleTapFeedback && (
          <div className={`absolute top-1/2 -translate-y-1/2 ${doubleTapFeedback === 'left' ? 'left-12' : 'right-12'} z-30 pointer-events-none flex items-center gap-2 px-6 py-4 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white animate-in zoom-in-75 fade-out duration-500 shadow-2xl`}>
            {doubleTapFeedback === 'left' ? (
              <>
                <RotateCcw className="w-6 h-6 text-sky-400 animate-spin" />
                <span className="text-sm font-bold tracking-wider">-10s</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold tracking-wider">+10s</span>
                <RotateCw className="w-6 h-6 text-sky-400 animate-spin" />
              </>
            )}
          </div>
        )}

        {/* Big Center Play/Pause Indicator (when paused) */}
        {!isPlaying && !isTranscodingLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-2xl border border-white/25 text-white flex items-center justify-center shadow-2xl transition-transform transform scale-100 hover:scale-110 ring-1 ring-white/10">
              <Play className="w-9 h-9 fill-white ml-1 text-white" />
            </div>
          </div>
        )}

        {/* Transcoder / Buffering Spinner */}
        {isTranscodingLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-30 pointer-events-none gap-3 animate-in fade-in duration-150">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin" />
              <Zap className="w-6 h-6 text-sky-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-bold text-white tracking-wide">
                {lang === 'fa' ? 'در حال لود کردن ویدیو...' : 'Loading video...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- Top Header Bar (Glassmorphic) ----------------- */}
      <div 
        className={`absolute top-0 inset-x-0 p-3 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-[2px] flex items-center justify-between gap-2 text-white z-40 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner backdrop-blur-md">
            <Film className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-xs sm:text-sm font-bold truncate max-w-[150px] xs:max-w-[210px] sm:max-w-md md:max-w-xl text-zinc-100">{file.filename}</h3>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 border border-white/10 shrink-0 backdrop-blur-md">
                {ext || 'VIDEO'}
              </span>
              {videoFiles.length > 1 && (
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 shrink-0 backdrop-blur-md">
                  {currentIndex + 1} / {videoFiles.length}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5 sm:gap-2 truncate">
              <span>{formatFileSize(file.size)}</span>
              {Boolean(file.width && file.height) && <span className="hidden xs:inline">• {file.width}×{file.height}</span>}
              {effectiveDuration > 0 && <span>• {formatDuration(effectiveDuration)}</span>}
              {playbackMode === 'transcode' && (
                <span className="text-sky-400 flex items-center gap-1 font-sans font-medium text-[10px] bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 shrink-0">
                  <Zap className="w-2.5 h-2.5" /> Live
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={takeSnapshot}
            title="عکس از فریم ویدیو (Snapshot)"
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition backdrop-blur-md relative hidden xs:flex border border-white/10"
          >
            {snapshotSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Camera className="w-4 h-4" />}
          </button>

          <button
            onClick={handleCopyLink}
            title={t('copyDirectLink')}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition backdrop-blur-md border border-white/10"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <a
            href={file.downloadUrl}
            download={file.filename}
            title={t('directDownload')}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition backdrop-blur-md border border-white/10"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Native OS Picture-in-Picture (Outside browser) */}
          {isNativePiPSupported && (
            <button
              onClick={toggleNativeOSPiP}
              title={lang === 'fa' ? 'شناور خارج از مرورگر (OS Picture-in-Picture)' : 'Pop out to OS Floating Window'}
              className={`p-2 sm:p-2.5 rounded-full transition backdrop-blur-md active:scale-95 cursor-pointer border ${
                isNativePiPActive
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border-white/10'
              }`}
            >
              <PictureInPicture className="w-4 h-4" />
            </button>
          )}

          {/* In-App Floating Mini Player */}
          <button
            onClick={togglePiP}
            title={lang === 'fa' ? 'تصویر در تصویر شناور درون برنامه (In-App PiP)' : 'In-App Draggable Mini Player'}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition backdrop-blur-md active:scale-95 cursor-pointer border border-white/10"
          >
            <PictureInPicture2 className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-rose-600 text-zinc-300 hover:text-white transition backdrop-blur-md border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ----------------- Bottom Floating Controls Panel (Glassmorphic) ----------------- */}
      <div 
        className={`absolute bottom-0 inset-x-0 p-2.5 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-40 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-zinc-950/65 dark:bg-zinc-950/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/15 rounded-2xl sm:rounded-3xl p-2.5 sm:px-5 sm:py-3.5 shadow-[0_16px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10 flex flex-col gap-2 max-w-5xl mx-auto">
          
          {/* Progress Bar */}
          <div 
            ref={progressBarRef}
            onMouseDown={handleProgressMouseDown}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={handleProgressMouseLeave}
            onTouchStart={handleProgressTouchStart}
            onTouchMove={handleProgressTouchMove}
            onTouchEnd={handleProgressTouchEnd}
            className="relative w-full h-5 flex items-center cursor-pointer group/bar touch-none"
          >
            <div className="w-full h-1.5 sm:h-1.5 group-hover/bar:h-2.5 bg-white/15 rounded-full overflow-hidden transition-all relative">
              <div 
                className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-200"
                style={{ width: `${bufferedPercent}%` }}
              />
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div 
              className="absolute w-3.5 h-3.5 group-hover/bar:w-4 group-hover/bar:h-4 bg-white rounded-full shadow-[0_0_14px_rgba(255,255,255,0.9),0_0_6px_rgba(56,189,248,0.8)] border-2 border-sky-400 -translate-x-1/2 transition-transform duration-75 pointer-events-none"
              style={{ left: `${progressPercent}%` }}
            />

            {hoverTime !== null && (
              <div 
                className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded-md bg-zinc-900 border border-white/20 text-white font-mono text-[11px] pointer-events-none shadow-xl"
                style={{ left: `${hoverPosition}px` }}
              >
                {formatDuration(hoverTime)}
              </div>
            )}
          </div>

          {/* Controls Bottom Row */}
          <div className="flex items-center justify-between gap-1 sm:gap-3 text-white">
            <div className="flex items-center gap-1 sm:gap-2.5 min-w-0">
              <button
                onClick={togglePlay}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-zinc-950 hover:bg-sky-400 hover:text-white transition flex items-center justify-center shadow-lg active:scale-95 shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => skipTime(-10)}
                title="۱۰ ثانیه به عقب"
                className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition flex items-center justify-center shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => skipTime(10)}
                title="۱۰ ثانیه به جلو"
                className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition flex items-center justify-center shrink-0"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 group/vol relative shrink-0">
                <button
                  onClick={toggleMute}
                  className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition"
                  title="صدا"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <div className="hidden md:flex w-0 group-hover/vol:w-20 md:w-20 transition-all duration-200 overflow-hidden items-center">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowRemainingTime(!showRemainingTime)}
                title="تغییر حالت نمایش زمان باقی‌مانده"
                className="text-[10px] xs:text-[11px] sm:text-xs font-mono text-zinc-300 hover:text-white px-1 sm:px-2 py-1 rounded-lg hover:bg-white/10 transition select-none flex items-center gap-1 truncate"
              >
                <span>{formatDuration(currentTime)}</span>
                <span className="text-zinc-500">/</span>
                <span className="text-zinc-400 font-medium">
                  {showRemainingTime && effectiveDuration > 0
                    ? `-${formatDuration(Math.max(0, effectiveDuration - currentTime))}`
                    : formatDuration(effectiveDuration)}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                  }}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-medium border transition ${
                    playbackMode === 'transcode' 
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30' 
                      : 'bg-white/10 text-zinc-300 border-white/10 hover:bg-white/20'
                  }`}
                  title="کیفیت و موتور پخش"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="capitalize hidden sm:inline">{playbackMode === 'transcode' ? (quality === 'auto' ? 'تبدیل آنی' : quality) : 'استریم خام'}</span>
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-full end-0 mb-3 w-56 rounded-2xl bg-zinc-950/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-50 text-xs flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10">
                    <div className="px-3 py-1 text-[11px] font-bold text-zinc-400 border-b border-white/10 flex items-center justify-between">
                      <span>موتور پخش و کیفیت</span>
                      <Zap className="w-3 h-3 text-amber-400" />
                    </div>

                    <button
                      onClick={() => {
                        setPlaybackMode('transcode');
                        setQuality('auto');
                        setShowQualityMenu(false);
                        setIsTranscodingLoading(true);
                        setRetryAttempt(r => r + 1);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-right transition ${
                        playbackMode === 'transcode' && quality === 'auto' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'hover:bg-white/10 text-zinc-300'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">تبدیل خودکار (Auto fMP4)</span>
                        <span className="text-[10px] text-zinc-400">مناسب تمام فرمت‌ها و MKV</span>
                      </div>
                      {playbackMode === 'transcode' && quality === 'auto' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setPlaybackMode('transcode');
                        setQuality('1080p');
                        setShowQualityMenu(false);
                        setIsTranscodingLoading(true);
                        setRetryAttempt(r => r + 1);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-right transition ${
                        playbackMode === 'transcode' && quality === '1080p' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'hover:bg-white/10 text-zinc-300'
                      }`}
                    >
                      <span>1080p Full HD</span>
                      {playbackMode === 'transcode' && quality === '1080p' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setPlaybackMode('transcode');
                        setQuality('720p');
                        setShowQualityMenu(false);
                        setIsTranscodingLoading(true);
                        setRetryAttempt(r => r + 1);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-right transition ${
                        playbackMode === 'transcode' && quality === '720p' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'hover:bg-white/10 text-zinc-300'
                      }`}
                    >
                      <span>720p HD</span>
                      {playbackMode === 'transcode' && quality === '720p' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setPlaybackMode('direct');
                        setShowQualityMenu(false);
                        setIsTranscodingLoading(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-right border-t border-white/10 mt-1 transition ${
                        playbackMode === 'direct' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'hover:bg-white/10 text-zinc-300'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">استریم خام تلگرام (Direct)</span>
                        <span className="text-[10px] text-zinc-400">فرمت‌های استاندارد MP4/WebM</span>
                      </div>
                      {playbackMode === 'direct' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setShowSpeedMenu(!showSpeedMenu);
                    setShowQualityMenu(false);
                  }}
                  className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white text-[11px] sm:text-xs font-mono border border-white/10 transition backdrop-blur-md"
                  title="سرعت پخش"
                >
                  {playbackRate}x
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full end-0 mb-3 w-28 rounded-2xl bg-zinc-950/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-50 text-xs flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`px-3 py-1.5 rounded-xl text-center font-mono transition ${
                          playbackRate === s ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'hover:bg-white/10 text-zinc-300'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Native OS Picture-in-Picture */}
              {isNativePiPSupported && (
                <button
                  onClick={toggleNativeOSPiP}
                  title={lang === 'fa' ? 'شناور خارج از مرورگر (OS Picture-in-Picture)' : 'Pop out to OS Floating Window'}
                  className={`p-2 rounded-xl transition hidden sm:flex ${
                    isNativePiPActive
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                      : 'text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <PictureInPicture className="w-4 h-4" />
                </button>
              )}

              {/* In-App Floating Mini-Player */}
              <button
                onClick={togglePiP}
                title={lang === 'fa' ? 'تصویر در تصویر شناور درون برنامه (In-App PiP)' : 'In-App Draggable Mini Player'}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition hidden sm:flex"
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
                className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
