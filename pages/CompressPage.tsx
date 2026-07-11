import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload';
import { ArrowsPointingInIcon, CheckBadgeIcon, BoltIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/compress-pdf/';
const BRAND = 'PDFClear';

const CompressPage: React.FC = () => {
  const [compressionLevel, setCompressionLevel] = useState(8); // Default to "Good" (level 6-10)
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

  const handleCompress = async () => {
    if (!pdfFile) {
        showMessage('Please upload a PDF file to compress.', 'error');
        return;
    }
    setProcessing(true, 'Compressing PDF...');
    try {
      // Pass setProgress to the service function
      const downloadResult = await pdfService.compressPdf(pdfFile, compressionLevel, setProgress);
      showMessage('PDF compressed successfully!', 'success');
      showPostOperationSuccess(downloadResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      showMessage(`Error: ${message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };
  
  const getCompressionLabel = (level: number) => {
    if (level <= 5) return 'Basic (Web Optimization)';
    return 'Good (Recommended)';
  };

  const getCompressionDescription = (level: number) => {
    if (level <= 5) return 'Optimizes the PDF for fast web viewing (linearization). Minimal size reduction but improves loading in browsers.';
    return 'Applies standard lossless compression to streams and objects. This is the recommended setting for a good balance of size reduction and compatibility.';
  };


  // --- JSON-LD Structured Data ---
  const jsonLdWebPage = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Compress PDF - Reduce PDF File Size Online | ${BRAND}`,
    url: PAGE_URL,
    description: 'Reduce the file size of your PDFs for free without losing quality. Our client-side tool makes PDF compression quick and secure, ensuring your privacy.'
  }), []);

  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PDF Compressor',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    url: PAGE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: BRAND },
    featureList: [ 'Reduce PDF file size', 'Make PDF smaller', 'Optimize PDF for web', 'Client-side PDF processing', 'Free to use', 'Maintain PDF quality', 'Secure and private' ]
  }), []);

  const jsonLdFAQ = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How does PDF compression work?', acceptedAnswer: { '@type': 'Answer', text: 'Our tool analyzes the PDF document to optimize its internal structure, remove redundant data, and sometimes apply lossless image compression (if applicable). This reduces the file size without compromising visual quality.' } },
      { '@type': 'Question', name: 'Will compressing my PDF affect its quality?', acceptedAnswer: { '@type': 'Answer', text: 'Our PDF compressor focuses on optimizing the file\'s internal structure to achieve the smallest possible size without loss of quality. Text and images should remain clear and readable.' } },
      { '@type': 'Question', name: 'Is it safe to compress PDFs online with PDFClear?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, it is designed to be safe. All PDF compression operations are performed directly in your web browser. Your files are processed in your browser and are not uploaded to a PDFClear server.' } },
      { '@type': 'Question', name: 'Can I choose the compression level?', acceptedAnswer: { '@type': 'Answer', text: 'You can choose between Basic (Web Optimization) and Good (Recommended Lossless Compression). The Good level provides the best balance of size reduction and compatibility.' } },
      { '@type': 'Question', name: 'What kind of PDF files can be compressed?', acceptedAnswer: { '@type': 'Answer', text: 'Our tool can compress most standard PDF documents. Files already highly optimized or containing only vector graphics may see less reduction in size.' } }
    ]
  }), []);

  return (
    <div>
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Reduce the file size of your PDFs for free without losing quality. Our client-side tool makes PDF compression quick and secure, ensuring your privacy. No PDFClear server upload." />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>Compress PDF - Reduce PDF File Size Online | PDFClear</title>
        
        {/* Open Graph */}
        <meta property="og:title" content={`Compress PDF - Reduce PDF File Size Online | ${BRAND}`} />
        <meta property="og:description" content="Reduce the file size of your PDFs for free without losing quality. Our client-side tool makes PDF compression quick and secure, ensuring your privacy. No PDFClear server upload." />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Compress PDF - Reduce PDF File Size Online | ${BRAND}`} />
        <meta name="twitter:description" content="Reduce PDF file size quickly and securely in your browser. Free client-side compression without quality loss." />
        {/* Keywords */}
        <meta name="keywords" content="compress PDF, reduce PDF size, make pdf smaller, optimize PDF, free PDF compressor, online PDF compression, client-side PDF tools, secure PDF" />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      {/* Enhanced Header / Value props */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          Compress PDF Files - Make PDFs Smaller
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Reduce the file size of your PDF documents quickly and securely. Compression runs in your browser, so your PDF stays on your device.
        </p>
        
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <div className="inline-flex items-center gap-2">
                <ArrowsPointingInIcon className="h-5 w-5 text-brand-500" />
                <span>Reduce File Size</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <CheckBadgeIcon className="h-5 w-5 text-brand-500" />
                <span>Maintain Quality</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <BoltIcon className="h-5 w-5 text-brand-500" />
                <span>Fast Processing</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                <span>Runs in your browser</span>
            </div>
        </div>
      </header>

      {/* File Upload Component */}
      {!operationCompleted && (
        <div className="mt-6">
          <FileUpload /> {/* Keep FileUpload here as it manages file state */}
        </div>
      )}
      
      {/* Tool-specific controls and preview */}
      {!operationCompleted && pdfFile && (
        <>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            Reduce the file size of your PDF by recompressing streams and optimizing its structure. This can significantly reduce file size with no loss of quality.
          </p>
          <div className="mb-6 max-w-lg mx-auto">
            <label htmlFor="compression-level" className="block text-text-light-primary dark:text-text-dark-primary text-sm font-bold mb-2">
              Compression Level: <span className="font-semibold">{getCompressionLabel(compressionLevel)}</span>
            </label>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Basic</span>
              <input
                id="compression-level"
                type="range"
                min="1"
                max="10"
                value={compressionLevel}
                onChange={(e) => setCompressionLevel(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-brand-500"
                disabled={processing}
              />
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Good</span>
            </div>
             <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
                {getCompressionDescription(compressionLevel)}
             </p>
          </div>
          

           <button
            onClick={handleCompress}
            disabled={processing || !pdfFile}
            className="btn-primary w-full sm:w-auto mx-auto"
          >
            Compress PDF
          </button>

          {/* Feature Highlight Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Maximize Space</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Reduce file sizes for easier sharing and storage.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Quality Maintained</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Achieve smaller files without visible degradation of content.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Private & Secure</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Compression runs on your device. Normal application and runtime assets may still be requested by the browser.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Frequently Asked Questions Section */}
      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Compressing PDFs</h2>

          <details className="faq-details">
            <summary className="faq-summary">How does PDF compression work?</summary>
            <p className="faq-answer">
              Our tool optimizes the internal structure of your PDF document. This includes streamlining objects, removing redundant data, and sometimes apply lossless compression to images, resulting in a smaller file size without affecting visual quality.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Will compressing my PDF affect its quality?</summary>
            <p className="faq-answer">
              Our PDF compressor focuses on optimizing the file\'s internal structure to achieve the smallest possible size without loss of quality. Text and images should remain clear and readable.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Is it safe to compress PDFs online with PDFClear?</summary>
            <p className="faq-answer">
              Absolutely. With PDFClear, your privacy is paramount. PDF compression runs in your browser. Your sensitive files are processed in your browser and are not uploaded to a PDFClear server.
            </p>
          </details>
          
          <details className="faq-details">
            <summary className="faq-summary">Can I choose the compression level?</summary>
            <p className="faq-answer">
              You can choose between Basic (Web Optimization) and Good (Recommended Lossless Compression). The Good level provides the best balance of size reduction and compatibility.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">What kind of PDF files can be compressed effectively?</summary>
            <p className="faq-answer">
              PDFs containing unoptimized images, embedded fonts, or a complex internal structure will generally see the most significant size reductions. Documents already highly optimized or consisting mostly of simple text and vector graphics might have less room for further compression.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default CompressPage;
