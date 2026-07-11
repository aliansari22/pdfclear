import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload';
import Spinner from '../components/Spinner';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { CodeBracketIcon, DocumentDuplicateIcon, BoltIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

GlobalWorkerOptions.workerSrc = workerUrl;

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/html-to-pdf/';
const BRAND = 'PDFClear';

const PAGE_SIZES_MM: { [key: string]: { width: number; height: number } } = {
  a1: { width: 594, height: 841 },
  a2: { width: 420, height: 594 },
  a3: { width: 297, height: 420 },
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
};

const defaultOptions: pdfService.HtmlToPdfOptions = {
  margin: { top: 10, right: 10, bottom: 10, left: 10 },
  pageSize: 'a4',
  orientation: 'portrait',
};

const HtmlToPdfPage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
  const htmlFile = uploadedFiles.find(f => f.file.name.endsWith('.html') || f.file.name.endsWith('.htm'));

  const [options, setOptions] = useState<pdfService.HtmlToPdfOptions>(defaultOptions);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // This function generates the PDF blob based on current options.
  const generatePreviewBlob = useCallback(async (currentOptions: pdfService.HtmlToPdfOptions) => {
    if (!htmlFile) return;
    setIsPreviewLoading(true);
    try {
      const result = await pdfService.htmlToPdf(htmlFile, currentOptions);
      setPreviewPdfBlob(result.data as Blob);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate preview.';
      showMessage(message, 'error');
      setPreviewPdfBlob(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [htmlFile, showMessage]);

  // This effect runs ONLY when the previewPdfBlob state changes.
  // It's responsible for rendering the blob to the canvas.
  useEffect(() => {
    const render = async () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !previewPdfBlob) {
        // Clear canvas if no blob
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      try {
        const buffer = await previewPdfBlob.arrayBuffer();
        const pdf = await getDocument({ data: buffer }).promise;
        const page = await pdf.getPage(1); // Always render the first page for preview

        const parentWidth = container.offsetWidth;
        const viewport = page.getViewport({ scale: 1 });
        const scale = parentWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport }).promise;
      } catch (error: any) {
        // pdf.js throws this error if a new render starts before the old one finishes.
        // This is not a critical failure, so we can safely ignore it.
        if (error?.name === 'RenderingCancelledException') {
          return;
        }
        console.error("Error rendering PDF preview:", error);
        showMessage("Could not render PDF preview.", "error");
      }
    };
    render();
  }, [previewPdfBlob, showMessage]);

  useEffect(() => {
    if (htmlFile && !operationCompleted) {
      setOptions(defaultOptions);
    } else if (!htmlFile) {
      setPreviewPdfBlob(null);
    }
  }, [htmlFile, operationCompleted]);

  useEffect(() => {
    if (!htmlFile || operationCompleted) {
      return; // Don't run if there is no file to process
    }

    // Set up a timer to generate the preview after a short delay
    const handler = setTimeout(() => {
      generatePreviewBlob(options);
    }, 500); // 500ms debounce delay prevents excessive calls

    // Clean up the timer if options change again before the delay is over
    return () => {
      clearTimeout(handler);
    };
  }, [options, htmlFile, operationCompleted, generatePreviewBlob]);

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOptions(prev => ({ ...prev, [name]: value as any }));
  };

  const handleMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOptions(prev => ({
      ...prev,
      margin: { ...prev.margin, [name]: Math.max(0, Number(value)) }
    }));
  };
  
  const handleConvert = async () => {
    if (!previewPdfBlob || !htmlFile) {
      showMessage('Please upload a file first.', 'error');
      return;
    }
    setProcessing(true);
    showMessage('Preparing your PDF for download...', 'info');
    try {
      const outputFilename = createOutputFilename(htmlFile.file.name, 'converted', 'pdf');
      // The previewPdfBlob is now always in sync with the latest options, so we can use it directly.
      const data = await previewPdfBlob.arrayBuffer();
      
      showPostOperationSuccess({
        data: new Uint8Array(data),
        filename: outputFilename,
        mimeType: 'application/pdf'
      });
      showMessage('PDF created successfully!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      showMessage(`Error: ${message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const createOutputFilename = (originalName: string, operation: string, newExtension: string): string => {
    const nameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    return `${nameWithoutExtension}_${operation}.${newExtension}`;
  };

  const aspectRatio = useMemo(() => {
    const size = PAGE_SIZES_MM[options.pageSize];
    if (!size) return 1 / Math.sqrt(2); // Default to A4 aspect ratio if size is invalid
    return options.orientation === 'portrait' ? size.height / size.width : size.width / size.height;
  }, [options.pageSize, options.orientation]);

  // --- JSON-LD Structured Data ---
  const jsonLdWebPage = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `HTML to PDF Converter - Preserve Web Page Layouts | ${BRAND}`,
    url: PAGE_URL,
    description: 'Convert HTML files to PDF documents while preserving web page layouts and styles. PDFClear\'s free, client-side tool ensures privacy with no file uploads.'
  }), []);

  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HTML to PDF Converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    url: PAGE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: BRAND },
    featureList: [ 'Convert HTML to PDF', 'Save web page as PDF', 'Preserve HTML layout and styles', 'Client-side PDF processing', 'Free to use', 'No software installation required', 'Secure and private' ]
  }), []);

  const jsonLdFAQ = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How do I convert HTML to PDF?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your HTML file using the drag-and-drop area or "Select Files" button. Click the "Download PDF" button, and the tool will render your HTML content into a PDF document.' } },
      { '@type': 'Question', name: 'Will the PDF retain the original HTML formatting and styles?', acceptedAnswer: { '@type': 'Answer', text: 'Our converter strives to preserve the layout, styles (CSS), and images from your HTML file as accurately as possible in the resulting PDF. Complex or highly dynamic web pages may have minor rendering differences.' } },
      { '@type': 'Question', name: 'Is it safe to convert HTML to PDF online with PDFClear?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, it is designed to be safe. HTML-to-PDF conversion runs directly in your browser. Your files are processed in your browser and are not uploaded to a PDFClear server.' } },
      { '@type': 'Question', name: 'Can I convert an HTML file with external CSS/JS?', acceptedAnswer: { '@type': 'Answer', text: 'The tool will attempt to render HTML with embedded styles and images. For external resources (CSS, JavaScript, images), ensure they are accessible from the HTML file (e.g., relative paths if bundled, or public URLs). Highly interactive JavaScript might not be fully rendered.' } }
    ]
  }), []);

  return (
    <div>
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Convert HTML files to PDF documents. Preserve web page layouts and styles in a portable format, securely in your browser. No PDFClear server upload, browser-based." />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>HTML to PDF Converter - Preserve Web Page Layouts | PDFClear</title>

        {/* Open Graph */}
        <meta property="og:title" content={`HTML to PDF Converter - Preserve Web Page Layouts | ${BRAND}`} />
        <meta property="og:description" content="Convert HTML files to PDF documents. Preserve web page layouts and styles in a portable format, securely in your browser. No PDFClear server upload, browser-based." />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`HTML to PDF Converter - Preserve Web Page Layouts | ${BRAND}`} />
        <meta name="twitter:description" content="Convert HTML files to PDF documents. Preserve web page layouts and styles in a portable format, securely in your browser. No PDFClear server upload, browser-based." />
        {/* Keywords */}
        <meta name="keywords" content="html to pdf, convert html to pdf, web page to pdf, save html as pdf, html file to pdf, free html converter, online pdf tools" />
        
        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          Convert HTML to PDF - Save Web Pages as PDF
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Transform your HTML files into high-quality PDF documents while preserving layouts and styles. Conversion runs in your browser, so your HTML stays on your device.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <div className="inline-flex items-center gap-2">
              <CodeBracketIcon className="h-5 w-5 text-brand-500" />
              <span>Web Page to PDF</span>
          </div>
          <div className="inline-flex items-center gap-2">
              <DocumentDuplicateIcon className="h-5 w-5 text-brand-500" />
              <span>Preserve Layouts</span>
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

      {!operationCompleted && <FileUpload />}
      
      {!operationCompleted && htmlFile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="md:col-span-1 space-y-4 p-4 feature-card">
            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Page Size</label>
              <select name="pageSize" value={options.pageSize} onChange={handleOptionChange} disabled={processing || isPreviewLoading} className="input-style">
                {Object.keys(PAGE_SIZES_MM).map(size => <option key={size} value={size}>{size.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Orientation</label>
              <select name="orientation" value={options.orientation} onChange={handleOptionChange} disabled={processing || isPreviewLoading} className="input-style">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Margins (mm)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" name="top" value={options.margin.top} onChange={handleMarginChange} placeholder="Top" className="input-style" disabled={processing || isPreviewLoading} />
                <input type="number" name="right" value={options.margin.right} onChange={handleMarginChange} placeholder="Right" className="input-style" disabled={processing || isPreviewLoading} />
                <input type="number" name="bottom" value={options.margin.bottom} onChange={handleMarginChange} placeholder="Bottom" className="input-style" disabled={processing || isPreviewLoading} />
                <input type="number" name="left" value={options.margin.left} onChange={handleMarginChange} placeholder="Left" className="input-style" disabled={processing || isPreviewLoading} />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <button onClick={handleConvert} disabled={processing || isPreviewLoading || !previewPdfBlob} className="btn-primary w-full">
                { processing ? 'Processing...' : 'Download PDF' }
              </button>
            </div>
          </div>
          {/* Preview Column */}
          <div className="md:col-span-2 space-y-4">
            <div 
              ref={containerRef} 
              className="relative w-full shadow-lg rounded-md overflow-hidden bg-light-body dark:bg-dark-body"
              style={{ aspectRatio: `${1 / aspectRatio}` }}
            >
              {isPreviewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-light-card/70 dark:bg-dark-card/70 z-20"><Spinner /> <span className="ml-2">Updating Preview...</span></div>
              )}
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
              {!previewPdfBlob && !isPreviewLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-text-light-secondary dark:text-text-dark-secondary">
                  <p>Preview will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about HTML to PDF</h2>
          <details className="faq-details">
            <summary className="faq-summary">How do I convert HTML to PDF?</summary>
            <p className="faq-answer">
              Upload your HTML file. A default preview will be generated. You can then adjust the page size, orientation, and margins and the preview will update automatically. When you're satisfied, click "Download PDF".
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">Will the PDF retain the original HTML formatting and styles?</summary>
            <p className="faq-answer">
              Our converter strives to preserve the layout, styles (CSS), and images from your HTML file as accurately as possible. The live preview gives a good indication of the final output.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">Is my data safe when converting HTML to PDF?</summary>
            <p className="faq-answer">
              Absolutely. PDFClear processes files in your browser. Your HTML files are processed in your browser and are not uploaded to a PDFClear server.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default HtmlToPdfPage;
