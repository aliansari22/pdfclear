
export interface UploadedFile {
  file: File;
  id: string;
}

export interface StatusMessage {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface ISidebarLink {
  id: string;
  label: string;
  path: string;
  accept: string;
  singleFile: boolean;
  requiresPdf: boolean;
  requiresNonPdf: boolean;
  description: string;
}

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


// Type declarations for libraries loaded via CDN
declare global {
  interface Window {
    PDFLib: any;
    pdfjsLib: any;
    JSZip: any;
    docxpdf: any;
    html2pdf: any;
    marked: any;
  //  qpdf: any; // Added qpdf
  }
}
