import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import Spinner from '../components/Spinner';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import FileUpload from '../components/FileUpload';
import { PencilIcon, PhotoIcon, ArrowsPointingOutIcon, ShieldCheckIcon, TrashIcon } from '@heroicons/react/24/outline';

GlobalWorkerOptions.workerSrc = workerUrl;

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/sign-pdf/';
const BRAND = 'PDFClear';

interface DraggableSignature {
  image: HTMLImageElement;
  width: number;
  height: number;
  x: number;
  y: number;
  aspectRatio: number;
}

const SignPdfPage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
  const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');

  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Signature creation states
  const [typedName, setTypedName] = useState('');
  const [typedFont, setTypedFont] = useState('cursive');
  
  // The final signature to be placed
  const [signatureImage, setSignatureImage] = useState<HTMLImageElement | null>(null);
  const [draggableSig, setDraggableSig] = useState<DraggableSignature | null>(null);

  // Canvas refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null); // For drawing pad
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing pad state
  const isDrawingRef = useRef(false);
  
  // Placement dragging state
  const isDraggingPlacement = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const originalSigX = useRef(0);
  const originalSigY = useRef(0);

  // PDF Rendering State
  const pdfDocRef = useRef<any>(null);
  const renderStateRef = useRef<{ page: number, scale: number, width: number, height: number }>({ page: 0, scale: 0, width: 0, height: 0 });

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      if (!pdfFile) {
        setNumPages(0);
        setSelectedPage(1);
        pdfDocRef.current = null;
        return;
      }
      const buffer = await pdfFile.file.arrayBuffer();
      const pdf = await getDocument({ data: buffer }).promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
    };
    loadPdf();
  }, [pdfFile]);

  // Render PDF Preview
  useEffect(() => {
    const render = async () => {
      const pdf = pdfDocRef.current;
      if (!pdf || selectedPage <= 0 || !numPages) return;

      const canvas = pdfCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !overlayCanvas || !container) return;

      const ctx = canvas.getContext("2d");
      const overlayCtx = overlayCanvas.getContext("2d");
      if (!ctx || !overlayCtx) return;

      let scale = renderStateRef.current.scale;
      let width = renderStateRef.current.width;
      let height = renderStateRef.current.height;

      if (renderStateRef.current.page !== selectedPage || scale === 0) {
        const page = await pdf.getPage(selectedPage);
        const viewport = page.getViewport({ scale: 1 });
        const parentWidth = container.offsetWidth;
        scale = parentWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        width = scaledViewport.width;
        height = scaledViewport.height;

        canvas.width = width;
        canvas.height = height;
        overlayCanvas.width = width;
        overlayCanvas.height = height;

        await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport }).promise;
        renderStateRef.current = { page: selectedPage, scale, width, height };
      }

      // Draw Overlay (Signature)
      overlayCtx.clearRect(0, 0, width, height);
      if (draggableSig) {
        overlayCtx.drawImage(draggableSig.image, draggableSig.x, draggableSig.y, draggableSig.width, draggableSig.height);
        
        // Draw bounding box
        overlayCtx.strokeStyle = "#007bff";
        overlayCtx.lineWidth = 2;
        overlayCtx.setLineDash([4, 4]);
        overlayCtx.strokeRect(draggableSig.x, draggableSig.y, draggableSig.width, draggableSig.height);
        overlayCtx.setLineDash([]);
      }
    };
    render();
  }, [pdfFile, selectedPage, draggableSig, numPages]);

  // --- Signature Creation Handlers ---

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault(); 

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const createSignatureFromDraw = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    initializeDraggableSignature(dataUrl);
  };

  const createSignatureFromType = () => {
    if (!typedName.trim()) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = `60px ${typedFont}`; 
    const textWidth = ctx.measureText(typedName).width;
    canvas.width = textWidth + 40;
    canvas.height = 100;

    // Redefine context after resizing
    ctx.font = `60px ${typedFont}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL('image/png');
    initializeDraggableSignature(dataUrl);
  };

  const handleUploadSig = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          initializeDraggableSignature(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const initializeDraggableSignature = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      setSignatureImage(img);
      const canvas = overlayCanvasRef.current;
      // Fallback width if canvas is not yet ready (e.g. 600px)
      const canvasWidth = canvas ? canvas.width : 600;
      const canvasHeight = canvas ? canvas.height : 800;

      const aspectRatio = img.width / img.height;
      const initialWidth = canvasWidth * 0.4; 
      const initialHeight = initialWidth / aspectRatio;

      setDraggableSig({
        image: img,
        width: initialWidth,
        height: initialHeight,
        x: (canvasWidth - initialWidth) / 2,
        y: (canvasHeight - initialHeight) / 2,
        aspectRatio
      });
    };
    img.src = dataUrl;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggableSig) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (
      mouseX >= draggableSig.x && mouseX <= draggableSig.x + draggableSig.width &&
      mouseY >= draggableSig.y && mouseY <= draggableSig.y + draggableSig.height
    ) {
      isDraggingPlacement.current = true;
      dragStartX.current = mouseX;
      dragStartY.current = mouseY;
      originalSigX.current = draggableSig.x;
      originalSigY.current = draggableSig.y;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPlacement.current || !draggableSig) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const dx = e.clientX - overlayCanvasRef.current.getBoundingClientRect().left - dragStartX.current;
    const dy = e.clientY - overlayCanvasRef.current.getBoundingClientRect().top - dragStartY.current;

    setDraggableSig(prev => prev ? { ...prev, x: originalSigX.current + dx, y: originalSigY.current + dy } : null);
  };

  const handleMouseUp = () => {
    isDraggingPlacement.current = false;
  };

  const handleResize = (percent: number) => {
    if (!draggableSig || !overlayCanvasRef.current) return;
    const newWidth = overlayCanvasRef.current.width * (percent / 100);
    const newHeight = newWidth / draggableSig.aspectRatio;
    setDraggableSig({ ...draggableSig, width: newWidth, height: newHeight });
  };

  // --- Apply Signature ---
  const handleSign = async () => {
    if (!pdfFile || !draggableSig || !signatureImage) {
        showMessage("Please add a signature to the document first.", "error");
        return;
    }

    // Capture width immediately to avoid "Canvas missing" if DOM updates during processing
    const currentCanvasWidth = renderStateRef.current.width || overlayCanvasRef.current?.width;
    
    if (!currentCanvasWidth) {
        showMessage("Display error: Canvas dimensions missing.", "error");
        return;
    }
    
    setProcessing(true);
    showMessage('Signing PDF...', 'info');

    try {
        const response = await fetch(signatureImage.src);
        const blob = await response.blob();
        const imageFile = new File([blob], "signature.png", { type: "image/png" });

        const pdf = pdfDocRef.current;
        const page = await pdf.getPage(selectedPage);
        const viewport = page.getViewport({ scale: 1 });
        
        const scale = viewport.width / currentCanvasWidth; 
        
        const finalX = draggableSig.x * scale;
        // PDF coordinates start from bottom-left
        const finalY = viewport.height - (draggableSig.y * scale) - (draggableSig.height * scale);
        const finalWidth = draggableSig.width * scale;
        const finalHeight = draggableSig.height * scale;

        const result = await pdfService.addImageToPdf(
            pdfFile,
            imageFile,
            selectedPage - 1, // 0-based index
            finalX,
            finalY,
            finalWidth,
            finalHeight,
            1 // opacity
        );

        showPostOperationSuccess(result);
        showMessage("PDF Signed Successfully!", "success");

    } catch (err: any) {
        console.error(err);
        showMessage(err.message || "Error signing PDF", "error");
    } finally {
        setProcessing(false);
    }
  };

  const jsonLdWebPage = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Sign PDF Online - Free Electronic Signature | ${BRAND}`,
    url: PAGE_URL,
    description: 'Sign PDF documents online for free. Draw, type, or upload your signature and place it on your PDF securely in your browser.'
  }), []);

  const jsonLdFAQ = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        { '@type': 'Question', name: 'How do I sign a PDF online?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your PDF, then create a signature by drawing, typing, or uploading an image. Drag the signature to the correct place on the document and click "Sign PDF".' } },
        { '@type': 'Question', name: 'Is my signature saved?', acceptedAnswer: { '@type': 'Answer', text: 'No. Your signature and document are processed entirely in your browser memory and are wiped as soon as you close the tab or refresh the page.' } },
        { '@type': 'Question', name: 'Is it legally binding?', acceptedAnswer: { '@type': 'Answer', text: 'Electronic signatures are valid in many jurisdictions, but legal weight depends on local laws and specific use cases. This tool provides a simple electronic signature.' } }
    ]
  }), []);

  return (
    <div>
      <Helmet>
        <meta name="description" content="Sign PDF documents online for free. Draw, type, or upload your signature. Secure, client-side processing." />
        <title>Sign PDF Online - Free Electronic Signature | PDFClear</title>
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content={`Sign PDF Online | ${BRAND}`} />
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          Sign PDF Document
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Create an electronic signature and place it on your document. Draw, type, or upload an image - all processed securely in your browser.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <div className="inline-flex items-center gap-2">
                <PencilIcon className="h-5 w-5 text-brand-500" />
                <span>Draw Signature</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <PhotoIcon className="h-5 w-5 text-brand-500" />
                <span>Upload Image</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <ArrowsPointingOutIcon className="h-5 w-5 text-brand-500" />
                <span>Resize & Position</span>
            </div>
            <div className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                <span>Private & Secure</span>
            </div>
        </div>
      </header>

      {!operationCompleted && <FileUpload />}

      {!operationCompleted && pdfFile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="feature-card p-4">
                <h3 className="font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">1. Create Signature</h3>
                
                <div className="flex border-b border-border-light dark:border-border-dark mb-4">
                    <button onClick={() => setActiveTab('draw')} className={`flex-1 pb-2 text-sm font-medium ${activeTab === 'draw' ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>Draw</button>
                    <button onClick={() => setActiveTab('type')} className={`flex-1 pb-2 text-sm font-medium ${activeTab === 'type' ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>Type</button>
                    <button onClick={() => setActiveTab('upload')} className={`flex-1 pb-2 text-sm font-medium ${activeTab === 'upload' ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>Upload</button>
                </div>

                {activeTab === 'draw' && (
                    <div className="space-y-3">
                        <div className="border border-gray-300 dark:border-gray-600 rounded bg-white touch-none">
                            <canvas 
                                ref={drawingCanvasRef} 
                                width={300} 
                                height={150} 
                                className="w-full h-auto cursor-crosshair"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={clearDrawing} className="btn-secondary text-xs">Clear</button>
                            <button onClick={createSignatureFromDraw} className="btn-primary text-xs flex-1">Use Drawing</button>
                        </div>
                    </div>
                )}

                {activeTab === 'type' && (
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            placeholder="Type your name" 
                            value={typedName} 
                            onChange={(e) => setTypedName(e.target.value)} 
                            className="input-style"
                        />
                        <select 
                            value={typedFont} 
                            onChange={(e) => setTypedFont(e.target.value)} 
                            className="input-style"
                        >
                            <option value="cursive">Cursive</option>
                            <option value="sans-serif">Print</option>
                            <option value="serif">Formal</option>
                        </select>
                        <button onClick={createSignatureFromType} className="btn-primary w-full text-sm">Use Typed Name</button>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="space-y-3">
                        <input type="file" accept="image/png, image/jpeg" onChange={handleUploadSig} className="text-sm text-text-light-primary dark:text-text-dark-primary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Upload a PNG (transparent recommended) or JPG of your signature.</p>
                    </div>
                )}
            </div>

            {draggableSig && (
                <div className="feature-card p-4">
                    <h3 className="font-semibold mb-2 text-text-light-primary dark:text-text-dark-primary">2. Adjust & Sign</h3>
                    <label className="block text-xs mb-1 text-text-light-secondary dark:text-text-dark-secondary">Signature Size</label>
                    <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        defaultValue="40" 
                        onChange={(e) => handleResize(Number(e.target.value))} 
                        className="w-full accent-brand-500"
                    />
                    <button onClick={handleSign} disabled={processing} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                        {processing ? <Spinner /> : "Download Signed PDF"}
                    </button>
                </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
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

             <div ref={containerRef} className="relative w-full shadow-lg rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                <canvas ref={pdfCanvasRef} className="block w-full h-auto" />
                <canvas 
                    ref={overlayCanvasRef} 
                    className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
             </div>
             {!draggableSig && (
                 <p className="text-center text-sm mt-2 text-text-light-secondary dark:text-text-dark-secondary">
                     Create a signature on the left to place it here.
                 </p>
             )}
          </div>
        </div>
      )}

      {!operationCompleted && (
        <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions</h2>
            <details className="faq-details">
                <summary className="faq-summary">How do I sign a PDF online?</summary>
                <p className="faq-answer">Upload your PDF, then create a signature by drawing, typing, or uploading an image. Drag the signature to the correct place on the document and click "Sign PDF".</p>
            </details>
            <details className="faq-details">
                <summary className="faq-summary">Is my signature saved?</summary>
                <p className="faq-answer">No. Your signature and document are processed entirely in your browser memory and are wiped as soon as you close the tab or refresh the page.</p>
            </details>
        </section>
      )}
    </div>
  );
};

export default SignPdfPage;
