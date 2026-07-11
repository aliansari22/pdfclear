import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload';
import { DocumentPlusIcon, ArrowsRightLeftIcon, Square2StackIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/merge-pdf/';
const BRAND = 'PDFClear';

const MergePage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
  const pdfFiles = uploadedFiles.filter(f => f.file.type === 'application/pdf');

  const handleMerge = async () => {
    if (processing || pdfFiles.length < 2) {
      showMessage('Please upload at least two PDF files to merge.', 'error');
      return;
    }
    setProcessing(true);
    showMessage('Merging PDFs...', 'info');
    try {
      const downloadResult = await pdfService.mergePdfs(pdfFiles);
      showMessage('PDFs merged successfully!', 'success');
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
    name: `Merge PDF - Combine & Join PDF Files Online | ${BRAND}`,
    url: PAGE_URL,
    description: 'Combine multiple PDF files into one document quickly and securely in your browser. PDFClear\'s free tool ensures your privacy with client-side processing.'
  }), []);

  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PDF Merger',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    url: PAGE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: BRAND },
    featureList: [ 'Combine multiple PDFs', 'Join PDFs', 'PDF Combiner', 'Reorder PDF pages and files', 'Client-side PDF processing', 'Free to use', 'No software installation required', 'Secure and private' ]
  }), []);

  const jsonLdFAQ = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How do I merge PDF files?', acceptedAnswer: { '@type': 'Answer', text: 'Simply upload two or more PDF documents. You can then drag and drop them in the file list to reorder them. Once ready, click the "Merge PDFs" button to combine them into a single file.' } },
      { '@type': 'Question', name: 'Is it safe to merge PDFs online with PDFClear?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, it is designed to be safe. All PDF merging operations are performed directly in your web browser. Your files are processed in your browser and are not uploaded to a PDFClear server.' } },
      { '@type': 'Question', name: 'Can I reorder the files before merging?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, after uploading your PDF files, you can easily drag and drop them in the list to arrange them in your desired order before initiating the merge process.' } },
      { '@type': 'Question', name: 'How many PDF files can I combine?', acceptedAnswer: { '@type': 'Answer', text: 'You can combine any number of PDF files. Just keep in mind that merging a very large number of files or extremely large files might take longer depending on your browser and computer\'s performance.' } },
      { '@type': 'Question', name: 'Will merging PDFs affect their quality?', acceptedAnswer: { '@type': 'Answer', text: 'Our PDF merging tool is designed to combine your documents without compromising their quality. The output PDF will retain the original quality of the individual files.' } }
    ]
  }), []);

  return (
    <div>
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Easily combine multiple PDF files into one document. Drag, drop, and merge securely in your browser with PDFClear's free tool. No PDFClear server upload, browser-based." />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>Merge PDF - Combine & Join PDF Files Online | PDFClear</title>
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta property="og:title" content={`Merge PDF - Combine & Join PDF Files Online | ${BRAND}`} />
        <meta property="og:description" content="Combine multiple PDF files into one document quickly and securely in your browser. PDFClear's free tool ensures your privacy with client-side processing." />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Merge PDF - Combine & Join PDF Files Online | ${BRAND}`} />
        <meta name="twitter:description" content="Combine multiple PDF files into one document quickly and securely in your browser. PDFClear's free tool ensures your privacy with client-side processing." />
        {/* Keywords */}
        <meta name="keywords" content="merge PDF, combine PDF, join PDF, pdf combiner, merge pdf files, free PDF merge, online PDF merger, secure PDF tools, client-side PDF" />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>
      
      {/* Enhanced Header / Value props */}
      
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
            Merge PDFs - Combine & Join Files Online
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Combine multiple PDF files into one document quickly and securely. Drag and drop to reorder, then merge – all directly in your browser without uploading files to a PDFClear server.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <div className="inline-flex items-center gap-2">
                <Square2StackIcon className="h-5 w-5 text-brand-500" />
                <span>Combine PDFs</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <ArrowsRightLeftIcon className="h-5 w-5 text-brand-500" />
                <span>Easy Reordering</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <DocumentPlusIcon className="h-5 w-5 text-brand-500" />
                <span>No server-side job quota</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                <span>Browser-based</span>
            </div>
        </div>
        </header>
      

      {/* File Upload Component */}
      {!operationCompleted && (
        <div className="mt-6">
          <FileUpload />
        </div>
      )}

      {/* Main Tool Content */}
      {!operationCompleted && pdfFiles.length > 0 && (
        <>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
              Drag and drop the documents in the list above to set their order, then click "Merge PDFs".
            </p>
            
            <button
                onClick={handleMerge}
                disabled={processing || pdfFiles.length < 2}
                className="btn-primary"
            >
                Merge PDFs
            </button>

            {/* Feature Highlight Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="feature-card">
                <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Combine Easily</h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Quickly merge multiple PDFs into a single, cohesive document.
                </p>
              </div>
              <div className="feature-card">
                <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Secure & Private</h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Your files are processed in your browser and are not uploaded to a PDFClear server.
                </p>
              </div>
              <div className="feature-card">
                <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Reorder Pages</h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Drag and drop to arrange your documents in any order you need.
                </p>
              </div>
            </div>
        </>
      )}

      {/* Frequently Asked Questions Section */}
      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Merging PDFs</h2>

          <details className="faq-details">
            <summary className="faq-summary">How do I merge PDF files?</summary>
            <p className="faq-answer">
              Upload two or more PDF documents using the drag-and-drop area or "Select Files" button. Once uploaded, you can reorder them by dragging the file items in the list. Finally, click the "Merge PDFs" button to combine them.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Is it safe to merge PDFs online with PDFClear?</summary>
            <p className="faq-answer">
              Absolutely. PDFClear prioritizes your privacy. PDF merging runs directly in your browser. Your files are not uploaded to a PDFClear server.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Can I reorder the files before merging?</summary>
            <p className="faq-answer">
              Yes! After uploading your PDF files, you will see a list of them. You can easily click, drag, and drop the individual file items to arrange them in the precise order you want before starting the merge process.
            </p>
          </details>
          
          <details className="faq-details">
            <summary className="faq-summary">How many PDF files can I combine?</summary>
            <p className="faq-answer">
              You can combine any number of PDF files. The only practical limitations might be your computer's memory and processing power for a very large number of extremely complex documents. For most users, combining many files will work flawlessly.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Will merging PDFs affect their quality?</summary>
            <p className="faq-answer">
              No, our PDF merging tool is designed to combine your documents without any loss of quality. The resulting PDF will maintain the original resolution, text clarity, and image quality of the source files.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default MergePage;
