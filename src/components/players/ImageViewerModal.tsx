import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Maximize, 
  Minimize,
  Download, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Sparkles,
  Layers,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { TelegramFile } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';
import { useTelegram, useBackHandler } from '../../context/TelegramContext';

// Global in-memory cache of successfully loaded full-res image URLs
const loadedImageCache = new Set<string>();

export function ImageViewerModal({ 
  file, 
  onClose 
}: { 
  file: TelegramFile; 
  onClose: () => void;
}) {
  const { activeTab, files, favoriteFiles, setActiveImage } = useTelegram();
  const { t, lang } = useTheme();

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [isFlippedV, setIsFlippedV] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFilmstrip, setShowFilmstrip] = useState(true);

  // Per-file loading & error tracking
  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useBackHandler(showFilters, () => setShowFilters(false));

  // Pan / Dragging position when zoomed
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch Swipe Gesture state (when zoom === 1): Swipe Left/Right (prev/next) & Swipe Down (close)
  const [swipeDelta, setSwipeDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeAxisRef = useRef<'x' | 'y' | null>(null);
  const touchStartPointRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // Visual Image Filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sepia, setSepia] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [invert, setInvert] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const getFullImageUrl = useCallback((f: TelegramFile) => {
    return f.directUrl.startsWith('http')
      ? f.directUrl
      : `${window.location.origin}${f.directUrl}`;
  }, []);

  const imageUrl = getFullImageUrl(file);
  const thumbnailSrc = file.thumbnailUrl || (file.directUrl.startsWith('http') ? file.directUrl : `${window.location.origin}${file.directUrl}`);

  // Image list for next/prev navigation
  const sourceList = activeTab === 'favorites' ? favoriteFiles : files;
  const imageFiles = sourceList.filter(f => f.category === 'images');
  const currentIndex = imageFiles.findIndex(
    f => f.id === file.id && (f.originPeer || 'me') === (file.originPeer || 'me')
  );

  // Preload adjacent images (Next 2, Prev 1) in background for instant switching
  useEffect(() => {
    const imagesToPreload: TelegramFile[] = [];
    if (currentIndex < imageFiles.length - 1) imagesToPreload.push(imageFiles[currentIndex + 1]);
    if (currentIndex < imageFiles.length - 2) imagesToPreload.push(imageFiles[currentIndex + 2]);
    if (currentIndex > 0) imagesToPreload.push(imageFiles[currentIndex - 1]);

    imagesToPreload.forEach(imgFile => {
      const url = getFullImageUrl(imgFile);
      if (!loadedImageCache.has(url)) {
        const img = new Image();
        img.src = url;
        img.onload = () => loadedImageCache.add(url);
      }
    });
  }, [currentIndex, imageFiles, getFullImageUrl]);

  // Reset adjustments and initialize loading state on file change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setIsFlippedH(false);
    setIsFlippedV(false);
    setPanOffset({ x: 0, y: 0 });
    setSwipeDelta({ x: 0, y: 0 });
    resetFilters();

    const url = getFullImageUrl(file);
    if (loadedImageCache.has(url)) {
      setLoadingState('loaded');
    } else {
      setLoadingState('loading');
    }
  }, [file.id, getFullImageUrl, reloadKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === 'r' || e.key === 'R') handleRotateCw();
      if (e.key === 'f' || e.key === 'F') handleFlipH();
      if (e.key === '0') handleReset();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, imageFiles]);

  const handleNext = () => {
    if (currentIndex < imageFiles.length - 1) {
      setActiveImage(imageFiles[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setActiveImage(imageFiles[currentIndex - 1]);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.3, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.3, 0.4));
  const handleRotateCw = () => setRotation(prev => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation(prev => (prev - 90 + 360) % 360);
  const handleFlipH = () => setIsFlippedH(prev => !prev);
  const handleFlipV = () => setIsFlippedV(prev => !prev);
  
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setIsFlippedH(false);
    setIsFlippedV(false);
    setPanOffset({ x: 0, y: 0 });
    setSwipeDelta({ x: 0, y: 0 });
    resetFilters();
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSepia(0);
    setGrayscale(0);
    setInvert(0);
  };

  const hasCustomFilters = brightness !== 100 || contrast !== 100 || saturation !== 100 || sepia !== 0 || grayscale !== 0 || invert !== 0;

  // Desktop Mouse Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPanOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Gestures: Pan when zoomed, or Swipe Left/Right/Down when zoom === 1
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    if (zoom > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX - panOffset.x,
        y: touch.clientY - panOffset.y
      };
    } else {
      setIsSwiping(true);
      swipeAxisRef.current = null;
      touchStartPointRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      setSwipeDelta({ x: 0, y: 0 });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    if (zoom > 1 && isDragging) {
      setPanOffset({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y
      });
      return;
    }

    if (zoom === 1 && isSwiping) {
      const dx = touch.clientX - touchStartPointRef.current.x;
      const dy = touch.clientY - touchStartPointRef.current.y;

      if (!swipeAxisRef.current) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          swipeAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        } else {
          return;
        }
      }

      if (swipeAxisRef.current === 'x') {
        // Apply resistance if at start or end of gallery
        const atBoundary =
          (dx > 0 && currentIndex === 0) ||
          (dx < 0 && currentIndex === imageFiles.length - 1);
        setSwipeDelta({ x: atBoundary ? dx * 0.25 : dx, y: 0 });
      } else if (swipeAxisRef.current === 'y') {
        // Allow downward swipe to close (resist upward swipe)
        setSwipeDelta({ x: dx * 0.15, y: dy > 0 ? dy : dy * 0.2 });
      }
    }
  };

  const handleTouchEnd = () => {
    if (zoom > 1) {
      setIsDragging(false);
      return;
    }

    if (isSwiping) {
      const elapsed = Math.max(1, Date.now() - touchStartPointRef.current.time);
      const velocityX = Math.abs(swipeDelta.x) / elapsed;
      const velocityY = swipeDelta.y / elapsed;

      if (swipeAxisRef.current === 'y' && (swipeDelta.y > 95 || (swipeDelta.y > 45 && velocityY > 0.45))) {
        if (navigator.vibrate) navigator.vibrate(20);
        onClose();
        return;
      }

      if (swipeAxisRef.current === 'x') {
        if ((swipeDelta.x < -55 || (swipeDelta.x < -25 && velocityX > 0.4)) && currentIndex < imageFiles.length - 1) {
          if (navigator.vibrate) navigator.vibrate(15);
          handleNext();
        } else if ((swipeDelta.x > 55 || (swipeDelta.x > 25 && velocityX > 0.4)) && currentIndex > 0) {
          if (navigator.vibrate) navigator.vibrate(15);
          handlePrev();
        }
      }

      setIsSwiping(false);
      swipeAxisRef.current = null;
      setSwipeDelta({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(imageUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const filterStyle = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%) grayscale(${grayscale}%) invert(${invert}%)`;

  // Dynamic backdrop dimming and scale when swiping down to close
  const swipeDownProgress = Math.min(1, Math.max(0, swipeDelta.y / 300));
  const swipeScale = zoom === 1 && swipeDelta.y > 0 ? Math.max(0.78, 1 - swipeDownProgress * 0.22) : zoom;
  const backdropOpacity = Math.max(0.35, 0.95 - swipeDownProgress * 0.6);

  return (
    <div 
      ref={containerRef}
      style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
      className="fixed inset-0 z-50 backdrop-blur-2xl flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200 transition-colors"
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
    >
      {/* Mobile Pull-Down Handle Indicator */}
      <div className="sm:hidden pt-[max(0.4rem,env(safe-area-inset-top))] flex justify-center pointer-events-none z-40">
        <div className="w-10 h-1 rounded-full bg-white/30" />
      </div>

      {/* ----------------- Top Header Bar (Glassmorphic) ----------------- */}
      <div className="p-3 sm:p-5 pt-2 sm:pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-[2px] flex items-center justify-between gap-2 text-white z-40">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-500/20 to-pink-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 shadow-inner backdrop-blur-md">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-xs sm:text-sm font-bold truncate max-w-[140px] xs:max-w-[200px] sm:max-w-md md:max-w-xl text-zinc-100">{file.filename}</h3>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 border border-white/10 shrink-0 font-mono backdrop-blur-md">
                {currentIndex + 1} / {imageFiles.length}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5 sm:gap-2 truncate">
              <span>{formatFileSize(file.size)}</span>
              {Boolean(file.width && file.height) && <span className="hidden xs:inline">• {file.width}×{file.height}px</span>}
              <span>• {formatDate(file.date, lang)}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Filters Studio Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            title="تنظیمات نور و رنگ (Filters Studio)"
            className={`p-2 sm:p-2.5 rounded-full transition backdrop-blur-md relative border ${
              showFilters || hasCustomFilters ? 'bg-rose-500/30 text-rose-300 border-rose-500/50' : 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border-white/10'
            }`}
          >
            <Sliders className="w-4 h-4" />
            {hasCustomFilters && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-black" />}
          </button>

          {/* Copy Direct Link */}
          <button
            onClick={handleCopyLink}
            title={t('copyDirectLink')}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition backdrop-blur-md border border-white/10"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Download Original File */}
          <a
            href={imageUrl}
            download={file.filename}
            title={t('directDownload')}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition backdrop-blur-md border border-white/10"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition backdrop-blur-md hidden sm:flex border border-white/10"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-rose-600 text-zinc-300 hover:text-white transition backdrop-blur-md border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ----------------- Filters Drawer Popover (Glassmorphic) ----------------- */}
      {showFilters && (
        <div className="absolute inset-x-3 bottom-20 sm:bottom-auto sm:top-20 sm:inset-x-auto sm:end-6 sm:w-72 rounded-2xl sm:rounded-3xl bg-zinc-950/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 p-4 z-40 text-white shadow-[0_16px_45px_rgba(0,0,0,0.65)] animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-top-3 duration-200 flex flex-col gap-3 ring-1 ring-white/10">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-bold flex items-center gap-1.5 text-zinc-200">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              استودیو فیلتر تصویر
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={resetFilters} 
                className="text-[10px] text-rose-400 hover:text-rose-300 font-medium px-2 py-0.5 rounded bg-rose-500/10"
              >
                ریست فیلترها
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 rounded-lg bg-white/10 text-zinc-300 sm:hidden"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2.5 text-xs">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>روشنایی</span>
                <span className="font-mono">{brightness}%</span>
              </div>
              <input 
                type="range" min={30} max={200} value={brightness} 
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>کنتراست</span>
                <span className="font-mono">{contrast}%</span>
              </div>
              <input 
                type="range" min={30} max={200} value={contrast} 
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>اشباع رنگ</span>
                <span className="font-mono">{saturation}%</span>
              </div>
              <input 
                type="range" min={0} max={200} value={saturation} 
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>سیاه و سفید</span>
                <span className="font-mono">{grayscale}%</span>
              </div>
              <input 
                type="range" min={0} max={100} value={grayscale} 
                onChange={(e) => setGrayscale(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>نوستالژیک</span>
                <span className="font-mono">{sepia}%</span>
              </div>
              <input 
                type="range" min={0} max={100} value={sepia} 
                onChange={(e) => setSepia(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>نگاتیو</span>
                <span className="font-mono">{invert}%</span>
              </div>
              <input 
                type="range" min={0} max={100} value={invert} 
                onChange={(e) => setInvert(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500" 
              />
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Main Canvas Viewport ----------------- */}
      <div 
        className="relative flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-4 select-none cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-zinc-950/60 hover:bg-zinc-900/80 text-white backdrop-blur-2xl border border-white/15 flex items-center justify-center transition shadow-2xl hover:scale-110 active:scale-95 ring-1 ring-white/10 cursor-pointer"
            title="تصویر قبلی"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Next Button */}
        {currentIndex < imageFiles.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-zinc-950/60 hover:bg-zinc-900/80 text-white backdrop-blur-2xl border border-white/15 flex items-center justify-center transition shadow-2xl hover:scale-110 active:scale-95 ring-1 ring-white/10 cursor-pointer"
            title="تصویر بعدی"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Displayed Image Container with Zoom/Pan/Swipe/Rotate/Flip & Progressive Loading Layers */}
        <div 
          className={`relative ${isSwiping || isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'} flex items-center justify-center pointer-events-none max-h-[72dvh] max-w-[92vw] sm:max-w-[88vw]`}
          style={{
            transform: `translate(${zoom > 1 ? panOffset.x : swipeDelta.x}px, ${zoom > 1 ? panOffset.y : swipeDelta.y}px) scale(${swipeScale}) rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1}) scaleY(${isFlippedV ? -1 : 1})`,
          }}
        >
          {/* Layer 1: Instant Low-Res Thumbnail Blur Placeholder (Eliminates showing old photo) */}
          {loadingState === 'loading' && (
            <div className="relative flex items-center justify-center overflow-hidden rounded-2xl">
              <img
                src={thumbnailSrc}
                alt=""
                aria-hidden="true"
                className="max-h-[72dvh] max-w-[92vw] sm:max-w-[88vw] object-contain rounded-2xl blur-md scale-105 opacity-70 filter brightness-90 transition-opacity duration-300"
              />
              
              {/* Telegram-style Circular Loading Spinner Overlay */}
              <div className="absolute inset-0 m-auto flex flex-col items-center justify-center gap-2.5 z-20 pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                  <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
                </div>
                <span className="text-[11px] font-bold text-zinc-200 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
                  {lang === 'fa' ? 'درحال دریافت...' : 'Loading image...'}
                </span>
              </div>
            </div>
          )}

          {/* Layer 2: Error State with Retry Button */}
          {loadingState === 'error' && (
            <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-black/60 backdrop-blur-2xl border border-rose-500/30 text-white gap-3 pointer-events-auto shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-zinc-200">
                {lang === 'fa' ? 'خطا در بارگذاری تصویر' : 'Failed to load image'}
              </p>
              <button
                onClick={() => {
                  setLoadingState('loading');
                  setReloadKey(k => k + 1);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition active:scale-95 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'تلاش مجدد' : 'Retry'}</span>
              </button>
            </div>
          )}

          {/* Layer 3: High-Res Full Image with Discrete Key per File ID */}
          <img
            key={`${file.id}-${reloadKey}`}
            src={imageUrl}
            alt={file.filename}
            style={{ filter: filterStyle }}
            onLoad={() => {
              loadedImageCache.add(imageUrl);
              setLoadingState('loaded');
            }}
            onError={() => {
              setLoadingState('error');
            }}
            className={`max-h-[72dvh] max-w-[92vw] sm:max-w-[88vw] object-contain rounded-2xl shadow-2xl pointer-events-auto ring-1 ring-white/10 transition-opacity duration-250 ease-out ${
              loadingState === 'loaded' ? 'opacity-100' : 'opacity-0 absolute inset-0 m-auto'
            }`}
          />
        </div>
      </div>

      {/* ----------------- Bottom Floating Toolbar & Filmstrip (Glassmorphic) ----------------- */}
      <div className="p-2.5 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/85 via-black/40 to-transparent backdrop-blur-[2px] flex flex-col items-center gap-2.5 sm:gap-3 z-40">
        
        {/* Thumbnails Filmstrip Preview */}
        {showFilmstrip && imageFiles.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full px-3 py-1.5 scrollbar-none bg-zinc-950/50 backdrop-blur-xl rounded-2xl border border-white/10">
            {imageFiles.map((imgFile) => (
              <button
                key={imgFile.id}
                onClick={() => setActiveImage(imgFile)}
                className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer ${
                  imgFile.id === file.id 
                    ? 'border-rose-500 scale-110 shadow-[0_0_12px_rgba(244,63,94,0.6)] z-10 ring-2 ring-white/30' 
                    : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                }`}
              >
                <img
                  src={imgFile.thumbnailUrl || imgFile.directUrl}
                  alt={imgFile.filename}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Controls Pill (Glassmorphic) */}
        <div className="bg-zinc-950/65 dark:bg-zinc-950/70 backdrop-blur-2xl backdrop-saturate-150 px-3 sm:px-4 py-2 rounded-2xl sm:rounded-3xl border border-white/15 flex items-center gap-1.5 sm:gap-3 text-white text-xs shadow-[0_16px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10 max-w-[95vw] overflow-x-auto scrollbar-none">
          <button onClick={handleZoomOut} title="کوچک‌نمایی (-)" className="p-1.5 rounded-lg hover:bg-white/10 hover:text-rose-400 transition shrink-0 cursor-pointer">
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="font-mono text-[11px] px-1 text-zinc-300 min-w-10 text-center font-bold shrink-0">
            {Math.round(zoom * 100)}%
          </span>

          <button onClick={handleZoomIn} title="بزرگ‌نمایی (+)" className="p-1.5 rounded-lg hover:bg-white/10 hover:text-rose-400 transition shrink-0 cursor-pointer">
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/20 mx-0.5 shrink-0" />

          <button onClick={handleRotateCcw} title="چرخش ۹۰- درجه" className="p-1.5 rounded-lg hover:bg-white/10 hover:text-rose-400 transition hidden sm:flex shrink-0 cursor-pointer">
            <RotateCcw className="w-4 h-4" />
          </button>

          <button onClick={handleRotateCw} title="چرخش ۹۰ درجه (R)" className="p-1.5 rounded-lg hover:bg-white/10 hover:text-rose-400 transition shrink-0 cursor-pointer">
            <RotateCw className="w-4 h-4" />
          </button>

          <button onClick={handleFlipH} title="آینه افقی (F)" className="p-1.5 rounded-lg hover:bg-white/10 hover:text-rose-400 transition shrink-0 cursor-pointer">
            <FlipHorizontal className="w-4 h-4" />
          </button>

          <button onClick={handleFlipV} title="آینه عمودی" className="p-1.5 rounded-lg hover:bg-white/10 hover:text-rose-400 transition hidden sm:flex shrink-0 cursor-pointer">
            <FlipVertical className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/20 mx-0.5 shrink-0" />

          {imageFiles.length > 1 && (
            <button
              onClick={() => setShowFilmstrip(!showFilmstrip)}
              title="نمایش نوار تصاویر"
              className={`p-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                showFilmstrip ? 'text-rose-400 bg-rose-500/20 border border-rose-500/30' : 'text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>
          )}

          <button 
            onClick={handleReset} 
            title="ریست مقیاس و جهت (0)" 
            className="text-[11px] font-medium px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl transition text-zinc-200 hover:text-white shrink-0 border border-white/10 cursor-pointer"
          >
            ریست
          </button>
        </div>
      </div>
    </div>
  );
}
