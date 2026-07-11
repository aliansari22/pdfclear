import React, { useEffect } from 'react';
import { useFileContext } from '../hooks/useFileContext';

interface DownloadInfo {
  data: Uint8Array | Blob;
  filename: string;
  mimeType: string;
}

interface PostOperationMessageProps {
  downloadInfo?: DownloadInfo | null;
  initiateDownload?: () => void;
}

const PostOperationMessage: React.FC<PostOperationMessageProps> = ({ downloadInfo, initiateDownload }) => {
  const { showPostOperationMessage, hidePostOperationSuccess, reset } = useFileContext();

  const handleClose = () => {
    hidePostOperationSuccess();
    reset();
  };

  useEffect(() => {
    if (showPostOperationMessage) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [showPostOperationMessage]);

  if (!showPostOperationMessage) return null;

  return (
    <div
      className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl p-6 sm:p-8 text-center relative"
      role="region"
      aria-labelledby="post-operation-title"
    >
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 text-text-light-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors z-10"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <h3 id="post-operation-title" className="text-xl sm:text-2xl font-bold text-center text-text-light-primary dark:text-text-dark-primary mb-2">
        Your file is now ready!
      </h3>

      <p className="text-center text-text-light-secondary dark:text-text-dark-secondary mb-6 text-sm">
        Download your processed file below.
      </p>

      {downloadInfo && (
        <div className="flex justify-center">
          <button
            onClick={initiateDownload}
            className="btn-primary py-3 px-6 text-lg"
          >
            Download file
          </button>
        </div>
      )}
    </div>
  );
};

export default PostOperationMessage;
