import React, { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PhotoIcon, QueueListIcon, ArchiveBoxArrowDownIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

GlobalWorkerOptions.workerSrc = workerUrl;

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/pdf-to-jpg/';
const BRAND = 'PDFClear';

interface PageRangeGroup {
    id: number;
    range: string; // e.g., "1-5, 8, 10"
}

const PdfToJpgPage: React.FC = () => {
  const { 
    uploadedFiles, 
    processing, 
    setProcessing, 
    showMessage, 
    showPostOperationSuccess,
    operationCompleted,
    setProgress
  } = useFileContext();
  
  const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');
  const [dpi, setDpi] = useState<number>(150);
  const [rangeGroups, setRangeGroups] = useState<PageRangeGroup[]>([{ id: Date.now(), range: 'all' }]);
  const [numPages, setNumPages] = useState(0);

  // Effect to get the total number of pages
  useEffect(() => {
    const getPageCount = async () => {
        if (!pdfFile) {
            setNumPages(0);
            setRangeGroups([{ id: Date.now(), range: 'all' }]); // Reset groups
            return;
        }
        try {
            const buffer = await pdfFile.file.arrayBuffer();
            const pdf = await pdfService.getDocument({ data: buffer }).promise;
            setNumPages(pdf.numPages);
        } catch (error) {
            console.error("Error loading PDF for page count:", error);
            showMessage("Could not read PDF file to get page count. It might be corrupt or password-protected.", "error");
            setNumPages(0);
        }
    };
    getPageCount();
  }, [pdfFile, showMessage]);

  const handleAddRange = () => {
    setRangeGroups(prev => [...prev, { id: Date.now(), range: '' }]);
  };

  const handleRemoveRange = (id: number) => {
    setRangeGroups(prev => prev.filter(group => group.id !== id));
    if (rangeGroups.length === 1) {
        setRangeGroups([{ id: Date.now(), range: 'all' }]);
    }
  };

  const handleRangeChange = (id: number, newRange: string) => {
    setRangeGroups(prev => prev.map((group) => (group.id === id ? { ...group, range: newRange } : group)));
  };


  const handleConvert = async () => {
    if (!pdfFile) {
      showMessage('Please upload a PDF file to convert.', 'error');
      return;
    }
    
    const validRanges = rangeGroups.map(g => g.range).filter(r => r.trim() !== '');
    if (validRanges.length === 0) {
        showMessage('Please define at least one page range to convert.', 'error');
        return;
    }

    setProcessing(true, 'Converting selected pages to JPG...');
    try {
        let pagesToConvert: number[] = [];
        
        // 1. Parse all pages to convert from all ranges
        for (const rangeStr of validRanges) {
            const pages = pdfService.parsePageRanges(rangeStr, numPages);
            pagesToConvert.push(...pages);
        }
        pagesToConvert = Array.from(new Set(pagesToConvert)); // Deduplicate

        if (pagesToConvert.length === 0) {
            throw new Error("No valid pages specified for conversion.");
        }

        // 2. Call service
        const downloadResult = await pdfService.pdfToImages(pdfFile, 'jpeg', setProgress, dpi, pagesToConvert);
        
        const successMessage = pagesToConvert.length > 1 
            ? 'PDF converted to JPG successfully! Downloading ZIP...' 
            : 'PDF page converted to JPG successfully!';
        showMessage(successMessage, 'success');
        showPostOperationSuccess(downloadResult); 

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      showMessage(`Error: ${message}`, 'error');
    } finally {
        setProcessing(false);
    }
  };

  // --- JSON-LD Structured Data for PDF to JPG ---
  const jsonLdWebPage = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `PDF to JPG Converter - Convert PDF to High-Quality Images | ${BRAND}`,
    url: PAGE_URL,
    description: 'Convert selected pages of your PDF into high-quality JPG images by defining page ranges. PDFClear\'s free tool ensures privacy with client-side processing, no PDFClear server upload required.'
  }), []);

  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PDF to JPG Converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    url: PAGE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: BRAND },
    featureList: [ 'Convert PDF to JPG images by range', 'PDF to JPEG', 'Save PDF as image', 'Select specific pages to convert', 'High-quality output', 'Batch download as ZIP', 'Client-side PDF processing', 'Free to use', 'Secure and private' ]
  }), []);

  const jsonLdFAQ = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How do I convert a PDF to JPG?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your PDF file. Define the page numbers or ranges you wish to convert (e.g., "1-3, 5"). Adjust the DPI for image quality, then click the "Convert to JPG" button. The selected pages will be converted into separate JPG images and downloaded as a ZIP file if multiple pages are selected.' } },
      { '@type': 'Question', name: 'Is it safe to convert PDFs to JPGs online with PDFClear?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, it is designed to be safe. PDF-to-JPG conversion runs directly in your browser. Your files are processed in your browser and are not uploaded to a PDFClear server.' } },
      { '@type': 'Question', name: 'Will the JPG images be high quality?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, our converter generates high-quality JPG images from your PDF pages. You can also adjust the DPI (resolution) to control the output quality.' } },
      { '@type': 'Question', name: 'Can I adjust the DPI (resolution) for the output JPG images?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, you can adjust the DPI (dots per inch) before converting. A higher DPI will result in higher resolution images, which are suitable for printing or detailed viewing, but will also lead to larger file sizes.' } }
    ]
  }), []);
  
  const totalPagesLabel = numPages > 0 ? `(Total pages: ${numPages})` : '';


  return (
    <div>
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Convert selected pages of your PDF into high-quality JPG images by defining page ranges. Free, secure, and entirely browser-based. No PDFClear server upload, browser-based." />
        <link rel="canonical" href={PAGE_URL} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />

        {/* SEO: Standardized title */}
        <title>PDF to JPG Converter - Convert PDF to High-Quality Images | PDFClear</title>
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta property="og:title" content={`PDF to JPG Converter - Convert PDF to High-Quality Images | ${BRAND}`} />
        <meta property="og:description" content="Convert selected pages of your PDF into high-quality JPG images. Free, secure, and entirely browser-based. No PDFClear server upload, browser-based." />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`PDF to JPG Converter - Convert PDF to High-Quality Images | ${BRAND}`} />
        <meta name="twitter:description" content="Convert selected pages of your PDF into high-quality JPG images. Free, secure, and entirely browser-based. No PDFClear server upload, browser-based." />
        {/* Keywords */}
        <meta name="keywords" content="PDF to JPG, convert PDF to image, PDF to JPEG, save pdf as jpg, free PDF to JPG, online PDF to JPG, secure PDF converter, client-side PDF" />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>
      
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          Convert PDF to JPG Images
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Define page ranges to transform them into high-quality JPG images. Fast, free, and secure client-side conversion.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <div className="inline-flex items-center gap-2">
              <PhotoIcon className="h-5 w-5 text-brand-500" />
              <span>High Quality JPGs</span>
          </div>
          <div className="inline-flex items-center gap-2">
              <QueueListIcon className="h-5 w-5 text-brand-500" />
              <span>Select Page Ranges</span>
          </div>
          <div className="inline-flex items-center gap-2">
              <ArchiveBoxArrowDownIcon className="h-5 w-5 text-brand-500" />
              <span>Zipped Download</span>
          </div>
          <div className="inline-flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
              <span>Private Conversion</span>
          </div>
      </div>
      </header>
      
      {!operationCompleted && (
        <div className="mt-6">
          <FileUpload />
        </div>
      )}

      {!operationCompleted && pdfFile && !processing && (
        <div>
          <p className="text-text-light-secondary dark:text-text-dark-secondary my-4">
            Define the page ranges you want to convert to JPG. If you specify more than one page, the images will be bundled into a ZIP file for download.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* DPI Selector */}
            <div className="p-4 feature-card text-left">
                <h3 className="font-semibold text-lg mb-2">Image Quality</h3>
                <label htmlFor="dpi-selector" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                Resolution (DPI): <span className="font-semibold">{dpi} DPI</span>
                </label>
                <input
                type="range"
                id="dpi-selector"
                min="72"
                max="300"
                step="50"
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-brand-500"
                />
                <div className="flex justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                <span>72 DPI (Low)</span>
                <span>150 DPI (Medium)</span>
                <span>300 DPI (High)</span>
                </div>
            </div>
            
            {/* Range Selector */}
            <div className="p-4 feature-card text-left">
                <h3 className="font-semibold text-lg mb-2">Pages to Convert {totalPagesLabel}</h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
                    Enter page numbers or ranges (e.g., "1-5, 8, all").
                </p>
                <div className="space-y-3">
                    {rangeGroups.map((group, index) => (
                        <div key={group.id} className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="e.g., 1-3, 5, all"
                                value={group.range}
                                onChange={(e) => handleRangeChange(group.id, e.target.value)}
                                className={`input-style flex-grow`}
                                disabled={processing}
                                aria-label={`Page range for conversion group ${index + 1}`}
                            />
                            <button
                                onClick={() => handleRemoveRange(group.id)}
                                disabled={rangeGroups.length <= 1 || processing}
                                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                aria-label={`Remove range group ${index + 1}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddRange} className="btn-secondary mt-4 text-sm" disabled={processing || numPages === 0}>
                    + Add Page Range
                </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
                onClick={handleConvert}
                disabled={!pdfFile || rangeGroups.every(g => g.range.trim() === '') || processing || numPages === 0}
                className="btn-primary"
            >
                Convert to JPG
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Selective Conversion</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Choose exactly which pages to convert using precise range inputs.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Adjustable Resolution</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Control the output quality with an easy-to-use DPI slider.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Smart Downloading</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Get a single JPG for one page, or a convenient ZIP for multiple pages.
              </p>
            </div>
          </div>
        </div>
      )}

      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about PDF to JPG</h2>
          <details className="faq-details">
            <summary className="faq-summary">How do I convert a PDF to JPG?</summary>
            <p className="faq-answer">
              Upload your PDF file. Define the page numbers or ranges you wish to convert (e.g., "1-3, 5"). Adjust the DPI for image quality, then click the "Convert to JPG" button. The selected pages will be converted into separate JPG images. If you convert more than one page, they will be downloaded as a ZIP file.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">Is it safe to convert PDFs to JPGs online?</summary>
            <p className="faq-answer">
              Yes, it is designed to be safe. PDF-to-JPG conversion runs in your browser. Your files are processed in your browser and are not uploaded to a PDFClear server.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">Will the JPG images be high quality?</summary>
            <p className="faq-answer">
              Yes, our converter generates high-quality JPG images. You can control the quality and resolution by selecting your preferred DPI before converting.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">Can I adjust the DPI (resolution) for the output JPG images?</summary>
            <p className="faq-answer">
              Yes, you can select the desired DPI using the slider provided. Options typically range from 72 DPI (suitable for screen viewing and smaller file sizes) up to 300 DPI (ideal for printing and maximum detail).
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default PdfToJpgPage;
