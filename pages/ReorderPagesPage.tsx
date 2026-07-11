import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowsUpDownIcon, QueueListIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import FileUpload from '../components/FileUpload';
import PdfPageThumbnailGrid from '../components/PdfPageThumbnailGrid';
import ToolActionBar from '../components/ToolActionBar';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import { getDocument } from 'pdfjs-dist';

const PAGE_URL = 'https://www.pdfclear.com/reorder-pdf-pages/';
const BRAND = 'PDFClear';

const ReorderPagesPage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted, setProgress } = useFileContext();
  const pdfFile = uploadedFiles.find((f) => f.file.type === 'application/pdf');
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [initialOrder, setInitialOrder] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function initOrder() {
      setPageOrder([]);
      setInitialOrder([]);
      if (!pdfFile) return;
      try {
        const buffer = await pdfFile.file.arrayBuffer();
        const pdf = await getDocument({ data: buffer }).promise;
        const order = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
        if (!cancelled) {
          setPageOrder(order);
          setInitialOrder(order);
        }
      } catch {
        if (!cancelled) showMessage('Could not read this PDF. It may be corrupt or password-protected.', 'error');
      }
    }
    void initOrder();
    return () => { cancelled = true; };
  }, [pdfFile, showMessage]);

  const changed = useMemo(() => pageOrder.some((page, index) => page !== initialOrder[index]), [pageOrder, initialOrder]);

  const movePage = (fromIndex: number, toIndex: number) => {
    setPageOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleReorder = async () => {
    if (!pdfFile) return showMessage('Please upload a PDF first.', 'error');
    if (!changed) return showMessage('Drag at least one page to a new position before saving.', 'error');
    setProgress(0);
    setProcessing(true, 'Reordering PDF pages...');
    try {
      const result = await pdfService.reorderPdfPages(pdfFile, pageOrder, setProgress);
      showMessage('PDF pages reordered successfully.', 'success');
      showPostOperationSuccess(result);
    } catch (error) {
      showMessage(`Error: ${error instanceof Error ? error.message : 'Could not reorder pages.'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const jsonLdWebPage = useMemo(() => JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: `Reorder PDF Pages with Thumbnails | ${BRAND}`, url: PAGE_URL, description: 'Reorder PDF pages visually by dragging thumbnails. Private browser-based processing with no PDFClear server upload.' }), []);
  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'PDF Page Reorder Tool', applicationCategory: 'UtilityApplication', operatingSystem: 'Web', url: PAGE_URL, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, isAccessibleForFree: true, publisher: { '@type': 'Organization', name: BRAND }, featureList: ['Reorder PDF pages', 'Drag page thumbnails', 'Move PDF pages visually', 'Private browser processing'] }), []);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Reorder PDF Pages Online with Thumbnails | PDFClear</title>
        <meta name="description" content="Reorder PDF pages visually by dragging page thumbnails. Rearrange pages privately in your browser with no PDFClear server upload." />
        <meta name="keywords" content="reorder PDF pages, rearrange PDF pages, move PDF pages, PDF thumbnails, organize PDF pages" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content={`Reorder PDF Pages with Thumbnails | ${BRAND}`} />
        <meta property="og:description" content="Drag thumbnails to rearrange PDF pages before saving locally." />
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">Reorder PDF Pages</h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">Drag page thumbnails into the right order, preview the sequence, and save a newly arranged PDF without uploading your file.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <span className="inline-flex items-center gap-2"><ArrowsUpDownIcon className="h-5 w-5 text-brand-500" /> Drag to reorder</span>
          <span className="inline-flex items-center gap-2"><QueueListIcon className="h-5 w-5 text-brand-500" /> Thumbnail preview</span>
          <span className="inline-flex items-center gap-2"><ShieldCheckIcon className="h-5 w-5 text-brand-500" /> Private & secure</span>
        </div>
      </header>

      {!operationCompleted && (
        <ToolActionBar title="Apply page order and download your PDF">
          <button type="button" className="btn-secondary w-full" onClick={() => setPageOrder(initialOrder)} disabled={processing || !changed}>Reset order</button>
          <button type="button" className="btn-secondary w-full" onClick={() => setPageOrder((prev) => [...prev].reverse())} disabled={processing || pageOrder.length < 2}>Reverse order</button>
          <button type="button" className="btn-primary w-full" onClick={handleReorder} disabled={processing || !changed}>Save Reordered PDF</button>
        </ToolActionBar>
      )}

      {!operationCompleted && <FileUpload showProcessingStatus={false} />}

      {!operationCompleted && pdfFile && (
        <>
          <PdfPageThumbnailGrid file={pdfFile.file} pageOrder={pageOrder} onMovePage={movePage} actionLabel="Drag thumbnails to move pages into a new order." />
        </>
      )}
    </div>
  );
};

export default ReorderPagesPage;
