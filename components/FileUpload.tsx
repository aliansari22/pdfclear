import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useFileContext } from '../hooks/useFileContext';
import { ALL_TOOLS } from '../constants'; // Correct import
import FileItem from './FileItem';
import Spinner from './Spinner';
import { getLargeFileWarning } from '../utils/fileSize';

const normalizePath = (p: string) => {
  if (!p || p === '/') return '/';
  return p.replace(/\/+$/, '') + '/';
};


interface FileUploadProps {
  showProcessingStatus?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ showProcessingStatus = true }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { uploadedFiles, addFiles, reorderFiles, statusMessage, processing, operationCompleted, progress } = useFileContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const currentTool = ALL_TOOLS.find(tab => tab.path === normalizePath(location.pathname)) || ALL_TOOLS[0];
  const showLargeFileWarning = ['merge', 'compress', 'semantic-search'].includes(currentTool.id);
  const largeFileWarning = useMemo(() => showLargeFileWarning ? getLargeFileWarning(uploadedFiles) : null, [showLargeFileWarning, uploadedFiles]);
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (processing || operationCompleted) return; 

    if (e.type === 'dragenter' || e.type === 'dragover') {
        setIsDragging(true);
    } else if (e.type === 'dragleave') {
        setIsDragging(false);
    }
  }, [processing, operationCompleted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (processing || operationCompleted) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files, location.pathname);
    }
  }, [addFiles, processing, location.pathname, operationCompleted]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (processing || operationCompleted) return;

    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files, location.pathname);
      e.target.value = ''; // Allow re-uploading same file
    }
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      reorderFiles(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const dragAreaClasses = `p-8 text-center rounded-2xl cursor-pointer transition-all mb-4 border-2 border-dashed shadow-sm ${
    isDragging
      ? 'border-fuchsia-400 bg-gradient-to-br from-indigo-50 via-white to-rose-50 shadow-lg shadow-fuchsia-900/10 dark:border-fuchsia-500 dark:from-indigo-950/40 dark:via-dark-card dark:to-rose-950/30'
      : 'border-slate-200 bg-white/90 hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-border-dark dark:bg-dark-card dark:hover:border-indigo-700 dark:hover:bg-indigo-950/25'
  } ${processing || operationCompleted ? 'opacity-60 cursor-not-allowed' : ''}`;

  return (
    <div className="mb-2 border-b border-border-light dark:border-border-dark pb-1">
      <div
        className={dragAreaClasses}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
            if (!(processing || operationCompleted)) {
                fileInputRef.current?.click();
            }
        }}
      >
        <p className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">Drag & Drop files here</p>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">or</p>
        <button
          type="button"
          className="btn-primary"
          disabled={processing || operationCompleted}
        >
          Select Files
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple={!currentTool.singleFile}
          accept={currentTool.accept}
          onChange={handleFileSelect}
          disabled={processing || operationCompleted}
        />
      </div>
      {largeFileWarning && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {largeFileWarning}
        </div>
      )}
      <div className="space-y-2 mt-4 max-h-[26rem] overflow-y-auto pr-1">
        {uploadedFiles.map((item, index) => (
          <FileItem 
            key={item.id} 
            item={item} 
            index={index}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
      <div className="mt-4 text-center text-sm font-medium min-h-[40px] flex flex-col items-center justify-center gap-2">
            {showProcessingStatus && processing && (
                <div className="w-full max-w-md">
                    <div className="flex items-center justify-center gap-2">
                        <Spinner />
                        {statusMessage && (
                            <span className={statusMessage.type === 'error' ? 'text-rose-500' : 'text-text-light-primary dark:text-text-dark-secondary'}>
                                {statusMessage.text}
                            </span>
                        )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 overflow-hidden">
                        <div 
                            className="progress-gradient h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}
            {!processing && statusMessage && (
                <span className={statusMessage.type === 'error' ? 'text-rose-500' : statusMessage.type === 'success' ? 'text-emerald-500' : 'text-text-light-primary dark:text-text-dark-secondary'}>
                    {statusMessage.text}
                </span>
            )}
      </div>
      
    </div>
  );
};

export default FileUpload;
