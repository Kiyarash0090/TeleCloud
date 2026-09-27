export type FileCategory = 'all' | 'images' | 'videos' | 'audio' | 'documents' | 'archives' | 'other';

export interface TelegramFile {
  id: number;
  filename: string;
  caption: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  hasThumb: boolean;
  date: number;
  duration?: number;
  width?: number;
  height?: number;
  directUrl: string;
  downloadUrl: string;
  thumbnailUrl: string | null;
}

export interface StorageCategoryStats {
  count: number;
  size: number;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  categories: {
    images: StorageCategoryStats;
    videos: StorageCategoryStats;
    audio: StorageCategoryStats;
    documents: StorageCategoryStats;
    archives: StorageCategoryStats;
    other: StorageCategoryStats;
  };
}

export interface TelegramUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  bio?: string;
  isPremium?: boolean;
  photoUrl?: string;
  dcId?: number;
  connectedAt?: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  speed: string;
  startedAt?: number;
  error?: string;
  messageId?: number;
}

export type ActiveTab = 'files' | 'account';
export type ViewMode = 'grid' | 'list';
export type SortOption = 'date_desc' | 'date_asc' | 'size_desc' | 'size_asc' | 'name_asc' | 'name_desc';
export type Language = 'fa' | 'en';

