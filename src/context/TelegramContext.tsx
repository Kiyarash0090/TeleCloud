import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  TelegramFile,
  StorageStats,
  TelegramUser,
  SavedTelegramAccount,
  SharedApiCredentials,
  FileCategory,
  SortOption,
  ViewMode,
  ActiveTab,
} from '../types';
import { DEMO_FILES, DEMO_STATS } from '../utils/demoData';

interface NavSnapshot {
  activeTab: ActiveTab;
  selectedCategory: FileCategory;
  selectedExtension: string | null;
  activePeer: string;
  activeChatTitle: string;
}

const ACCOUNTS_STORAGE_KEY = 'telecloud_accounts';
const ACTIVE_ACCOUNT_ID_KEY = 'telecloud_active_account_id';
const SHARED_API_CREDS_KEY = 'telecloud_shared_api_creds';
const LEGACY_TOKEN_KEY = 'telecloud_encrypted_session';

function loadSavedAccounts(): SavedTelegramAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccountsToStorage(list: SavedTelegramAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function loadSharedApiCreds(): SharedApiCredentials | null {
  try {
    const raw = localStorage.getItem(SHARED_API_CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.apiId && parsed.apiHash) {
      return { apiId: String(parsed.apiId), apiHash: String(parsed.apiHash) };
    }
    return null;
  } catch {
    return null;
  }
}

function extractPeerFromUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const match = url.match(/[?&]peer=([^&]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {}
  return undefined;
}

function ensurePeerInUrl(url: string | null | undefined, peer: string): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith('/')) return url;
  if (/[?&]peer=/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}peer=${encodeURIComponent(peer)}`;
}

export function resolveFilePeer(file: TelegramFile, fallbackPeer?: string): string {
  return (
    file.originPeer ||
    extractPeerFromUrl(file.directUrl) ||
    extractPeerFromUrl(file.downloadUrl) ||
    extractPeerFromUrl(file.streamUrl) ||
    extractPeerFromUrl(file.thumbnailUrl) ||
    fallbackPeer ||
    'me'
  );
}

function normalizeFavoriteFile(
  file: TelegramFile,
  fallbackPeer?: string,
  fallbackTitle?: string
): TelegramFile {
  const peer = resolveFilePeer(file, fallbackPeer);
  const title =
    file.originChatTitle ||
    fallbackTitle ||
    (peer === 'me' ? 'Saved Messages' : peer);
  return {
    ...file,
    originPeer: peer,
    originChatTitle: title,
    thumbnailUrl: ensurePeerInUrl(file.thumbnailUrl, peer) ?? file.thumbnailUrl,
    downloadUrl: ensurePeerInUrl(file.downloadUrl, peer) || file.downloadUrl,
    streamUrl: ensurePeerInUrl(file.streamUrl, peer) || file.streamUrl,
    directUrl: ensurePeerInUrl(file.directUrl, peer) || file.directUrl,
  };
}

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

  // Telegram connection & Multi-Account management
  isConnected: boolean;
  isDemoMode: boolean;
  isLoading: boolean;
  isSwitchingAccount: boolean;
  user: TelegramUser | null;
  accounts: SavedTelegramAccount[];
  activeAccountId: string | null;
  sharedApiCreds: SharedApiCredentials | null;
  saveSharedApiCreds: (apiId: string, apiHash: string) => void;
  addOrUpdateAccount: (
    user: TelegramUser,
    encryptedToken: string,
    apiId?: string,
    apiHash?: string
  ) => void;
  switchAccount: (accountId: string) => Promise<boolean>;
  removeAccount: (accountId: string) => Promise<void>;
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
  refreshFiles: (forceReload?: boolean) => Promise<void>;
  loadMoreFiles: () => Promise<void>;
  hasMoreFiles: boolean;
  isLoadingMore: boolean;
  deleteFile: (id: number) => Promise<boolean>;

  // Favorites (Global across all chats & channels)
  favoriteFiles: TelegramFile[];
  favoriteFileIds: number[];
  toggleFavorite: (fileOrId: TelegramFile | number, peer?: string) => void;
  isFavorite: (fileOrId: TelegramFile | number, peer?: string) => boolean;

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
  isTelegramLinkModalOpen: boolean;
  setIsTelegramLinkModalOpen: (open: boolean) => void;
  isAccountDrawerOpen: boolean;
  setIsAccountDrawerOpen: (open: boolean) => void;


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

  // Chat / Channel / Bot Selector
  activePeer: string;
  activeChatTitle: string;
  setActivePeer: (id: string, title: string) => void;
  isChatSelectorOpen: boolean;
  setIsChatSelectorOpen: (open: boolean) => void;

  // Mobile Back Button & Double-Back-to-Exit
  showExitToast: boolean;
  registerBackHandler: (id: string, onBack: () => void) => void;
  unregisterBackHandler: (id: string) => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('files');

  // Web app login status
  const [isWebAuthProtected, setIsWebAuthProtected] = useState(false);
  const [isWebAuthenticated, setIsWebAuthenticated] = useState(true);

  // Telegram account status & Multi-account list
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('telecloud_mode') === 'demo';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [accounts, setAccounts] = useState<SavedTelegramAccount[]>(() => loadSavedAccounts());
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_ACCOUNT_ID_KEY);
  });
  const [sharedApiCreds, setSharedApiCreds] = useState<SharedApiCredentials | null>(() =>
    loadSharedApiCreds()
  );

  // Chat / Channel / Bot Selector state
  const [activePeer, setActivePeerState] = useState<string>('me');
  const [activeChatTitle, setActiveChatTitle] = useState<string>('Saved Messages');
  const [isChatSelectorOpen, setIsChatSelectorOpen] = useState(false);

  // File data, in-memory channel cache & pagination
  const [files, setFiles] = useState<TelegramFile[]>([]);
  const [hasMoreFiles, setHasMoreFiles] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const nextOffsetIdRef = useRef<number>(0);
  const activeFetchTokenRef = useRef<number>(0);
  const isLoadingMoreRef = useRef<boolean>(false);

  // In-memory cache for channel/chat file lists: key is `${activeAccountId}_${activePeer}`
  const channelCacheRef = useRef<
    Map<
      string,
      {
        files: TelegramFile[];
        nextOffsetId: number;
        hasMore: boolean;
        timestamp: number;
      }
    >
  >(new Map());

  const getCacheKey = useCallback(
    (peer?: string) => {
      const acc = activeAccountId || user?.id || 'default';
      const p = peer !== undefined ? peer : activePeer || 'me';
      return `${acc}_${p}`;
    },
    [activeAccountId, user?.id, activePeer]
  );

  // Live computed storage stats across all loaded files
  const stats = React.useMemo<StorageStats | null>(() => {
    if (isDemoMode) return DEMO_STATS;
    if (!isConnected && files.length === 0) return null;
    const result: StorageStats = {
      totalFiles: 0,
      totalSize: 0,
      categories: {
        images: { count: 0, size: 0 },
        videos: { count: 0, size: 0 },
        audio: { count: 0, size: 0 },
        documents: { count: 0, size: 0 },
        archives: { count: 0, size: 0 },
        other: { count: 0, size: 0 },
      },
    };
    for (const f of files) {
      const cat = (f.category in result.categories ? f.category : 'other') as Exclude<FileCategory, 'all'>;
      if (result.categories[cat]) {
        result.categories[cat].count += 1;
        result.categories[cat].size += f.size || 0;
      }
      result.totalFiles += 1;
      result.totalSize += f.size || 0;
    }
    return result;
  }, [files, isDemoMode, isConnected]);

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
  const [isTelegramLinkModalOpen, setIsTelegramLinkModalOpen] = useState(false);
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [showExitToast, setShowExitToast] = useState(false);

  // Global Favorites state persisted in localStorage across all chats & channels
  const [favoriteFiles, setFavoriteFiles] = useState<TelegramFile[]>(() => {
    try {
      const raw = localStorage.getItem('telecloud_favorite_items');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const normalized: TelegramFile[] = [];
          for (const item of parsed) {
            if (!item || typeof item.id !== 'number') continue;
            const norm = normalizeFavoriteFile(item);
            const key = `${norm.originPeer || 'me'}_${norm.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              normalized.push(norm);
            }
          }
          return normalized;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Automatically hydrate/backfill any legacy ID-only favorites or missing chat titles when files load
  useEffect(() => {
    if (files.length === 0) return;
    try {
      const legacyRaw = localStorage.getItem('telecloud_favorites');
      const legacyIds: number[] = legacyRaw ? JSON.parse(legacyRaw) : [];
      const legacySet = new Set(Array.isArray(legacyIds) ? legacyIds : []);

      setFavoriteFiles((prev) => {
        let changed = false;
        const next = prev.map((fav) => {
          const favPeer = resolveFilePeer(fav);
          const currentPeer = activePeer || 'me';
          if (
            favPeer === currentPeer &&
            activeChatTitle &&
            (!fav.originChatTitle || fav.originChatTitle === favPeer)
          ) {
            changed = true;
            return normalizeFavoriteFile(fav, currentPeer, activeChatTitle);
          }
          return fav;
        });

        for (const f of files) {
          const fPeer = resolveFilePeer(f, activePeer || 'me');
          const alreadyInNext = next.some(
            (fav) => fav.id === f.id && resolveFilePeer(fav) === fPeer
          );
          if (!alreadyInNext && legacySet.has(f.id) && prev.length === 0) {
            changed = true;
            next.push(
              normalizeFavoriteFile(
                { ...f, starredAt: Date.now() },
                fPeer,
                activeChatTitle || 'Saved Messages'
              )
            );
          }
        }

        if (changed) {
          try {
            localStorage.setItem('telecloud_favorite_items', JSON.stringify(next));
          } catch {}
          return next;
        }
        return prev;
      });
    } catch {}
  }, [files, activePeer, activeChatTitle]);

  const favoriteFileIds = React.useMemo(() => {
    return favoriteFiles.map((f) => f.id);
  }, [favoriteFiles]);

  const toggleFavorite = useCallback(
    (fileOrId: TelegramFile | number, peer?: string) => {
      setFavoriteFiles((prev) => {
        const targetId = typeof fileOrId === 'number' ? fileOrId : fileOrId.id;
        const fallbackPeer = peer || activePeer || 'me';
        const foundInFiles =
          typeof fileOrId === 'number'
            ? files.find(
                (f) =>
                  f.id === targetId &&
                  (!peer || resolveFilePeer(f, activePeer || 'me') === peer)
              ) || files.find((f) => f.id === targetId)
            : fileOrId;

        const targetPeer = foundInFiles
          ? resolveFilePeer(foundInFiles, fallbackPeer)
          : fallbackPeer;

        const existsInPeer = prev.some(
          (f) => f.id === targetId && resolveFilePeer(f) === targetPeer
        );
        const existsAnywhere =
          !existsInPeer &&
          typeof fileOrId === 'number' &&
          !peer &&
          activeTab === 'favorites' &&
          prev.some((f) => f.id === targetId);

        let next: TelegramFile[];
        if (existsInPeer) {
          next = prev.filter(
            (f) => !(f.id === targetId && resolveFilePeer(f) === targetPeer)
          );
        } else if (existsAnywhere) {
          next = prev.filter((f) => f.id !== targetId);
        } else if (foundInFiles) {
          const fileToAdd = normalizeFavoriteFile(
            {
              ...foundInFiles,
              starredAt: Date.now(),
            },
            targetPeer,
            foundInFiles.originChatTitle || activeChatTitle || 'Saved Messages'
          );
          next = [fileToAdd, ...prev];
        } else {
          next = prev;
        }

        try {
          localStorage.setItem('telecloud_favorite_items', JSON.stringify(next));
          localStorage.setItem('telecloud_favorites', JSON.stringify(next.map((f) => f.id)));
        } catch {}

        return next;
      });
    },
    [activePeer, activeChatTitle, activeTab, files]
  );

  const isFavorite = useCallback(
    (fileOrId: TelegramFile | number, peer?: string) => {
      const targetId = typeof fileOrId === 'number' ? fileOrId : fileOrId.id;
      const targetPeer =
        typeof fileOrId === 'number'
          ? peer || activePeer || 'me'
          : resolveFilePeer(fileOrId, peer || activePeer || 'me');

      return favoriteFiles.some(
        (f) => f.id === targetId && resolveFilePeer(f) === targetPeer
      );
    },
    [favoriteFiles, activePeer]
  );

  // Track if music was playing before a video opened, to auto-resume on close
  const wasPlayingAudioBeforeVideoRef = useRef(false);

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

  const saveSharedApiCreds = useCallback((apiId: string, apiHash: string) => {
    const cleanId = String(apiId || '').trim();
    const cleanHash = String(apiHash || '').trim();
    if (!cleanId || !cleanHash) return;
    const creds: SharedApiCredentials = { apiId: cleanId, apiHash: cleanHash };
    setSharedApiCreds(creds);
    try {
      localStorage.setItem(SHARED_API_CREDS_KEY, JSON.stringify(creds));
    } catch {}
  }, []);

  const upsertAccountInList = useCallback(
    (
      userData: TelegramUser,
      encryptedToken: string,
      apiId?: string,
      apiHash?: string
    ): SavedTelegramAccount[] => {
      if (apiId && apiHash) {
        saveSharedApiCreds(apiId, apiHash);
      }
      const uid = String(userData.id);
      const enrichedUser: TelegramUser = {
        ...userData,
        id: uid,
        photoUrl: userData.photoUrl || `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
      };

      let nextList: SavedTelegramAccount[] = [];
      setAccounts((prev) => {
        const existing = prev.find((a) => a.id === uid);
        const entry: SavedTelegramAccount = {
          id: uid,
          user: existing ? { ...existing.user, ...enrichedUser } : enrichedUser,
          encryptedToken: encryptedToken || existing?.encryptedToken || '',
          apiId: apiId || existing?.apiId,
          addedAt: existing?.addedAt || Date.now(),
          lastActiveAt: Date.now(),
        };
        const filtered = prev.filter((a) => a.id !== uid);
        nextList = [entry, ...filtered];
        saveAccountsToStorage(nextList);
        return nextList;
      });
      try {
        localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, uid);
        if (encryptedToken) {
          localStorage.setItem(LEGACY_TOKEN_KEY, encryptedToken);
        }
      } catch {}
      setActiveAccountId(uid);
      return nextList;
    },
    [saveSharedApiCreds]
  );

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

  const setActivePeer = useCallback((id: string, title: string) => {
    setActivePeerState(id);
    setActiveChatTitle(title);
    setSelectedFileIds([]);
    if (id && id !== 'me') {
      setIsUploadModalOpen(false);
    }
  }, []);

  // Fetch initial batch of files from real Telegram or In-Memory Channel Cache
  const refreshFiles = useCallback(
    async (forceReload: boolean = false) => {
      const fetchToken = ++activeFetchTokenRef.current;
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);

      if (isDemoMode) {
        setFiles(DEMO_FILES);
        setHasMoreFiles(false);
        setIsLoading(false);
        return;
      }

      if (!isConnected) {
        setFiles([]);
        setHasMoreFiles(false);
        setIsLoading(false);
        return;
      }

      const cacheKey = getCacheKey();

      // Check In-Memory Channel Cache for instant 0ms restoration without refetching
      if (!forceReload && channelCacheRef.current.has(cacheKey)) {
        const cached = channelCacheRef.current.get(cacheKey)!;
        setFiles(cached.files);
        nextOffsetIdRef.current = cached.nextOffsetId;
        setHasMoreFiles(cached.hasMore);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      nextOffsetIdRef.current = 0;

      try {
        const filesRes = await fetch(
          `/api/telegram/files?limit=150&offsetId=0&peer=${encodeURIComponent(activePeer)}`
        );

        if (fetchToken !== activeFetchTokenRef.current) return;

        if (filesRes.ok) {
          const filesData = await filesRes.json();
          if (filesData.success) {
            const rawIncoming: TelegramFile[] = filesData.files || [];
            const incoming: TelegramFile[] = rawIncoming.map((f) =>
              normalizeFavoriteFile(
                f,
                activePeer || 'me',
                activeChatTitle || 'Saved Messages'
              )
            );
            const nextOffset = Number(filesData.nextOffsetId) || 0;
            const more = Boolean(filesData.hasMore && nextOffset > 0);

            setFiles(incoming);
            nextOffsetIdRef.current = nextOffset;
            setHasMoreFiles(more);

            // Store in in-memory channel cache
            channelCacheRef.current.set(cacheKey, {
              files: incoming,
              nextOffsetId: nextOffset,
              hasMore: more,
              timestamp: Date.now(),
            });
          }
        }
      } catch (e) {
        console.error('Failed to load files:', e);
      } finally {
        if (fetchToken === activeFetchTokenRef.current) {
          setIsLoading(false);
        }
      }
    },
    [isConnected, isDemoMode, activePeer, activeChatTitle, getCacheKey]
  );

  // Fetch the next page of older files on-demand (when scrolled near the bottom)
  const loadMoreFiles = useCallback(async () => {
    if (
      isDemoMode ||
      !isConnected ||
      isLoading ||
      isLoadingMoreRef.current ||
      !hasMoreFiles ||
      nextOffsetIdRef.current <= 0
    ) {
      return;
    }

    const fetchToken = activeFetchTokenRef.current;
    const offsetToFetch = nextOffsetIdRef.current;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const res = await fetch(
        `/api/telegram/files?limit=150&offsetId=${offsetToFetch}&peer=${encodeURIComponent(activePeer)}`
      );

      if (fetchToken !== activeFetchTokenRef.current) return;

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const rawIncoming: TelegramFile[] = data.files || [];
          const incoming: TelegramFile[] = rawIncoming.map((f) =>
            normalizeFavoriteFile(
              f,
              activePeer || 'me',
              activeChatTitle || 'Saved Messages'
            )
          );
          const nextOffset = Number(data.nextOffsetId) || 0;
          const more = Boolean(data.hasMore && nextOffset > 0 && nextOffset !== offsetToFetch);
          nextOffsetIdRef.current = nextOffset;
          setHasMoreFiles(more);

          setFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const uniqueNew = incoming.filter((f) => !existingIds.has(f.id));
            const updated = uniqueNew.length > 0 ? [...prev, ...uniqueNew] : prev;

            // Update in-memory channel cache with the expanded list
            const cacheKey = getCacheKey();
            channelCacheRef.current.set(cacheKey, {
              files: updated,
              nextOffsetId: nextOffset,
              hasMore: more,
              timestamp: Date.now(),
            });

            return updated;
          });
        } else {
          setHasMoreFiles(false);
        }
      }
    } catch (e) {
      console.error('Failed to load more channel files:', e);
    } finally {
      if (fetchToken === activeFetchTokenRef.current) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [isDemoMode, isConnected, isLoading, hasMoreFiles, activePeer, activeChatTitle, getCacheKey]);

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
        const uid = String(data.user.id);
        const enriched: TelegramUser = {
          ...data.user,
          photoUrl: `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
        };
        setUser(enriched);
        setAccounts((prev) => {
          const idx = prev.findIndex((a) => a.id === uid);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            user: { ...updated[idx].user, ...enriched },
          };
          saveAccountsToStorage(updated);
          return updated;
        });
      }
    } catch (e) {
      console.error('Failed to fetch full user info:', e);
    }
  }, [isConnected, isDemoMode]);

  // Add or update an account after login in TelegramLoginModal
  const addOrUpdateAccount = useCallback(
    (userData: TelegramUser, encryptedToken: string, apiId?: string, apiHash?: string) => {
      if (!userData || !userData.id) return;
      const uid = String(userData.id);
      const enrichedUser: TelegramUser = {
        ...userData,
        id: uid,
        photoUrl: `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
      };
      upsertAccountInList(enrichedUser, encryptedToken, apiId, apiHash);
      setIsDemoMode(false);
      setIsConnected(true);
      setUser(enrichedUser);
      setActivePeerState('me');
      setActiveChatTitle('Saved Messages');
      setSelectedFileIds([]);
      localStorage.removeItem('telecloud_mode');
      fetch('/api/telegram/full-user')
        .then((r) => r.json())
        .then((fullData) => {
          if (fullData.success && fullData.user) {
            const fullEnriched: TelegramUser = {
              ...fullData.user,
              photoUrl: `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
            };
            setUser(fullEnriched);
            upsertAccountInList(fullEnriched, encryptedToken, apiId, apiHash);
          }
        })
        .catch(() => {});
    },
    [upsertAccountInList]
  );

  // Switch between saved Telegram accounts
  const switchAccount = useCallback(
    async (accountId: string): Promise<boolean> => {
      const storedList = loadSavedAccounts();
      const target =
        accounts.find((a) => a.id === accountId) || storedList.find((a) => a.id === accountId);
      if (!target || !target.encryptedToken) return false;

      if (isConnected && !isDemoMode && activeAccountId === accountId && user?.id === accountId) {
        return true;
      }

      setIsSwitchingAccount(true);
      setIsLoading(true);
      channelCacheRef.current.clear();
      setSelectedFileIds([]);
      setSearchQuery('');
      setActivePeerState('me');
      setActiveChatTitle('Saved Messages');

      try {
        const res = await fetch('/api/telegram/restore-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: target.encryptedToken }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          const uid = String(data.user.id);
          const enrichedUser: TelegramUser = {
            ...target.user,
            ...data.user,
            id: uid,
            photoUrl: `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
          };
          upsertAccountInList(
            enrichedUser,
            target.encryptedToken,
            data.apiId ? String(data.apiId) : target.apiId,
            data.apiHash ? String(data.apiHash) : undefined
          );
          setUser(enrichedUser);
          setIsDemoMode(false);
          setIsConnected(true);
          localStorage.removeItem('telecloud_mode');

          // Fetch full user profile in background
          fetch('/api/telegram/full-user')
            .then((r) => r.json())
            .then((fullData) => {
              if (fullData.success && fullData.user) {
                const fullEnriched: TelegramUser = {
                  ...fullData.user,
                  photoUrl: `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
                };
                setUser(fullEnriched);
                upsertAccountInList(fullEnriched, target.encryptedToken);
              }
            })
            .catch(() => {});

          return true;
        } else {
          // Session expired or invalid -> remove from saved accounts
          setAccounts((prev) => {
            const next = prev.filter((a) => a.id !== accountId);
            saveAccountsToStorage(next);
            return next;
          });
          return false;
        }
      } catch (err) {
        console.error('Error switching account:', err);
        return false;
      } finally {
        setIsSwitchingAccount(false);
        setIsLoading(false);
      }
    },
    [accounts, isConnected, isDemoMode, activeAccountId, user?.id, upsertAccountInList]
  );

  // Check Telegram status on mount (and auto-restore preferred multi-account session)
  const checkTelegramStatus = useCallback(async () => {
    try {
      const savedList = loadSavedAccounts();
      const preferredId = localStorage.getItem(ACTIVE_ACCOUNT_ID_KEY);
      const preferredAccount =
        savedList.find((a) => a.id === preferredId) || savedList[0] || null;

      const res = await fetch('/api/telegram/status');
      const data = await res.json();

      // If server is already connected AND either matches preferredAccount or we have no preferredAccount
      if (
        data.connected &&
        data.user &&
        (!preferredAccount || String(data.user.id) === preferredAccount.id)
      ) {
        const uid = String(data.user.id);
        const enrichedUser: TelegramUser = {
          ...data.user,
          id: uid,
          photoUrl: `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
        };
        setIsConnected(true);
        setIsDemoMode(false);
        setUser(enrichedUser);
        localStorage.removeItem('telecloud_mode');

        if (data.encryptedToken) {
          upsertAccountInList(
            enrichedUser,
            data.encryptedToken,
            data.apiId ? String(data.apiId) : undefined,
            data.apiHash ? String(data.apiHash) : undefined
          );
        }

        fetch('/api/telegram/full-user')
          .then((r) => r.json())
          .then((fullData) => {
            if (fullData.success && fullData.user) {
              const fullEnriched: TelegramUser = {
                ...fullData.user,
                photoUrl: `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
              };
              setUser(fullEnriched);
              if (data.encryptedToken) {
                upsertAccountInList(fullEnriched, data.encryptedToken);
              }
            }
          })
          .catch(() => {});
        return;
      }

      // Attempt to restore from preferred saved account or legacy token
      const tokenToRestore =
        preferredAccount?.encryptedToken || localStorage.getItem(LEGACY_TOKEN_KEY);

      if (tokenToRestore) {
        try {
          const restoreRes = await fetch('/api/telegram/restore-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenToRestore }),
          });
          const restoreData = await restoreRes.json();
          if (restoreData.success && restoreData.user) {
            const uid = String(restoreData.user.id);
            const enrichedUser: TelegramUser = {
              ...(preferredAccount?.user || {}),
              ...restoreData.user,
              id: uid,
              photoUrl: `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
            };
            setIsConnected(true);
            setIsDemoMode(false);
            setUser(enrichedUser);
            localStorage.removeItem('telecloud_mode');
            upsertAccountInList(
              enrichedUser,
              tokenToRestore,
              restoreData.apiId ? String(restoreData.apiId) : undefined,
              restoreData.apiHash ? String(restoreData.apiHash) : undefined
            );

            fetch('/api/telegram/full-user')
              .then((r) => r.json())
              .then((fullData) => {
                if (fullData.success && fullData.user) {
                  const fullEnriched: TelegramUser = {
                    ...fullData.user,
                    photoUrl: `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`,
                  };
                  setUser(fullEnriched);
                  upsertAccountInList(fullEnriched, tokenToRestore);
                }
              })
              .catch(() => {});
            return;
          } else if (preferredAccount) {
            // Remove invalid preferred account
            const remaining = savedList.filter((a) => a.id !== preferredAccount.id);
            saveAccountsToStorage(remaining);
            setAccounts(remaining);
          } else {
            localStorage.removeItem(LEGACY_TOKEN_KEY);
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
  }, [isDemoMode, upsertAccountInList]);

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

  // Remove a specific account (and auto-switch if removing the currently active account)
  const removeAccount = useCallback(
    async (accountId: string) => {
      try {
        await fetch('/api/telegram/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId }),
        });
      } catch {}

      const currentAccounts = loadSavedAccounts();
      const remaining = currentAccounts.filter((a) => a.id !== accountId);
      saveAccountsToStorage(remaining);
      setAccounts(remaining);
      channelCacheRef.current.clear();

      if (activeAccountId === accountId || user?.id === accountId) {
        if (remaining.length > 0) {
          const nextAcc = remaining[0];
          await switchAccount(nextAcc.id);
        } else {
          setIsConnected(false);
          setIsDemoMode(false);
          setUser(null);
          setActiveAccountId(null);
          localStorage.removeItem('telecloud_mode');
          localStorage.removeItem(ACTIVE_ACCOUNT_ID_KEY);
          localStorage.removeItem(LEGACY_TOKEN_KEY);
          setFiles([]);
          setHasMoreFiles(false);
        }
      }
    },
    [activeAccountId, user?.id, switchAccount]
  );

  const disconnectTelegram = async () => {
    channelCacheRef.current.clear();
    if (isDemoMode) {
      setIsDemoMode(false);
      localStorage.removeItem('telecloud_mode');
      const remaining = loadSavedAccounts();
      if (remaining.length > 0) {
        await switchAccount(remaining[0].id);
        return;
      }
      setUser(null);
      setFiles([]);
      return;
    }

    const currentId = activeAccountId || user?.id;
    if (currentId) {
      await removeAccount(currentId);
      return;
    }

    try {
      await fetch('/api/telegram/logout', { method: 'POST' });
    } catch {}
    setIsConnected(false);
    setIsDemoMode(false);
    setUser(null);
    setActiveAccountId(null);
    localStorage.removeItem('telecloud_mode');
    localStorage.removeItem(ACTIVE_ACCOUNT_ID_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setFiles([]);
  };

  const deleteFile = async (id: number): Promise<boolean> => {
    if (activePeer && activePeer !== 'me') {
      return false;
    }

    if (isDemoMode) {
      setFiles(prev => prev.filter(f => f.id !== id));
      setSelectedFileIds(prev => prev.filter(fid => fid !== id));
      return true;
    }

    try {
      const res = await fetch(`/api/telegram/file/${id}?peer=${encodeURIComponent(activePeer || 'me')}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFiles(prev => prev.filter(f => f.id !== id));
        setSelectedFileIds(prev => prev.filter(fid => fid !== id));
        const cacheKey = getCacheKey();
        if (channelCacheRef.current.has(cacheKey)) {
          const c = channelCacheRef.current.get(cacheKey)!;
          channelCacheRef.current.set(cacheKey, {
            ...c,
            files: c.files.filter(f => f.id !== id),
          });
        }
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
    if (activePeer && activePeer !== 'me') {
      return false;
    }
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
            const res = await fetch(`/api/telegram/file/${id}?peer=${encodeURIComponent(activePeer || 'me')}`, { method: 'DELETE' });
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
        const cacheKey = getCacheKey();
        if (channelCacheRef.current.has(cacheKey)) {
          const c = channelCacheRef.current.get(cacheKey)!;
          channelCacheRef.current.set(cacheKey, {
            ...c,
            files: c.files.filter(f => !deletedIds.has(f.id)),
          });
        }
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
    const source = activeTab === 'favorites' ? favoriteFiles : files;
    source.forEach((f) => {
      const ext = f.filename.split('.').pop()?.toLowerCase();
      if (ext && ext !== f.filename.toLowerCase()) {
        exts.add(`.${ext}`);
      }
    });
    return Array.from(exts);
  }, [files, favoriteFiles, activeTab]);

  // Filtering and Sorting
  const filteredFiles = React.useMemo(() => {
    // When activeTab is 'favorites', use the global list of favorite files across ALL chats & channels
    let result = activeTab === 'favorites' ? [...favoriteFiles] : [...files];

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((f) => f.category === selectedCategory);
    }

    // Extension filter
    if (selectedExtension) {
      result = result.filter((f) => f.filename.toLowerCase().endsWith(selectedExtension.toLowerCase()));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.filename.toLowerCase().includes(q) ||
          f.caption.toLowerCase().includes(q) ||
          f.mimeType.toLowerCase().includes(q) ||
          (f.originChatTitle && f.originChatTitle.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'date_desc':
          return (b.starredAt || b.date) - (a.starredAt || a.date);
        case 'date_asc':
          return (a.starredAt || a.date) - (b.starredAt || b.date);
        case 'size_desc':
          return b.size - a.size;
        case 'size_asc':
          return a.size - b.size;
        case 'name_asc':
          return a.filename.localeCompare(b.filename);
        case 'name_desc':
          return b.filename.localeCompare(a.filename);
        default:
          return (b.starredAt || b.date) - (a.starredAt || a.date);
      }
    });

    return result;
  }, [files, activeTab, favoriteFiles, selectedCategory, selectedExtension, searchQuery, sortOption]);

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

  // ============================================================================
  // Mobile Hardware Back Button & Double-Back-to-Exit Controller
  // ============================================================================
  const backHandlersRef = useRef<{ id: string; onBack: () => void }[]>([]);
  const navHistoryRef = useRef<NavSnapshot[]>([
    {
      activeTab: 'files',
      selectedCategory: 'all',
      selectedExtension: null,
      activePeer: 'me',
      activeChatTitle: 'Saved Messages',
    },
  ]);
  const isSteppingBackRef = useRef(false);
  const hasGuardEntryRef = useRef(false);
  const isExitingRef = useRef(false);
  const exitPromptRef = useRef(false);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivationRefreshRef = useRef<number>(0);

  // Latest state refs for synchronous access inside popstate
  const stateRefs = useRef({
    activeTab,
    selectedCategory,
    selectedExtension,
    searchQuery,
    selectedFileIds,
    activePeer,
    activeChatTitle,
    activeVideo,
    isVideoPiP,
  });
  stateRefs.current = {
    activeTab,
    selectedCategory,
    selectedExtension,
    searchQuery,
    selectedFileIds,
    activePeer,
    activeChatTitle,
    activeVideo,
    isVideoPiP,
  };

  const registerBackHandler = useCallback((id: string, onBack: () => void) => {
    backHandlersRef.current = [
      ...backHandlersRef.current.filter(item => item.id !== id),
      { id, onBack },
    ];
  }, []);

  const unregisterBackHandler = useCallback((id: string) => {
    backHandlersRef.current = backHandlersRef.current.filter(item => item.id !== id);
  }, []);

  // Track navigation history across tabs, categories, extensions, and peers
  useEffect(() => {
    if (isSteppingBackRef.current) {
      isSteppingBackRef.current = false;
      return;
    }

    const currentSnap: NavSnapshot = {
      activeTab,
      selectedCategory,
      selectedExtension,
      activePeer: activePeer || 'me',
      activeChatTitle: activeChatTitle || 'Saved Messages',
    };

    const stack = navHistoryRef.current;
    const existingIdx = stack.findIndex(
      s =>
        s.activeTab === currentSnap.activeTab &&
        s.selectedCategory === currentSnap.selectedCategory &&
        s.selectedExtension === currentSnap.selectedExtension &&
        s.activePeer === currentSnap.activePeer
    );

    if (existingIdx !== -1) {
      // Slice back to existing snapshot so we never create navigation loops
      navHistoryRef.current = [
        ...stack.slice(0, existingIdx),
        currentSnap,
      ];
    } else {
      navHistoryRef.current = [...stack.slice(-15), currentSnap];
    }
  }, [activeTab, selectedCategory, selectedExtension, activePeer, activeChatTitle]);

  // Execute a single logical step back in the UI; returns true if handled, false if at Root
  const performStepBack = useCallback((): boolean => {
    // 1. Exit browser fullscreen if active
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return true;
    }

    // 2. Pop the topmost active modal / drawer / bottom-sheet / sub-step from LIFO stack
    if (backHandlersRef.current.length > 0) {
      const top = backHandlersRef.current[backHandlersRef.current.length - 1];
      top.onBack();
      return true;
    }

    const cur = stateRefs.current;

    // 3. Clear multi-file selection mode if active
    if (cur.selectedFileIds.length > 0) {
      setSelectedFileIds([]);
      return true;
    }

    // 4. Clear active search query if non-empty
    if (cur.searchQuery.trim() !== '') {
      setSearchQuery('');
      return true;
    }

    // 5. Step back one level in the navigation history stack (Account -> Category -> Extension -> Chat)
    if (navHistoryRef.current.length > 1) {
      const nextStack = navHistoryRef.current.slice(0, -1);
      const prevSnap = nextStack[nextStack.length - 1];
      navHistoryRef.current = nextStack;
      isSteppingBackRef.current = true;
      setActiveTab(prevSnap.activeTab);
      setSelectedCategory(prevSnap.selectedCategory);
      setSelectedExtension(prevSnap.selectedExtension);
      setActivePeerState(prevSnap.activePeer);
      setActiveChatTitle(prevSnap.activeChatTitle);
      return true;
    }

    // 6. Fallback unwinding if any filter/tab is non-default
    if (cur.activeTab !== 'files') {
      setActiveTab('files');
      return true;
    }
    if (cur.selectedExtension !== null) {
      setSelectedExtension(null);
      return true;
    }
    if (cur.selectedCategory !== 'all') {
      setSelectedCategory('all');
      return true;
    }
    if (cur.activePeer && cur.activePeer !== 'me') {
      setActivePeerState('me');
      setActiveChatTitle('Saved Messages');
      return true;
    }

    // 7. Close floating PiP video player if still open at Root
    if (cur.activeVideo && cur.isVideoPiP) {
      setActiveVideo(null);
      return true;
    }

    // 8. User is completely at Root
    return false;
  }, [setActiveVideo]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize history root + 1 guard entry
    try {
      window.history.replaceState({ telecloudRoot: true }, '', window.location.href);
      window.history.pushState({ telecloudGuard: true, ts: Date.now() }, '', window.location.href);
      hasGuardEntryRef.current = true;
    } catch {}

    // Keep history guard armed with fresh User Activation on user gestures
    const handleUserGesture = () => {
      if (isExitingRef.current) return;

      // If user interacts with the app while the "Press back again to exit" toast is shown, cancel exit
      if (exitPromptRef.current) {
        exitPromptRef.current = false;
        setShowExitToast(false);
        if (exitTimeoutRef.current) {
          clearTimeout(exitTimeoutRef.current);
          exitTimeoutRef.current = null;
        }
      }

      try {
        if (!hasGuardEntryRef.current) {
          window.history.pushState({ telecloudGuard: true, ts: Date.now() }, '', window.location.href);
          hasGuardEntryRef.current = true;
          lastActivationRefreshRef.current = Date.now();
        } else if (Date.now() - lastActivationRefreshRef.current > 1200) {
          window.history.replaceState({ telecloudGuard: true, ts: Date.now() }, '', window.location.href);
          lastActivationRefreshRef.current = Date.now();
        }
      } catch {}
    };

    const handlePopState = () => {
      if (isExitingRef.current) return;

      // Browser popped our guard entry
      hasGuardEntryRef.current = false;

      const steppedBack = performStepBack();

      if (steppedBack) {
        // Cancel any pending exit toast
        if (exitPromptRef.current) {
          exitPromptRef.current = false;
          setShowExitToast(false);
          if (exitTimeoutRef.current) {
            clearTimeout(exitTimeoutRef.current);
            exitTimeoutRef.current = null;
          }
        }

        // Re-arm the guard entry immediately so the next back press is also intercepted
        try {
          window.history.pushState({ telecloudGuard: true, ts: Date.now() }, '', window.location.href);
          hasGuardEntryRef.current = true;
        } catch {}

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(12);
        }
        return;
      }

      // User is at Root: require Double-Back-to-Exit
      if (!exitPromptRef.current) {
        // First back press at Root -> Show toast & wait 2.5s for second back press
        exitPromptRef.current = true;
        setShowExitToast(true);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(25);
        }

        if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = setTimeout(() => {
          exitPromptRef.current = false;
          setShowExitToast(false);
          if (!hasGuardEntryRef.current && !isExitingRef.current) {
            try {
              window.history.pushState({ telecloudGuard: true, ts: Date.now() }, '', window.location.href);
              hasGuardEntryRef.current = true;
            } catch {}
          }
        }, 2500);
      } else {
        // Second back press in a row within 2.5s -> Exit app!
        isExitingRef.current = true;
        exitPromptRef.current = false;
        setShowExitToast(false);
        if (exitTimeoutRef.current) {
          clearTimeout(exitTimeoutRef.current);
          exitTimeoutRef.current = null;
        }
        try {
          (window as any).Telegram?.WebApp?.close?.();
        } catch {}
        try {
          window.history.back();
        } catch {}
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 120);
      }
    };

    window.addEventListener('pointerdown', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('touchend', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('click', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('keydown', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('pointerdown', handleUserGesture, { capture: true });
      window.removeEventListener('touchend', handleUserGesture, { capture: true });
      window.removeEventListener('click', handleUserGesture, { capture: true });
      window.removeEventListener('keydown', handleUserGesture, { capture: true });
      window.removeEventListener('popstate', handlePopState);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [performStepBack]);

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
        isSwitchingAccount,
        user,
        accounts,
        activeAccountId,
        sharedApiCreds,
        saveSharedApiCreds,
        addOrUpdateAccount,
        switchAccount,
        removeAccount,
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
        loadMoreFiles,
        hasMoreFiles,
        isLoadingMore,
        deleteFile,
        favoriteFiles,
        favoriteFileIds,
        toggleFavorite,
        isFavorite,
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
        isTelegramLinkModalOpen,
        setIsTelegramLinkModalOpen,
        isAccountDrawerOpen,
        setIsAccountDrawerOpen,
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
        activePeer,
        activeChatTitle,
        setActivePeer,
        isChatSelectorOpen,
        setIsChatSelectorOpen,
        showExitToast,
        registerBackHandler,
        unregisterBackHandler,
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

export function useBackHandler(isActive: boolean, onBack: () => void) {
  const { registerBackHandler, unregisterBackHandler } = useTelegram();
  const idRef = useRef<string>(`bh_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    const id = idRef.current;
    if (isActive) {
      registerBackHandler(id, () => onBackRef.current());
      return () => unregisterBackHandler(id);
    } else {
      unregisterBackHandler(id);
    }
  }, [isActive, registerBackHandler, unregisterBackHandler]);
}
