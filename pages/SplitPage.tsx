import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload';
import { QueueListIcon, DocumentDuplicateIcon, ArchiveBoxArrowDownIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/split-pdf/';
const BRAND = 'PDFClear';

interface SplitGroup {
    id: number;
    range: string;
}

const SplitPage: React.FC = () => {
    const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
    const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');

    const [groups, setGroups] = useState<SplitGroup[]>([{ id: Date.now(), range: '' }]);
    const [activeGroupIndex, setActiveGroupIndex] = useState(0);
    const [numPages, setNumPages] = useState(0);
    
    useEffect(() => {
        const getPageCount = async () => {
            if (!pdfFile) {
                setNumPages(0);
                setGroups([{ id: Date.now(), range: '' }]); // Reset groups when no PDF
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
        setGroups(prev => [...prev, { id: Date.now(), range: '' }]);
        setActiveGroupIndex(groups.length);
    };

    const handleRemoveRange = (id: number) => {
        setGroups(prev => prev.filter(group => group.id !== id));
        // Adjust activeGroupIndex if the removed item was before it
        // Or if it was the last item, reset to last available or 0 if none.
        if (activeGroupIndex >= groups.findIndex(g => g.id === id) && groups.length > 1) {
             setActiveGroupIndex(Math.max(0, groups.length - 2));
        } else if (groups.length === 1) {
            setActiveGroupIndex(0); // If only one left, keep focus on it
        }
    };

    const handleRangeChange = (id: number, newRange: string) => {
        setGroups(prev => prev.map((group) => (group.id === id ? { ...group, range: newRange } : group)));
    };

    const handleSplit = async () => {
        if (!pdfFile) {
            showMessage('Please upload a PDF file to split.', 'error');
            return;
        }
        const validGroups = groups.map(g => g.range).filter(r => r.trim() !== '');
        if (validGroups.length === 0) {
            showMessage('Please define at least one page range to extract.', 'error');
            return;
        }
        setProcessing(true);
        showMessage('Splitting PDF into multiple files...', 'info');
        try {
          const downloadResult = await pdfService.batchSplitPdf(pdfFile, validGroups);
          showMessage('PDF split successfully! A ZIP file is downloading.', 'success');
          showPostOperationSuccess(downloadResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'An unknown error occurred.';
          showMessage(`Error: ${message}`, 'error');
        } finally {
          setProcessing(false);
        }
    };

    const jsonLdWebPage = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `Split PDF - Separate & Extract PDF Pages | ${BRAND}`,
        url: PAGE_URL,
        description: 'Split, separate, or unmerge a PDF by defining page ranges. Extract pages into separate PDF files, downloaded as a ZIP. Free, private, and in your browser.'
    }), []);

    const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'PDF Splitter',
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Web',
        url: PAGE_URL,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isAccessibleForFree: true,
        publisher: { '@type': 'Organization', name: BRAND },
        featureList: [ 'Split PDF by page range', 'Extract PDF pages', 'PDF separator', 'Extract multiple page ranges', 'Output as ZIP of PDFs', 'Client-side PDF processing', 'Free to use', 'Secure and private' ]
    }), []);

    const jsonLdFAQ = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'How do I split a PDF into multiple files?', acceptedAnswer: { '@type': 'Answer', text: `Upload your PDF. In the "Ranges to Extract" section, define groups of pages you want in each new file by typing ranges (e.g., "1-3, 5"). Add more ranges for more files using the "+ Add Range" button. Click "Split and Download ZIP" to get a ZIP file containing each range as a separate PDF.` } },
            { '@type': 'Question', name: 'Is it safe to split sensitive documents here?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, absolutely. PDF splitting and ZIP creation happen directly in your browser. Your files are processed in your browser and are not uploaded to a PDFClear server.' } },
            { '@type': 'Question', name: 'Can I define multiple output PDFs from one source file?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, that\'s the main feature of this tool! You can add multiple "Ranges to Extract" groups, and each group will generate a separate PDF document. All these new PDFs will be combined into a single downloadable ZIP archive.' } },
            { '@type': 'Question', name: 'What format should I use for page ranges?', acceptedAnswer: { '@type': 'Answer', text: 'You can use individual page numbers (e.g., "1, 5, 10"), page ranges (e.g., "2-7"), or a combination (e.g., "1, 3-5, 9"). You can also type "all" to include all pages in a specific output file.' } },
            { '@type': 'Question', name: 'Will the original PDF be altered?', acceptedAnswer: { '@type': 'Answer', text: 'No, your original PDF file on your computer remains completely untouched. Our tool generates new PDF files based on your specified ranges, leaving your source document in its pristine state.' } }
        ]
    }), []);

    return (
        <div>
            <Helmet>
                {/* Core SEO */}
                <meta name="description" content="Split, separate, or unmerge a PDF by page ranges. Extract PDF pages into multiple files, download them as a ZIP, and keep processing private in your browser." />
                <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
                <link rel="canonical" href={PAGE_URL} />

                {/* SEO: Standardized title */}
                <title>Split PDF - Separate & Extract PDF Pages | PDFClear</title>
                
                {/* Open Graph */}
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={BRAND} />
                <meta property="og:title" content={`Split PDF - Separate & Extract PDF Pages | ${BRAND}`} />
                <meta property="og:description" content="Split, separate, or unmerge a PDF by page ranges. Extract PDF pages into multiple files and download them as a ZIP." />
                <meta property="og:url" content={PAGE_URL} />
                {/* Twitter */}
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={`Split PDF - Separate & Extract PDF Pages | ${BRAND}`} />
                <meta name="twitter:description" content="Split, separate, or unmerge a PDF by page ranges. Extract PDF pages into multiple files and download them as a ZIP." />
                {/* Keywords */}
                <meta name="keywords" content="split PDF, separate PDF pages, extract PDF pages, unmerge PDF, PDF splitter, split PDF by range, PDF page extractor, cut PDF pages, multiple PDFs from one, free PDF splitter, private PDF tools, browser-based PDF" />

                {/* JSON-LD */}
                <script type="application/ld+json">{jsonLdWebPage}</script>
                <script type="application/ld+json">{jsonLdSoftwareApp}</script>
                <script type="application/ld+json">{jsonLdFAQ}</script>
            </Helmet>
            
            <header className="mb-6">
              <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
                Split PDF - Separate & Extract Pages
              </h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary">
                Separate, unmerge, or extract PDF pages by defining page ranges. Each range becomes a new PDF, bundled into a ZIP for download.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                <div className="inline-flex items-center gap-2">
                    <DocumentDuplicateIcon className="h-5 w-5 text-brand-500" />
                    <span>Extract Page Ranges</span>
                </div>
                <div className="inline-flex items-center gap-2">
                    <QueueListIcon className="h-5 w-5 text-brand-500" />
                    <span>Create Multiple PDFs</span>
                </div>
                <div className="inline-flex items-center gap-2">
                    <ArchiveBoxArrowDownIcon className="h-5 w-5 text-brand-500" />
                    <span>Download as ZIP</span>
                </div>
                <div className="inline-flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                    <span>Browser-based</span>
                </div>
            </div>
            </header>

            {!operationCompleted && <FileUpload />}
            
            {!operationCompleted && pdfFile && (
                <>
                    <div className="my-6 p-4 feature-card text-left">
                        <h3 className="font-semibold text-lg mb-2">Ranges to Extract</h3>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">Define one or more page ranges. Each range will become a separate PDF file in the final ZIP archive. (Total pages: {numPages > 0 ? numPages : '...'})</p>
                        <div className="space-y-3">
                            {groups.map((group, index) => (
                                <div key={group.id} className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        placeholder="e.g., 1-3, 5, 8-10"
                                        value={group.range}
                                        onFocus={() => setActiveGroupIndex(index)}
                                        onChange={(e) => handleRangeChange(group.id, e.target.value)}
                                        className={`input-style flex-grow ${activeGroupIndex === index ? 'ring-2 ring-brand-500' : ''}`}
                                        disabled={processing}
                                        aria-label={`Page range for split group ${index + 1}`}
                                    />
                                    <button
                                        onClick={() => handleRemoveRange(group.id)}
                                        disabled={groups.length <= 1 || processing}
                                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Remove split group ${index + 1}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddRange} className="btn-secondary mt-4 text-sm" disabled={processing}>
                            + Add Range
                        </button>
                    </div>
                    
                    <div className="mt-6 text-center">
                        <button
                            onClick={handleSplit}
                            disabled={processing || !pdfFile || groups.every(g => g.range.trim() === '')}
                            className="btn-primary"
                        >
                            Split and Download ZIP
                        </button>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Custom Page Grouping</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Define multiple page ranges to create separate PDF files.
                            </p>
                        </div>
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Convenient ZIP Output</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                All newly created PDFs are bundled into a single ZIP for easy download.
                            </p>
                        </div>
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Privacy Assured</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Your document is processed in your browser and is not uploaded to a PDFClear server.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {!operationCompleted && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently Asked Questions about Splitting PDFs</h2>
                <details className="faq-details">
                    <summary className="faq-summary">How do I split a PDF into multiple files?</summary>
                    <p className="faq-answer">
                        Upload your PDF. In the "Ranges to Extract" section, define the groups of pages you want in each new file by typing the page numbers (e.g., "1-3, 5"). Use the "+ Add Range" button to create more groups for additional files. When ready, click "Split and Download ZIP" to get a ZIP file containing each range as a separate PDF.
                    </p>
                </details>
                <details className="faq-details">
                    <summary className="faq-summary">Is it safe to split sensitive documents here?</summary>
                    <p className="faq-answer">
                        Yes, absolutely. PDF splitting and ZIP creation happen directly in your browser. Your original files are processed in your browser and are not uploaded to a PDFClear server.
                    </p>
                </details>
                <details className="faq-details">
                    <summary className="faq-summary">Can I define multiple output PDFs from one source file?</summary>
                    <p className="faq-answer">
                        Yes, that\'s the main feature of this tool! You can add multiple "Ranges to Extract" groups, and each group will generate a separate PDF document. All these new PDFs will be combined into a single downloadable ZIP archive.
                    </p>
                </details>
                 <details className="faq-details">
                    <summary className="faq-summary">What format should I use for page ranges?</summary>
                    <p className="faq-answer">
                        You can use individual page numbers (e.g., "1, 5, 10"), page ranges (e.g., "2-7"), or a combination (e.g., "1, 3-5, 9"). You can also type "all" to include all pages in a specific output file.
                    </p>
                </details>
                <details className="faq-details">
                    <summary className="faq-summary">Will the original PDF be altered?</summary>
                    <p className="faq-answer">
                        No, your original PDF file on your computer remains completely untouched. Our tool generates new PDF files based on your specified ranges, leaving your source document in its pristine state.
                    </p>
                </details>
            </section>
            )}
        </div>
    );
};

export default SplitPage;
