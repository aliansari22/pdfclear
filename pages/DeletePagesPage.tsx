import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { TrashIcon, QueueListIcon, DocumentMinusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import FileUpload from '../components/FileUpload';
import PdfPageThumbnailGrid from '../components/PdfPageThumbnailGrid';
import ToolActionBar from '../components/ToolActionBar';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import { getDocument } from 'pdfjs-dist';

const PAGE_URL = 'https://www.pdfclear.com/delete-pdf-pages/';
const BRAND = 'PDFClear';

const DeletePagesPage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted, setProgress } = useFileContext();
  const pdfFile = uploadedFiles.find((f) => f.file.type === 'application/pdf');
  const [numPages, setNumPages] = useState(0);
  const [removedPages, setRemovedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadPageCount() {
      setRemovedPages(new Set());
      setNumPages(0);
      if (!pdfFile) return;
      try {
        const buffer = await pdfFile.file.arrayBuffer();
        const pdf = await getDocument({ data: buffer }).promise;
        if (!cancelled) setNumPages(pdf.numPages);
      } catch {
        if (!cancelled) showMessage('Could not read this PDF. It may be corrupt or password-protected.', 'error');
      }
    }
    void loadPageCount();
    return () => { cancelled = true; };
  }, [pdfFile, showMessage]);

  const pagesToDelete = useMemo<number[]>(() => Array.from(removedPages).sort((a: number, b: number) => a - b), [removedPages]);

  const removePage = (pageNumber: number) => setRemovedPages((prev) => new Set([...prev, pageNumber]));
  const restorePage = (pageNumber: number) => setRemovedPages((prev) => {
    const next = new Set(prev);
    next.delete(pageNumber);
    return next;
  });

  const applyRangeDeletion = () => {
    if (!numPages) return;
    try {
      const pages = pdfService.parsePageRanges(rangeInput, numPages);
      setRemovedPages((prev) => new Set([...prev, ...pages]));
      setRangeInput('');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Invalid page range.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!pdfFile) return showMessage('Please upload a PDF first.', 'error');
    if (!pagesToDelete.length) return showMessage('Select at least one page to delete.', 'error');
    if (pagesToDelete.length >= numPages) return showMessage('You cannot delete every page. Leave at least one page.', 'error');

    setProgress(0);
    setProcessing(true, 'Deleting selected pages...');
    try {
      const result = await pdfService.deletePages(pdfFile, pagesToDelete, setProgress);
      showMessage('Pages deleted successfully.', 'success');
      showPostOperationSuccess(result);
    } catch (error) {
      showMessage(`Error: ${error instanceof Error ? error.message : 'Could not delete pages.'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const jsonLdWebPage = useMemo(() => JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: `Delete PDF Pages with Preview | ${BRAND}`, url: PAGE_URL, description: 'Delete PDF pages visually with removable thumbnails and private browser processing.' }), []);
  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'PDF Page Deleter with Preview', applicationCategory: 'UtilityApplication', operatingSystem: 'Web', url: PAGE_URL, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, isAccessibleForFree: true, publisher: { '@type': 'Organization', name: BRAND }, featureList: ['Delete PDF pages visually', 'Removable thumbnails', 'Private browser processing'] }), []);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Delete PDF Pages with Preview | PDFClear</title>
        <meta name="description" content="Delete PDF pages visually with removable page thumbnails. Remove pages privately in your browser with no PDFClear server upload." />
        <meta name="keywords" content="delete PDF pages, remove PDF pages preview, PDF thumbnails, cut PDF pages, private PDF tool" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content={`Delete PDF Pages with Preview | ${BRAND}`} />
        <meta property="og:description" content="Preview pages as thumbnails, remove unwanted pages, and save locally." />
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">Delete PDF Pages</h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">Remove unwanted pages with a clear visual preview. Click thumbnails to remove or restore pages before creating the final PDF.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <span className="inline-flex items-center gap-2"><DocumentMinusIcon className="h-5 w-5 text-brand-500" /> Remove pages</span>
          <span className="inline-flex items-center gap-2"><QueueListIcon className="h-5 w-5 text-brand-500" /> Thumbnail preview</span>
          <span className="inline-flex items-center gap-2"><TrashIcon className="h-5 w-5 text-brand-500" /> Restore before saving</span>
          <span className="inline-flex items-center gap-2"><ShieldCheckIcon className="h-5 w-5 text-brand-500" /> Private & secure</span>
        </div>
      </header>

      {!operationCompleted && (
        <ToolActionBar title="Delete selected pages and download your PDF">
          <button type="button" className="btn-secondary w-full" onClick={() => setRemovedPages(new Set())} disabled={processing || !pagesToDelete.length}>Restore all pages</button>
          <button type="button" className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed w-full" onClick={handleDelete} disabled={processing || !pagesToDelete.length || pagesToDelete.length >= numPages}>Delete {pagesToDelete.length || ''} Page{pagesToDelete.length === 1 ? '' : 's'}</button>
        </ToolActionBar>
      )}

      {!operationCompleted && <FileUpload showProcessingStatus={false} />}

      {!operationCompleted && pdfFile && (
        <>
          <section className="feature-card text-left space-y-4">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Delete by range</h2>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <input className="input-style" value={rangeInput} onChange={(e) => setRangeInput(e.target.value)} placeholder={`Pages to delete, e.g. 1-3, ${numPages || 1}`} disabled={processing} />
              <button type="button" className="btn-secondary" onClick={applyRangeDeletion} disabled={processing || !rangeInput.trim() || !numPages}>Mark for deletion</button>
            </div>
          </section>

          <PdfPageThumbnailGrid file={pdfFile.file} removedPages={removedPages} onRemovePage={removePage} onRestorePage={restorePage} actionLabel="Click Remove on thumbnails or mark pages by range above." />

        </>
      )}
    </div>
  );
};

export default DeletePagesPage;
