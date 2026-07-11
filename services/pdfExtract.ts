import * as pdfjsLib from "pdfjs-dist";
import Tesseract from 'tesseract.js';

// Import the worker URL dynamically from the installed package
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Point to the correct worker file that matches the installed API version
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Helper to run OCR on a canvas element.
 */
const performOcrOnCanvas = async (
    canvas: HTMLCanvasElement, 
    lang: string, 
    onProgress?: (p: Tesseract.LoggerMessage) => void
): Promise<string> => {
    const { data: { text } } = await Tesseract.recognize(
      canvas,
      lang,
      { logger: onProgress }
    );
    return text || '';
};

/**
 * Helper to render a high-resolution canvas of a PDF page for OCR.
 */
const renderPageForOcr = async (page: pdfjsLib.PDFPageProxy): Promise<HTMLCanvasElement> => {
    const scale = 2.0; // Higher resolution for better OCR accuracy
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true }); // Enable readback optimizations
    if (!context) throw new Error('Could not get canvas context');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    // --- ENHANCED: Image preprocessing for better OCR ---
    // Grayscale conversion using the Luma formula for better contrast
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = avg;     // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }
    context.putImageData(imageData, 0, 0);
    // --- END: Image preprocessing ---

    return canvas;
};

/**
 * Extracts text from each page of a PDF. If a page has minimal text,
 * it automatically switches to OCR to extract text from images.
 * @param file The PDF file to process.
 * @param options Configuration for language and progress reporting.
 * @returns An array of objects, each containing the page number and its extracted text.
 */
export async function extractPdfTextPerPageSmart(
    file: File,
    options: {
        lang?: string;
        onProgress?: (progress: { type: 'reading' | 'ocr'; page: number; total: number; ocrStatus?: string; ocrProgress?: number }) => void;
    } = {}
): Promise<{ pageNum: number, text: string }[]> {
    const { lang = 'eng', onProgress } = options;
    const OCR_TEXT_THRESHOLD = 50; // Chars per page to trigger OCR

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const pagesText: { pageNum: number, text: string }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        onProgress?.({ type: 'reading', page: i, total: pdf.numPages });
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const textItems = textContent.items.map((item: any) => item.str);
        let pageText = textItems.join(' ').trim();

        // If text content is very sparse, assume it's a scanned page and run OCR
        if (pageText.replace(/\s/g, '').length < OCR_TEXT_THRESHOLD) {
            const canvas = await renderPageForOcr(page);
            const ocrText = await performOcrOnCanvas(canvas, lang, (m) => {
                if (m.status === 'recognizing text') {
                    onProgress?.({
                        type: 'ocr',
                        page: i,
                        total: pdf.numPages,
                        ocrStatus: m.status,
                        ocrProgress: Math.round((m.progress || 0) * 100)
                    });
                }
            });
            pageText = ocrText;
        }

        pagesText.push({ pageNum: i, text: pageText });
    }

    return pagesText;
}


export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return fullText;
}

export async function extractPdfTextPerPage(file: File): Promise<{ pageNum: number, text: string }[]> {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const pagesText: { pageNum: number, text: string }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        pagesText.push({ pageNum: i, text: strings.join(" ") });
    }

    return pagesText;
}
