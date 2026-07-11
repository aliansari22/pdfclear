import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import Spinner from '../components/Spinner';
import FileUpload from '../components/FileUpload'; // Ensure FileUpload is imported
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PencilSquareIcon, ArrowsPointingOutIcon, PaintBrushIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

GlobalWorkerOptions.workerSrc = workerUrl;

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/add-text-to-pdf/';
const BRAND = 'PDFClear';

interface DraggableText {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity: number;
  width: number;
  height: number;
}

const AddTextPage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted, clearMessages } = useFileContext();
  const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');

  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [textInput, setTextInput] = useState('New Text');
  const [draggableText, setDraggableText] = useState<DraggableText | null>(null);
  const [numPages, setNumPages] = useState<number>(0);

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null); // background
  const textCanvasRef = useRef<HTMLCanvasElement>(null); // overlay
  const containerRef = useRef<HTMLDivElement>(null);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const originalTextX = useRef(0);
  const originalTextY = useRef(0);
  const originalTextWidth = useRef(0);
  const resizeHandle = useRef<'br' | null>(null);

  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#000000');
  const [opacity, setOpacity] = useState(1);

  const [pageReady, setPageReady] = useState(0);

  useEffect(() => {
    if (!operationCompleted) clearMessages();
  }, [uploadedFiles.length, operationCompleted, clearMessages]);

  useEffect(() => {
    const loadPdf = async () => {
      if (!pdfFile) {
        setNumPages(0);
        setSelectedPage(1);
        return;
      }
      const buffer = await pdfFile.file.arrayBuffer();
      const pdf = await getDocument({ data: buffer }).promise;
      setNumPages(pdf.numPages);
      if (selectedPage === 0 || selectedPage > pdf.numPages) {
        setSelectedPage(1);
      }
    };
    loadPdf();
  }, [pdfFile]);

  const drawTextOverlay = useCallback(() => {
    const canvas = textCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !draggableText) {
        if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const padding = 8;

    // Draw bounding box
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(draggableText.x - padding, draggableText.y - padding, draggableText.width + padding * 2, draggableText.height + padding * 2);
    ctx.setLineDash([]);

    // Draw text
    ctx.save();
    ctx.globalAlpha = draggableText.opacity;
    ctx.fillStyle = draggableText.color;
    ctx.font = `${draggableText.fontSize}px ${draggableText.fontFamily}`;
    ctx.textBaseline = 'top'; // Align to top for predictable positioning
    ctx.fillText(draggableText.text, draggableText.x, draggableText.y);
    ctx.restore();

    // Draw resize handle
    const handleSize = 0;
    ctx.fillStyle = '#007bff';
    ctx.fillRect(
      draggableText.x + draggableText.width + padding - handleSize / 2,
      draggableText.y + draggableText.height + padding - handleSize / 2,
      handleSize, handleSize
    );
  }, [draggableText]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfFile || selectedPage <= 0 || !numPages) return;
      const pdfCanvas = pdfCanvasRef.current;
      const textCanvas = textCanvasRef.current;
      const container = containerRef.current;
      if (!pdfCanvas || !textCanvas || !container) return;
      const ctx = pdfCanvas.getContext("2d");
      if (!ctx) return;

      const buffer = await pdfFile.file.arrayBuffer();
      const pdf = await getDocument({ data: buffer }).promise;
      const page = await pdf.getPage(selectedPage);

      const parentWidth = container.offsetWidth;
      const viewport = page.getViewport({ scale: 1 });
      const scale = parentWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      pdfCanvas.width = scaledViewport.width;
      pdfCanvas.height = scaledViewport.height;
      textCanvas.width = scaledViewport.width;
      textCanvas.height = scaledViewport.height;

      await page.render({ canvas: pdfCanvas, canvasContext: ctx, viewport: scaledViewport }).promise;
      setPageReady(v => v + 1);
    };
    renderPage();
  }, [pdfFile, selectedPage, numPages]);

  useEffect(() => {
    const textCanvas = textCanvasRef.current;
    const ctx = textCanvas?.getContext('2d');
    if (!textCanvas || !ctx || !textInput.trim()) {
      setDraggableText(null);
      return;
    }
    if (textCanvas.width === 0 || textCanvas.height === 0) return;

    ctx.font = `${fontSize}px Helvetica`;
    const textMetrics = ctx.measureText(textInput);
    const textWidth = textMetrics.width;
    const fontHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

    setDraggableText(prev => {
      const currentX = prev?.x ?? (textCanvas.width - textWidth) / 2;
      const currentY = prev?.y ?? (textCanvas.height - fontHeight) / 2;
      return {
        text: textInput,
        x: currentX,
        y: currentY,
        fontSize,
        fontFamily: 'Helvetica',
        color: fontColor,
        opacity,
        width: textWidth,
        height: fontHeight,
      };
    });
  }, [textInput, fontSize, fontColor, opacity, pageReady]);

  useEffect(() => {
    drawTextOverlay();
  }, [draggableText, drawTextOverlay]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggableText || processing) return;
    e.preventDefault();
    const canvas = textCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const padding = 8;

    const handleSize = 0;
    const resizeHandleArea = {
        x: draggableText.x + draggableText.width + padding - handleSize / 2,
        y: draggableText.y + draggableText.height + padding - handleSize / 2,
        width: handleSize,
        height: handleSize
    };

    if (mouseX > resizeHandleArea.x && mouseX < resizeHandleArea.x + resizeHandleArea.width &&
        mouseY > resizeHandleArea.y && mouseY < resizeHandleArea.y + resizeHandleArea.height) {
        resizeHandle.current = 'br';
        isDragging.current = true;
        dragStartX.current = mouseX;
        originalTextWidth.current = draggableText.width;
    } else if (mouseX > draggableText.x - padding && mouseX < draggableText.x + draggableText.width + padding &&
        mouseY > draggableText.y - padding && mouseY < draggableText.y + draggableText.height + padding) {
        isDragging.current = true;
        dragStartX.current = mouseX;
        dragStartY.current = mouseY;
        originalTextX.current = draggableText.x;
        originalTextY.current = draggableText.y;
    }
  }, [draggableText, processing]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || !draggableText || processing) return;
    e.preventDefault();
    const canvas = textCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - dragStartX.current;
    const dy = mouseY - dragStartY.current;

    if (resizeHandle.current === 'br') {
        const newWidth = Math.max(20, originalTextWidth.current + dx);
        const scaleRatio = newWidth / originalTextWidth.current;
        const newFontSize = Math.round(draggableText.fontSize * scaleRatio);
        if (newFontSize > 0) {
            setFontSize(newFontSize);
        }
    } else {
        setDraggableText(prev => prev ? {
            ...prev,
            x: originalTextX.current + dx,
            y: originalTextY.current + dy
        } : null);
    }
  }, [draggableText, processing]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    resizeHandle.current = null;
  }, []);

  const handleApplyText = async () => {
    if (!pdfFile || !draggableText || !textInput.trim()) {
      showMessage('Please upload a PDF, enter text, and position it.', 'error');
      return;
    }
    if (selectedPage === 0) {
      showMessage('Please select a page to add the text to.', 'error');
      return;
    }

    setProcessing(true);
    showMessage('Adding text to PDF...', 'info');
    try {
      const textCanvas = textCanvasRef.current;
      if (!textCanvas) throw new Error("Canvas not available.");

      const rawPdf = await getDocument({ data: await pdfFile.file.arrayBuffer() }).promise;
      const page = await rawPdf.getPage(selectedPage);
      const pdfViewport = page.getViewport({ scale: 1 });

      const scaleX = pdfViewport.width / textCanvas.width;
      const scaleY = pdfViewport.height / textCanvas.height;

      const finalX = draggableText.x * scaleX;
      const finalY = pdfViewport.height - (draggableText.y * scaleY) - (draggableText.fontSize * scaleY);

      const downloadResult = await pdfService.addTextToPdf(
        pdfFile, draggableText.text, selectedPage - 1,
        finalX, finalY, draggableText.fontSize * scaleX, draggableText.color, draggableText.opacity
      );
      showMessage('Text added successfully!', 'success');
      showPostOperationSuccess(downloadResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      showMessage(`Error: ${message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const jsonLdWebPage = useMemo(() => JSON.stringify({'@context': 'https://schema.org', '@type': 'WebPage', name: `Add Text to PDF - Type & Write on Documents | ${BRAND}`, url: PAGE_URL, description: 'Add custom text boxes to specific pages of your PDF document. Position, size, and color text visually in your browser. Free, private, and no PDFClear server upload.'}), []);
  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({'@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Add Text to PDF Tool', applicationCategory: 'UtilityApplication', operatingSystem: 'Web', url: PAGE_URL, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, isAccessibleForFree: true, publisher: { '@type': 'Organization', name: BRAND }, featureList: [ 'Add text to PDF', 'Write on PDF', 'Type on PDF', 'Fill out PDF forms', 'Customize text color and size', 'Client-side PDF processing', 'Free to use', 'Secure and private' ]}), []);
  const jsonLdFAQ = useMemo(() => JSON.stringify({'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [ { '@type': 'Question', name: 'How do I add text to my PDF?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your PDF, type your desired text, and then use the preview to drag the text box to position it. You can customize font size, color, and opacity before clicking "Add Text".' } }, { '@type': 'Question', name: 'Can I move the text on the page?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Click and drag the text box to move it anywhere on the page.' } }, { '@type': 'Question', name: 'Are my PDF files safe when I add text?', acceptedAnswer: { '@type': 'Answer', text: 'Your privacy and security are our top priorities. Text adding operations are performed directly in your browser. Your PDF files are processed in your browser and are not uploaded to a PDFClear server.' } } ]}), []);

  return (
    <div>
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Add custom text boxes to specific pages of your PDF document. Position, size, and color text visually in your browser. Free, private, and no PDFClear server upload." />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>Add Text to PDF - Type & Write on Documents | PDFClear</title>
        
        {/* Open Graph */}
        <meta property="og:title" content={`Add Text to PDF - Type & Write on Documents | ${BRAND}`} />
        <meta property="og:description" content="Add custom text boxes to specific pages of your PDF document. Position, size, and color text visually in your browser. Free, private, and no PDFClear server upload." />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Add Text to PDF - Type & Write on Documents | ${BRAND}`} />
        <meta name="twitter:description" content="Add custom text boxes to specific pages of your PDF document. Position, size, and color text visually in your browser. Free, private, and no PDFClear server upload." />
        {/* Keywords */}
        <meta name="keywords" content="add text to pdf, write on pdf, type on pdf, pdf editor, fill out pdf, free pdf tool, online pdf editor, secure pdf" />
        
        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>
      
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          Add Text to PDF - Free Online Tool
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Easily insert custom, resizable text onto any page of your PDF document. Type, drag, resize, and style your text directly in your browser.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <div className="inline-flex items-center gap-2">
              <PencilSquareIcon className="h-5 w-5 text-brand-500" />
              <span>Add Custom Text</span>
          </div>
          <div className="inline-flex items-center gap-2">
              <ArrowsPointingOutIcon className="h-5 w-5 text-brand-500" />
              <span>Drag & Reposition</span>
          </div>
          <div className="inline-flex items-center gap-2">
              <PaintBrushIcon className="h-5 w-5 text-brand-500" />
              <span>Style & Color</span>
          </div>
          <div className="inline-flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
              <span>Browser-based</span>
          </div>
      </div>
      </header>

      {!operationCompleted && <FileUpload />}

      {!operationCompleted && pdfFile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4 p-4 bg-light-card dark:bg-dark-card rounded-lg text-left">
            <div>
              <label htmlFor="text-input" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Text to Add</label>
              <textarea
                id="text-input"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                rows={3}
                disabled={processing}
                placeholder="Enter your text here..."
                className="input-style"
              />
            </div>

            <div>
              <label htmlFor="font-size" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Font Size</label>
              <input
                type="number"
                id="font-size"
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                min="8"
                max="144"
                disabled={processing}
                className="input-style"
              />
            </div>

            <div>
              <label htmlFor="font-color" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Font Color</label>
              <input
                type="color"
                id="font-color"
                value={fontColor}
                onChange={e => setFontColor(e.target.value)}
                disabled={processing}
                className="w-full h-10 p-1 rounded-md border border-border-light dark:border-border-dark bg-white dark:bg-dark-card cursor-pointer disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="text-opacity" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Opacity ({opacity.toFixed(2)})</label>
              <input
                type="range"
                id="text-opacity"
                min="0.1"
                max="1"
                step="0.05"
                value={opacity}
                onChange={e => setOpacity(Number(e.target.value))}
                disabled={processing}
                className="w-full accent-brand-500 cursor-pointer disabled:opacity-50"
              />
            </div>

            <div className="text-center">
              <button
                onClick={handleApplyText}
                disabled={processing || !textInput.trim()}
                className="btn-primary"
              >
                Download Result
              </button>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="mb-2">
              <label htmlFor="select-page" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Select Page to Edit:</label>
              <select
                id="select-page"
                value={selectedPage}
                onChange={e => setSelectedPage(Number(e.target.value))}
                disabled={processing}
                className="input-style"
              >
                {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                  <option key={page} value={page}>Page {page}</option>
                ))}
              </select>
            </div>

            {selectedPage > 0 && (
              <div ref={containerRef} className="relative w-full aspect-[8.5/11] shadow-lg rounded-md overflow-hidden">
                {processing && <div className="absolute inset-0 flex items-center justify-center bg-light-card/70 dark:bg-dark-card/70 z-20"><Spinner /></div>}
                <canvas ref={pdfCanvasRef} className="absolute top-0 left-0 w-full h-full z-0" />
                <canvas
                  ref={textCanvasRef}
                  className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing z-10"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>
            )}
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Drag the text to reposition it.</p>
          </div>
        </div>
      )}
      
      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Adding Text to PDFs</h2>
          <details className="faq-details">
            <summary className="faq-summary">How do I add text to my PDF?</summary>
            <p className="faq-answer">
              Upload your PDF, type your desired text, and then use the preview to drag the text box to position it. You can customize font size, color, and opacity before clicking "Add Text".
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">Can I move the text on the page?</summary>
            <p className="faq-answer">
              Yes. Click and drag the text box to move it anywhere on the page.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">Are my PDF files safe when I add text?</summary>
            <p className="faq-answer">
              Your privacy and security are our top priorities. Text adding operations are performed directly in your browser. Your PDF files are processed in your browser and are not uploaded to a PDFClear server.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default AddTextPage;
