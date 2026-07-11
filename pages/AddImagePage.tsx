import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import Spinner from '../components/Spinner';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import FileUpload from '../components/FileUpload';
import { PhotoIcon, ArrowsPointingOutIcon, AdjustmentsHorizontalIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

GlobalWorkerOptions.workerSrc = workerUrl;

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/add-image-to-pdf/';
const BRAND = 'PDFClear';

interface DraggableImage {
  file: File;
  url: string;
  // Position and dimensions are now stored relative to the canvas (which scales to the container)
  width: number;
  height: number;
  x: number;
  y: number;
  opacity: number;
  aspectRatio: number;
}

const AddImagePage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
  const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');

  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [imageToAdd, setImageToAdd] = useState<File | null>(null);
  const [draggableImage, setDraggableImage] = useState<DraggableImage | null>(null);
  const [numPages, setNumPages] = useState<number>(0);

  // New state for user-controlled dimensions (as percentage of page width/height)
  const [imageWidthPercent, setImageWidthPercent] = useState(25);
  const [imageHeightPercent, setImageHeightPercent] = useState(25);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);   // background canvas
  const imageCanvasRef = useRef<HTMLCanvasElement>(null); // overlay canvas
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(new Image());

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const originalImageX = useRef(0);
  const originalImageY = useRef(0);
  
  // Store the actual PDF page dimensions (in PDF units, 72 DPI) for accurate scaling calculations
  const pdfPageDimensions = useRef<{ width: number, height: number, scale: number }>({ width: 0, height: 0, scale: 0 });

  // Load PDF metadata
  useEffect(() => {
    const loadPdf = async () => {
      if (!pdfFile) {
        setNumPages(0);
        return;
      };
      const buffer = await pdfFile.file.arrayBuffer();
      const pdf = await getDocument({ data: buffer }).promise;
      setNumPages(pdf.numPages);
      setSelectedPage(1); // Reset selected page when new PDF is loaded
    };
    loadPdf();
  }, [pdfFile]);

  // Render PDF page into background canvas and calculate scale
  useEffect(() => {
    const renderPdfPage = async () => {
      if (!pdfFile || selectedPage <= 0) return;

      const pdfCanvas = pdfCanvasRef.current;
      const container = containerRef.current;
      if (!pdfCanvas || !container) return;

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

      const overlay = imageCanvasRef.current;
      if (overlay) {
        overlay.width = scaledViewport.width;
        overlay.height = scaledViewport.height;
      }
      
      // Store PDF dimensions and scale relative to the canvas size
      pdfPageDimensions.current = {
        width: viewport.width,
        height: viewport.height,
        scale: scale,
      };

      await page.render({ canvas: pdfCanvas, canvasContext: ctx, viewport: scaledViewport }).promise;
    };

    renderPdfPage();
  }, [pdfFile, selectedPage]);

  // Handle image selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/jpeg') || file.type.startsWith('image/png'))) {
      setImageToAdd(file);
    } else {
      setImageToAdd(null);
      showMessage('Please select a JPG or PNG image.', 'error');
    }
  };

  // Load image, calculate aspect ratio, and initialize position/size state
  useEffect(() => {
    if (imageToAdd && imageCanvasRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = imgRef.current;
        img.onload = () => {
          const canvas = imageCanvasRef.current;
          if (!canvas) return;
          
          const aspectRatio = img.width / img.height;

          // Initial size calculation based on 25% of canvas width
          const initialWidth = canvas.width * 0.25;
          const initialHeight = initialWidth / aspectRatio;

          // Set initial percentage states
          setImageWidthPercent(25);
          setImageHeightPercent(Math.round((initialHeight / canvas.height) * 100));

          setDraggableImage({
            file: imageToAdd,
            url: e.target?.result as string,
            width: initialWidth,
            height: initialHeight,
            x: (canvas.width - initialWidth) / 2,
            y: (canvas.height - initialHeight) / 2,
            opacity: 1,
            aspectRatio: aspectRatio,
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageToAdd);
    } else {
      setDraggableImage(null);
    }
    return () => {
      if (imgRef.current) imgRef.current.onload = null;
    };
  }, [imageToAdd, showMessage]);

  // Effect to update draggableImage dimensions when percentage inputs change
  useEffect(() => {
    const canvas = imageCanvasRef.current;
    if (!draggableImage || !canvas) return;

    const newWidth = canvas.width * (imageWidthPercent / 100);
    let newHeight = canvas.height * (imageHeightPercent / 100);

    if (lockAspectRatio) {
        newHeight = newWidth / draggableImage.aspectRatio;
    }

    setDraggableImage(prev => prev ? {
        ...prev,
        width: newWidth,
        height: newHeight,
    } : null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageWidthPercent, imageHeightPercent, lockAspectRatio, imageCanvasRef.current?.width, imageCanvasRef.current?.height, draggableImage?.aspectRatio]);


  // Draw overlay with draggable image
  const drawImageOverlay = useCallback(() => {
    const canvas = imageCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (draggableImage) {
      ctx.save();
      ctx.globalAlpha = draggableImage.opacity;
      ctx.drawImage(imgRef.current, draggableImage.x, draggableImage.y, draggableImage.width, draggableImage.height);
      ctx.restore();

      // Draw bounding box (no resize handle needed now)
      ctx.strokeStyle = "rgba(0, 123, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(draggableImage.x, draggableImage.y, draggableImage.width, draggableImage.height);
      ctx.setLineDash([]);
    }
  }, [draggableImage]);

  useEffect(() => {
    drawImageOverlay();
  }, [drawImageOverlay]);

  // Drag handlers (only for moving)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggableImage || processing) return;
    e.preventDefault();
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if click is inside the image bounding box
    if (
      mouseX > draggableImage.x && mouseX < draggableImage.x + draggableImage.width &&
      mouseY > draggableImage.y && mouseY < draggableImage.y + draggableImage.height
    ) {
      isDragging.current = true;
      dragStartX.current = mouseX;
      dragStartY.current = mouseY;
      originalImageX.current = draggableImage.x;
      originalImageY.current = draggableImage.y;
    }
  }, [draggableImage, processing]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || !draggableImage || processing) return;
    e.preventDefault();
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - dragStartX.current;
    const dy = mouseY - dragStartY.current;

    // Only update position
    setDraggableImage(prev => prev ? {
      ...prev,
      x: originalImageX.current + dx,
      y: originalImageY.current + dy
    } : null);
  }, [draggableImage, processing]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Handle dimension input changes
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newWidthPercent = Number(e.target.value);
    newWidthPercent = Math.min(100, Math.max(1, newWidthPercent));
    setImageWidthPercent(newWidthPercent);

    if (lockAspectRatio && draggableImage) {
        const canvas = imageCanvasRef.current;
        if (!canvas) return;
        const newWidth = canvas.width * (newWidthPercent / 100);
        const newHeight = newWidth / draggableImage.aspectRatio;
        const newHeightPercent = Math.round((newHeight / canvas.height) * 100);
        setImageHeightPercent(newHeightPercent);
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newHeightPercent = Number(e.target.value);
    newHeightPercent = Math.min(100, Math.max(1, newHeightPercent));
    setImageHeightPercent(newHeightPercent);

    if (lockAspectRatio && draggableImage) {
        const canvas = imageCanvasRef.current;
        if (!canvas) return;
        const newHeight = canvas.height * (newHeightPercent / 100);
        const newWidth = newHeight * draggableImage.aspectRatio;
        const newWidthPercent = Math.round((newWidth / canvas.width) * 100);
        setImageWidthPercent(newWidthPercent);
    }
  };


  // Apply image to PDF
  const handleApplyImage = async () => {
    if (!pdfFile || !draggableImage || !imageToAdd) {
      showMessage('Please upload a PDF and an image first, then position the image.', 'error');
      return;
    }
    if (selectedPage === 0) {
      showMessage('Please select a page to add the image to.', 'error');
      return;
    }

    setProcessing(true);
    showMessage('Adding image to PDF...', 'info');
    try {
      const overlay = imageCanvasRef.current;
      const { width: pdfWidth, height: pdfHeight } = pdfPageDimensions.current;

      if (!overlay || pdfWidth === 0) throw new Error("Canvas or PDF dimensions not available.");

      // Scale factors to convert from canvas rendering size back to original PDF unit size
      const scaleX = pdfWidth / overlay.width;
      const scaleY = pdfHeight / overlay.height;

      // Convert canvas coordinates (x, y, width, height) to PDF units (0,0 is bottom-left)
      const finalWidth = draggableImage.width * scaleX;
      const finalHeight = draggableImage.height * scaleY;
      const finalX = draggableImage.x * scaleX;
      
      // PDF-LIB Y-coordinate = PDF_HEIGHT - (Canvas_Y_Coordinate + Image_Height) * Scale_Y
      const finalY = pdfHeight - (draggableImage.y * scaleY) - finalHeight;

      const downloadResult = await pdfService.addImageToPdf(
        pdfFile, imageToAdd, selectedPage - 1, // pageIndex is 0-based for pdf-lib
        finalX, finalY, finalWidth, finalHeight, draggableImage.opacity
      );
      showMessage('Image added successfully!', 'success');
      showPostOperationSuccess(downloadResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      showMessage(`Error: ${message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // --- JSON-LD Structured Data ---
  const jsonLdWebPage = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Add Image to PDF - Insert Pictures & Photos | ${BRAND}`,
    url: PAGE_URL,
    description: 'Easily insert JPG or PNG images into your PDF documents. Drag, resize, adjust opacity, and place pictures visually in your browser, no PDFClear server upload needed.'
  }), []);

  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Add Image to PDF Tool',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    url: PAGE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: BRAND },
    featureList: [ 'Insert JPG to PDF', 'Insert PNG to PDF', 'Place photo on PDF', 'Drag and drop image positioning', 'Image resizing on PDF', 'Adjust image opacity', 'Client-side PDF processing', 'Free to use', 'Secure and private' ]
  }), []);

  const jsonLdFAQ = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How do I add an image to a PDF?', acceptedAnswer: { '@type': 'Answer', text: 'First, upload your PDF document. Then, select a JPG or PNG image to add. You will see a live preview where you can drag the image to your desired position, set its size using percentage inputs, and adjust its opacity. Once satisfied, click "Add Image" to apply the changes.' } },
      { '@type': 'Question', name: 'What image formats are supported?', acceptedAnswer: { '@type': 'Answer', text: 'Our tool supports JPG/JPEG and PNG image formats for insertion into your PDF documents.' } },
      { '@type': 'Question', name: 'Can I resize and move the image after adding it?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Click and drag the image box to move it anywhere on the page. You can set the image size using the Width and Height percentage inputs in the control panel, with an option to lock the aspect ratio.' } },
      { '@type': 'Question', name: 'Is it safe to add images to PDFs online with PDFClear?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, it is designed to be safe. Adding pictures runs directly in your browser. Your PDF and image files are processed in your browser and are not uploaded to a PDFClear server.' } },
      { '@type': 'Question', name: 'Can I add multiple images to different pages?', acceptedAnswer: { '@type': 'Answer', text: 'Currently, the tool allows you to add one image at a time to a selected page. To add more images, you would repeat the process for each image and page.' } }
    ]
  }), []);

  return (
    <div>
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Add images (JPG, PNG) to specific pages of your PDF document. Visually place, resize, and insert pictures directly in your browser with PDFClear. No PDFClear server upload, browser-based." />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>Add Image to PDF - Insert Pictures & Photos | PDFClear</title>
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta property="og:title" content={`Add Image to PDF - Insert Pictures & Photos | ${BRAND}`} />
        <meta property="og:description" content="Easily insert JPG or PNG images into your PDF documents. Drag, resize, adjust opacity, and place pictures visually in your browser, no PDFClear server upload needed." />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Add Image to PDF - Insert Pictures & Photos | ${BRAND}`} />
        <meta name="twitter:description" content="Easily insert JPG or PNG images into your PDF documents. Drag, resize, adjust opacity, and place pictures visually in your browser, no PDFClear server upload needed." />
        {/* Keywords */}
        <meta name="keywords" content="add image to PDF, insert JPG to PDF, insert PNG to PDF, place photo on PDF, add picture to pdf, PDF image editor, free PDF tools, client-side PDF" />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>
      
      {/* Enhanced Header / Value props */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          Add Image to PDF - Insert Pictures
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Easily insert JPG or PNG images into specific pages of your PDF document. Visually drag, resize, and adjust opacity — all securely in your browser without uploading files.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <div className="inline-flex items-center gap-2">
              <PhotoIcon className="h-5 w-5 text-brand-500" />
              <span>Insert JPG & PNG</span>
          </div>
          <div className="inline-flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-brand-500" />
              <span>Opacity Control</span>
          </div>
          <div className="inline-flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
              <span>Browser-based</span>
          </div>
      </div>
      </header>
      
      {/* File Upload Component */}
      {!operationCompleted && (
        <div className="mt-6">
          <FileUpload /> {/* Keep FileUpload here as it manages file state */}
        </div>
      )}

      {!operationCompleted && pdfFile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="md:col-span-1 space-y-4 p-4 bg-light-card dark:bg-dark-card rounded-lg text-left">
            <div>
              <label htmlFor="image-file" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Upload Image</label>
              <input
                type="file"
                id="image-file"
                accept="image/jpeg,image/png"
                onChange={handleImageFileChange}
                disabled={processing}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
                           file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700
                           hover:file:bg-brand-100 dark:file:bg-brand-900/50 dark:file:text-brand-300
                           dark:hover:file:bg-brand-900 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {draggableImage && (
              <>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="image-width" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Width (% Page)</label>
                        <input
                            type="number"
                            id="image-width"
                            min="1"
                            max="100"
                            step="1"
                            value={imageWidthPercent}
                            onChange={handleWidthChange}
                            disabled={processing}
                            className="input-style"
                        />
                    </div>
                    <div>
                        <label htmlFor="image-height" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Height (% Page)</label>
                        <input
                            type="number"
                            id="image-height"
                            min="1"
                            max="100"
                            step="1"
                            value={imageHeightPercent}
                            onChange={handleHeightChange}
                            disabled={processing || (lockAspectRatio && !!draggableImage)}
                            className="input-style"
                        />
                    </div>
                </div>
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={lockAspectRatio} 
                        onChange={(e) => setLockAspectRatio(e.target.checked)} 
                        disabled={processing || !draggableImage}
                        className="h-4 w-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                    />
                    <span className="ml-2 text-sm text-text-light-primary dark:text-text-dark-primary">Lock Aspect Ratio</span>
                </label>

                <div>
                  <label htmlFor="image-opacity" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                    Opacity ({draggableImage.opacity.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    id="image-opacity"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={draggableImage.opacity}
                    onChange={e => setDraggableImage(prev => prev ? { ...prev, opacity: Number(e.target.value) } : null)}
                    disabled={processing}
                    className="w-full accent-brand-500 cursor-pointer disabled:opacity-50"
                  />
                </div>

                <div className="text-center">
                  <button
                    onClick={handleApplyImage}
                    disabled={processing}
                    className="btn-primary"
                  >
                    Download Result
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Preview */}
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
                <option value={0} disabled>Select a page</option>
                {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                  <option key={page} value={page}>Page {page}</option>
                ))}
              </select>
            </div>

            {selectedPage > 0 && (
              <div
                ref={containerRef}
                className="relative w-full aspect-[8.5/11] shadow-lg rounded-md overflow-hidden"
              >
                {processing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-light-card/70 dark:bg-dark-card/70 z-10">
                    <Spinner />
                  </div>
                )}
                <canvas ref={pdfCanvasRef} className="absolute top-0 left-0 w-full h-full" />
                <canvas
                  ref={imageCanvasRef}
                  className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>
            )}

            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Drag the image to reposition it. Adjust size using the controls on the left.
            </p>
          </div>
        </div>
      )}

      {/* Feature Highlight Cards */}
      {!operationCompleted && (
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="feature-card">
          <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Visual Placement</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Drag and drop your image directly onto the PDF preview for perfect positioning.
          </p>
        </div>
        <div className="feature-card">
          <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Flexible Customization</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Set image size precisely using percentage inputs, with optional aspect ratio lock.
          </p>
        </div>
        <div className="feature-card">
          <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Private & Secure</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Processing happens in your browser. Your files are not uploaded to a PDFClear server.
          </p>
        </div>
      </div>
      )}
      
      {/* Frequently Asked Questions Section */}
      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Adding Images to PDFs</h2>

          <details className="faq-details">
            <summary className="faq-summary">How do I insert an image into my PDF?</summary>
            <p className="faq-answer">
              First, upload your PDF document. Then, select a JPG or PNG image to add. You will see a live preview where you can drag the image to your desired position, set its size using percentage inputs, and adjust its opacity. Once satisfied, click "Add Image" to apply the changes.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">What image formats are supported?</summary>
            <p className="faq-answer">
              Our tool supports JPG/JPEG and PNG image formats for insertion into your PDF documents.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Can I resize and move the image after adding it?</summary>
            <p className="faq-answer">
              Yes. Click and drag the image box to move it anywhere on the page. You can set the image size using the Width and Height percentage inputs in the control panel, with an option to lock the aspect ratio.
            </p>
          </details>
          
          <details className="faq-details">
            <summary className="faq-summary">Is it safe to add images to PDFs online with PDFClear?</summary>
            <p className="faq-answer">
              Yes, it is designed to be safe. Adding images runs directly in your browser. Your PDF and image files are processed in your browser and are not uploaded to a PDFClear server.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Can I add multiple images to different pages?</summary>
            <p className="faq-answer">
              Currently, the tool allows you to add one image at a time to a selected page. To add more images, you would repeat the process for each image and page.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default AddImagePage;
