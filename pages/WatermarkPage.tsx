import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Spinner from '../components/Spinner';
import { CheckBadgeIcon, PhotoIcon, AdjustmentsHorizontalIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';


GlobalWorkerOptions.workerSrc = workerUrl;

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/watermark-pdf/';
const BRAND = 'PDFClear';

const WatermarkPage: React.FC = () => {
    const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
    const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');

    const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
    const [text, setText] = useState('CONFIDENTIAL');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [opacity, setOpacity] = useState(0.3);
    const [angle, setAngle] = useState(-45);
    const [fontSize, setFontSize] = useState(72);
    const [color, setColor] = useState('#ff0000');
    const [position, setPosition] = useState<'tiled' | 'center'>('center');
    
    const [numPages, setNumPages] = useState<number>(0);
    const [previewPage, setPreviewPage] = useState<number>(1);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const watermarkImageRef = useRef<HTMLImageElement>(new Image());

    // Refs for caching PDF document and rendering state
    const pdfDocRef = useRef<any>(null); 
    const renderStateRef = useRef<{ page: number, scale: number, width: number, height: number }>({ page: 0, scale: 0, width: 0, height: 0 });

    // Load PDF metadata and document (Only runs when pdfFile changes)
    useEffect(() => {
        const loadPdf = async () => {
          if (!pdfFile) {
            setNumPages(0);
            setPreviewPage(1);
            pdfDocRef.current = null;
            renderStateRef.current = { page: 0, scale: 0, width: 0, height: 0 };
            return;
          }
          const buffer = await pdfFile.file.arrayBuffer();
          // Cache the PDF document object
          const pdf = await getDocument({ data: buffer }).promise;
          pdfDocRef.current = pdf;
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
            const pdf = pdfDocRef.current;
            if (!pdf || previewPage <= 0 || !numPages) return;
      
            const canvas = canvasRef.current;
            const overlayCanvas = overlayCanvasRef.current;
            const container = containerRef.current;
            if (!canvas || !overlayCanvas || !container) return;
      
            const ctx = canvas.getContext("2d");
            const overlayCtx = overlayCanvas.getContext("2d");
            if (!ctx || !overlayCtx) return;
            
            let scale = renderStateRef.current.scale;
            let canvasWidth = renderStateRef.current.width;
            let canvasHeight = renderStateRef.current.height;
            
            // Determine if we need to redraw the base PDF page (only if page changes or scale is uninitialized)
            const needsPdfRedraw = renderStateRef.current.page !== previewPage || scale === 0;

            if (needsPdfRedraw) {
                // 1. Calculate dimensions and render PDF base layer
                const page = await pdf.getPage(previewPage);
          
                const parentWidth = container.offsetWidth;
                const viewport = page.getViewport({ scale: 1 });
                scale = parentWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });
          
                canvasWidth = scaledViewport.width;
                canvasHeight = scaledViewport.height;

                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                overlayCanvas.width = canvasWidth;
                overlayCanvas.height = canvasHeight;
          
                await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport }).promise;
                
                // Store state for reuse
                renderStateRef.current = { page: previewPage, scale, width: canvasWidth, height: canvasHeight };

            } else {
                // If skipping PDF redraw, ensure overlay canvas dimensions match the base canvas
                overlayCanvas.width = canvasWidth;
                overlayCanvas.height = canvasHeight;
            }

            // --- Draw Live Preview Overlay (Always happens when settings change) ---
            overlayCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            overlayCtx.globalAlpha = opacity;

            const drawTextWatermark = () => {
                overlayCtx.fillStyle = color;
                // Use calculated scale for accurate font sizing
                overlayCtx.font = `${fontSize * scale}px Helvetica`; 
                overlayCtx.textAlign = 'center';
                overlayCtx.textBaseline = 'middle';

                if (position === 'center') {
                    overlayCtx.save();
                    overlayCtx.translate(canvasWidth / 2, canvasHeight / 2);
                    overlayCtx.rotate((angle * Math.PI) / 180);
                    overlayCtx.fillText(text, 0, 0);
                    overlayCtx.restore();
                } else { // tiled
                    const textWidth = overlayCtx.measureText(text).width;
                    const patternSize = Math.max(textWidth, fontSize * scale) * 2.5;
                    overlayCtx.save();
                    for (let y = -canvasHeight; y < canvasHeight * 2; y += patternSize) {
                        for (let x = -canvasWidth; x < canvasWidth * 2; x += patternSize) {
                            overlayCtx.save();
                            overlayCtx.translate(x, y);
                            overlayCtx.rotate((angle * Math.PI) / 180);
                            overlayCtx.fillText(text, 0, 0);
                            overlayCtx.restore();
                        }
                    }
                    overlayCtx.restore();
                }
            };
            
            const drawImageWatermark = (img: HTMLImageElement) => {
                const scaleFactor = 0.4 * scale;
                const scaledWidth = img.width * scaleFactor;
                const scaledHeight = img.height * scaleFactor;

                if (position === 'center') {
                    overlayCtx.save();
                    overlayCtx.translate(canvasWidth / 2, canvasHeight / 2);
                    overlayCtx.rotate((angle * Math.PI) / 180);
                    overlayCtx.drawImage(img, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
                    overlayCtx.restore();
                } else { // tiled
                    const patternSize = Math.max(scaledWidth, scaledHeight) * 2.0;
                    overlayCtx.save();
                    for (let y = -canvasHeight; y < canvasHeight * 2; y += patternSize) {
                        for (let x = -canvasWidth; x < canvasWidth * 2; x += patternSize) {
                            overlayCtx.save();
                            overlayCtx.translate(x, y);
                            overlayCtx.rotate((angle * Math.PI) / 180);
                            overlayCtx.drawImage(img, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
                            overlayCtx.restore();
                        }
                    }
                    overlayCtx.restore();
                }
            };

            if (watermarkType === 'text' && text.trim()) {
                drawTextWatermark();
            } else if (watermarkType === 'image' && imagePreview) {
                const img = watermarkImageRef.current;
                
                if(img.src !== imagePreview || !img.complete) {
                    img.onload = () => {
                        drawImageWatermark(img);
                    };
                    img.src = imagePreview;
                } else {
                    drawImageWatermark(img);
                }
            }
        };
    
        render();
    }, [pdfFile, previewPage, watermarkType, text, imagePreview, opacity, angle, fontSize, color, position, numPages]);


    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                showMessage('Please upload a JPG or PNG image.', 'error');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleWatermark = async () => {
        if (!pdfFile) {
            showMessage('Please upload a PDF file first.', 'error');
            return;
        }
        if (watermarkType === 'text' && !text.trim()) {
            showMessage('Watermark text cannot be empty.', 'error');
            return;
        }
        if (watermarkType === 'image' && !imageFile) {
            showMessage('Please upload an image for the watermark.', 'error');
            return;
        }

        setProcessing(true);
        showMessage('Applying watermark...', 'info');

        try {
            const options: pdfService.WatermarkOptions = {
                type: watermarkType,
                opacity, angle, position,
            };

            if (watermarkType === 'text') {
                options.text = text;
                options.fontSize = fontSize;
                options.color = color;
            } else if (imageFile) {
                options.imageBytes = await imageFile.arrayBuffer();
            }

            const downloadResult = await pdfService.watermarkPdf(pdfFile, options);
            showMessage('Watermark applied successfully!', 'success');
            showPostOperationSuccess(downloadResult);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            showMessage(`Error: ${message}`, 'error');
        } finally {
            setProcessing(false);
        }
    };

    // --- JSON-LD Structured Data ---
  const jsonLdWebPage = useMemo(() => JSON.stringify({'@context': 'https://schema.org', '@type': 'WebPage', name: `Watermark PDF - Add Text or Image Watermark | ${BRAND}`, url: PAGE_URL, description: 'Add custom text or image watermarks to your PDF documents. Adjust opacity, rotation, and position securely in your browser with PDFClear\'s free tool.'}), []);
  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({'@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'PDF Watermarker', applicationCategory: 'UtilityApplication', operatingSystem: 'Web', url: PAGE_URL, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, isAccessibleForFree: true, publisher: { '@type': 'Organization', name: BRAND }, featureList: [ 'Add text watermarks', 'Add image watermarks', 'Add logo to PDF', 'Stamp PDF', 'Adjust watermark opacity', 'Rotate watermarks', 'Tiled or centered positioning', 'Client-side PDF processing', 'Free to use', 'No software installation required', 'Secure and private' ]}), []);
  const jsonLdFAQ = useMemo(() => JSON.stringify({'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [ { '@type': 'Question', name: 'How do I add a watermark to a PDF?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your PDF file, then choose between a text or image watermark. Customize text (content, font size, color) or upload an image. Adjust opacity, rotation, and position, then click "Apply Watermark".' } }, { '@type': 'Question', name: 'Is PDFClear\'s watermark tool private and secure?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, absolutely. Watermarking runs directly in your browser. Your PDF files are processed in your browser and are not uploaded to a PDFClear server.' } }, { '@type': 'Question', name: 'What image formats are supported for watermarks?', acceptedAnswer: { '@type': 'Answer', text: 'You can use JPG and PNG image files for your watermarks. PNGs are recommended if you need transparency in your watermark.' } }, { '@type': 'Question', name: 'Can I choose where the watermark appears on the page?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, you can choose between "Tiled" (repeated across the page for a background effect) or "Center" (a single, prominent watermark in the middle of each page) positioning.' } } ]}), []);

    return (
        <div>
            <Helmet>
                {/* Core SEO */}
                <meta name="description" content="Add a custom text or image watermark to your PDF files. Adjust opacity, rotation, and position for free. Secure, in-browser processing by PDFClear." />
                <link rel="canonical" href={PAGE_URL} />

                {/* SEO: Standardized title */}
                <title>Watermark PDF - Add Text or Image Watermark | PDFClear</title>
                
                {/* Open Graph */}
                <meta property="og:title" content={`Watermark PDF - Add Text or Image Watermark | ${BRAND}`} />
                <meta property="og:description" content="Add a custom text or image watermark to your PDF files. Adjust opacity, rotation, and position for free. Secure, in-browser processing by PDFClear." />
                <meta property="og:url" content={PAGE_URL} />
                {/* Twitter */}
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={`Watermark PDF - Add Text or Image Watermark | ${BRAND}`} />
                <meta name="twitter:description" content="Add a custom text or image watermark to your PDF files. Adjust opacity, rotation, and position for free. Secure, in-browser processing by PDFClear." />
                {/* Keywords */}
                <meta name="keywords" content="watermark pdf, add watermark to pdf, add logo to pdf, stamp pdf, text watermark, image watermark, free pdf tool, secure pdf" />

                {/* JSON-LD */}
                <script type="application/ld+json">{jsonLdWebPage}</script>
                <script type="application/ld+json">{jsonLdSoftwareApp}</script>
                <script type="application/ld+json">{jsonLdFAQ}</script>
            </Helmet>

            <header className="mb-6">
                <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
                Watermark PDF Files
                </h1>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                Add a custom text or image watermark to every page of your PDF document. Adjust transparency, rotation, and placement – with browser-side processing and no account required.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <div className="inline-flex items-center gap-2">
                        <CheckBadgeIcon className="h-5 w-5 text-brand-500" />
                        <span>Text & Image Watermarks</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <AdjustmentsHorizontalIcon className="h-5 w-5 text-brand-500" />
                        <span>Customize Opacity & Rotation</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <PhotoIcon className="h-5 w-5 text-brand-500" />
                        <span>Tiled or Center Position</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                        <span>Runs in your browser</span>
                    </div>
                </div>
            </header>
            
            {!operationCompleted && <FileUpload />}

            {!operationCompleted && pdfFile && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Controls Column */}
                    <div className="md:col-span-1 space-y-4 p-4 feature-card">
                        <div className="flex bg-gray-200 dark:bg-dark-body rounded-md p-1">
                            <button onClick={() => setWatermarkType('text')} className={`flex-1 p-2 rounded text-sm font-semibold ${watermarkType === 'text' ? 'bg-light-card dark:bg-dark-card shadow' : 'hover:bg-gray-100 dark:hover:bg-dark-body/50'}`}>Text</button>
                            <button onClick={() => setWatermarkType('image')} className={`flex-1 p-2 rounded text-sm font-semibold ${watermarkType === 'image' ? 'bg-light-card dark:bg-dark-card shadow' : 'hover:bg-gray-100 dark:hover:bg-dark-body/50'}`}>Image</button>
                        </div>

                        {watermarkType === 'text' ? (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label htmlFor="watermark-text" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Text</label>
                                    <input type="text" id="watermark-text" value={text} onChange={e => setText(e.target.value)} className="input-style" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="watermark-fontsize" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Font Size</label>
                                        <input type="number" id="watermark-fontsize" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="input-style" />
                                    </div>
                                    <div>
                                        <label htmlFor="watermark-color" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Color</label>
                                        <input type="color" id="watermark-color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-10 p-1 rounded-md border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 animate-fade-in">
                                <label htmlFor="watermark-image" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Image File</label>
                                <input type="file" id="watermark-image" accept=".png, .jpg, .jpeg" onChange={handleImageChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/50 dark:file:text-brand-300 dark:hover:file:bg-brand-900" />
                                {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 rounded-md max-h-24 mx-auto" />}
                            </div>
                        )}

                        <hr className="dark:border-border-dark" />

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="watermark-opacity" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Opacity ({opacity})</label>
                                <input type="range" id="watermark-opacity" min="0.1" max="1" step="0.05" value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="w-full accent-brand-500 cursor-pointer disabled:opacity-50" />
                            </div>
                            <div>
                                <label htmlFor="watermark-angle" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Rotation ({angle}°)</label>
                                <input type="range" id="watermark-angle" min="-90" max="90" step="5" value={angle} onChange={e => setAngle(Number(e.target.value))} className="w-full accent-brand-500 cursor-pointer disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Position</label>
                                <select value={position} onChange={e => setPosition(e.target.value as any)} className="input-style" disabled={processing}>
                                    <option value="tiled">Tiled</option>
                                    <option value="center">Center</option>
                                </select>
                            </div>
                        </div>

                        <button onClick={handleWatermark} disabled={processing} className="btn-primary w-full">
                            Download Result
                        </button>
                    </div>
                    {/* Preview Column */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="mb-2">
                            <label htmlFor="select-page" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Preview Page:</label>
                            <select id="select-page" value={previewPage} onChange={e => setPreviewPage(Number(e.target.value))} disabled={processing || numPages === 0} className="input-style">
                                {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                                <option key={page} value={page}>Page {page}</option>
                                ))}
                            </select>
                        </div>
                        <div ref={containerRef} className="relative w-full aspect-[8.5/11] shadow-lg rounded-md overflow-hidden bg-light-body dark:bg-dark-body">
                            {processing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-light-card/70 dark:bg-dark-card/70 z-20"><Spinner /></div>
                            )}
                            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />
                            <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full z-10" />
                        </div>
                    </div>
                </div>
            )}

            {!operationCompleted && (
                <section className="mt-10">
                  <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Watermarking PDFs</h2>
                  <details className="faq-details">
                    <summary className="faq-summary">How do I add a watermark to a PDF?</summary>
                    <p className="faq-answer">
                      First, upload your PDF file. Then, select either "Text" or "Image" for your watermark type. Customize the text or upload your image, and adjust settings like opacity, rotation, and position. The live preview will show you how it looks. Finally, click "Apply Watermark."
                    </p>
                  </details>
                  <details className="faq-details">
                    <summary className="faq-summary">Is this watermark tool private and secure?</summary>
                    <p className="faq-answer">
                      Watermarking runs in your browser, so your PDF stays on your device.
                    </p>
                  </details>
                  <details className="faq-details">
                    <summary className="faq-summary">What image formats are supported for watermarks?</summary>
                    <p className="faq-answer">
                      You can use standard image formats like JPG (JPEG) and PNG for your image watermarks. PNG files are particularly useful if your watermark design includes transparent areas.
                    </p>
                  </details>
                  <details className="faq-details">
                    <summary className="faq-summary">Can I choose where the watermark appears on the page?</summary>
                    <p className="faq-answer">
                      Yes, you have control over the watermark's placement. You can choose between a "Tiled" position, where the watermark repeats across the entire page, or a "Center" position, placing a single watermark in the middle of each page.
                    </p>
                  </details>
                </section>
            )}
        </div>
    );
};

export default WatermarkPage;
