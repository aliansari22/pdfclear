import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload'; // Ensure FileUpload is imported
import ToolActionBar from '../components/ToolActionBar';
import { DocumentTextIcon, RectangleStackIcon, BoltIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/txt-to-pdf/';
const BRAND = 'PDFClear';

const TxtToPdfPage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted, setProgress } = useFileContext();
  const convertibleFiles = uploadedFiles.filter(f => f.file.type === 'text/plain');

  const handleConvert = async () => {
    if (convertibleFiles.length === 0) {
      showMessage('Please upload text files (.txt) to convert.', 'error');
      return;
    }
    setProcessing(true);
    showMessage('Converting text files to PDF...', 'info');
    try {
      const downloadResult = await pdfService.convertToPdf(convertibleFiles, setProgress);
      showMessage('Files converted to PDF successfully!', 'success');
      showPostOperationSuccess(downloadResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      showMessage(`Error: ${message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // --- JSON-LD Structured Data ---
  const jsonLdWebPage = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `TXT to PDF Converter - Free & Online | ${BRAND}`,
    url: PAGE_URL,
    description: 'Convert plain text (.txt) files or a ZIP archive of them into a professional PDF document quickly and privately. PDFClear\'s free tool processes files in your browser, ensuring no PDFClear server upload.'
  }), []);

  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TXT to PDF Converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    url: PAGE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: BRAND },
    featureList: [ 'Convert TXT to PDF', 'Text file to PDF', 'Combine multiple TXT files', 'Accepts ZIP file of text files', 'Client-side PDF processing', 'Secure and private' ]
  }), []);

  const jsonLdFAQ = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How do I convert TXT to PDF?', acceptedAnswer: { '@type': 'Answer', text: 'Upload one or more .txt files, or a ZIP file containing them. Click the "Convert to PDF" button, and your text files will be combined into a single PDF document.' } },
      { '@type': 'Question', name: 'Can I upload a ZIP file with my text files?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. If you have multiple .txt files, you can place them in a ZIP archive and upload it. The tool will extract all text files and combine their content into a single PDF.' } },
      { '@type': 'Question', name: 'Is it safe to convert TXT to PDF online with PDFClear?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, it is designed to be safe. TXT-to-PDF conversion runs directly in your browser. Your files are processed in your browser and are not uploaded to a PDFClear server.' } },
      { '@type': 'Question', name: 'Will my text formatting be preserved?', acceptedAnswer: { '@type': 'Answer', text: 'As plain text files (.txt) generally do not contain complex formatting, the conversion will render your text in a standard, readable font within the PDF. Basic line breaks and paragraphs will be preserved.' } }
    ]
  }), []);

  return (
    <div>
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Turn plain text (.txt) files or a ZIP archive into a professional PDF document. A simple, free, and private online converter. No PDFClear server upload, browser-based." />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>TXT to PDF Converter - Convert Text Files Online | PDFClear</title>
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta property="og:title" content={`TXT to PDF Converter - Convert Text Files Online | ${BRAND}`} />
        <meta property="og:description" content="Turn plain text (.txt) files or a ZIP archive into a professional PDF document. A simple, free, and private online converter. No PDFClear server upload, browser-based." />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`TXT to PDF Converter - Convert Text Files Online | ${BRAND}`} />
        <meta name="twitter:description" content="Turn plain text (.txt) files or a ZIP archive into a professional PDF document. A simple, free, and private online converter. No PDFClear server upload, browser-based." />
        {/* Keywords */}
        <meta name="keywords" content="TXT to PDF, convert TXT to PDF, text to PDF, plain text to PDF, text file to pdf, save txt as pdf, free TXT to PDF, online TXT to PDF, secure PDF tools, client-side PDF, zip to pdf" />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      {/* Enhanced Header / Value props */}
      
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
            Convert TXT to PDF - Turn Text Files into PDFs
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Transform plain text (.txt) files into professional PDFs instantly. Upload multiple files or a ZIP archive and convert them directly in your browser while the content stays on your device.
          </p>
          
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <div className="inline-flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-brand-500" />
                <span>Plain Text to PDF</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <RectangleStackIcon className="h-5 w-5 text-brand-500" />
                <span>Combine Multiple Files</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <BoltIcon className="h-5 w-5 text-brand-500" />
                <span>Fast Conversion</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                <span>Runs in your browser</span>
            </div>
        </div>
        </header>
      

      {/* Action and upload area */}
      {!operationCompleted && (
        <>
          <ToolActionBar title="Convert text files and download the PDF">
            <button
              onClick={handleConvert}
              disabled={processing || convertibleFiles.length === 0}
              className="btn-primary w-full"
            >
              Download PDF
            </button>
          </ToolActionBar>

          <div className="mt-6">
            <FileUpload showProcessingStatus={false} />
          </div>
        </>
      )}

      {/* Main Tool Content */}
      {!operationCompleted && (
        <>
          {/* Feature Highlight Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Simple Conversion</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Effortlessly turn any plain text file into a PDF document.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Combine Text Files</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Merge several TXT files or a ZIP archive into a single, organized PDF.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Browser-side processing</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                TXT conversion runs in your browser, so your file content stays on your device.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Frequently Asked Questions Section */}
      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about TXT to PDF</h2>

          <details className="faq-details">
            <summary className="faq-summary">How do I convert TXT to PDF?</summary>
            <p className="faq-answer">
              Upload one or more .txt files (or a ZIP file containing them) using the "Select Files" button. Once your files are listed, click the "Convert to PDF" button. Your text will be rendered into a new PDF document.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Can I upload a ZIP file with my text files?</summary>
            <p className="faq-answer">
              Yes. If you have multiple .txt files, you can place them in a ZIP archive and upload it. The tool will extract all text files and combine their content into a single PDF.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Is my data safe when converting TXT to PDF?</summary>
            <p className="faq-answer">
              Absolutely. PDFClear processes files in your browser. This means your text files are processed in your browser and are not uploaded to a PDFClear server.
            </p>
          </details>
          
          <details className="faq-details">
            <summary className="faq-summary">What about text formatting and fonts?</summary>
            <p className="faq-answer">
              Since .txt files are plain text, they typically don't contain complex formatting. The converter will render your text using a standard, readable font (like Helvetica) within the PDF. Basic line breaks and paragraph structures from your original text file will be preserved.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default TxtToPdfPage;
