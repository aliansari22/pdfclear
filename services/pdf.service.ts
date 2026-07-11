import { UploadedFile } from '../types';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

import { PDFDocument, rgb, StandardFonts, degrees, PageSizes, BlendMode, PDFFont, PDFPage, Color, TextAlignment } from 'pdf-lib';
import JSZip from 'jszip';
import html2pdf from 'html2pdf.js';
import { marked } from 'marked'; 
import { jsPDF } from 'jspdf';
import PdfWorker from '../workers/pdf.worker.ts?worker'; 
import { createWorkerBridge } from '../utils/workerBridge';
import { sanitizeHtml } from '../utils/sanitizeHtml';

declare global {
    interface Window {
        docxpdf: any;
        pdfjsLib: any;
        JSZip: any;
        html2pdf: any;
        marked: any;
    }
}

export interface DownloadResult {
  data: Uint8Array | Blob;
  filename: string;
  mimeType: string;
}

export interface MetadataOptions {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
}

export interface RotationInstruction {
    range: string;
    angle: number;
}

export interface WatermarkOptions {
    type: 'text' | 'image';
    text?: string;
    imageBytes?: ArrayBuffer;
    font?: string;
    fontSize?: number;
    color?: string;
    opacity?: number;
    angle?: number;
    position?: 'center' | 'bottom_left' | 'bottom_right' | 'top_left' | 'top_right' | 'bottom_center' | 'tiled';
}

export interface PageNumberOptions {
    format: '1' | '1 / n' | 'Page 1' | 'Page 1 of n';
    position: 'top_left' | 'top_center' | 'top_right' | 'bottom_left' | 'bottom_center' | 'bottom_right';
    margin: number;
    fontSize: number;
    pages: string;
    color?: string;
}

export interface HtmlToPdfOptions {
    margin: { top: number; right: number; bottom: number; left: number };
    pageSize: string;
    orientation: 'portrait' | 'landscape';
}

export interface ImageToPdfOptions {
    marginMm: number;
}

export type FlipDirection = 'horizontal' | 'vertical';

// New Interface for Batch Text Adding (Fill Form)
export interface TextItem {
    text: string;
    pageIndex: number;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    opacity: number;
}

// --- Optional custom font loading for jsPDF ---
// The open-source repository does not bundle font binaries. Set this value at
// build time if your deployment needs a custom Unicode-capable font. When no
// custom font is configured or the font cannot be fetched, jsPDF falls back to
// its built-in Helvetica font.
let mainThreadCustomFont: ArrayBuffer | null = null;
const customFontURL = import.meta.env.VITE_PDF_CUSTOM_FONT_URL?.trim() || '';

async function configureMainThreadJsPdfFont(pdf: jsPDF): Promise<void> {
    if (!customFontURL) {
        pdf.setFont('helvetica', 'normal');
        return;
    }

    try {
        if (!mainThreadCustomFont) {
            const response = await fetch(customFontURL);
            if (!response.ok) {
                throw new Error(`Failed to fetch custom font from ${customFontURL}.`);
            }
            mainThreadCustomFont = await response.arrayBuffer();
        }

        let binary = '';
        const bytes = new Uint8Array(mainThreadCustomFont);
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const fontBase64 = btoa(binary);
        pdf.addFileToVFS('PDFClearCustom-Regular.ttf', fontBase64);
        pdf.addFont('PDFClearCustom-Regular.ttf', 'PDFClearCustom', 'normal');
        pdf.setFont('PDFClearCustom', 'normal');
    } catch (error) {
        console.warn('Falling back to jsPDF built-in Helvetica font.', error);
        pdf.setFont('helvetica', 'normal');
    }
}

// Natural sort function for filenames
const naturalSort = (a: string, b: string): number => {
    const re = /(\d+)|(\D+)/g;
    const aParts = a.match(re) || [];
    const bParts = b.match(re) || [];

    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];
        const aIsNumber = !isNaN(parseInt(aPart, 10));
        const bIsNumber = !isNaN(parseInt(bPart, 10));
        if (aIsNumber && bIsNumber) {
            const aNum = parseInt(aPart, 10);
            const bNum = parseInt(bPart, 10);
            if (aNum !== bNum) return aNum - bNum;
        } else {
            if (aPart !== bPart) return aPart.localeCompare(bPart);
        }
    }
    return a.length - b.length;
};

const worker = new PdfWorker();
const workerBridge = createWorkerBridge(worker);

const callWorker = (
    type: string,
    payload: any,
    onProgress?: (progress: number) => void
): Promise<DownloadResult> => {
    const transferables = payload.transferables || [];
    const cleanPayload = { ...payload };
    delete cleanPayload.transferables;
    return workerBridge.call<DownloadResult>({ type, payload: cleanPayload, transferables }, onProgress).promise;
};

const createOutputFilename = (originalName: string, operation: string, newExtension: string): string => {
    const nameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    return `${nameWithoutExtension}_${operation}.${newExtension}`;
};

export const prepareDownload = (
    data: Uint8Array | Blob, 
    filename: string, 
    mimeType: string
): DownloadResult => {
    return { data, filename, mimeType };
};

export const parsePageRanges = (rangeStr: string, totalPages: number): number[] => {
    if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(s => s.trim()).filter(s => s);
    for (const part of parts) {
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-').map(s => parseInt(s.trim(), 10));
            if (isNaN(startStr) || isNaN(endStr) || startStr < 1 || endStr > totalPages || startStr > endStr) {
                throw new Error(`Invalid range: ${part}. Pages must be within 1 and ${totalPages}.`);
            }
            for (let i = startStr; i <= endStr; i++) pages.add(i);
        } else {
            const pageNum = parseInt(part, 10);
            if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
                throw new Error(`Invalid page number: ${part}. Must be between 1 and ${totalPages}.`);
            }
            pages.add(pageNum);
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
};

export async function readPdfMetadata(file: UploadedFile): Promise<MetadataOptions> {
    const buffer = await file.file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    const metadata = await pdf.getMetadata();
    const info = (metadata.info || {}) as Partial<Record<'Keywords' | 'Title' | 'Author' | 'Subject', string>>;
    let keywordsString = info.Keywords || metadata.metadata?.get('pdf:keywords') || '';
    const keywordsArray = keywordsString.split(',').map(k => k.trim()).filter(k => k);
    return {
        title: info.Title || metadata.metadata?.get('dc:title') || '',
        author: info.Author || metadata.metadata?.get('dc:creator') || '',
        subject: info.Subject || metadata.metadata?.get('dc:subject') || '',
        keywords: keywordsArray,
    };
}

export const mergePdfs = async (files: UploadedFile[], onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const filesArrayBuffers = await Promise.all(files.map(f => f.file.arrayBuffer()));
    const originalFilename = files.length > 0 ? files[0].file.name : 'merged.pdf';
    return callWorker('mergePdfs', { filesArrayBuffers, originalFilename, transferables: filesArrayBuffers }, onProgress);
};

export const splitPdf = async (file: UploadedFile, pageRangesStr: string, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    return callWorker('splitPdf', { pdfBuffer, pageRangesStr, originalFilename: file.file.name, transferables: [pdfBuffer] }, onProgress);
};

export const batchSplitPdf = async (file: UploadedFile, groups: string[], onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    return callWorker('batchSplitPdf', { pdfBuffer, groups, originalFilename: file.file.name, transferables: [pdfBuffer] }, onProgress);
};

export const deletePages = async (file: UploadedFile, pagesToDelete: number[], onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    return callWorker('deletePages', { pdfBuffer, pagesToDelete, originalFilename: file.file.name, transferables: [pdfBuffer] }, onProgress);
};

export const reorderPdfPages = async (file: UploadedFile, pageOrder: number[], onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    return callWorker('reorderPdfPages', { pdfBuffer, pageOrder, originalFilename: file.file.name, transferables: [pdfBuffer] }, onProgress);
};

export const flipPdfPages = async (file: UploadedFile, pagesToFlip: number[], direction: FlipDirection, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    return callWorker('flipPdfPages', { pdfBuffer, pagesToFlip, direction, originalFilename: file.file.name, transferables: [pdfBuffer] }, onProgress);
};

export const rotatePdf = async (file: UploadedFile, pagesToRotateStr: string, angle: number, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    console.warn("Using deprecated 'rotatePdf' service function. Consider `rotatePdfBatch`.");
    const pdfBuffer = await file.file.arrayBuffer();
    const totalPages = (await getDocument({ data: pdfBuffer }).promise).numPages;
    const rotationInstructions = [{ range: pagesToRotateStr, angle }];
    return callWorker('rotatePdfBatch', { pdfBuffer, rotationInstructions, originalFilename: file.file.name, totalPages, transferables: [pdfBuffer] }, onProgress);
};

export const rotatePdfBatch = async (
    pdfBuffer: ArrayBuffer,
    rotationInstructions: RotationInstruction[],
    originalFilename: string,
    onProgress?: (p: number) => void
): Promise<DownloadResult> => {
    return callWorker('rotatePdfBatch', { pdfBuffer, rotationInstructions, originalFilename, transferables: [pdfBuffer] }, onProgress);
};

export const watermarkPdf = async (file: UploadedFile, options: WatermarkOptions, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    const transferables: Transferable[] = [pdfBuffer];
    if (options.imageBytes) transferables.push(options.imageBytes);
    return callWorker('watermarkPdf', { pdfBuffer, options, originalFilename: file.file.name, transferables }, onProgress);
};

export const addPageNumbers = async (file: UploadedFile, options: PageNumberOptions, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    return callWorker('addPageNumbers', { pdfBuffer, options, originalFilename: file.file.name, transferables: [pdfBuffer] }, onProgress);
};

export const editMetadata = async (file: UploadedFile, options: MetadataOptions, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    return callWorker('editMetadata', { pdfBuffer, options, originalFilename: file.file.name, transferables: [pdfBuffer] }, onProgress);
};

let qpdfModule: any = null;
async function _loadQpdfModule(onProgress?: (p: number) => void) {
  if (!qpdfModule) {
    try {
      onProgress?.(5);
      const qpdfUrl = new URL('/qpdf.mjs', window.location.origin).toString();
      const mod = await import(/* @vite-ignore */ qpdfUrl);
      onProgress?.(20);
      const createModule = mod.default || mod;
      qpdfModule = await createModule({
        locateFile: (p: string) => p.endsWith('.wasm') ? '/qpdf.wasm' : p,
        noInitialRun: true,
      });
      onProgress?.(40);
    } catch (err) {
      console.error('Failed to load qpdf-wasm:', err);
      throw new Error('Failed to load PDF engine. Check internet connection.');
    }
  }
  return qpdfModule;
}

export const compressPdf = async (file: UploadedFile, compressionLevel: number, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const qpdf = await _loadQpdfModule(onProgress);
    const pdfBuffer = await file.file.arrayBuffer();
    const outputFilename = createOutputFilename(file.file.name, 'compressed', 'pdf');
    const inName = `in_${Date.now()}.pdf`;
    const outName = `out_${Date.now()}.pdf`;
    try {
        onProgress?.(50);
        qpdf.FS.writeFile(inName, new Uint8Array(pdfBuffer));
        let args: string[];
        if (compressionLevel <= 5) args = ['--linearize', inName, outName];
        else args = ['--recompress-flate', '--object-streams=generate', inName, outName];
        onProgress?.(60);
        qpdf.callMain(args);
        onProgress?.(90);
        const outBytes = qpdf.FS.readFile(outName);
        if (outBytes.length === 0) throw new Error('Compression resulted in empty file.');
        return prepareDownload(outBytes, outputFilename, 'application/pdf');
    } catch (error: any) {
        console.error('QPDF error:', error);
        throw new Error(`Failed to compress PDF: ${error.message || 'Unknown error'}`);
    } finally {
        try { qpdf.FS.unlink(inName); } catch (_) {}
        try { qpdf.FS.unlink(outName); } catch (_) {}
        onProgress?.(100);
    }
};

export const protectPdf = async (file: UploadedFile, password: string, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const qpdf = await _loadQpdfModule(onProgress);
    const arrayBuffer = await file.file.arrayBuffer();
    const outputFilename = createOutputFilename(file.file.name, 'protected', 'pdf');
    const inName = `in_${Date.now()}.pdf`;
    const outName = `out_${Date.now()}.pdf`;
    try {
        onProgress?.(50);
        qpdf.FS.writeFile(inName, new Uint8Array(arrayBuffer));
        const args = ['--encrypt', password, password, '256', '--', inName, outName];
        onProgress?.(60);
        qpdf.callMain(args);
        onProgress?.(90);
        const outBytes = qpdf.FS.readFile(outName);
        if (outBytes.length === 0) throw new Error('Protection resulted in empty file.');
        return prepareDownload(outBytes, outputFilename, 'application/pdf');
    } catch (err: any) {
        throw new Error(`Failed to protect PDF: ${err.message || 'Unknown error'}`);
    } finally {
        try { qpdf.FS.unlink(inName); } catch {}
        try { qpdf.FS.unlink(outName); } catch {}
        onProgress?.(100);
    }
};

export const unlockPdf = async (file: UploadedFile, userPass: string, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const qpdf = await _loadQpdfModule(onProgress);
    const pdfBuffer = await file.file.arrayBuffer();
    const outputFilename = createOutputFilename(file.file.name, 'unlocked', 'pdf');
    const inName = `in_${Date.now()}.pdf`;
    const outName = `out_${Date.now()}.pdf`;
    try {
        onProgress?.(50);
        qpdf.FS.writeFile(inName, new Uint8Array(pdfBuffer));
        const args = ['--decrypt', `--password=${userPass}`, '--', inName, outName];
        onProgress?.(60);
        qpdf.callMain(args);
        onProgress?.(90);
        const outBytes = qpdf.FS.readFile(outName);
        return prepareDownload(outBytes, outputFilename, 'application/pdf');
    } catch (error: any) {
        console.error('QPDF decryption error:', error);
        if (error.message && error.message.includes('qpdf: ERROR')) {
            const qpdfError = error.message.split('qpdf: ERROR:')[1]?.trim();
            if (qpdfError && qpdfError.includes('incorrect password')) throw new Error('Incorrect password. Please try again.');
            if (qpdfError && qpdfError.includes('not encrypted')) throw new Error('This PDF is not encrypted.');
            throw new Error(`PDF unlocking failed: ${qpdfError || 'QPDF error'}`);
        }
        throw new Error(`Failed to unlock PDF: ${error.message || 'Unknown error'}`);
    } finally {
        try { qpdf.FS.unlink(inName); } catch (_) {}
        try { qpdf.FS.unlink(outName); } catch (_) {}
        onProgress?.(100);
    }
};

export const addImageToPdf = async (
    pdfFile: UploadedFile, 
    imageFile: File, 
    pageIndex: number, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    opacity: number,
    onProgress?: (p: number) => void
): Promise<DownloadResult> => {
    const pdfBuffer = await pdfFile.file.arrayBuffer();
    const imageBuffer = await imageFile.arrayBuffer();
    return callWorker('addImageToPdf', { pdfBuffer, imageBuffer, pageIndex, x, y, width, height, opacity, originalFilename: pdfFile.file.name, transferables: [pdfBuffer, imageBuffer] }, onProgress);
};

export const addTextToPdf = async (
    pdfFile: UploadedFile, 
    text: string, 
    pageIndex: number, 
    x: number, 
    y: number, 
    fontSize: number, 
    fontColor: string, 
    opacity: number,
    onProgress?: (p: number) => void
): Promise<DownloadResult> => {
    const pdfBuffer = await pdfFile.file.arrayBuffer();
    return callWorker('addTextToPdf', { pdfBuffer, text, pageIndex, x, y, fontSize, fontColor, opacity, originalFilename: pdfFile.file.name, transferables: [pdfBuffer] }, onProgress);
};

// --- FIX: THIS WAS MISSING ---
export const batchAddText = async (
    file: UploadedFile, 
    texts: TextItem[], 
    onProgress?: (p: number) => void
): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    return callWorker('batchAddText', { pdfBuffer, texts, originalFilename: file.file.name, transferables: [pdfBuffer] }, onProgress);
};
// ------------------------------

const readFilesForWorker = async (
    files: UploadedFile[],
    onProgress?: (p: number) => void,
    startProgress = 1,
    endProgress = 10
): Promise<{ buffer: ArrayBuffer; type: string; name: string }[]> => {
    const filesData: { buffer: ArrayBuffer; type: string; name: string }[] = [];
    onProgress?.(startProgress);
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        filesData.push({
            buffer: await f.file.arrayBuffer(),
            type: f.file.type,
            name: f.file.name
        });
        const pct = startProgress + Math.round(((i + 1) / Math.max(1, files.length)) * (endProgress - startProgress));
        onProgress?.(pct);
    }
    return filesData;
};

export const convertToPdf = async (files: UploadedFile[], onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const filesData = await readFilesForWorker(files, onProgress);
    const originalFilename = files.length > 0 ? files[0].file.name : 'converted.pdf';
    const transferables: Transferable[] = filesData.map(f => f.buffer);
    return callWorker('convertToPdf', { filesData, originalFilename, transferables }, (workerProgress) => {
        const pct = 10 + Math.round((Math.max(0, Math.min(100, workerProgress)) / 100) * 85);
        onProgress?.(pct);
    });
};

export const convertImagesToPdf = async (files: UploadedFile[], options: ImageToPdfOptions, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    const filesData = await readFilesForWorker(files, onProgress);
    const originalFilename = files.length > 0 ? files[0].file.name : 'converted.pdf';
    const transferables: Transferable[] = filesData.map(f => f.buffer);
    return callWorker('convertImagesToPdf', { filesData, options, originalFilename, transferables }, (workerProgress) => {
        const pct = 10 + Math.round((Math.max(0, Math.min(100, workerProgress)) / 100) * 85);
        onProgress?.(pct);
    });
};

export const pdfToImages = async (
    file: UploadedFile,
    imageFormat: 'jpeg' | 'png',
    onProgress: (progress: number) => void,
    dpi: number = 150,
    pagesToConvert?: number[]
): Promise<DownloadResult> => {
    onProgress(0);
    const pdfBuffer = await file.file.arrayBuffer();
    const pdf = await getDocument({ data: pdfBuffer }).promise;
    onProgress(5);
    const mimeType = `image/${imageFormat}`;
    const extension = imageFormat === 'jpeg' ? 'jpg' : 'png';
    const images: { name: string, blob: Blob }[] = [];
    const pageNumbersToProcess = pagesToConvert && pagesToConvert.length > 0 ? pagesToConvert : Array.from({ length: pdf.numPages }, (_, i) => i + 1);

    if (pageNumbersToProcess.length === 0) throw new Error("No pages selected.");

    let processedCount = 0;
    for (const pageNum of pageNumbersToProcess) {
        if (pageNum < 1 || pageNum > pdf.numPages) continue;
        const page = await pdf.getPage(pageNum);
        const scale = dpi / 72;
        const viewport = page.getViewport({ scale }); 
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context.');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const blob = await new Promise<Blob | null>(resolve => 
            canvas.toBlob(resolve, mimeType, imageFormat === 'jpeg' ? 0.95 : undefined)
        );
        if (blob) images.push({ name: `page_${pageNum}.${extension}`, blob });
        processedCount++;
        onProgress(5 + Math.round((processedCount / pageNumbersToProcess.length) * 85));
    }

    if (images.length === 0) throw new Error('Could not extract any images.');

    if (images.length > 1) {
        const zip = new JSZip();
        onProgress(95);
        images.forEach(image => { zip.file(image.name, image.blob); });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const outputFilename = createOutputFilename(file.file.name, 'images', 'zip');
        onProgress(100);
        return prepareDownload(zipBlob, outputFilename, 'application/zip');
    } else {
        const singleImage = images[0];
        const outputFilename = createOutputFilename(file.file.name, `page_${pageNumbersToProcess[0]}`, extension);
        onProgress(100);
        return prepareDownload(singleImage.blob, outputFilename, mimeType);
    }
};

export const pdfToText = async (
    file: UploadedFile,
    onProgress: (p: number) => void,
    selectedPages?: number[]
): Promise<DownloadResult> => {
    const pdfBuffer = await file.file.arrayBuffer();
    return callWorker('pdfToText', { pdfBuffer, selectedPages, originalFilename: file.file.name, transferables: [pdfBuffer] }, onProgress);
};

export const textToPdf = async (text: string, filename: string): Promise<DownloadResult> => {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    await configureMainThreadJsPdfFont(pdf);
    pdf.setFontSize(12);
    const margin = 15;
    const lineHeight = 7;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const usableWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
    const lines = pdf.splitTextToSize(text, usableWidth);
    let cursorY = margin;
    for (const line of lines) {
        if (cursorY + lineHeight > pageHeight - margin) {
            pdf.addPage();
            cursorY = margin;
        }
        pdf.text(line, margin, cursorY);
        cursorY += lineHeight;
    }
    const pdfBlob = pdf.output('blob');
    return { data: pdfBlob, filename: filename, mimeType: 'application/pdf' };
};

export const extractFilesFromZip = async (
    file: UploadedFile,
    showMessage: (text: string, type?: 'info' | 'success' | 'error') => void,
    acceptedExtensions: string[]
): Promise<File[]> => {
    showMessage('Extracting files from ZIP...', 'info');
    const arrayBuffer = await file.file.arrayBuffer();
    if (typeof window.JSZip === 'undefined' && typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded.');
    }
    const zip = await (window.JSZip || JSZip).loadAsync(arrayBuffer);
    const extractedFiles: File[] = [];
    const extensionsWithoutDot = acceptedExtensions.map(ext => ext.startsWith('.') ? ext.substring(1).toLowerCase() : ext.toLowerCase());
    const getMimeTypeFromExtension = (ext: string): string => {
        switch (ext) {
            case 'jpg': case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'txt': return 'text/plain';
            case 'svg': return 'image/svg+xml';
            case 'webp': return 'image/webp';
            case 'html': return 'text/html';
            case 'md': return 'text/markdown';
            default: return 'application/octet-stream';
        }
    };
    const filePromises = Object.keys(zip.files).map(async (filename) => {
        const zipEntry = zip.files[filename];
        if (zipEntry.dir) return;
        const fileExtension = filename.split('.').pop()?.toLowerCase();
        if (!fileExtension || !extensionsWithoutDot.includes(fileExtension)) return;
        const content = await zipEntry.async('blob');
        const mimeType = getMimeTypeFromExtension(fileExtension);
        extractedFiles.push(new File([content], filename, { type: mimeType }));
    });
    await Promise.all(filePromises);
    extractedFiles.sort((a, b) => naturalSort(a.name, b.name));
    if (extractedFiles.length === 0) throw new Error(`No files with supported extensions found in ZIP.`);
    showMessage(`Extracted ${extractedFiles.length} files.`, 'info');
    return extractedFiles;
};

export const htmlToPdf = async (file: UploadedFile, options: HtmlToPdfOptions, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    if (typeof window.html2pdf === 'undefined' && typeof html2pdf === 'undefined') throw new Error('html2pdf.js not loaded.');
    onProgress?.(10);
    const htmlContent = await file.file.text();
    const element = document.createElement('div');
    element.innerHTML = sanitizeHtml(htmlContent);
    onProgress?.(20);
    const outputFilename = createOutputFilename(file.file.name, 'converted', 'pdf');
    const opt = {
        margin: [options.margin.top, options.margin.right, options.margin.bottom, options.margin.left],
        filename: outputFilename, 
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: options.pageSize.toLowerCase(), orientation: options.orientation }
    };
    const pdfBlob = await (window.html2pdf || html2pdf)().from(element).set(opt).output('blob');
    onProgress?.(100);
    return prepareDownload(pdfBlob, opt.filename, 'application/pdf'); 
};

export const markdownToPdf = async (markdownContent: string, filename: string, onProgress?: (p: number) => void): Promise<DownloadResult> => {
    if ((typeof window.marked === 'undefined' && typeof marked === 'undefined') || 
        (typeof window.html2pdf === 'undefined' && typeof html2pdf === 'undefined')) {
        throw new Error('Required libraries not loaded.');
    }
    onProgress?.(10);
    const htmlContent = await Promise.resolve((window.marked || marked).parse(markdownContent));
    const element = document.createElement('div');
    element.innerHTML = `<div style="padding: 20px; font-family: sans-serif; line-height: 1.6;">${sanitizeHtml(htmlContent)}</div>`;
    onProgress?.(20);
    const opt = {
        margin: 0.5,
        filename: filename, 
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    const pdfBlob = await (window.html2pdf || html2pdf)().from(element).set(opt).output('blob', {
        progress: ({ current, total }) => onProgress?.(20 + (current / total) * 80)
    });
    return prepareDownload(pdfBlob, opt.filename, 'application/pdf'); 
};

export { getDocument };
