import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Spinner from '../components/Spinner';
import { HashtagIcon, Cog6ToothIcon, QueueListIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

GlobalWorkerOptions.workerSrc = workerUrl;

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/add-page-numbers/';
const BRAND = 'PDFClear';

const AddPageNumbersPage: React.FC = () => {
    const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
    const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');
    
    const [options, setOptions] = useState<pdfService.PageNumberOptions>({
        format: '1 / n',
        position: 'bottom_center',
        margin: 36,
        fontSize: 12,
        pages: 'all',
        color: '#000000', // New color option
    });
    
    const [numPages, setNumPages] = useState<number>(0);
    const [previewPage, setPreviewPage] = useState<number>(1);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // New canvas for preview
    const containerRef = useRef<HTMLDivElement>(null);

    // Load PDF metadata (# of pages)
    useEffect(() => {
      const loadPdf = async () => {
        if (!pdfFile) {
          setNumPages(0);
          setPreviewPage(1);
          return;
        }
        const buffer = await pdfFile.file.arrayBuffer();
        const pdf = await getDocument({ data: buffer }).promise;
        setNumPages(pdf.numPages);
        if (previewPage === 0 || previewPage > pdf.numPages) {
          setPreviewPage(1);
        }
      };
      loadPdf();
    }, [pdfFile]);

    // Render PDF and draw live preview overlay
    useEffect(() => {
        const render = async () => {
            if (!pdfFile || previewPage <= 0 || !numPages) return;
      
            const canvas = canvasRef.current;
            const overlayCanvas = overlayCanvasRef.current;
            const container = containerRef.current;
            if (!canvas || !overlayCanvas || !container) return;
      
            const ctx = canvas.getContext("2d");
            const overlayCtx = overlayCanvas.getContext("2d");
            if (!ctx || !overlayCtx) return;
      
            // Render PDF page
            const buffer = await pdfFile.file.arrayBuffer();
            const pdf = await getDocument({ data: buffer }).promise;
            const page = await pdf.getPage(previewPage);
      
            const parentWidth = container.offsetWidth;
            const viewport = page.getViewport({ scale: 1 });
            const scale = parentWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });
      
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            overlayCanvas.width = scaledViewport.width;
            overlayCanvas.height = scaledViewport.height;
      
            await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport }).promise;

            // Draw Live Preview Overlay
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            overlayCtx.font = `${options.fontSize * scale}px Helvetica`;
            overlayCtx.fillStyle = options.color || '#000000';

            const text = options.format
                .replace('1', String(previewPage))
                .replace('n', String(numPages));
            
            const scaledMargin = (options.margin / 72) * (96 * scale); // Convert pt to px roughly

            let x: number, y: number;

            switch(options.position) {
                case 'top_left':
                    overlayCtx.textAlign = 'left';
                    overlayCtx.textBaseline = 'top';
                    x = scaledMargin;
                    y = scaledMargin;
                    break;
                case 'top_center':
                    overlayCtx.textAlign = 'center';
                    overlayCtx.textBaseline = 'top';
                    x = overlayCanvas.width / 2;
                    y = scaledMargin;
                    break;
                case 'top_right':
                    overlayCtx.textAlign = 'right';
                    overlayCtx.textBaseline = 'top';
                    x = overlayCanvas.width - scaledMargin;
                    y = scaledMargin;
                    break;
                case 'bottom_left':
                    overlayCtx.textAlign = 'left';
                    overlayCtx.textBaseline = 'bottom';
                    x = scaledMargin;
                    y = overlayCanvas.height - scaledMargin;
                    break;
                case 'bottom_right':
                    overlayCtx.textAlign = 'right';
                    overlayCtx.textBaseline = 'bottom';
                    x = overlayCanvas.width - scaledMargin;
                    y = overlayCanvas.height - scaledMargin;
                    break;
                default: // bottom_center
                    overlayCtx.textAlign = 'center';
                    overlayCtx.textBaseline = 'bottom';
                    x = overlayCanvas.width / 2;
                    y = overlayCanvas.height - scaledMargin;
                    break;
            }

            overlayCtx.fillText(text, x, y);
        };
    
        render();
    }, [pdfFile, previewPage, options, numPages]);

    const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setOptions(prev => ({ ...prev, [name]: name === 'fontSize' || name === 'margin' ? Number(value) : value }));
    };

    const handleApply = async () => {
        if (!pdfFile) return;
        setProcessing(true);
        showMessage('Adding page numbers...');
        try {
            const downloadResult = await pdfService.addPageNumbers(pdfFile, options);
            showPostOperationSuccess(downloadResult);
            showMessage('Page numbers added successfully!', 'success');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'An unknown error occurred.';
            showMessage(`Error: ${message}`, 'error');
        } finally {
            setProcessing(false);
        }
    };
    
    // --- JSON-LD Structured Data ---
    const jsonLdWebPage = useMemo(() => JSON.stringify({'@context': 'https://schema.org', '@type': 'WebPage', name: `Add Page Numbers to PDF - Insert Pagination | ${BRAND}`, url: PAGE_URL, description: 'Easily add page numbers to your PDF documents. Customize position, format, font size, and apply to specific pages, all client-side and private.'}), []);
    const jsonLdSoftwareApp = useMemo(() => JSON.stringify({'@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'PDF Page Numberer', applicationCategory: 'UtilityApplication', operatingSystem: 'Web', url: PAGE_URL, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, isAccessibleForFree: true, publisher: { '@type': 'Organization', name: BRAND }, featureList: ['Add page numbers to PDF', 'Paginate PDF', 'Number PDF pages', 'Customize page number format (e.g., "1 of n")', 'Choose position (top/bottom, left/center/right)', 'Adjust font size and margin', 'Apply to specific page ranges or all pages', 'Client-side PDF processing', 'Free to use', 'Secure and private' ]}), []);
    const jsonLdFAQ = useMemo(() => JSON.stringify({'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [ { '@type': 'Question', name: 'How do I add page numbers to my PDF?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your PDF, choose your desired format (e.g., "1 of n"), position (e.g., bottom center), font size, color, and margin. You can specify which pages to number in the "Pages to number" field. Then click "Add Page Numbers" to process.' } }, { '@type': 'Question', name: 'Is it safe to add page numbers online?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, with PDFClear, it is designed to be safe. Page-numbering runs directly in your browser. Your PDF files are processed in your browser and are not uploaded to a PDFClear server.' } }, { '@type': 'Question', name: 'Can I customize the page number style?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, you have full control over the page number\'s appearance. You can select from several formats, choose its position on the page, adjust the font size, color, and set the margin from the page edges.' } }, { '@type': 'Question', name: 'Can I add page numbers to specific pages only?', acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. In the "Pages to number" field, you can specify individual page numbers (e.g., "1, 5, 8"), page ranges (e.g., "3-7"), or write "all" to apply numbering to the entire document.' } } ]}), []);

    return (
        <div>
            <Helmet>
                {/* Core SEO */}
                <meta name="description" content="Easily add page numbers to your PDF documents. Customize position, format, font size, and apply to specific pages. Fast, free, and private client-side processing." />
                <link rel="canonical" href={PAGE_URL} />

                {/* SEO: Standardized title */}
                <title>Add Page Numbers to PDF - Insert Pagination | PDFClear</title>
                
                {/* Open Graph */}
                <meta property="og:title" content={`Add Page Numbers to PDF - Insert Pagination | ${BRAND}`} />
                <meta property="og:description" content="Easily add page numbers to your PDF documents. Customize position, format, font size, and apply to specific pages. Fast, free, and private client-side processing." />
                <meta property="og:url" content={PAGE_URL} />
                {/* Twitter */}
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={`Add Page Numbers to PDF - Insert Pagination | ${BRAND}`} />
                <meta name="twitter:description" content="Easily add page numbers to your PDF documents. Customize position, format, font size, and apply to specific pages. Fast, free, and private client-side processing." />
                {/* Keywords */}
                <meta name="keywords" content="add page numbers to pdf, paginate pdf, number pdf pages, pdf pagination tool, insert page numbers, free pdf tools" />
                
                {/* JSON-LD */}
                <script type="application/ld+json">{jsonLdWebPage}</script>
                <script type="application/ld+json">{jsonLdSoftwareApp}</script>
                <script type="application/ld+json">{jsonLdFAQ}</script>
            </Helmet>

            <header className="mb-6">
                <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
                    Add Page Numbers to PDF
                </h1>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    Easily add customizable page numbers to your PDF documents. Choose format, position, font size, and apply to specific pages — all without uploading files to a PDFClear server.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <div className="inline-flex items-center gap-2">
                        <HashtagIcon className="h-5 w-5 text-brand-500" />
                        <span>Easy Numbering</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <Cog6ToothIcon className="h-5 w-5 text-brand-500" />
                        <span>Full Customization</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <QueueListIcon className="h-5 w-5 text-brand-500" />
                        <span>Apply to Specific Pages</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                        <span>Runs in your browser</span>
                    </div>
                </div>
            </header>

            {!operationCompleted && <FileUpload />}
            
            {!operationCompleted && pdfFile && (
                <>
                    <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
                        Customize how and where page numbers appear in your document. The preview updates in real-time.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 space-y-4 p-4 bg-light-card dark:bg-dark-card rounded-lg text-left">
                            <div>
                                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Position</label>
                                <select name="position" value={options.position} onChange={handleOptionChange} disabled={processing} className="input-style">
                                    <option value="bottom_center">Bottom Center</option>
                                    <option value="bottom_left">Bottom Left</option>
                                    <option value="bottom_right">Bottom Right</option>
                                    <option value="top_center">Top Center</option>
                                    <option value="top_left">Top Left</option>
                                    <option value="top_right">Top Right</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Format</label>
                                <select name="format" value={options.format} onChange={handleOptionChange} disabled={processing} className="input-style">
                                    <option value="1">1</option>
                                    <option value="1 / n">1 / n</option>
                                    <option value="Page 1">Page 1</option>
                                    <option value="Page 1 of n">Page 1 of n</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Pages to number</label>
                                <input type="text" name="pages" value={options.pages} onChange={handleOptionChange} placeholder="e.g., 1-5, 8, all" disabled={processing} className="input-style" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Font Size</label>
                                    <input type="number" name="fontSize" value={options.fontSize} onChange={handleOptionChange} disabled={processing} className="input-style" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Margin (pt)</label>
                                    <input type="number" name="margin" value={options.margin} onChange={handleOptionChange} disabled={processing} className="input-style" />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="page-number-color" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Color</label>
                                <input type="color" id="page-number-color" name="color" value={options.color} onChange={handleOptionChange} className="w-full h-10 p-1 rounded-md border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card" />
                            </div>
                            <button onClick={handleApply} disabled={processing} className="btn-primary w-full">
                                Download Result
                            </button>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div className="mb-2">
                                <label htmlFor="select-page" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Preview Page:</label>
                                <select
                                    id="select-page"
                                    value={previewPage}
                                    onChange={e => setPreviewPage(Number(e.target.value))}
                                    disabled={processing || numPages === 0}
                                    className="input-style"
                                >
                                    {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                                    <option key={page} value={page}>Page {page}</option>
                                    ))}
                                </select>
                            </div>
                            <div
                                ref={containerRef}
                                className="relative w-full aspect-[8.5/11] shadow-lg rounded-md overflow-hidden bg-light-body dark:bg-dark-body"
                            >
                                {processing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-light-card/70 dark:bg-dark-card/70 z-20">
                                    <Spinner />
                                </div>
                                )}
                                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />
                                <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full z-10" />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {!operationCompleted && (
                <section className="mt-10">
                    <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Adding Page Numbers</h2>
                    <details className="faq-details">
                        <summary className="faq-summary">How do I add page numbers to my PDF?</summary>
                        <p className="faq-answer">
                            Upload your PDF file. Then, use the controls on the left to select your desired page number format, position, font size, color, and margin. The preview will update to show you how it will look. You can specify which pages to number by entering page numbers, ranges, or "all". Finally, click "Add Page Numbers" to generate your new PDF.
                        </p>
                    </details>
                    <details className="faq-details">
                        <summary className="faq-summary">Is it safe to add page numbers online?</summary>
                        <p className="faq-answer">
                            Yes. Page numbering runs directly in your browser, and your PDF document is not uploaded to a PDFClear server.
                        </p>
                    </details>
                    <details className="faq-details">
                        <summary className="faq-summary">Can I choose the color of the page numbers?</summary>
                        <p className="faq-answer">
                           Yes. You can use the color picker in the options panel to select any color you want for your page numbers.
                        </p>
                    </details>
                    <details className="faq-details">
                        <summary className="faq-summary">Can I number only a selection of pages?</summary>
                        <p className="faq-answer">
                            Yes, you can. In the "Pages to number" input field, you can specify individual pages (e.g., "1, 3, 5"), page ranges (e.g., "10-15"), a combination (e.g., "1, 4-7, 10"), or type "all" to number every page.
                        </p>
                    </details>
                </section>
            )}
        </div>
    );
};

export default AddPageNumbersPage;
