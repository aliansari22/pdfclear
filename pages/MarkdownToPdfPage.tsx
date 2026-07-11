import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload'; // Ensure FileUpload is imported
import { CodeBracketSquareIcon, DocumentCheckIcon, BoltIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/markdown-to-pdf/';
const BRAND = 'PDFClear';

const MarkdownToPdfPage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
  const mdFile = uploadedFiles.find(f => f.file.name.endsWith('.md'));
  const [markdownText, setMarkdownText] = useState('');

  // When a file is uploaded, read its content into the textarea
  useEffect(() => {
    if (mdFile && !operationCompleted) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMarkdownText(e.target?.result as string);
      };
      reader.onerror = () => {
        showMessage('Error reading file.', 'error');
      }
      reader.readAsText(mdFile.file);
    } else if (!mdFile && !operationCompleted) {
        setMarkdownText('');
    }
  }, [mdFile, showMessage, operationCompleted]);

  const handleConvert = async () => {
    const content = markdownText.trim();
    if (!content) {
      showMessage('Please upload a Markdown file or paste content into the text area.', 'error');
      return;
    }

    setProcessing(true);
    showMessage('Converting Markdown to PDF...', 'info');
    try {
      const filename = mdFile ? `${mdFile.file.name.replace(/\.md$/, '')}.pdf` : 'markdown_output.pdf';
      const downloadResult = await pdfService.markdownToPdf(content, filename);
      showMessage('Markdown converted to PDF successfully!', 'success');
      showPostOperationSuccess(downloadResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      showMessage(`Error: ${message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };
  
  const handlePaste = async () => {
    if (processing) return;
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            setMarkdownText(text);
            showMessage('Pasted content from clipboard.', 'info');
        } else {
            showMessage('Clipboard is empty or does not contain text.', 'error');
        }
    } catch (err) {
        showMessage('Could not read from clipboard. Please paste manually.', 'error');
    }
  };

  // --- JSON-LD Structured Data ---
  const jsonLdWebPage = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Markdown to PDF Converter - Convert .md Files | ${BRAND}`,
    url: PAGE_URL,
    description: 'Convert Markdown text or .md files into styled PDF documents. A fast, free, and private tool for writers and developers, processed securely in your browser.'
  }), []);

  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Markdown to PDF Converter',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    url: PAGE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: BRAND },
    featureList: [ 'Convert .md to PDF', 'Paste Markdown text', 'MD file to PDF', 'Preserves formatting', 'Client-side PDF processing', 'Free to use', 'Secure and private' ]
  }), []);

  const jsonLdFAQ = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How do I convert Markdown to PDF?', acceptedAnswer: { '@type': 'Answer', text: 'Upload a Markdown (.md) file or paste your Markdown text directly into the input area. Then, click the "Convert to PDF" button. Your styled PDF will be generated and ready for download.' } },
      { '@type': 'Question', name: 'Is my Markdown content kept private?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, absolutely. Markdown-to-PDF conversion happens directly in your browser. Your Markdown text and generated PDF are processed in your browser and are not uploaded to a PDFClear server.' } },
      { '@type': 'Question', name: 'What kind of Markdown formatting is supported?', acceptedAnswer: { '@type': 'Answer', text: 'Our converter supports standard Markdown syntax, including headings, lists, bold/italic text, links, code blocks, and more. The output PDF will reflect a clean, readable style.' } },
      { '@type': 'Question', name: 'Can I convert multiple Markdown files at once?', acceptedAnswer: { '@type': 'Answer', text: 'Currently, this tool processes one Markdown file or one pasted text input at a time to ensure optimal formatting. For batch conversion, you would need to process each file individually.' } }
    ]
  }), []);

  return (
    <div>
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Convert Markdown text or .md files into styled PDF documents. A fast, free, and private tool for writers and developers, processed securely in your browser." />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>Markdown to PDF Converter - Convert .md Files | PDFClear</title>
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta property="og:title" content={`Markdown to PDF Converter - Convert .md Files | ${BRAND}`} />
        <meta property="og:description" content="Convert Markdown text or .md files into styled PDF documents. A fast, free, and private tool for writers and developers, processed securely in your browser." />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Markdown to PDF Converter - Convert .md Files | ${BRAND}`} />
        <meta name="twitter:description" content="Convert Markdown text or .md files into styled PDF documents. A fast, free, and private tool for writers and developers, processed securely in your browser." />
        {/* Keywords */}
        <meta name="keywords" content="Markdown to PDF, MD to PDF, convert Markdown, md file to pdf, markdown converter, free MD to PDF, online Markdown to PDF, client-side Markdown, secure Markdown" />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      {/* Enhanced Header / Value props */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          Markdown to PDF Converter
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Turn your Markdown text or `.md` files into professional PDF documents. Conversion runs directly in your browser, so your Markdown stays on your device.
        </p>
        
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <div className="inline-flex items-center gap-2">
                <CodeBracketSquareIcon className="h-5 w-5 text-brand-500" />
                <span>Convert .md Files</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <DocumentCheckIcon className="h-5 w-5 text-brand-500" />
                <span>Styled Output</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <BoltIcon className="h-5 w-5 text-brand-500" />
                <span>Instant Conversion</span>
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
          <FileUpload />
        </div>
      )}
      
      {!operationCompleted && (
        <>
            <div className="flex items-center my-6">
                <div className="flex-grow border-t border-border-light dark:border-border-dark"></div>
                <span className="flex-shrink mx-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">Paste Markdown Content</span>
                <div className="flex-grow border-t border-border-light dark:border-border-dark"></div>
            </div>
            
            <div className="relative">
                <textarea
                    value={markdownText}
                    onChange={(e) => setMarkdownText(e.target.value)}
                    placeholder="Paste your Markdown here... The content of an uploaded .md file will also appear here."
                    className="w-full h-64 p-3 border rounded-md focus:ring-brand-500 focus:border-brand-500 bg-light-card dark:bg-dark-card dark:text-text-dark-primary font-mono text-sm"
                    disabled={processing}
                    aria-label="Markdown input"
                />
                <button 
                    onClick={handlePaste}
                    disabled={processing}
                    className="absolute top-3 right-3 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-dark-card dark:hover:bg-gray-700 dark:text-text-dark-primary text-xs font-bold py-1 px-2 rounded"
                    title="Paste from clipboard"
                >
                    Paste
                </button>
            </div>

            <div className="mt-6">
                <button
                    onClick={handleConvert}
                    disabled={processing || markdownText.trim().length === 0}
                    className="btn-primary"
                >
                    Convert to PDF
                </button>
            </div>

            {/* Feature Highlight Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="feature-card">
                <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Clean Conversion</h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Transforms your Markdown into a well-formatted PDF document.
                </p>
              </div>
              <div className="feature-card">
                <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Instant Preview</h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  See your Markdown rendered to HTML before converting to PDF (feature coming soon).
                </p>
              </div>
              <div className="feature-card">
                <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Privacy First</h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Your content is processed in your browser and is not uploaded to a PDFClear server.
                </p>
              </div>
            </div>
        </>
      )}

      {/* Frequently Asked Questions Section */}
      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Markdown to PDF</h2>

          <details className="faq-details">
            <summary className="faq-summary">How do I convert Markdown to PDF?</summary>
            <p className="faq-answer">
              You can either upload a Markdown (.md) file using the "Select Files" button, or paste your Markdown text directly into the provided text area. Once your content is ready, click the "Convert to PDF" button to generate and download your PDF document.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Is my Markdown content kept private?</summary>
            <p className="faq-answer">
              Yes, absolutely. Markdown-to-PDF conversion happens directly in your browser. Your Markdown text and generated PDF are processed in your browser and are not uploaded to a PDFClear server.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">What kind of Markdown formatting is supported?</summary>
            <p className="faq-answer">
              Our converter supports standard Markdown syntax, including headings (#, ##, etc.), lists (*, -, 1.), bold (**), italic (*), links ([]()), code blocks (```), and more. The output PDF aims to reflect a clean, professional, and readable style based on common Markdown rendering conventions.
            </p>
          </details>
          
          <details className="faq-details">
            <summary className="faq-summary">Can I convert multiple Markdown files at once?</summary>
            <p className="faq-answer">
              Currently, this specific tool is optimized to process one Markdown file or one block of pasted Markdown text at a time. This ensures the best possible formatting and control over the output. If you have multiple Markdown files, you would need to convert them individually.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default MarkdownToPdfPage;
