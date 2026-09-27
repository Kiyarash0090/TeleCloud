import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { UploadQueueItem } from '../types';

interface QueueContextType {
  queue: UploadQueueItem[];
  addFilesToQueue: (files: FileList | File[]) => void;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  clearCompleted: () => void;
  isUploading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  totalActiveCount: number;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export function QueueProvider({
  children,
  onUploadSuccess,
  activePeer = 'me',
}: {
  children: React.ReactNode;
  onUploadSuccess?: () => void;
  activePeer?: string;
}) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const activeXhrs = useRef<Map<string, XMLHttpRequest>>(new Map());
  const isProcessingRef = useRef(false);

  const addFilesToQueue = (files: FileList | File[]) => {
    if (activePeer && activePeer !== 'me') {
      return;
    }

    const newItems: UploadQueueItem[] = Array.from(files).map(file => ({
      id: `task_${Date.now()}_${Math.random().toString(36).substring(5)}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'queued',
      speed: '0 KB/s',
    }));

    setQueue(prev => [...prev, ...newItems]);
    setIsOpen(true);
  };

  const cancelUpload = (id: string) => {
    const xhr = activeXhrs.current.get(id);
    if (xhr) {
      xhr.abort();
      activeXhrs.current.delete(id);
    }
    setQueue(prev =>
      prev.map(item => (item.id === id ? { ...item, status: 'cancelled', speed: '' } : item))
    );
  };

  const retryUpload = (id: string) => {
    setQueue(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: 'queued', progress: 0, error: undefined } : item
      )
    );
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(item => item.status === 'uploading' || item.status === 'queued'));
  };

  const processNextInQueue = useCallback(async () => {
    if (isProcessingRef.current) return;

    const queuedItem = queue.find(item => item.status === 'queued');
    if (!queuedItem) return;

    isProcessingRef.current = true;

    // Update status to uploading
    setQueue(prev =>
      prev.map(item =>
        item.id === queuedItem.id
          ? { ...item, status: 'uploading', startedAt: Date.now() }
          : item
      )
    );

    const formData = new FormData();
    formData.append('file', queuedItem.file);
    formData.append('caption', queuedItem.name);
    formData.append('peer', 'me');

    const xhr = new XMLHttpRequest();
    activeXhrs.current.set(queuedItem.id, xhr);

    let lastLoaded = 0;
    let lastTime = Date.now();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000;

        let speedStr = '';
        if (timeDiff >= 0.5) {
          const bytesDiff = e.loaded - lastLoaded;
          const speedBytesPerSec = bytesDiff / timeDiff;
          if (speedBytesPerSec > 1024 * 1024) {
            speedStr = `${(speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
          } else {
            speedStr = `${(speedBytesPerSec / 1024).toFixed(0)} KB/s`;
          }
          lastLoaded = e.loaded;
          lastTime = currentTime;
        }

        setQueue(prev =>
          prev.map(item =>
            item.id === queuedItem.id
              ? {
                  ...item,
                  progress: percent,
                  speed: speedStr || item.speed,
                }
              : item
          )
        );
      }
    });

    xhr.addEventListener('load', () => {
      activeXhrs.current.delete(queuedItem.id);
      isProcessingRef.current = false;

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          setQueue(prev =>
            prev.map(item =>
              item.id === queuedItem.id
                ? {
                    ...item,
                    status: 'completed',
                    progress: 100,
                    speed: '',
                    messageId: res.messageId,
                  }
                : item
            )
          );
          if (onUploadSuccess) onUploadSuccess();
        } catch {
          setQueue(prev =>
            prev.map(item =>
              item.id === queuedItem.id
                ? { ...item, status: 'completed', progress: 100, speed: '' }
                : item
            )
          );
        }
      } else {
        let errMsg = 'Upload failed';
        try {
          const res = JSON.parse(xhr.responseText);
          errMsg = res.error || errMsg;
        } catch {}
        setQueue(prev =>
          prev.map(item =>
            item.id === queuedItem.id
              ? { ...item, status: 'failed', error: errMsg, speed: '' }
              : item
          )
        );
      }
    });

    xhr.addEventListener('error', () => {
      activeXhrs.current.delete(queuedItem.id);
      isProcessingRef.current = false;
      setQueue(prev =>
        prev.map(item =>
          item.id === queuedItem.id
            ? { ...item, status: 'failed', error: 'Network error occurred', speed: '' }
            : item
        )
      );
    });

    xhr.addEventListener('abort', () => {
      activeXhrs.current.delete(queuedItem.id);
      isProcessingRef.current = false;
    });

    xhr.open('POST', '/api/telegram/upload');
    xhr.withCredentials = true;
    xhr.send(formData);
  }, [queue, onUploadSuccess]);

  useEffect(() => {
    const hasQueued = queue.some(item => item.status === 'queued');
    const isCurrentlyUploading = queue.some(item => item.status === 'uploading');
    if (hasQueued && !isCurrentlyUploading) {
      processNextInQueue();
    }
  }, [queue, processNextInQueue]);

  const totalActiveCount = queue.filter(
    item => item.status === 'uploading' || item.status === 'queued'
  ).length;

  const isUploading = queue.some(item => item.status === 'uploading');

  return (
    <QueueContext.Provider
      value={{
        queue,
        addFilesToQueue,
        cancelUpload,
        retryUpload,
        clearCompleted,
        isUploading,
        isOpen,
        setIsOpen,
        totalActiveCount,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (!context) throw new Error('useQueue must be used within QueueProvider');
  return context;
}
