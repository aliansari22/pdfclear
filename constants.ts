import { ISidebarLink } from './types';

interface ISidebarCategory {
  category: string;
  links: ISidebarLink[];
}

export const SIDEBAR_TOOLS: ISidebarCategory[] = [

  // =========================
  // AI & TEXT EXTRACTION
  // =========================
  {
    category: 'AI & Text Extraction',
    links: [
      { 
        id: 'semantic-search', 
        label: 'AI PDF Search', 
        path: '/pdf-semantic-search/', 
        accept: '.pdf, .txt', 
        singleFile: true, 
        requiresPdf: false, 
        requiresNonPdf: false,
        description: 'Ask questions across your PDFs with private AI search that runs in your browser.'
      },
      { 
        id: 'summarize', 
        label: 'AI PDF Summarizer', 
        path: '/ai-pdf-summarizer/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Generate concise PDF summaries with private browser-based AI.'
      },
      { 
        id: 'pdf-to-markdown-nougat', 
        label: 'PDF to Markdown (AI)', 
        path: '/pdf-to-markdown/', 
        accept: '.pdf, .jpeg, .jpg, .png, .webp', 
        singleFile: true, 
        requiresPdf: false, 
        requiresNonPdf: false,
        description: 'Convert PDFs and images to clean Markdown with local AI processing.'
      },
      { 
        id: 'smart-pdf-to-txt-ocr', 
        label: 'Smart PDF to TXT (OCR)', 
        path: '/smart-pdf-to-txt/', 
        accept: '.pdf, .jpeg, .jpg, .png, .webp', 
        singleFile: false, 
        requiresPdf: false, 
        requiresNonPdf: false,
        description: 'Extract clean text from scanned PDFs and images with browser-based OCR.'
      },
    ],
  },

  // =========================
  // CONVERT FROM PDF
  // =========================
  {
    category: 'Convert from PDF',
    links: [
      { 
        id: 'pdf-to-jpg', 
        label: 'PDF to JPG', 
        path: '/pdf-to-jpg/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Convert PDF pages into high-quality JPG images.'
      },
      { 
        id: 'pdf-to-png', 
        label: 'PDF to PNG', 
        path: '/pdf-to-png/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Convert PDF pages into PNG images with transparency.'
      },
    ],
  },

  // =========================
  // CONVERT TO PDF
  // =========================
  {
    category: 'Convert to PDF',
    links: [
      { 
        id: 'jpg-to-pdf', 
        label: 'JPG to PDF', 
        path: '/jpg-to-pdf/', 
        accept: '.jpeg, .jpg', 
        singleFile: false, 
        requiresPdf: false, 
        requiresNonPdf: true,
        description: 'Convert JPG images into a single PDF or multiple PDFs.'
      },
      { 
        id: 'png-to-pdf', 
        label: 'PNG to PDF', 
        path: '/png-to-pdf/', 
        accept: '.png', 
        singleFile: false, 
        requiresPdf: false, 
        requiresNonPdf: true,
        description: 'Convert PNG images into a PDF.'
      },
      { 
        id: 'txt-to-pdf', 
        label: 'TXT to PDF', 
        path: '/txt-to-pdf/', 
        accept: '.txt', 
        singleFile: true, 
        requiresPdf: false, 
        requiresNonPdf: true,
        description: 'Convert plain text files to PDFs.'
      },
      { 
        id: 'html-to-pdf', 
        label: 'HTML to PDF', 
        path: '/html-to-pdf/', 
        accept: '.html, .htm', 
        singleFile: true, 
        requiresPdf: false, 
        requiresNonPdf: true,
        description: 'Convert HTML files to PDFs.'
      },
      { 
        id: 'markdown-to-pdf', 
        label: 'Markdown to PDF', 
        path: '/markdown-to-pdf/', 
        accept: '.md', 
        singleFile: true, 
        requiresPdf: false, 
        requiresNonPdf: true,
        description: 'Convert Markdown files to beautifully formatted PDFs.'
      },
    ],
  },

  // =========================
  // EDIT & ANNOTATE
  // =========================
  {
    category: 'Edit & Annotate',
    links: [
      { 
        id: 'add-text', 
        label: 'Add Text to PDF', 
        path: '/add-text-to-pdf/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Type and add text annotations anywhere on your PDF.'
      },
      { 
        id: 'add-image', 
        label: 'Add Image to PDF', 
        path: '/add-image-to-pdf/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Insert images into existing PDF pages.'
      },
      { 
        id: 'sign-pdf', 
        label: 'Sign PDF', 
        path: '/sign-pdf/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Draw or upload signatures and sign your PDFs.'
      },
      { 
        id: 'fill-pdf-form', 
        label: 'Fill PDF Form', 
        path: '/fill-pdf-form/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Click anywhere to type and fill out PDF forms.'
      },
      { 
        id: 'add-page-numbers', 
        label: 'Add Page Numbers', 
        path: '/add-page-numbers/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Add page numbers to every page of your PDF.'
      },
      { 
        id: 'watermark', 
        label: 'Watermark PDF', 
        path: '/watermark-pdf/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Add a text or image watermark to a PDF.'
      },
      { 
        id: 'edit-metadata', 
        label: 'Edit PDF Metadata', 
        path: '/edit-pdf-metadata/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Edit PDF title, author, subject, and keywords.'
      },
    ],
  },

  // =========================
  // ORGANIZE PAGES
  // =========================
  {
    category: 'Organize Pages',
    links: [
      { 
        id: 'merge', 
        label: 'Merge PDF', 
        path: '/merge-pdf/', 
        accept: '.pdf', 
        singleFile: false, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Combine or merge multiple PDF files into one document.'
      },
      { 
        id: 'split', 
        label: 'Split PDF', 
        path: '/split-pdf/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Split, separate, or unmerge a PDF into page ranges.'
      },
      { 
        id: 'rotate', 
        label: 'Rotate PDF', 
        path: '/rotate-pdf/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Rotate PDF pages and fix page orientation.'
      },
      { 
        id: 'delete-pages', 
        label: 'Delete PDF Pages', 
        path: '/delete-pdf-pages/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Delete or cut unwanted pages from a PDF.'
      },
      { 
        id: 'reorder-pages', 
        label: 'Reorder PDF Pages', 
        path: '/reorder-pdf-pages/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Rearrange PDF pages visually with draggable thumbnails.'
      },
      { 
        id: 'flip-pages', 
        label: 'Flip PDF Pages', 
        path: '/flip-pdf-pages/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Mirror selected PDF pages horizontally or vertically with preview thumbnails.'
      },
      { 
        id: 'compress', 
        label: 'Compress PDF', 
        path: '/compress-pdf/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Compress PDF files and reduce PDF size in your browser.'
      },
    ],
  },

  // =========================
  // SECURITY
  // =========================
  {
    category: 'Security',
    links: [
      { 
        id: 'protect-pdf', 
        label: 'Protect PDF', 
        path: '/protect-pdf/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Password protect and encrypt your PDF file.'
      },
      { 
        id: 'unlock-pdf', 
        label: 'Unlock PDF', 
        path: '/unlock-pdf/', 
        accept: '.pdf', 
        singleFile: true, 
        requiresPdf: true, 
        requiresNonPdf: false,
        description: 'Unlock a PDF by removing password protection you know.'
      },
    ],
  },
];

export const ALL_TOOLS: ISidebarLink[] = SIDEBAR_TOOLS.flatMap(category => category.links);

