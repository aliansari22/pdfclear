import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { UploadedFile, StatusMessage } from '../types';
import { ALL_TOOLS } from '../constants';
import { extractFilesFromZip } from '../services/pdf.service';
import { getErrorMessage, logError } from '../utils/logger';

const WEBSITE_ADDRESS_PREFIX = 'pdfclear.com-';
const PERSIST_DB_NAME = 'pdfclear-file-store';
const PERSIST_STORE_NAME = 'files';
const PERSIST_KEY = 'active-uploaded-files';

type Theme = 'light' | 'dark';
interface DownloadInfo {
  data: Uint8Array | Blob;
  filename: string;
  mimeType: string;
}

interface PersistedUploadedFile {
  id: string;
  name: string;
  type: string;
  lastModified: number;
  file: Blob;
}

interface FileContextType {
  uploadedFiles: UploadedFile[];
  processing: boolean;
  statusMessage: StatusMessage | null;
  showPostOperationMessage: boolean;
  operationCompleted: boolean;
  downloadInfo: DownloadInfo | null;
  theme: Theme;
  progress: number;
  addFiles: (files: FileList | File[], currentPath: string) => void;
  removeFile: (id: string) => void;
  reorderFiles: (dragIndex: number, dropIndex: number) => void;
  reset: () => void;
  setProcessing: (isProcessing: boolean, startMessage?: string) => void;
  setProgress: (progress: number) => void;
  showMessage: (text: string, type?: StatusMessage['type']) => void;
  clearMessages: () => void;
  showPostOperationSuccess: (info: DownloadInfo) => void;
  hidePostOperationSuccess: () => void;
  toggleTheme: () => void;
  initiateDownload: () => void;
  setShowPostOperationMessage: (show: boolean) => void;
}

export const FileContext = createContext<FileContextType | undefined>(undefined);

interface FileProviderProps {
  children: ReactNode;
}

const normalizePath = (p: string) => {
  if (!p || p === '/') return '/';
  return p.replace(/\/+$/, '') + '/';
};

async function openFilesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PERSIST_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PERSIST_STORE_NAME)) {
        db.createObjectStore(PERSIST_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePersistedFiles(files: UploadedFile[]): Promise<void> {
  const db = await openFilesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PERSIST_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PERSIST_STORE_NAME);
    const payload: PersistedUploadedFile[] = files.map((entry) => ({
      id: entry.id,
      name: entry.file.name,
      type: entry.file.type,
      lastModified: entry.file.lastModified,
      file: entry.file,
    }));
    store.put(payload, PERSIST_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadPersistedFiles(): Promise<UploadedFile[]> {
  const db = await openFilesDb();
  const payload = await new Promise<PersistedUploadedFile[] | undefined>((resolve, reject) => {
    const tx = db.transaction(PERSIST_STORE_NAME, 'readonly');
    const store = tx.objectStore(PERSIST_STORE_NAME);
    const request = store.get(PERSIST_KEY);
    request.onsuccess = () => resolve(request.result as PersistedUploadedFile[] | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!payload?.length) return [];
  return payload.map((entry) => ({
    id: entry.id,
    file: new File([entry.file], entry.name, { type: entry.type, lastModified: entry.lastModified }),
  }));
}

async function clearPersistedFiles(): Promise<void> {
  const db = await openFilesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PERSIST_STORE_NAME, 'readwrite');
    tx.objectStore(PERSIST_STORE_NAME).delete(PERSIST_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export const FileProvider: React.FC<FileProviderProps> = ({ children }) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processing, _setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [showPostOperationMessage, setShowPostOperationMessage] = useState(false);
  const [operationCompleted, setOperationCompleted] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    return savedTheme ?? 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    void (async () => {
      try {
        const restored = await loadPersistedFiles();
        if (restored.length > 0) {
          setUploadedFiles(restored);
          setStatusMessage({ text: `Restored ${restored.length} file${restored.length === 1 ? '' : 's'} from your last session.`, type: 'info' });
        }
      } catch (error) {
        logError(error, 'FileContext.restore');
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        if (uploadedFiles.length === 0) {
          await clearPersistedFiles();
        } else {
          await savePersistedFiles(uploadedFiles);
        }
      } catch (error) {
        logError(error, 'FileContext.persist');
      }
    })();
  }, [uploadedFiles]);

  const toggleTheme = () => setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));

  const showMessage = useCallback((text: string, type: StatusMessage['type'] = 'info') => {
    setStatusMessage({ text, type });
  }, []);

  const clearMessages = useCallback(() => setStatusMessage(null), []);

  const setProcessing = useCallback((isProcessing: boolean, startMessage?: string) => {
    _setProcessing(isProcessing);
    if (isProcessing) {
      setProgress(0);
      if (startMessage) showMessage(startMessage, 'info');
    } else {
      setProgress(100);
    }
  }, [showMessage]);

  const addFiles = useCallback(async (filesToAdd: FileList | File[], currentPath: string) => {
    clearMessages();
    setShowPostOperationMessage(false);
    setOperationCompleted(false);
    setDownloadInfo(null);
    setProgress(0);

    const normalizedPath = normalizePath(currentPath);
    const currentTool = ALL_TOOLS.find((tool) => tool.path === normalizedPath);
    if (!currentTool) {
      showMessage('Could not identify the current tool. Please try reloading the page.', 'error');
      return;
    }

    const filesToProcess: File[] = [];
    const acceptedExtensions = currentTool.accept.split(',').map((t) => t.trim());

    for (const file of Array.from(filesToAdd)) {
      const isZip = file.type === 'application/zip' || file.name.endsWith('.zip');
      if (isZip && acceptedExtensions.includes('.zip')) {
        try {
          const zipUploadedFile: UploadedFile = { file, id: 'temp-zip' };
          const acceptedInsideZip = acceptedExtensions.filter((ext) => ext !== '.zip');
          const extracted = await extractFilesFromZip(zipUploadedFile, showMessage, acceptedInsideZip);
          filesToProcess.push(...extracted);
        } catch (error) {
          showMessage(getErrorMessage(error, 'Failed to process ZIP file.'), 'error');
        }
      } else {
        filesToProcess.push(file);
      }
    }

    const newUploadedFiles: UploadedFile[] = [];
    for (const file of filesToProcess) {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptedExtensions.includes(fileExtension) && !acceptedExtensions.includes(file.type)) {
        showMessage(`Skipping unsupported file: ${file.name}. Accepted types: ${currentTool.accept}`, 'error');
        continue;
      }
      newUploadedFiles.push({ file, id: `${Date.now()}-${Math.random()}` });
    }

    if (newUploadedFiles.length === 0) return;

    setUploadedFiles((prevFiles) => {
      if (currentTool.singleFile) {
        if (prevFiles.length > 0 && newUploadedFiles.length > 0) {
          showMessage('This tool only processes one file at a time. Replacing the current file.', 'info');
        }
        return [newUploadedFiles[newUploadedFiles.length - 1]];
      }
      return [...prevFiles, ...newUploadedFiles];
    });
  }, [showMessage, clearMessages]);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((item) => item.id !== id));
    setShowPostOperationMessage(false);
    setOperationCompleted(false);
    setDownloadInfo(null);
    setProgress(0);
  }, []);

  const reorderFiles = useCallback((dragIndex: number, dropIndex: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(dragIndex, 1);
      newFiles.splice(dropIndex, 0, removed);
      return newFiles;
    });
  }, []);

  const reset = useCallback(() => {
    setUploadedFiles([]);
    _setProcessing(false);
    clearMessages();
    setShowPostOperationMessage(false);
    setOperationCompleted(false);
    setDownloadInfo(null);
    setProgress(0);
  }, [clearMessages]);

  const showPostOperationSuccess = (info: DownloadInfo) => {
    setDownloadInfo(info);
    setOperationCompleted(true);
    setProgress(100);
    setTimeout(() => setShowPostOperationMessage(true), 1000);
  };

  const hidePostOperationSuccess = () => {
    setShowPostOperationMessage(false);
    setOperationCompleted(false);
    setDownloadInfo(null);
  };


  const initiateDownload = useCallback(() => {
    if (!downloadInfo) return;
    const { data, filename, mimeType } = downloadInfo;
    const finalDownloadFilename = filename.startsWith(WEBSITE_ADDRESS_PREFIX) ? filename : WEBSITE_ADDRESS_PREFIX + filename;
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalDownloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [downloadInfo]);

  const value = {
    uploadedFiles,
    processing,
    statusMessage,
    showPostOperationMessage,
    operationCompleted,
    downloadInfo,
    theme,
    progress,
    addFiles,
    removeFile,
    reorderFiles,
    reset,
    setProcessing,
    setProgress,
    showMessage,
    clearMessages,
    showPostOperationSuccess,
    hidePostOperationSuccess,
    toggleTheme,
    initiateDownload,
    setShowPostOperationMessage,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};
