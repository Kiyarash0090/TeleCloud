import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Folder,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTheme } from '../context/ThemeContext';
import {
  FOLDER_COLORS,
  FOLDER_ICONS,
  getFolderColor,
  getFolderIcon,
} from '../utils/folderHelpers';

export function FolderModal() {
  const {
    isFolderModalOpen,
    setIsFolderModalOpen,
    folderToEdit,
    setFolderToEdit,
    createFolder,
    updateFolder,
    deleteFolder,
    setActiveFolderId,
  } = useTelegram();
  const { t, lang } = useTheme();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(folderToEdit);

  useEffect(() => {
    if (isFolderModalOpen) {
      if (folderToEdit) {
        setName(folderToEdit.name);
        setSelectedColor(folderToEdit.color || 'blue');
        setSelectedIcon(folderToEdit.icon || 'folder');
      } else {
        setName('');
        setSelectedColor('blue');
        setSelectedIcon('folder');
      }
      setConfirmDelete(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    }
  }, [isFolderModalOpen, folderToEdit]);

  if (!isFolderModalOpen) return null;

  const handleClose = () => {
    setIsFolderModalOpen(false);
    setFolderToEdit(null);
    setConfirmDelete(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    if (navigator.vibrate) navigator.vibrate(20);

    if (isEditing && folderToEdit) {
      updateFolder(folderToEdit.id, cleanName, selectedColor, selectedIcon);
    } else {
      const created = createFolder(cleanName, selectedColor, selectedIcon);
      setActiveFolderId(created.id);
    }

    handleClose();
  };

  const handleDelete = () => {
    if (!isEditing || !folderToEdit) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      if (navigator.vibrate) navigator.vibrate(30);
      setTimeout(() => setConfirmDelete(false), 3500);
      return;
    }
    deleteFolder(folderToEdit.id);
    handleClose();
  };

  const currentColor = getFolderColor(selectedColor);
  const CurrentIcon = getFolderIcon(selectedIcon);

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-[#18191d] border-t sm:border border-slate-200/80 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 animate-in slide-in-from-bottom-4 duration-200 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${currentColor.bgClass} ${currentColor.textClass}`}
            >
              <CurrentIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? t('editFolder') : t('createFolder')}
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
                {lang === 'fa'
                  ? 'دسته‌بندی و ساماندهی فایل‌های شخصی'
                  : 'Organize files into custom folders'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
          {/* Folder Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              {t('folderName')}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('folderNamePlaceholder')}
                maxLength={40}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName('')}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Color Palette Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
              {t('folderColor')}
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {FOLDER_COLORS.map((col) => {
                const isSelected = selectedColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      setSelectedColor(col.id);
                      if (navigator.vibrate) navigator.vibrate(10);
                    }}
                    title={lang === 'fa' ? col.nameFa : col.nameEn}
                    className={`relative w-8 h-8 rounded-full ${col.dotClass} flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-3 ring-offset-2 ring-blue-500 dark:ring-offset-zinc-900 scale-110 shadow-sm'
                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
              {lang === 'fa' ? 'نماد و آیکون' : 'Folder Icon'}
            </label>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {FOLDER_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedIcon(item.id);
                      if (navigator.vibrate) navigator.vibrate(10);
                    }}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition cursor-pointer active:scale-95 ${
                      isSelected
                        ? `${currentColor.bgClass} ${currentColor.textClass} border ${currentColor.borderClass} font-bold shadow-2xs`
                        : 'bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-800'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] truncate max-w-full">
                      {lang === 'fa' ? item.nameFa : item.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="pt-1">
            <div className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>{lang === 'fa' ? 'پیش‌نمایش پوشه' : 'Folder Preview'}</span>
            </div>
            <div
              className={`p-3 rounded-2xl border ${currentColor.borderClass} ${currentColor.bgClass} flex items-center gap-3 transition-all`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-800 shadow-2xs ${currentColor.textClass}`}
              >
                <CurrentIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {name.trim() || (lang === 'fa' ? 'نام پوشه شما' : 'Your Folder Name')}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                  {lang === 'fa' ? '۰ فایل' : '0 files'}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  confirmDelete
                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {confirmDelete
                    ? lang === 'fa'
                      ? 'تأیید حذف؟'
                      : 'Confirm?'
                    : t('deleteFolder')}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer active:scale-95 text-center"
            >
              {t('cancel')}
            </button>

            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 text-center"
            >
              {isEditing ? t('save') : t('createFolder')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
