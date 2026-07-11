import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import Spinner from '../components/Spinner';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import FileUpload from '../components/FileUpload';
import { PencilIcon, TrashIcon, DocumentTextIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

GlobalWorkerOptions.workerSrc = workerUrl;

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/fill-pdf-form/';
const BRAND = 'PDFClear';

interface TextToFill {
    id: string;
    text: string;
    x: number; // canvas relative
    y: number; // canvas relative
    page: number;
    fontSize: number;
}

const FillFormPage: React.FC = () => {
    const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
    const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');

    const [selectedPage, setSelectedPage] = useState<number>(1);
    const [numPages, setNumPages] = useState<number>(0);
    
    // Store all text inputs for the document
    const [inputs, setInputs] = useState<TextToFill[]>([]);
    
    // Default style settings
    const [defaultFontSize, setDefaultFontSize] = useState(14);
    const [defaultColor, setDefaultColor] = useState('#000000');

    // Canvas refs
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfDocRef = useRef<any>(null);
    const renderStateRef = useRef<{ page: number, scale: number }>({ page: 0, scale: 0 });

    useEffect(() => {
        const loadPdf = async () => {
            if (!pdfFile) {
                setNumPages(0);
                pdfDocRef.current = null;
                setInputs([]);
                return;
            }
            const buffer = await pdfFile.file.arrayBuffer();
            const pdf = await getDocument({ data: buffer }).promise;
            pdfDocRef.current = pdf;
            setNumPages(pdf.numPages);
        };
        loadPdf();
    }, [pdfFile]);

    useEffect(() => {
        const render = async () => {
            const pdf = pdfDocRef.current;
            if (!pdf || selectedPage <= 0 || !numPages) return;

            const canvas = pdfCanvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const page = await pdf.getPage(selectedPage);
            const viewport = page.getViewport({ scale: 1 });
            const parentWidth = container.offsetWidth;
            const scale = parentWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport }).promise;
            renderStateRef.current = { page: selectedPage, scale };
        };
        render();
    }, [pdfFile, selectedPage, numPages]);

    const handleCanvasClick = (e: React.MouseEvent) => {
        // Only add input if clicking directly on container/canvas overlay
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;

        const container = containerRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Visual adjustment: center the input vertically on the click point
        const adjustedY = y - (defaultFontSize);

        const newInput: TextToFill = {
            id: Date.now().toString(),
            text: '',
            x: x,
            y: adjustedY,
            page: selectedPage,
            fontSize: defaultFontSize
        };

        setInputs(prev => [...prev, newInput]);
    };

    const updateInput = (id: string, text: string) => {
        setInputs(prev => prev.map(inp => inp.id === id ? { ...inp, text } : inp));
    };

    const removeInput = (id: string) => {
        setInputs(prev => prev.filter(inp => inp.id !== id));
    };

    const handleSave = async () => {
        if (!pdfFile || inputs.length === 0) {
            showMessage('Please add some text to fill the form.', 'error');
            return;
        }

        setProcessing(true);
        showMessage('Filling form...', 'info');

        try {
            const textsToProcess = [];
            
            for (const input of inputs) {
                if (!input.text.trim()) continue;
                
                const page = await pdfDocRef.current.getPage(input.page);
                const viewport = page.getViewport({ scale: 1 });
                
                // Calculate scale factor relative to visual container width
                const visualScale = containerRef.current ? containerRef.current.offsetWidth / viewport.width : 1;
                
                const pdfX = input.x / visualScale;
                // PDF Y is from bottom. Visual Y is from top.
                // Subtract approximate font height to align baseline.
                const pdfY = viewport.height - (input.y / visualScale) - (input.fontSize * 0.8); 

                textsToProcess.push({
                    text: input.text,
                    pageIndex: input.page - 1, // 0-based
                    x: pdfX,
                    y: pdfY,
                    fontSize: input.fontSize,
                    color: defaultColor, 
                    opacity: 1
                });
            }

            if (textsToProcess.length === 0) {
                throw new Error("No text content found to add.");
            }

            const result = await pdfService.batchAddText(pdfFile, textsToProcess);
            showPostOperationSuccess(result);
            showMessage("Form filled successfully!", "success");

        } catch (err: any) {
            showMessage(err.message || "Error filling form", "error");
        } finally {
            setProcessing(false);
        }
    };

    // --- JSON-LD ---
    const jsonLdWebPage = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `Fill PDF Form Online - Type on PDF | ${BRAND}`,
        url: PAGE_URL,
        description: 'Fill out PDF forms online for free. Click to type anywhere on the document. No software installation required, secure and private.'
    }), []);

    const jsonLdFAQ = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'How do I fill out a PDF form?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your PDF file. Click anywhere on the document page where you want to add text. Type your answer. Repeat for all fields, then click "Download PDF".' } },
            { '@type': 'Question', name: 'Does this work on non-fillable PDFs?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! This tool works by adding text on top of the PDF page, so it works on any PDF, even scanned ones or flat forms that don\'t have interactive fields.' } },
            { '@type': 'Question', name: 'Is my data secure?', acceptedAnswer: { '@type': 'Answer', text: 'Form filling runs in your browser, so your form data and PDF stay on your device.' } }
        ]
    }), []);

    return (
        <div>
            <Helmet>
                <meta name="description" content="Fill out PDF forms online for free. Click to type anywhere on the document. Secure, client-side processing." />
                <title>Fill PDF Form Online - Type on PDF | PDFClear</title>
                <link rel="canonical" href={PAGE_URL} />
                <meta property="og:title" content={`Fill PDF Form Online | ${BRAND}`} />
                <script type="application/ld+json">{jsonLdWebPage}</script>
                <script type="application/ld+json">{jsonLdFAQ}</script>
            </Helmet>

            <header className="mb-6">
                <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
                    Fill PDF Form
                </h1>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    Easily fill out non-interactive PDF forms. Simply click anywhere on the page to start typing.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <div className="inline-flex items-center gap-2">
                        <PencilIcon className="h-5 w-5 text-brand-500" />
                        <span>Click & Type</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5 text-brand-500" />
                        <span>Works on Any PDF</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                        <span>Private & Secure</span>
                    </div>
                </div>
            </header>

            {!operationCompleted && <FileUpload />}

            {!operationCompleted && pdfFile && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="feature-card p-4">
                            <h3 className="font-semibold mb-2 text-text-light-primary dark:text-text-dark-primary">Text Settings</h3>
                            <div className="mb-3">
                                <label className="block text-xs mb-1 text-text-light-secondary dark:text-text-dark-secondary">Font Size</label>
                                <input 
                                    type="number" 
                                    value={defaultFontSize} 
                                    onChange={(e) => setDefaultFontSize(Number(e.target.value))} 
                                    className="input-style"
                                />
                            </div>
                            <div className="mb-3">
                                <label className="block text-xs mb-1 text-text-light-secondary dark:text-text-dark-secondary">Color</label>
                                <input 
                                    type="color" 
                                    value={defaultColor} 
                                    onChange={(e) => setDefaultColor(e.target.value)} 
                                    className="w-full h-8 cursor-pointer border rounded border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card"
                                />
                            </div>
                            <button onClick={handleSave} disabled={processing} className="btn-primary w-full flex items-center justify-center gap-2">
                                {processing ? <Spinner /> : "Download Filled PDF"}
                            </button>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30">
                            <strong>How to use:</strong> Select a page, then click anywhere on the preview to add a text box.
                        </div>
                    </div>

                    {/* Preview / Interaction Area */}
                    <div className="lg:col-span-3">
                        <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">Page:</label>
                            <select 
                                value={selectedPage} 
                                onChange={(e) => setSelectedPage(Number(e.target.value))} 
                                className="input-style w-32 py-1"
                            >
                                {Array.from({length: numPages}, (_, i) => i + 1).map(p => (
                                    <option key={p} value={p}>Page {p}</option>
                                ))}
                            </select>
                        </div>

                        <div 
                            ref={containerRef} 
                            className="relative w-full shadow-lg rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-text"
                            onClick={handleCanvasClick}
                        >
                            <canvas ref={pdfCanvasRef} className="block w-full h-auto" />
                            
                            {/* Inputs Overlay */}
                            {inputs.filter(i => i.page === selectedPage).map(input => (
                                <div
                                    key={input.id}
                                    style={{
                                        position: 'absolute',
                                        left: input.x,
                                        top: input.y,
                                        transform: 'translateY(25%)',
                                    }}
                                    onClick={(e) => e.stopPropagation()} 
                                >
                                    <input
                                        autoFocus={!input.text}
                                        type="text"
                                        value={input.text}
                                        onChange={(e) => updateInput(input.id, e.target.value)}
                                        style={{
                                            fontSize: `${input.fontSize}px`,
                                            color: defaultColor,
                                            background: 'transparent',
                                            border: '1px dashed rgba(100,100,100,0.5)',
                                            outline: 'none',
                                            padding: '2px',
                                            minWidth: '50px'
                                        }}
                                        className="hover:bg-white/50 focus:bg-white/80 rounded transition-colors text-text-light-primary"
                                    />
                                    <button 
                                        onClick={() => removeInput(input.id)}
                                        className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 shadow-sm"
                                        title="Remove field"
                                    >
                                        <TrashIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!operationCompleted && (
                <section className="mt-10">
                    <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions</h2>
                    <details className="faq-details">
                        <summary className="faq-summary">How do I fill out a PDF form?</summary>
                        <p className="faq-answer">Upload your PDF file. Click anywhere on the document page where you want to add text. Type your answer. Repeat for all fields, then click "Download Filled PDF".</p>
                    </details>
                    <details className="faq-details">
                        <summary className="faq-summary">Does this work on non-fillable PDFs?</summary>
                        <p className="faq-answer">Yes! This tool works by adding text directly on top of the PDF page canvas, so it works on any PDF, even scanned documents or flat forms that don't have interactive form fields.</p>
                    </details>
                </section>
            )}
        </div>
    );
};

export default FillFormPage;
