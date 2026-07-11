import { PDFDocument, rgb, StandardFonts, degrees, BlendMode } from 'pdf-lib';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'; 
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { reshapeText } from 'arabic-persian-reshaper'; 

GlobalWorkerOptions.workerSrc = workerUrl;

// --- Optional custom font loading for jsPDF ---
// The open-source repository does not bundle font binaries. Set this value at
// build time if your deployment needs a custom Unicode-capable font. When no
// custom font is configured or the font cannot be fetched, jsPDF falls back to
// its built-in Helvetica font.
let customFont: ArrayBuffer | null = null;
const customFontURL = import.meta.env.VITE_PDF_CUSTOM_FONT_URL?.trim() || '';

async function configureJsPdfFont(pdf: jsPDF): Promise<void> {
    if (!customFontURL) {
        pdf.setFont('helvetica', 'normal');
        return;
    }

    try {
        if (!customFont) {
            const response = await fetch(customFontURL);
            if (!response.ok) throw new Error(`Failed to fetch custom font from ${customFontURL}`);
            customFont = await response.arrayBuffer();
        }

        let binary = '';
        const bytes = new Uint8Array(customFont);
        for (let j = 0; j < bytes.byteLength; j++) binary += String.fromCharCode(bytes[j]);
        const fontBase64 = btoa(binary);
        pdf.addFileToVFS('PDFClearCustom-Regular.ttf', fontBase64);
        pdf.addFont('PDFClearCustom-Regular.ttf', 'PDFClearCustom', 'normal');
        pdf.setFont('PDFClearCustom', 'normal');
    } catch (error) {
        console.warn('Falling back to jsPDF built-in Helvetica font.', error);
        pdf.setFont('helvetica', 'normal');
    }
}

type OutputAction =
    | 'merged'
    | 'split'
    | 'deleted'
    | 'rotated'
    | 'reordered'
    | 'flipped'
    | 'watermarked'
    | 'page_numbers'
    | 'image_added'
    | 'text_added'
    | 'form_filled'
    | 'metadata_edited'
    | 'converted'
    | 'extracted_text';

const getBaseFilename = (filename: string | undefined | null): string => {
    if (!filename) return 'output';
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;
    return filename.substring(0, lastDotIndex);
};

const formatPageRange = (pages: number[]): string => {
    if (pages.length === 0) return '';
    const ranges: string[] = [];
    let start = pages[0];
    let prev = pages[0];

    for (let i = 1; i < pages.length; i++) {
        const current = pages[i];
        if (current === prev + 1) {
            prev = current;
            continue;
        }
        ranges.push(start === prev ? `${start}` : `${start}_to_${prev}`);
        start = current;
        prev = current;
    }
    ranges.push(start === prev ? `${start}` : `${start}_to_${prev}`);
    return ranges.join('_');
};

const createOutputFilename = (options: {
    originalFilename?: string;
    action: OutputAction | string;
    pages?: number[];
    extension: string;
}): string => {
    const base = getBaseFilename(options.originalFilename);
    const action = String(options.action).trim().replace(/\s+/g, '_');

    let suffix = action;
    if (options.pages && options.pages.length > 0) {
        const normalizedPages = [...options.pages]
            .filter(p => Number.isFinite(p))
            .map(p => Math.trunc(p))
            .sort((a, b) => a - b);

        suffix += `_page_${formatPageRange(normalizedPages)}`;
    }

    return `${base}_${suffix}.${options.extension}`;
};





const finalizeOutputs = async (options: {
    files: { data: Uint8Array | Blob; filename: string; mimeType: string }[];
    originalFilename?: string;
    action: OutputAction | string;
}): Promise<{ data: Uint8Array | Blob; filename: string; mimeType: string }> => {
    if (options.files.length === 1) return options.files[0];

    const zip = new JSZip();
    for (const file of options.files) {
        zip.file(file.filename, file.data);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return {
        data: zipBlob,
        filename: createOutputFilename({
            originalFilename: options.originalFilename,
            action: options.action,
            extension: 'zip'
        }),
        mimeType: 'application/zip'
    };
};


const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return rgb(r / 255, g / 255, b / 255);
};

const parsePageRanges = (rangeStr: string, totalPages: number): number[] => {
    if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(s => s.trim()).filter(s => s);
    for (const part of parts) {
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-').map(s => parseInt(s.trim(), 10));
            if (isNaN(startStr) || isNaN(endStr) || startStr < 1 || endStr > totalPages || startStr > endStr) throw new Error(`Invalid range: ${part}.`);
            for (let i = startStr; i <= endStr; i++) pages.add(i);
        } else {
            const pageNum = parseInt(part, 10);
            if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) throw new Error(`Invalid page number: ${part}.`);
            pages.add(pageNum);
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
};

const cancelledRequests = new Set<string>();

self.onmessage = async (event: MessageEvent) => {
    const { id, type, payload } = event.data;
    if (type === '__cancel__') {
        cancelledRequests.add(id);
        return;
    }
    const ensureNotCancelled = () => {
        if (cancelledRequests.has(id)) throw new Error('Operation cancelled.');
    };
    try {
        ensureNotCancelled();
        let result;
        const { originalFilename = 'document.pdf' } = payload;

        switch (type) {
            case 'mergePdfs': {
                const { filesArrayBuffers, originalFilename } = payload;
                const totalFiles = filesArrayBuffers.length;
                const pdfDoc = await PDFDocument.create();
                for (let i = 0; i < totalFiles; i++) {
                    const buffer = filesArrayBuffers[i];
                    const donorPdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
                    const copiedPages = await pdfDoc.copyPages(donorPdfDoc, donorPdfDoc.getPageIndices());
                    copiedPages.forEach((page) => pdfDoc.addPage(page));
                    ensureNotCancelled();
                    const progress = Math.round(((i + 1) / totalFiles) * 90);
                    self.postMessage({ id, status: 'progress', progress });
                }
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'merged', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'splitPdf': {
                const { pdfBuffer, pageRangesStr, originalFilename } = payload;
                self.postMessage({ id, status: 'progress', progress: 10 });
                const originalPdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const totalPages = originalPdfDoc.getPageCount();
                const pagesToExtract = parsePageRanges(pageRangesStr, totalPages);
                if (pagesToExtract.length === 0) throw new Error("No valid pages specified for extraction.");
                self.postMessage({ id, status: 'progress', progress: 40 });
                const newPdfDoc = await PDFDocument.create();
                const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, pagesToExtract.map(p => p - 1));
                copiedPages.forEach(page => newPdfDoc.addPage(page));
                self.postMessage({ id, status: 'progress', progress: 80 });
                const pdfBytes = await newPdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'split', pages: pagesToExtract, extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'batchSplitPdf': {
                const { pdfBuffer, groups, originalFilename } = payload;
                const originalPdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const totalPages = originalPdfDoc.getPageCount();

                const outputs: { data: Uint8Array | Blob; filename: string; mimeType: string }[] = [];

                for (let i = 0; i < groups.length; i++) {
                    const rangeStr = groups[i];
                    const pagesToExtract = parsePageRanges(rangeStr, totalPages);

                    if (pagesToExtract.length > 0) {
                        const newPdfDoc = await PDFDocument.create();
                        const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, pagesToExtract.map(p => p - 1));
                        copiedPages.forEach(page => newPdfDoc.addPage(page));
                        const pdfBytes = await newPdfDoc.save();

                        outputs.push({
                            data: pdfBytes,
                            filename: createOutputFilename({ originalFilename, action: 'split', pages: pagesToExtract, extension: 'pdf' }),
                            mimeType: 'application/pdf'
                        });
                    }

                    ensureNotCancelled();
                    const progress = Math.round(((i + 1) / groups.length) * 90);
                    self.postMessage({ id, status: 'progress', progress });
                }

                if (outputs.length === 0) throw new Error("No valid pages were specified.");

                result = await finalizeOutputs({ files: outputs, originalFilename, action: 'split' });
                break;
            }
            case 'deletePages': {
                const { pdfBuffer, pagesToDelete, originalFilename } = payload;
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const totalPages = pdfDoc.getPageCount();
                if (pagesToDelete.length === 0) throw new Error("No pages selected for deletion.");
                if (pagesToDelete.length >= totalPages) throw new Error("Cannot delete all pages.");
                const sortedPagesToDelete = [...pagesToDelete].sort((a, b) => b - a);
                for (let i = 0; i < sortedPagesToDelete.length; i++) {
                    const pageNum = sortedPagesToDelete[i];
                    if (pageNum >= 1 && pageNum <= pdfDoc.getPageCount()) pdfDoc.removePage(pageNum - 1);
                    ensureNotCancelled();
                    const progress = Math.round(((i + 1) / sortedPagesToDelete.length) * 90);
                    self.postMessage({ id, status: 'progress', progress });
                }
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'deleted', pages: pagesToDelete, extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'reorderPdfPages': {
                const { pdfBuffer, pageOrder, originalFilename } = payload;
                const originalPdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const totalPages = originalPdfDoc.getPageCount();
                const normalizedOrder = (pageOrder || []).map((p: number) => Math.trunc(p)).filter((p: number) => p >= 1 && p <= totalPages);
                if (normalizedOrder.length !== totalPages) throw new Error('The page order must contain every page exactly once.');
                if (new Set(normalizedOrder).size !== totalPages) throw new Error('The page order contains duplicate pages.');
                const pdfDoc = await PDFDocument.create();
                const copiedPages = await pdfDoc.copyPages(originalPdfDoc, normalizedOrder.map((p: number) => p - 1));
                copiedPages.forEach((page) => pdfDoc.addPage(page));
                self.postMessage({ id, status: 'progress', progress: 90 });
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'reordered', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'flipPdfPages': {
                const { pdfBuffer, pagesToFlip, direction, originalFilename } = payload;
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const totalPages = pdfDoc.getPageCount();
                const selectedPages = Array.from(new Set((pagesToFlip || []).map((p: number) => Math.trunc(p)).filter((p: number) => p >= 1 && p <= totalPages))) as number[];
                if (!selectedPages.length) throw new Error('Select at least one page to flip.');
                for (let i = 0; i < selectedPages.length; i++) {
                    const pageNum = selectedPages[i];
                    const page = pdfDoc.getPage(pageNum - 1);
                    const { width, height } = page.getSize();
                    if (direction === 'vertical') {
                        (page as any).translateContent(0, height);
                        (page as any).scaleContent(1, -1);
                    } else {
                        (page as any).translateContent(width, 0);
                        (page as any).scaleContent(-1, 1);
                    }
                    ensureNotCancelled();
                    self.postMessage({ id, status: 'progress', progress: Math.round(((i + 1) / selectedPages.length) * 90) });
                }
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'flipped', pages: selectedPages, extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'rotatePdfBatch': {
                const { pdfBuffer, rotationInstructions, originalFilename } = payload;
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const totalPages = pdfDoc.getPageCount();
                if (rotationInstructions.length === 0) throw new Error("No rotation instructions provided.");
                const effectivePageRotations: { [key: number]: number } = {};
                let processedInstructions = 0;
                for (const instruction of rotationInstructions) {
                    const pagesToAffect = parsePageRanges(instruction.range, totalPages);
                    pagesToAffect.forEach(pageNum => {
                        effectivePageRotations[pageNum] = (effectivePageRotations[pageNum] || 0) + instruction.angle;
                    });
                    ensureNotCancelled();
                    processedInstructions++;
                    self.postMessage({ id, status: 'progress', progress: Math.round((processedInstructions / rotationInstructions.length) * 50) });
                }
                let appliedRotationsCount = 0;
                const pagesToModify = Object.keys(effectivePageRotations).map(Number).sort((a,b)=>a-b);
                for (const pageNum of pagesToModify) {
                    const page = pdfDoc.getPage(pageNum - 1);
                    const finalAngle = effectivePageRotations[pageNum];
                    page.setRotation(degrees(finalAngle % 360));
                    ensureNotCancelled();
                    appliedRotationsCount++;
                    self.postMessage({ id, status: 'progress', progress: 50 + Math.round((appliedRotationsCount / pagesToModify.length) * 40) });
                }
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'rotated', pages: pagesToModify, extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'watermarkPdf': {
                const { pdfBuffer, options, originalFilename } = payload;
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const colorRgb = hexToRgb(options.color || '#ff0000');
                let watermarkImage;
                if (options.type === 'image' && options.imageBytes) {
                    const firstBytes = new Uint8Array(options.imageBytes.slice(0, 8));
                    if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) {
                         watermarkImage = await pdfDoc.embedPng(options.imageBytes);
                    } else {
                        watermarkImage = await pdfDoc.embedJpg(options.imageBytes);
                    }
                }
                const pages = pdfDoc.getPages();
                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i];
                    const { width, height } = page.getSize();
                    const rotation = page.getRotation();
                    const isRotated = rotation.angle === 90 || rotation.angle === 270;
                    const page_width = isRotated ? height : width;
                    const page_height = isRotated ? width : height;

                    if (options.type === 'text' && options.text) {
                        const fontSize = options.fontSize || 72;
                        const textWidth = font.widthOfTextAtSize(options.text, fontSize);
                        const textHeight = font.heightAtSize(fontSize);
                        const drawText = (x: number, y: number) => page.drawText(options.text!, { x, y, font, size: fontSize, color: colorRgb, opacity: options.opacity, rotate: degrees(options.angle || 0), blendMode: BlendMode.Multiply });
                        if (options.position === 'tiled') {
                            for (let yOffset = -page_height; yOffset < page_height * 2; yOffset += textHeight * 4) {
                                for (let xOffset = -page_width; xOffset < page_width * 2; xOffset += textWidth * 1.5) drawText(xOffset, yOffset);
                            }
                        } else {
                            drawText((page_width - textWidth) / 2, (page_height - textHeight) / 2);
                        }
                    } else if (options.type === 'image' && watermarkImage) {
                        const scaleFactor = 0.4;
                        const scaledWidth = watermarkImage.width * scaleFactor;
                        const scaledHeight = watermarkImage.height * scaleFactor;
                        const drawImage = (x: number, y: number) => page.drawImage(watermarkImage!, { x, y, width: scaledWidth, height: scaledHeight, opacity: options.opacity, rotate: degrees(options.angle || 0), blendMode: BlendMode.Multiply });
                        if (options.position === 'tiled') {
                             for (let yOffset = -page_height; yOffset < page_height * 2; yOffset += scaledHeight * 1.5) {
                                for (let xOffset = -page_width; xOffset < page_width * 2; xOffset += scaledWidth * 1.5) drawImage(xOffset, yOffset);
                            }
                        } else {
                            drawImage((page_width - scaledWidth) / 2, (page_height - scaledHeight) / 2);
                        }
                    }
                    self.postMessage({ id, status: 'progress', progress: Math.round(((i + 1) / pages.length) * 90) });
                }
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'watermarked', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'addPageNumbers': {
                const { pdfBuffer, options, originalFilename } = payload;
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const totalPages = pdfDoc.getPageCount();
                const pagesToNumber = parsePageRanges(options.pages, totalPages);
                if (pagesToNumber.length === 0) throw new Error("No valid pages specified for numbering.");
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const colorRgb = hexToRgb(options.color || '#000000');
                for (let i = 0; i < pagesToNumber.length; i++) {
                    const pageNum = pagesToNumber[i];
                    const page = pdfDoc.getPage(pageNum - 1);
                    const { width, height } = page.getSize();
                    let text = options.format.replace('1', String(pageNum)).replace('n', String(totalPages));
                    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
                    const textHeight = font.heightAtSize(options.fontSize);
                    let x: number, y: number;
                    const pageRotation = page.getRotation().angle;
                    const rotatedWidth = (pageRotation === 90 || pageRotation === 270) ? height : width;
                    const rotatedHeight = (pageRotation === 90 || pageRotation === 270) ? width : height;
                    if (options.position.includes('top')) y = rotatedHeight - options.margin - textHeight;
                    else y = options.margin;
                    if (options.position.includes('left')) x = options.margin;
                    else if (options.position.includes('right')) x = rotatedWidth - options.margin - textWidth;
                    else x = (rotatedWidth - textWidth) / 2;
                    page.drawText(text, { x, y, font, size: options.fontSize, color: colorRgb });
                    self.postMessage({ id, status: 'progress', progress: Math.round(((i + 1) / pagesToNumber.length) * 90) });
                }
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'page_numbers', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'addImageToPdf': {
                const { pdfBuffer, imageBuffer, pageIndex, x, y, width, height, opacity, originalFilename } = payload;
                self.postMessage({ id, status: 'progress', progress: 10 });
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                self.postMessage({ id, status: 'progress', progress: 30 });
                const page = pdfDoc.getPage(pageIndex);
                let embeddedImage;
                const imageBytes = new Uint8Array(imageBuffer);
                if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4E && imageBytes[3] === 0x47) {
                    embeddedImage = await pdfDoc.embedPng(imageBuffer);
                } else {
                    embeddedImage = await pdfDoc.embedJpg(imageBuffer);
                }
                self.postMessage({ id, status: 'progress', progress: 60 });
                page.drawImage(embeddedImage, { x, y, width, height, opacity, blendMode: BlendMode.Normal });
                self.postMessage({ id, status: 'progress', progress: 80 });
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'image_added', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'addTextToPdf': {
                const { pdfBuffer, text, pageIndex, x, y, fontSize, fontColor, opacity, originalFilename } = payload;
                self.postMessage({ id, status: 'progress', progress: 10 });
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const page = pdfDoc.getPage(pageIndex);
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const color = hexToRgb(fontColor);
                page.drawText(text, { x, y, font, size: fontSize, color, opacity, blendMode: BlendMode.Normal });
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'text_added', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            // --- NEW: Batch Add Text ---
            case 'batchAddText': {
                const { pdfBuffer, texts, originalFilename } = payload;
                self.postMessage({ id, status: 'progress', progress: 10 });
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                self.postMessage({ id, status: 'progress', progress: 30 });
                let processed = 0;
                for (const item of texts) {
                    const page = pdfDoc.getPage(item.pageIndex);
                    const color = hexToRgb(item.color || '#000000');
                    page.drawText(item.text, {
                        x: item.x,
                        y: item.y,
                        font: font,
                        size: item.fontSize,
                        color: color,
                        opacity: item.opacity ?? 1,
                        blendMode: BlendMode.Normal 
                    });
                    processed++;
                    if (processed % 5 === 0) self.postMessage({ id, status: 'progress', progress: 30 + Math.round((processed / texts.length) * 60) });
                }
                self.postMessage({ id, status: 'progress', progress: 90 });
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'form_filled', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'editMetadata': {
                const { pdfBuffer, options, originalFilename } = payload;
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                if (options.title !== undefined) pdfDoc.setTitle(options.title);
                if (options.author !== undefined) pdfDoc.setAuthor(options.author);
                if (options.subject !== undefined) pdfDoc.setSubject(options.subject);
                if (options.keywords !== undefined) pdfDoc.setKeywords(options.keywords);
                pdfDoc.setModificationDate(new Date());
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'metadata_edited', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'convertImagesToPdf': {
                const { filesData, options, originalFilename } = payload;
                const pdfDoc = await PDFDocument.create();
                const margin = Math.max(0, Math.min(170, Number(options?.marginMm ?? 10) * 2.834645669));
                let filesConverted = 0;
                for (let i = 0; i < filesData.length; i++) {
                    const item = filesData[i];
                    if (!item.type.startsWith('image/')) continue;
                    const arrayBuffer = item.buffer;
                    let image;
                    if (item.type === 'image/jpeg' || item.type === 'image/jpg') image = await pdfDoc.embedJpg(arrayBuffer);
                    else if (item.type === 'image/png') image = await pdfDoc.embedPng(arrayBuffer);
                    if (!image) continue;
                    const page = pdfDoc.addPage();
                    const { width, height } = page.getSize();
                    const maxWidth = Math.max(1, width - margin * 2);
                    const maxHeight = Math.max(1, height - margin * 2);
                    const dims = image.scaleToFit(maxWidth, maxHeight);
                    page.drawImage(image, { x: (width - dims.width) / 2, y: (height - dims.height) / 2, width: dims.width, height: dims.height });
                    filesConverted++;
                    self.postMessage({ id, status: 'progress', progress: Math.round(((i + 1) / filesData.length) * 90) });
                }
                if (filesConverted === 0) throw new Error('No convertible images found.');
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'converted', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'convertToPdf': {
                const { filesData, originalFilename } = payload;
                const pdfDoc = await PDFDocument.create();
                let filesConverted = 0;
                for (let i = 0; i < filesData.length; i++) {
                    const item = filesData[i];
                    const arrayBuffer = item.buffer;
                    const fileType = item.type;
                    if (fileType.startsWith('image/')) {
                        let image;
                        if (fileType === 'image/jpeg') image = await pdfDoc.embedJpg(arrayBuffer);
                        else if (fileType === 'image/png') image = await pdfDoc.embedPng(arrayBuffer);
                        else if (typeof OffscreenCanvas !== 'undefined') {
                            const blob = new Blob([arrayBuffer], { type: fileType });
                            const imgBitmap = await createImageBitmap(blob);
                            const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(imgBitmap, 0, 0);
                                const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
                                const pngBytes = await pngBlob.arrayBuffer();
                                image = await pdfDoc.embedPng(pngBytes);
                            }
                        }
                        if (image) {
                            const page = pdfDoc.addPage();
                            const { width, height } = page.getSize();
                            const imageDims = image.scaleToFit(width - 50, height - 50);
                            page.drawImage(image, { x: (width - imageDims.width) / 2, y: (height - imageDims.height) / 2, width: imageDims.width, height: imageDims.height });
                            filesConverted++;
                        }
                    } else if (fileType === 'text/plain') {
                        const text = new TextDecoder('utf-8').decode(arrayBuffer);
                        const tempPdf = new jsPDF();
                        await configureJsPdfFont(tempPdf);
                        tempPdf.setFontSize(12);
                        const lineHeight = 1;
                        const margin = 20;
                        const pageSize = tempPdf.internal.pageSize;
                        const pageWidth = pageSize.getWidth();
                        const pageHeight = pageSize.getHeight();
                        const maxLineWidth = pageWidth - 2 * margin;
                        const splitLines = tempPdf.splitTextToSize(text, maxLineWidth);
                        const lineHeightInPoints = 12 * lineHeight;
                        let cursorY = margin;
                        let currentPage = 1;
                        tempPdf.setPage(currentPage);
                        for (const line of splitLines) {
                            if (cursorY + lineHeightInPoints > pageHeight - margin) {
                                tempPdf.addPage();
                                currentPage++;
                                cursorY = margin;
                            }
                            tempPdf.text(line, margin, cursorY);
                            cursorY += lineHeightInPoints;
                        }
                        if (currentPage > 1 && tempPdf.internal.pages.length > currentPage + 1) tempPdf.internal.pages.splice(1, 1);
                        const textPdfBytes = tempPdf.output('arraybuffer');
                        const tempDoc = await PDFDocument.load(textPdfBytes);
                        const copiedPages = await pdfDoc.copyPages(tempDoc, tempDoc.getPageIndices());
                        copiedPages.forEach(page => pdfDoc.addPage(page));
                        filesConverted++;
                    }
                    self.postMessage({ id, status: 'progress', progress: Math.round(((i + 1) / filesData.length) * 90) });
                }
                if (filesConverted === 0) throw new Error("No convertible files found.");
                const pdfBytes = await pdfDoc.save();
                result = { data: pdfBytes, filename: createOutputFilename({ originalFilename, action: 'converted', extension: 'pdf' }), mimeType: 'application/pdf' };
                break;
            }
            case 'pdfToText': {
                const { pdfBuffer, selectedPages, originalFilename } = payload;
                const pdf = await getDocument({ data: pdfBuffer }).promise;
                const pagesToProcess = selectedPages && selectedPages.length > 0 ? selectedPages : Array.from({ length: pdf.numPages }, (_, i) => i + 1);
                if (pagesToProcess.length === 0) throw new Error("No pages selected.");
                let fullText = '';
                for (let i = 0; i < pagesToProcess.length; i++) {
                    const pageNum = pagesToProcess[i];
                    if (pageNum < 1 || pageNum > pdf.numPages) continue;
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = reshapeText(textContent.items.map((item: any) => item.str).join(' '));
                    if (pagesToProcess.length > 1) fullText += `--- Page ${pageNum} ---\n`;
                    fullText += `${pageText}\n\n`;
                    self.postMessage({ id, status: 'progress', progress: Math.round(((i + 1) / pagesToProcess.length) * 100) });
                }
                const textBlob = new Blob([new TextEncoder().encode(fullText)], { type: 'text/plain' });
                result = { data: textBlob, filename: createOutputFilename({ originalFilename, action: 'extracted_text', extension: 'txt' }), mimeType: 'text/plain' };
                break;
            }
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
        ensureNotCancelled();
        self.postMessage({ id, status: 'success', result });
    } catch (error: any) {
        self.postMessage({ id, status: 'error', message: error.message });
    } finally {
        cancelledRequests.delete(id);
    }
};
