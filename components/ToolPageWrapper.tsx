import React, { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import FileUpload from './FileUpload';
import PostOperationMessage from './PostOperationMessage'; // Corrected import path
import { useFileContext } from '../hooks/useFileContext';
import { ALL_TOOLS } from '../constants';

interface ToolPageWrapperProps {
  children: ReactNode; // The actual tool page component (e.g., <MergePage />)
}
const normalizePath = (p: string) => {
  if (!p || p === '/') return '/';
  return p.replace(/\/+$/, '') + '/';
};

const ToolPageWrapper: React.FC<ToolPageWrapperProps> = ({ children }) => {
  const location = useLocation();
  const { operationCompleted, showPostOperationMessage, downloadInfo, initiateDownload, uploadedFiles } = useFileContext();
  const [hasPdfFile, setHasPdfFile] = useState(false);
  const [hasNonPdfFile, setHasNonPdfFile] = useState(false);


  useEffect(() => {
    setHasPdfFile(uploadedFiles.some(f => f.file.type === 'application/pdf'));
    setHasNonPdfFile(uploadedFiles.some(f => f.file.type !== 'application/pdf'));
  }, [uploadedFiles]);

  const toolSet = React.useMemo(
    () => new Set(ALL_TOOLS.map(t => normalizePath(t.path))),
    []
  );
  const isToolPage = toolSet.has(normalizePath(location.pathname));

  // Determine the configuration for the current tool
  const currentToolConfig = ALL_TOOLS.find(t => normalizePath(t.path) === normalizePath(location.pathname));
  const requiresPdf = currentToolConfig?.requiresPdf;
  const requiresNonPdf = currentToolConfig?.requiresNonPdf; // New: for non-PDF converters

  // FileUpload should only be shown if the operation isn't completed.
  const showFileUploadComponent = isToolPage && !operationCompleted;

  // The success PostOperationMessage should be shown if operation is completed and message is set to show.
  const showPostOpSuccessMessage = isToolPage && operationCompleted && showPostOperationMessage;

  // Condition for showing the interactive tool controls (passed as children)
  // This is now based on `!operationCompleted` AND whether the required file type is present.
  const showToolControls = !operationCompleted && (
    (requiresPdf && hasPdfFile) || 
    (requiresNonPdf && hasNonPdfFile) ||
    (!requiresPdf && !requiresNonPdf && uploadedFiles.length > 0) // For tools that accept any file after upload, e.g., ZipToPdf after images extracted
  );

  return (
    <>
      {/* This div now wraps the original tool page content. Its centering applies to the title/description. */}
      <div className="max-w-3xl mx-auto text-center">
        {/*
          Always render the children *unconditionally* here.
          The individual tool pages (`CompressPage`, `SplitPage`, etc.) will internally
          manage whether their specific *controls* (inputs, buttons, PdfPreviewer) are shown
          based on `!operationCompleted` and `pdfFile` availability.
          This ensures titles and descriptions are always visible.
        */}
        {children}

        {/* If the operation is not completed, show the FileUpload zone */}
        
      </div> {/* End of max-w-3xl mx-auto text-center */}

      {/* If the operation IS completed, and the message should be shown, render the PostOperationMessage with download button */}
      {showPostOpSuccessMessage && (
        <div className="mt-6 max-w-3xl mx-auto"> {/* Also center the PostOperationMessage itself */}
          <PostOperationMessage 
            downloadInfo={downloadInfo} 
            initiateDownload={initiateDownload} 
          />
        </div>
      )}
    </>
  );
};

export default ToolPageWrapper;
