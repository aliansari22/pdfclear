import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { UploadedFile, formatBytes } from '../types';
import { useFileContext } from '../hooks/useFileContext';
import { ALL_TOOLS } from '../constants';

interface FileItemProps {
  item: UploadedFile;
  index: number;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
}

const FileItem: React.FC<FileItemProps> = ({ item, index, onDragStart, onDragEnter, onDragEnd }) => {
  const { removeFile, processing } = useFileContext();
  const location = useLocation();
  const itemRef = useRef<HTMLDivElement>(null);

  const currentTool = ALL_TOOLS.find(tool => tool.path === location.pathname);
  const isDraggable = currentTool ? !currentTool.singleFile : false;

  const handleDragStartInternal = (e: React.DragEvent<HTMLDivElement>) => {
    onDragStart(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (itemRef.current) {
        itemRef.current.classList.add('opacity-50');
      }
    }, 0);
  };

  const handleDragEndInternal = () => {
    if (itemRef.current) {
      itemRef.current.classList.remove('opacity-50');
    }
    onDragEnd();
  };

  return (
    <div
      ref={itemRef}
      className={`flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-border-light dark:border-border-dark transition-opacity ${isDraggable && !processing ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={isDraggable && !processing}
      onDragStart={handleDragStartInternal}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={handleDragEndInternal}
      onDragOver={(e) => e.preventDefault()} // Necessary to allow drop
    >
      <div className="flex items-center min-w-0 flex-grow">
        {isDraggable && !processing && (
          <span className="text-text-light-secondary dark:text-text-dark-secondary mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </span>
        )}
        <span className="truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary" title={item.file.name}>
          {item.file.name}
        </span>
        <span className="ml-2 text-xs text-text-light-secondary dark:text-text-dark-secondary flex-shrink-0">
          ({formatBytes(item.file.size)})
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent parent div's onClick if it had one
          removeFile(item.id);
        }}
        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 ml-2 flex-shrink-0"
        disabled={processing}
        aria-label={`Remove ${item.file.name}`}
        // Make the button itself non-draggable to avoid conflicts
        draggable={false}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default FileItem;
