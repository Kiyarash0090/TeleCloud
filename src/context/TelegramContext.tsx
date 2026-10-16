import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from './ThemeContext';
import {
  TelegramFile,
  TelegramChat,
  StorageStats,
  TelegramUser,
  SavedTelegramAccount,
  SharedApiCredentials,
  FileCategory,
  SortOption,
  ViewMode,
  ActiveTab,
  UserFolder,
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

function buildProfilePhotoUrl(uid: string, encryptedToken?: string): string {
  const base = `/api/telegram/profile-photo?uid=${encodeURIComponent(uid)}`;
  if (encryptedToken) {
    return `${base}&token=${encodeURIComponent(encryptedToken)}`;
  }
  return base;
}

function loadSavedAccounts(): SavedTelegramAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((acc: SavedTelegramAccount) => {
      const uid = String(acc.id || acc.user?.id || '');
      return {
        ...acc,
        id: uid,
        user: {
          ...acc.user,
          id: uid,
          photoUrl: buildProfilePhotoUrl(uid, acc.encryptedToken),
        },
      };
    });
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

const CUSTOM_FOLDERS_STORAGE_KEY = 'telecloud_custom_folders';

function loadSavedFolders(): UserFolder[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FOLDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      id: String(item.id || `fld_${Date.now()}`),
      name: String(item.name || 'Folder'),
      color: String(item.color || 'blue'),
      icon: item.icon || 'folder',
      files: Array.isArray(item.files)
        ? item.files.map((f: any) => normalizeFavoriteFile(f))
        : [],
      createdAt: Number(item.createdAt) || Date.now(),
    }));
  } catch {
    return [];
  }
}

function saveFoldersToStorage(list: UserFolder[]) {
  try {
    localStorage.setItem(CUSTOM_FOLDERS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

interface TelegramContextType {
  // Navigation tabs
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Custom User Folders
  folders: UserFolder[];
  activeFolderId: string | null;
  activeFolder: UserFolder | null;
  setActiveFolderId: (id: string | null) => void;
  createFolder: (name: string, color?: string, icon?: string, initialFiles?: TelegramFile[]) => UserFolder;
  updateFolder: (id: string, name: string, color?: string, icon?: string) => void;
  deleteFolder: (id: string) => void;
  addFilesToFolder: (folderId: string, files: TelegramFile[]) => void;
  removeFilesFromFolder: (folderId: string, fileIds: number[]) => void;
  isFolderModalOpen: boolean;
  setIsFolderModalOpen: (open: boolean) => void;
  folderToEdit: UserFolder | null;
  setFolderToEdit: (f: UserFolder | null) => void;
  isAddToFolderModalOpen: boolean;
  setIsAddToFolderModalOpen: (open: boolean) => void;
  targetFilesForFolder: TelegramFile[];
  setTargetFilesForFolder: (files: TelegramFile[]) => void;
  openAddToFolderModal: (filesToTarget: TelegramFile | TelegramFile[]) => void;

  // Web app auth
  isAppConfigured: boolean;
  webAppUsername: string;
  isWebAuthProtected: boolean;
  isWebAuthenticated: boolean;
  isWebAuthLoading: boolean;
  serverDefaultApiId?: number;
  hasServerDefaultApiHash?: boolean;
  checkWebAuth: () => Promise<void>;
  webSetup: (username: string, password: string, defaultApiId?: string, defaultApiHash?: string) => Promise<{ success: boolean; error?: string }>;
  webLogin: (u: string, p: string) => Promise<boolean>;
  webUpdateCredentials: (currentPassword: string, newUsername?: string, newPassword?: string, defaultApiId?: string, defaultApiHash?: string) => Promise<{ success: boolean; error?: string }>;
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
  canDeleteFile: (file?: TelegramFile) => boolean;

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

  // Chat / Channel / Bot Selector & Permissions
  activePeer: string;
  activeChatTitle: string;
  canUploadInActiveChat: boolean;
  canDeleteInActiveChat: boolean;
  isActiveChatAdmin: boolean;
  activeChatType: TelegramChat['type'];
  setActivePeer: (id: string, title: string, chatMeta?: Partial<TelegramChat>) => void;
  isChatSelectorOpen: boolean;
  setIsChatSelectorOpen: (open: boolean) => void;

  // Channel Tabs & Swipe Switcher
  chats: TelegramChat[];
  isLoadingChats: boolean;
  quickFilter: 'all' | 'channel' | 'group' | 'user';
  setQuickFilter: (filter: 'all' | 'channel' | 'group' | 'user') => void;
  filteredChats: TelegramChat[];
  fetchChats: (forceRefresh?: boolean) => Promise<TelegramChat[]>;
  switchToNextChat: (direction: 'next' | 'prev') => void;

  // Mobile Back Button, Double-Back-to-Exit & Action Toast
  showExitToast: boolean;
  actionToast: string | null;
  actionError: string | null;
  registerBackHandler: (id: string, onBack: () => void) => void;
  unregisterBackHandler: (id: string) => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useTheme();

  // Navigation active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('files');

  // Web app login status & master in-app setup
  const [isAppConfigured, setIsAppConfigured] = useState(false);
  const [webAppUsername, setWebAppUsername] = useState('');
  const [isWebAuthProtected, setIsWebAuthProtected] = useState(true);
  const [isWebAuthenticated, setIsWebAuthenticated] = useState(false);
  const [isWebAuthLoading, setIsWebAuthLoading] = useState(true);
  const [serverDefaultApiId, setServerDefaultApiId] = useState<number | undefined>(undefined);
  const [hasServerDefaultApiHash, setHasServerDefaultApiHash] = useState(false);

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
  const [canUploadInActiveChat, setCanUploadInActiveChat] = useState<boolean>(true);
  const [canDeleteInActiveChat, setCanDeleteInActiveChat] = useState<boolean>(true);
  const [isActiveChatAdmin, setIsActiveChatAdmin] = useState<boolean>(true);
  const [activeChatType, setActiveChatType] = useState<TelegramChat['type']>('saved');
  const [isChatSelectorOpen, setIsChatSelectorOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const actionToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showActionToast = useCallback((msg: string) => {
    setActionToast(msg);
    if (actionToastTimerRef.current) clearTimeout(actionToastTimerRef.current);
    actionToastTimerRef.current = setTimeout(() => {
      setActionToast(null);
    }, 3500);
  }, []);

  // Channel Tabs & Swipe Switcher state
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState<boolean>(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'channel' | 'group' | 'user'>('all');

  const fetchChats = useCallback(async (forceRefresh = false): Promise<TelegramChat[]> => {
    if (isDemoMode) {
      const demoList: TelegramChat[] = [
        {
          id: 'me',
          title: lang === 'fa' ? 'سیو مسیج' : 'Saved',
          type: 'saved',
          username: 'me',
          isPrivate: true,
          canUpload: true,
          canDelete: true,
          isAdmin: true,
        },
        {
          id: '-1001548293849',
          title: lang === 'fa' ? 'کانال فیلم و سریال' : 'Movies & Media Channel',
          type: 'channel',
          username: 'telecloud_movies',
          isPrivate: false,
          canUpload: false,
          canDelete: false,
          isAdmin: false,
        },
        {
          id: '-1001928374650',
          title: lang === 'fa' ? 'کانال خصوصی پروژه (VIP)' : 'Private Project Channel',
          type: 'channel',
          username: '',
          isPrivate: true,
          canUpload: true,
          canDelete: true,
          isAdmin: true,
        },
        {
          id: '-948271625',
          title: lang === 'fa' ? 'گروه خصوصی تیم' : 'Private Team Group',
          type: 'group',
          username: '',
          isPrivate: true,
          canUpload: true,
          canDelete: true,
          isAdmin: true,
        },
        {
          id: '-1001847592038',
          title: lang === 'fa' ? 'آرشیو موزیک' : 'Music Archive Vault',
          type: 'bot',
          username: 'music_bot',
          isPrivate: false,
          canUpload: true,
          canDelete: true,
          isAdmin: false,
        },
        {
          id: '184920491',
          title: lang === 'fa' ? 'گفتگوی شخصی (John Doe)' : 'John Doe (PV)',
          type: 'user',
          username: 'johndoe',
          isPrivate: false,
          canUpload: true,
          canDelete: true,
          isAdmin: false,
        },
        {
          id: '294817263',
          title: lang === 'fa' ? 'علی محمدی (پی‌وی)' : 'Ali Mohammadi (PV)',
          type: 'user',
          username: '',
          isPrivate: true,
          canUpload: true,
          canDelete: true,
          isAdmin: false,
        },
      ];
      setChats(demoList);
      return demoList;
    }

    if (!isConnected) {
      const defaultList: TelegramChat[] = [
        {
          id: 'me',
          title: lang === 'fa' ? 'سیو مسیج' : 'Saved',
          type: 'saved',
          username: 'me',
          isPrivate: true,
          canUpload: true,
          canDelete: true,
          isAdmin: true,
        },
      ];
      setChats(defaultList);
      return defaultList;
    }

    setIsLoadingChats(true);
    try {
      const res = await fetch(`/api/telegram/chats${forceRefresh ? '?refresh=1' : ''}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.chats)) {
        setChats(data.chats);
        return data.chats;
      }
    } catch (err) {
      console.error('Failed to load quick chats:', err);
    } finally {
      setIsLoadingChats(false);
    }
    return [];
  }, [isDemoMode, isConnected, lang]);

  useEffect(() => {
    fetchChats(false);
  }, [fetchChats, activeAccountId]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchChats(true);
    };
    window.addEventListener('telecloud-pull-refresh', handleGlobalRefresh);
    return () => window.removeEventListener('telecloud-pull-refresh', handleGlobalRefresh);
  }, [fetchChats]);

  const filteredChats = useMemo(() => {
    const base =
      chats.length > 0
        ? chats
        : [
            {
              id: 'me',
              title: lang === 'fa' ? 'سیو مسیج' : 'Saved',
              type: 'saved' as const,
              username: 'me',
              isPrivate: true,
              canUpload: true,
              canDelete: true,
              isAdmin: true,
            },
          ];

    return base.filter((chat) => {
      if (quickFilter === 'all') return true;
      if (quickFilter === 'channel') return chat.type === 'channel';
      if (quickFilter === 'group') return chat.type === 'group' || chat.type === 'supergroup';
      if (quickFilter === 'user')
        return chat.type === 'user' || chat.type === 'bot' || chat.type === 'service';
      return true;
    });
  }, [chats, quickFilter, lang]);

  const switchToNextChat = useCallback(
    (direction: 'next' | 'prev') => {
      const list = filteredChats;
      if (!list || list.length <= 1) return;

      const isSaved = !activePeer || activePeer === 'me';
      const currentIndex = list.findIndex(
        (c) => (c.id === 'me' && isSaved) || c.id === activePeer
      );

      let targetIndex = 0;
      if (currentIndex === -1) {
        targetIndex = direction === 'next' ? 0 : list.length - 1;
      } else {
        if (direction === 'next') {
          targetIndex = (currentIndex + 1) % list.length;
        } else {
          targetIndex = (currentIndex - 1 + list.length) % list.length;
        }
      }

      const targetChat = list[targetIndex];
      if (!targetChat) return;

      setActivePeerState(targetChat.id);
      setActiveChatTitle(
        targetChat.id === 'me' || targetChat.type === 'saved'
          ? (lang === 'fa' ? 'سیو مسیج' : 'Saved Messages')
          : targetChat.title
      );
      setSelectedFileIds([]);

      if (targetChat.id === 'me' || targetChat.type === 'saved') {
        setCanUploadInActiveChat(true);
        setCanDeleteInActiveChat(true);
        setIsActiveChatAdmin(true);
        setActiveChatType('saved');
      } else {
        const cType = targetChat.type || 'user';
        const cUpload = targetChat.canUpload !== undefined
          ? targetChat.canUpload
          : cType === 'bot' || cType === 'user' || cType === 'group' || cType === 'supergroup';
        const cDelete = targetChat.canDelete !== undefined ? targetChat.canDelete : cUpload;
        const cAdmin = Boolean(targetChat.isAdmin);
        setCanUploadInActiveChat(cUpload);
        setCanDeleteInActiveChat(cDelete);
        setIsActiveChatAdmin(cAdmin);
        setActiveChatType(cType);
      }
    },
    [filteredChats, activePeer, lang]
  );

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
        permissions?: {
          canUpload: boolean;
          canDelete: boolean;
          isAdmin: boolean;
          type: TelegramChat['type'];
        };
      }
    >
  >(new Map());

  const peerPermissionsMapRef = useRef<
    Map<
      string,
      {
        canUpload: boolean;
        canDelete: boolean;
        isAdmin: boolean;
        type: TelegramChat['type'];
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

  // Custom User Folders state
  const [folders, setFolders] = useState<UserFolder[]>(loadSavedFolders);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<UserFolder | null>(null);
  const [isAddToFolderModalOpen, setIsAddToFolderModalOpen] = useState(false);
  const [targetFilesForFolder, setTargetFilesForFolder] = useState<TelegramFile[]>([]);

  const activeFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return folders.find((f) => f.id === activeFolderId) || null;
  }, [folders, activeFolderId]);


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
      let nextList: SavedTelegramAccount[] = [];
      setAccounts((prev) => {
        const existing = prev.find((a) => a.id === uid);
        const effectiveToken = encryptedToken || existing?.encryptedToken || '';
        const enrichedUser: TelegramUser = {
          ...userData,
          id: uid,
          photoUrl: buildProfilePhotoUrl(uid, effectiveToken),
        };
        const entry: SavedTelegramAccount = {
          id: uid,
          user: existing ? { ...existing.user, ...enrichedUser } : enrichedUser,
          encryptedToken: effectiveToken,
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
      const res = await fetch('/api/auth/web-status', { credentials: 'include' });
      const data = await res.json();
      setIsAppConfigured(Boolean(data.isConfigured));
      setWebAppUsername(data.username || '');
      setIsWebAuthProtected(Boolean(data.isAuthProtected));
      setIsWebAuthenticated(Boolean(data.isAuthenticated));
      if (data.defaultApiId) setServerDefaultApiId(data.defaultApiId);
      setHasServerDefaultApiHash(Boolean(data.hasDefaultApiHash));
    } catch {
      // In case of error keep existing values
    } finally {
      setIsWebAuthLoading(false);
    }
  };

  const webSetup = async (
    username: string,
    password: string,
    defaultApiId?: string,
    defaultApiHash?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/web-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
          defaultApiId: defaultApiId ? Number(defaultApiId) : undefined,
          defaultApiHash: defaultApiHash?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAppConfigured(true);
        setWebAppUsername(data.username || username);
        setIsWebAuthenticated(true);
        if (defaultApiId) setServerDefaultApiId(Number(defaultApiId));
        if (defaultApiHash) setHasServerDefaultApiHash(true);
        return { success: true };
      }
      return { success: false, error: data.error || 'خطا در راه‌اندازی اولیه' };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  const webLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/web-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsWebAuthenticated(true);
        setWebAppUsername(username);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const webUpdateCredentials = async (
    currentPassword: string,
    newUsername?: string,
    newPassword?: string,
    defaultApiId?: string,
    defaultApiHash?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/web-update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername?.trim() || undefined,
          newPassword: newPassword?.trim() || undefined,
          defaultApiId: defaultApiId ? Number(defaultApiId) : undefined,
          defaultApiHash: defaultApiHash ? defaultApiHash.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (newUsername) setWebAppUsername(newUsername.trim());
        if (defaultApiId) setServerDefaultApiId(Number(defaultApiId));
        if (defaultApiHash) setHasServerDefaultApiHash(true);
        return { success: true };
      }
      return { success: false, error: data.error || 'خطا در بروزرسانی اطلاعات' };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  const webLogout = async () => {
    try {
      await fetch('/api/auth/web-logout', {
        method: 'POST',
        credentials: 'include',
      });
      setIsWebAuthenticated(false);
    } catch {
      setIsWebAuthenticated(false);
    }
  };

  const setActivePeer = useCallback(
    (id: string, title: string, chatMeta?: Partial<TelegramChat>) => {
      const targetId = id || 'me';
      setActivePeerState(targetId);
      setActiveChatTitle(title || 'Saved Messages');
      setSelectedFileIds([]);

      if (targetId === 'me' || targetId === 'self') {
        setCanUploadInActiveChat(true);
        setCanDeleteInActiveChat(true);
        setIsActiveChatAdmin(true);
        setActiveChatType('saved');
        return;
      }

      if (chatMeta) {
        const cType = chatMeta.type || 'user';
        const cUpload =
          chatMeta.canUpload !== undefined
            ? chatMeta.canUpload
            : cType === 'saved' || cType === 'bot' || cType === 'user' || cType === 'group' || cType === 'supergroup';
        const cDelete =
          chatMeta.canDelete !== undefined
            ? chatMeta.canDelete
            : cUpload;
        const cAdmin = Boolean(chatMeta.isAdmin);

        setCanUploadInActiveChat(cUpload);
        setCanDeleteInActiveChat(cDelete);
        setIsActiveChatAdmin(cAdmin);
        setActiveChatType(cType);
        peerPermissionsMapRef.current.set(targetId, {
          canUpload: cUpload,
          canDelete: cDelete,
          isAdmin: cAdmin,
          type: cType,
        });
        if (!cUpload) {
          setIsUploadModalOpen(false);
        }
      } else if (peerPermissionsMapRef.current.has(targetId)) {
        const cachedPerms = peerPermissionsMapRef.current.get(targetId)!;
        setCanUploadInActiveChat(cachedPerms.canUpload);
        setCanDeleteInActiveChat(cachedPerms.canDelete);
        setIsActiveChatAdmin(cachedPerms.isAdmin);
        setActiveChatType(cachedPerms.type);
        if (!cachedPerms.canUpload) {
          setIsUploadModalOpen(false);
        }
      }
    },
    []
  );

  // Fetch initial batch of files from real Telegram or In-Memory Channel Cache
  const refreshFiles = useCallback(
    async (forceReload: boolean = false) => {
      const fetchToken = ++activeFetchTokenRef.current;
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);

      if (isDemoMode) {
        const isReadOnlyDemoChannel = activePeer === '-1001548293849';
        const demoCanUpload = !isReadOnlyDemoChannel;
        const demoCanDelete = !isReadOnlyDemoChannel;
        setCanUploadInActiveChat(demoCanUpload);
        setCanDeleteInActiveChat(demoCanDelete);
        setIsActiveChatAdmin(activePeer === 'me' || activePeer === '-1001928374650' || activePeer === '-948271625');
        setFiles(
          DEMO_FILES.map((f) => ({
            ...f,
            canDelete: demoCanDelete,
          }))
        );
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
        if (cached.permissions) {
          setCanUploadInActiveChat(cached.permissions.canUpload);
          setCanDeleteInActiveChat(cached.permissions.canDelete);
          setIsActiveChatAdmin(cached.permissions.isAdmin);
          setActiveChatType(cached.permissions.type);
        }
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
            const perms = filesData.permissions as
              | {
                  canUpload: boolean;
                  canDelete: boolean;
                  isAdmin: boolean;
                  type: TelegramChat['type'];
                }
              | undefined;

            if (perms) {
              setCanUploadInActiveChat(perms.canUpload);
              setCanDeleteInActiveChat(perms.canDelete);
              setIsActiveChatAdmin(perms.isAdmin);
              setActiveChatType(perms.type);
              peerPermissionsMapRef.current.set(activePeer || 'me', perms);
              if (!perms.canUpload) {
                setIsUploadModalOpen(false);
              }
            }

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
              permissions: perms,
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

  const canDeleteFile = useCallback(
    (file?: TelegramFile): boolean => {
      if (file && file.canDelete !== undefined) {
        return file.canDelete;
      }
      return canDeleteInActiveChat;
    },
    [canDeleteInActiveChat]
  );

  const deleteFile = async (id: number): Promise<boolean> => {
    const targetFile =
      files.find((f) => f.id === id) || favoriteFiles.find((f) => f.id === id);
    const effectivePeer = targetFile
      ? resolveFilePeer(targetFile, activePeer || 'me')
      : activePeer || 'me';

    if (activeTab !== 'favorites' && !canDeleteInActiveChat) {
      return false;
    }

    if (isDemoMode) {
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setSelectedFileIds((prev) => prev.filter((fid) => fid !== id));
      return true;
    }

    try {
      const res = await fetch(
        `/api/telegram/file/${id}?peer=${encodeURIComponent(effectivePeer)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        setSelectedFileIds((prev) => prev.filter((fid) => fid !== id));
        setFavoriteFiles((prev) => {
          const next = prev.filter(
            (f) => !(f.id === id && resolveFilePeer(f) === effectivePeer)
          );
          try {
            localStorage.setItem('telecloud_favorite_items', JSON.stringify(next));
            localStorage.setItem('telecloud_favorites', JSON.stringify(next.map((f) => f.id)));
          } catch {}
          return next;
        });
        const cacheKey = getCacheKey(effectivePeer);
        if (channelCacheRef.current.has(cacheKey)) {
          const c = channelCacheRef.current.get(cacheKey)!;
          channelCacheRef.current.set(cacheKey, {
            ...c,
            files: c.files.filter((f) => f.id !== id),
          });
        }
        return true;
      }
      if (data.error) {
        showActionToast(data.error);
      }
      return false;
    } catch {
      return false;
    }
  };

  const toggleSelectFile = useCallback((id: number) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFileIds([]);
  }, []);

  const deleteMultipleFiles = async (ids: number[]): Promise<boolean> => {
    if (activeTab !== 'favorites' && !canDeleteInActiveChat) {
      return false;
    }
    if (ids.length === 0) return true;
    if (isDemoMode) {
      const idSet = new Set(ids);
      setFiles((prev) => prev.filter((f) => !idSet.has(f.id)));
      setSelectedFileIds((prev) => prev.filter((id) => !idSet.has(id)));
      return true;
    }

    try {
      let lastErrorMsg = '';
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const targetFile =
              files.find((f) => f.id === id) || favoriteFiles.find((f) => f.id === id);
            const effectivePeer = targetFile
              ? resolveFilePeer(targetFile, activePeer || 'me')
              : activePeer || 'me';

            const res = await fetch(
              `/api/telegram/file/${id}?peer=${encodeURIComponent(effectivePeer)}`,
              { method: 'DELETE' }
            );
            const data = await res.json();
            if (!data.success && data.error) {
              lastErrorMsg = data.error;
            }
            return data.success ? id : null;
          } catch {
            return null;
          }
        })
      );
      const deletedIds = new Set(results.filter((id): id is number => id !== null));
      if (deletedIds.size > 0) {
        setFiles((prev) => prev.filter((f) => !deletedIds.has(f.id)));
        setSelectedFileIds((prev) => prev.filter((id) => !deletedIds.has(id)));
        const cacheKey = getCacheKey();
        if (channelCacheRef.current.has(cacheKey)) {
          const c = channelCacheRef.current.get(cacheKey)!;
          channelCacheRef.current.set(cacheKey, {
            ...c,
            files: c.files.filter((f) => !deletedIds.has(f.id)),
          });
        }
        if (deletedIds.size < ids.length && lastErrorMsg) {
          showActionToast(lastErrorMsg);
        }
        return true;
      }
      if (lastErrorMsg) {
        showActionToast(lastErrorMsg);
      }
      return false;
    } catch {
      return false;
    }
  };

  // Extract all unique file extensions in the current view
  const availableExtensions = React.useMemo(() => {
    const exts = new Set<string>();
    const source = activeFolder ? activeFolder.files : activeTab === 'favorites' ? favoriteFiles : files;
    source.forEach((f) => {
      const ext = f.filename.split('.').pop()?.toLowerCase();
      if (ext && ext !== f.filename.toLowerCase()) {
        exts.add(`.${ext}`);
      }
    });
    return Array.from(exts);
  }, [files, favoriteFiles, activeTab, activeFolder]);

  // Filtering and Sorting
  const filteredFiles = React.useMemo(() => {
    // When an activeFolder is selected, use that folder's files
    let result = activeFolder ? [...activeFolder.files] : activeTab === 'favorites' ? [...favoriteFiles] : [...files];

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
  }, [files, activeTab, favoriteFiles, activeFolder, selectedCategory, selectedExtension, searchQuery, sortOption]);

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

  // Custom User Folder operations
  const createFolder = useCallback(
    (name: string, color: string = 'blue', icon: string = 'folder', initialFiles?: TelegramFile[]): UserFolder => {
      const newFolder: UserFolder = {
        id: `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim() || (lang === 'fa' ? 'پوشه جدید' : 'New Folder'),
        color,
        icon,
        files: initialFiles ? initialFiles.map((f) => normalizeFavoriteFile(f, activePeer, activeChatTitle)) : [],
        createdAt: Date.now(),
      };
      setFolders((prev) => {
        const next = [newFolder, ...prev];
        saveFoldersToStorage(next);
        return next;
      });
      showActionToast(lang === 'fa' ? 'پوشه جدید با موفقیت ایجاد شد' : 'Folder created successfully');
      return newFolder;
    },
    [lang, activePeer, activeChatTitle, showActionToast]
  );

  const updateFolder = useCallback((id: string, name: string, color?: string, icon?: string) => {
    setFolders((prev) => {
      const next = prev.map((f) => {
        if (f.id !== id) return f;
        return {
          ...f,
          name: name.trim() || f.name,
          color: color || f.color,
          icon: icon || f.icon,
        };
      });
      saveFoldersToStorage(next);
      return next;
    });
    showActionToast(lang === 'fa' ? 'تغییرات پوشه ذخیره شد' : 'Folder updated successfully');
  }, [lang, showActionToast]);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveFoldersToStorage(next);
      return next;
    });
    setActiveFolderId((curr) => (curr === id ? null : curr));
    showActionToast(lang === 'fa' ? 'پوشه حذف شد' : 'Folder deleted');
  }, [lang, showActionToast]);

  const addFilesToFolder = useCallback(
    (folderId: string, filesToAdd: TelegramFile[]) => {
      let addedCount = 0;
      setFolders((prev) => {
        const next = prev.map((fld) => {
          if (fld.id !== folderId) return fld;
          const existingIds = new Set(fld.files.map((f) => f.id));
          const newItems = filesToAdd
            .filter((f) => !existingIds.has(f.id))
            .map((f) => normalizeFavoriteFile(f, activePeer, activeChatTitle));
          addedCount = newItems.length;
          return {
            ...fld,
            files: [...fld.files, ...newItems],
          };
        });
        saveFoldersToStorage(next);
        return next;
      });
      if (addedCount > 0) {
        showActionToast(
          lang === 'fa'
            ? `${addedCount} فایل به پوشه افزوده شد`
            : `${addedCount} file(s) added to folder`
        );
      }
    },
    [activePeer, activeChatTitle, lang, showActionToast]
  );

  const removeFilesFromFolder = useCallback(
    (folderId: string, fileIdsToRemove: number[]) => {
      const idsSet = new Set(fileIdsToRemove);
      setFolders((prev) => {
        const next = prev.map((fld) => {
          if (fld.id !== folderId) return fld;
          return {
            ...fld,
            files: fld.files.filter((f) => !idsSet.has(f.id)),
          };
        });
        saveFoldersToStorage(next);
        return next;
      });
      showActionToast(lang === 'fa' ? 'از پوشه خارج شد' : 'Removed from folder');
    },
    [lang, showActionToast]
  );

  const openAddToFolderModal = useCallback((filesToTarget: TelegramFile | TelegramFile[]) => {
    const list = Array.isArray(filesToTarget) ? filesToTarget : [filesToTarget];
    setTargetFilesForFolder(list);
    setIsAddToFolderModalOpen(true);
  }, []);


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
        isAppConfigured,
        webAppUsername,
        isWebAuthProtected,
        isWebAuthenticated,
        isWebAuthLoading,
        serverDefaultApiId,
        hasServerDefaultApiHash,
        checkWebAuth,
        webSetup,
        webLogin,
        webUpdateCredentials,
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
        canDeleteFile,
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

        // Custom User Folders
        folders,
        activeFolderId,
        activeFolder,
        setActiveFolderId,
        createFolder,
        updateFolder,
        deleteFolder,
        addFilesToFolder,
        removeFilesFromFolder,
        isFolderModalOpen,
        setIsFolderModalOpen,
        folderToEdit,
        setFolderToEdit,
        isAddToFolderModalOpen,
        setIsAddToFolderModalOpen,
        targetFilesForFolder,
        setTargetFilesForFolder,
        openAddToFolderModal,


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
        canUploadInActiveChat,
        canDeleteInActiveChat,
        isActiveChatAdmin,
        activeChatType,
        setActivePeer,
        isChatSelectorOpen,
        setIsChatSelectorOpen,
        chats,
        isLoadingChats,
        quickFilter,
        setQuickFilter,
        filteredChats,
        fetchChats,
        switchToNextChat,
        showExitToast,
        actionToast,
        actionError: actionToast,
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
