import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TelegramFile, StorageStats, TelegramUser, FileCategory, SortOption, ViewMode, ActiveTab } from '../types';
import { DEMO_FILES, DEMO_STATS } from '../utils/demoData';

interface TelegramContextType {
  // Navigation tabs
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Web app auth
  isWebAuthProtected: boolean;
  isWebAuthenticated: boolean;
  checkWebAuth: () => Promise<void>;
  webLogin: (u: string, p: string) => Promise<boolean>;
  webLogout: () => Promise<void>;

  // Telegram connection
  isConnected: boolean;
  isDemoMode: boolean;
  isLoading: boolean;
  user: TelegramUser | null;
  connectDemoMode: () => void;
  checkTelegramStatus: () => Promise<void>;
  fetchFullUser: () => Promise<void>;
  disconnectTelegram: () => Promise<void>;

  // Files & storage
  files: TelegramFile[];
  filteredFiles: TelegramFile[];
  stats: StorageStats | null;
  selectedCategory: FileCategory;
  setSelectedCategory: (cat: FileCategory) => void;
  selectedExtension: string | null;
  setSelectedExtension: (ext: string | null) => void;
  availableExtensions: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortOption: SortOption;
  setSortOption: (s: SortOption) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  refreshFiles: () => Promise<void>;
  deleteFile: (id: number) => Promise<boolean>;

  // Players & Modals
  activeVideo: TelegramFile | null;
  setActiveVideo: (f: TelegramFile | null) => void;
  activeAudio: TelegramFile | null;
  setActiveAudio: (f: TelegramFile | null) => void;
  activeImage: TelegramFile | null;
  setActiveImage: (f: TelegramFile | null) => void;
  activeDoc: TelegramFile | null;
  setActiveDoc: (f: TelegramFile | null) => void;
  shareModalFile: TelegramFile | null;
  setShareModalFile: (f: TelegramFile | null) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;

  // Audio & Video player global control
  isPlayingAudio: boolean;
  setIsPlayingAudio: (p: boolean) => void;
  isVideoPiP: boolean;
  setIsVideoPiP: (pip: boolean) => void;

  // Multi-select state & batch actions
  selectedFileIds: number[];
  isSelectionMode: boolean;
  toggleSelectFile: (id: number) => void;
  selectAllFiltered: () => void;
  clearSelection: () => void;
  deleteMultipleFiles: (ids: number[]) => Promise<boolean>;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('files');

  // Web app login status
  const [isWebAuthProtected, setIsWebAuthProtected] = useState(false);
  const [isWebAuthenticated, setIsWebAuthenticated] = useState(true);

  // Telegram account status
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('telecloud_mode') === 'demo';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<TelegramUser | null>(null);

  // File data
  const [files, setFiles] = useState<TelegramFile[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);

  // UI Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modals & Active media
  const [activeVideo, setActiveVideoState] = useState<TelegramFile | null>(null);
  const [isVideoPiP, setIsVideoPiP] = useState(false);
  const [activeAudio, setActiveAudio] = useState<TelegramFile | null>(null);
  const [activeImage, setActiveImage] = useState<TelegramFile | null>(null);
  const [activeDoc, setActiveDoc] = useState<TelegramFile | null>(null);
  const [shareModalFile, setShareModalFile] = useState<TelegramFile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);

  // Track if music was playing before a video opened, to auto-resume on close
  const wasPlayingAudioBeforeVideoRef = React.useRef(false);

  const setActiveVideo = useCallback((file: TelegramFile | null) => {
    if (file) {
      if (isPlayingAudio) {
        wasPlayingAudioBeforeVideoRef.current = true;
      }
      setIsPlayingAudio(false);
      setIsVideoPiP(false);
      setActiveVideoState(file);
    } else {
      setActiveVideoState(null);
      setIsVideoPiP(false);
      // Auto-resume music if it was playing before video opened
      if (wasPlayingAudioBeforeVideoRef.current) {
        wasPlayingAudioBeforeVideoRef.current = false;
        setIsPlayingAudio(true);
      }
    }
  }, [isPlayingAudio]);

  const isSelectionMode = selectedFileIds.length > 0;

  // Check Web App Auth Status
  const checkWebAuth = async () => {
    try {
      const res = await fetch('/api/auth/web-status');
      const data = await res.json();
      setIsWebAuthProtected(data.isAuthProtected);
      setIsWebAuthenticated(data.isAuthenticated);
    } catch {
      setIsWebAuthenticated(true);
    }
  };

  const webLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/web-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsWebAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const webLogout = async () => {
    try {
      await fetch('/api/auth/web-logout', { method: 'POST' });
      setIsWebAuthenticated(false);
    } catch {}
  };

  // Fetch files from real Telegram or Demo
  const refreshFiles = useCallback(async () => {
    if (isDemoMode) {
      setFiles(DEMO_FILES);
      setStats(DEMO_STATS);
      setIsLoading(false);
      return;
    }

    if (!isConnected) {
      setFiles([]);
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [filesRes, statsRes] = await Promise.all([
        fetch('/api/telegram/files?limit=150'),
        fetch('/api/telegram/stats'),
      ]);

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        if (filesData.success) {
          setFiles(filesData.files || []);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }
    } catch (e) {
      console.error('Failed to load files:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, isDemoMode]);

  // Fetch full user profile details (Bio, Numeric ID, DC, Premium)
  const fetchFullUser = useCallback(async () => {
    if (isDemoMode) {
      setUser({
        id: '784912034',
        firstName: 'Demo Vault',
        lastName: 'Developer',
        username: 'telecloud_user',
        phone: '+98 912 345 6789',
        bio: '🚀 TeleCloud Cloud Vault: Unlimited personal cloud storage powered by Telegram Saved Messages. Zero server disk usage.',
        isPremium: true,
        dcId: 4,
        photoUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%232563eb'/%3E%3Cstop offset='100%25' stop-color='%2338bdf8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='50' fill='url(%23g)'/%3E%3Cpath d='M50 25a18 18 0 1 0 0 36 18 18 0 0 0 0-36zm0 43c-18.8 0-34 10.7-34 24 0 2 15.2 3 34 3s34-1 34-3c0-13.3-15.2-24-34-24z' fill='%23ffffff' opacity='0.9'/%3E%3C/svg%3E",
        connectedAt: new Date().toISOString(),
      });
      return;
    }

    if (!isConnected) return;

    try {
      const res = await fetch('/api/telegram/full-user');
      const data = await res.json();
      if (data.success && data.user) {
        setUser({
          ...data.user,
          photoUrl: '/api/telegram/profile-photo',
        });
      }
    } catch (e) {
      console.error('Failed to fetch full user info:', e);
    }
  }, [isConnected, isDemoMode]);

  // Check Telegram status on mount (and auto-restore encrypted remember session)
  const checkTelegramStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (data.connected) {
        setIsConnected(true);
        setIsDemoMode(false);
        setUser(data.user || null);
        localStorage.removeItem('telecloud_mode');
        // Fetch full profile info with bio, DC ID, and premium status
        fetch('/api/telegram/full-user')
          .then((r) => r.json())
          .then((fullData) => {
            if (fullData.success && fullData.user) {
              setUser(fullData.user);
            }
          })
          .catch(() => {});
        return;
      }

      // If status is not connected, check if an encrypted session is stored in localStorage
      const savedEncryptedToken = localStorage.getItem('telecloud_encrypted_session');
      if (savedEncryptedToken) {
        try {
          const restoreRes = await fetch('/api/telegram/restore-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: savedEncryptedToken }),
          });
          const restoreData = await restoreRes.json();
          if (restoreData.success) {
            setIsConnected(true);
            setIsDemoMode(false);
            setUser(restoreData.user || null);
            localStorage.removeItem('telecloud_mode');
            fetch('/api/telegram/full-user')
              .then((r) => r.json())
              .then((fullData) => {
                if (fullData.success && fullData.user) {
                  setUser(fullData.user);
                }
              })
              .catch(() => {});
            return;
          } else {
            // Token expired or invalid
            localStorage.removeItem('telecloud_encrypted_session');
          }
        } catch {
          // Ignore restore error
        }
      }

      setIsConnected(false);
      if (isDemoMode) {
        setUser({
          id: '784912034',
          firstName: 'Demo Vault',
          lastName: 'Developer',
          username: 'telecloud_user',
          phone: '+98 912 345 6789',
          bio: '🚀 TeleCloud Cloud Vault: Unlimited personal cloud storage powered by Telegram Saved Messages. Zero server disk usage.',
          isPremium: true,
          dcId: 4,
          connectedAt: new Date().toISOString(),
        });
      }
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    checkWebAuth();
    checkTelegramStatus();
  }, [checkTelegramStatus]);

  useEffect(() => {
    refreshFiles();
  }, [isConnected, isDemoMode, refreshFiles]);

  const connectDemoMode = () => {
    setIsDemoMode(true);
    setIsConnected(false);
    setUser({
      id: '784912034',
      firstName: 'Demo Vault',
      lastName: 'Developer',
      username: 'telecloud_user',
      phone: '+98 912 345 6789',
      bio: '🚀 TeleCloud Cloud Vault: Unlimited personal cloud storage powered by Telegram Saved Messages. Zero server disk usage.',
      isPremium: true,
      dcId: 4,
      connectedAt: new Date().toISOString(),
    });
    localStorage.setItem('telecloud_mode', 'demo');
    setIsLoginModalOpen(false);
  };

  const disconnectTelegram = async () => {
    try {
      await fetch('/api/telegram/logout', { method: 'POST' });
    } catch {}
    setIsConnected(false);
    setIsDemoMode(false);
    setUser(null);
    localStorage.removeItem('telecloud_mode');
    localStorage.removeItem('telecloud_encrypted_session');
    setFiles([]);
    setStats(null);
  };

  const deleteFile = async (id: number): Promise<boolean> => {
    if (isDemoMode) {
      setFiles(prev => prev.filter(f => f.id !== id));
      setSelectedFileIds(prev => prev.filter(fid => fid !== id));
      return true;
    }

    try {
      const res = await fetch(`/api/telegram/file/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFiles(prev => prev.filter(f => f.id !== id));
        setSelectedFileIds(prev => prev.filter(fid => fid !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const toggleSelectFile = useCallback((id: number) => {
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFileIds([]);
  }, []);

  const deleteMultipleFiles = async (ids: number[]): Promise<boolean> => {
    if (ids.length === 0) return true;
    if (isDemoMode) {
      const idSet = new Set(ids);
      setFiles(prev => prev.filter(f => !idSet.has(f.id)));
      setSelectedFileIds(prev => prev.filter(id => !idSet.has(id)));
      return true;
    }

    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/telegram/file/${id}`, { method: 'DELETE' });
            const data = await res.json();
            return data.success ? id : null;
          } catch {
            return null;
          }
        })
      );
      const deletedIds = new Set(results.filter((id): id is number => id !== null));
      if (deletedIds.size > 0) {
        setFiles(prev => prev.filter(f => !deletedIds.has(f.id)));
        setSelectedFileIds(prev => prev.filter(id => !deletedIds.has(id)));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Extract all unique file extensions in the current view
  const availableExtensions = React.useMemo(() => {
    const exts = new Set<string>();
    files.forEach(f => {
      const ext = f.filename.split('.').pop()?.toLowerCase();
      if (ext && ext !== f.filename.toLowerCase()) {
        exts.add(`.${ext}`);
      }
    });
    return Array.from(exts);
  }, [files]);

  // Filtering and Sorting
  const filteredFiles = React.useMemo(() => {
    let result = [...files];

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(f => f.category === selectedCategory);
    }

    // Extension filter
    if (selectedExtension) {
      result = result.filter(f => f.filename.toLowerCase().endsWith(selectedExtension.toLowerCase()));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        f =>
          f.filename.toLowerCase().includes(q) ||
          f.caption.toLowerCase().includes(q) ||
          f.mimeType.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'date_desc':
          return b.date - a.date;
        case 'date_asc':
          return a.date - b.date;
        case 'size_desc':
          return b.size - a.size;
        case 'size_asc':
          return a.size - b.size;
        case 'name_asc':
          return a.filename.localeCompare(b.filename);
        case 'name_desc':
          return b.filename.localeCompare(a.filename);
        default:
          return b.date - a.date;
      }
    });

    return result;
  }, [files, selectedCategory, selectedExtension, searchQuery, sortOption]);

  const selectAllFiltered = useCallback(() => {
    const allFilteredIds = filteredFiles.map(f => f.id);
    setSelectedFileIds(prev => {
      const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => prev.includes(id));
      if (allSelected) {
        return [];
      }
      return allFilteredIds;
    });
  }, [filteredFiles]);

  return (
    <TelegramContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isWebAuthProtected,
        isWebAuthenticated,
        checkWebAuth,
        webLogin,
        webLogout,
        isConnected,
        isDemoMode,
        isLoading,
        user,
        connectDemoMode,
        checkTelegramStatus,
        fetchFullUser,
        disconnectTelegram,
        files,
        filteredFiles,
        stats,
        selectedCategory,
        setSelectedCategory,
        selectedExtension,
        setSelectedExtension,
        availableExtensions,
        searchQuery,
        setSearchQuery,
        sortOption,
        setSortOption,
        viewMode,
        setViewMode,
        refreshFiles,
        deleteFile,
        activeVideo,
        setActiveVideo,
        activeAudio,
        setActiveAudio,
        activeImage,
        setActiveImage,
        activeDoc,
        setActiveDoc,
        shareModalFile,
        setShareModalFile,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isPlayingAudio,
        setIsPlayingAudio,
        isVideoPiP,
        setIsVideoPiP,
        selectedFileIds,
        isSelectionMode,
        toggleSelectFile,
        selectAllFiltered,
        clearSelection,
        deleteMultipleFiles,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) throw new Error('useTelegram must be used within TelegramProvider');
  return context;
}
