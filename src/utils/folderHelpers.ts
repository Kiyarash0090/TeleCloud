import React from 'react';
import {
  Folder,
  FolderArchive,
  Briefcase,
  BookOpen,
  Music,
  Film,
  Image,
  Code,
  Heart,
  Star,
} from 'lucide-react';

export interface FolderColorConfig {
  id: string;
  nameEn: string;
  nameFa: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  pillClass: string;
}

export const FOLDER_COLORS: FolderColorConfig[] = [
  {
    id: 'blue',
    nameEn: 'Blue',
    nameFa: 'آبی',
    dotClass: 'bg-blue-500',
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
    textClass: 'text-blue-600 dark:text-sky-400',
    borderClass: 'border-blue-500/30 dark:border-blue-400/30',
    pillClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400',
  },
  {
    id: 'emerald',
    nameEn: 'Emerald',
    nameFa: 'سبز زمردی',
    dotClass: 'bg-emerald-500',
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-500/30 dark:border-emerald-400/30',
    pillClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'amber',
    nameEn: 'Amber',
    nameFa: 'کهربایی',
    dotClass: 'bg-amber-500',
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-500/30 dark:border-amber-400/30',
    pillClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'violet',
    nameEn: 'Violet',
    nameFa: 'بنفش',
    dotClass: 'bg-violet-500',
    bgClass: 'bg-violet-500/10 dark:bg-violet-500/20',
    textClass: 'text-violet-600 dark:text-violet-400',
    borderClass: 'border-violet-500/30 dark:border-violet-400/30',
    pillClass: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400',
  },
  {
    id: 'rose',
    nameEn: 'Rose',
    nameFa: 'رز',
    dotClass: 'bg-rose-500',
    bgClass: 'bg-rose-500/10 dark:bg-rose-500/20',
    textClass: 'text-rose-600 dark:text-rose-400',
    borderClass: 'border-rose-500/30 dark:border-rose-400/30',
    pillClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
  },
  {
    id: 'sky',
    nameEn: 'Sky',
    nameFa: 'آبی آسمانی',
    dotClass: 'bg-sky-500',
    bgClass: 'bg-sky-500/10 dark:bg-sky-500/20',
    textClass: 'text-sky-600 dark:text-sky-400',
    borderClass: 'border-sky-500/30 dark:border-sky-400/30',
    pillClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
  },
  {
    id: 'indigo',
    nameEn: 'Indigo',
    nameFa: 'نیلی',
    dotClass: 'bg-indigo-500',
    bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    borderClass: 'border-indigo-500/30 dark:border-indigo-400/30',
    pillClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  },
];

export const FOLDER_ICONS: { id: string; nameEn: string; nameFa: string; icon: React.ElementType }[] = [
  { id: 'folder', nameEn: 'General', nameFa: 'عمومی', icon: Folder },
  { id: 'briefcase', nameEn: 'Work', nameFa: 'کاری', icon: Briefcase },
  { id: 'book', nameEn: 'Study', nameFa: 'مطالعه', icon: BookOpen },
  { id: 'music', nameEn: 'Music', nameFa: 'موزیک', icon: Music },
  { id: 'video', nameEn: 'Media', nameFa: 'ویدیو', icon: Film },
  { id: 'image', nameEn: 'Photos', nameFa: 'تصاویر', icon: Image },
  { id: 'code', nameEn: 'Code', nameFa: 'کد و پروژه', icon: Code },
  { id: 'archive', nameEn: 'Archive', nameFa: 'آرشیو', icon: FolderArchive },
  { id: 'heart', nameEn: 'Personal', nameFa: 'شخصی', icon: Heart },
  { id: 'star', nameEn: 'Important', nameFa: 'مهم', icon: Star },
];

export function getFolderColor(colorId?: string): FolderColorConfig {
  return FOLDER_COLORS.find((c) => c.id === colorId) || FOLDER_COLORS[0];
}

export function getFolderIcon(iconId?: string): React.ElementType {
  const match = FOLDER_ICONS.find((i) => i.id === iconId);
  return match ? match.icon : Folder;
}
