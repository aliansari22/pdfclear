import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowPathIcon, ArrowsRightLeftIcon, QueueListIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import FileUpload from '../components/FileUpload';
import PdfPageThumbnailGrid from '../components/PdfPageThumbnailGrid';
import ToolActionBar from '../components/ToolActionBar';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import { getDocument } from 'pdfjs-dist';

const PAGE_URL = 'https://www.pdfclear.com/rotate-pdf/';
const BRAND = 'PDFClear';

const RotatePage: React.FC = () => {
  const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted, setProgress } = useFileContext();
  const pdfFile = uploadedFiles.find((f) => f.file.type === 'application/pdf');
  const [numPages, setNumPages] = useState(0);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [rangeInput, setRangeInput] = useState('');
  const [rangeAngle, setRangeAngle] = useState(90);

  useEffect(() => {
    let cancelled = false;
    async function loadPageCount() {
      setRotations({});
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

  const changedPages = useMemo(
    () => (Object.entries(rotations) as Array<[string, number]>).filter(([, angle]) => ((angle % 360) + 360) % 360 !== 0).map(([page]) => Number(page)).sort((a: number, b: number) => a - b),
    [rotations]
  );

  const rotatePage = (pageNumber: number, delta: number) => {
    setRotations((prev) => ({ ...prev, [pageNumber]: (((prev[pageNumber] || 0) + delta) % 360 + 360) % 360 }));
  };

  const applyRangeRotation = () => {
    if (!numPages) return;
    try {
      const pages = pdfService.parsePageRanges(rangeInput || 'all', numPages);
      setRotations((prev) => {
        const next = { ...prev };
        pages.forEach((page) => { next[page] = ((rangeAngle % 360) + 360) % 360; });
        return next;
      });
      setRangeInput('');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Invalid page range.', 'error');
    }
  };

  const handleApplyChanges = async () => {
    if (!pdfFile) return showMessage('Please upload a PDF first.', 'error');
    if (!changedPages.length) return showMessage('Rotate at least one page before applying changes.', 'error');

    setProgress(0);
    setProcessing(true, 'Applying rotations...');
    try {
      const pdfBuffer = await pdfFile.file.arrayBuffer();
      const instructions = changedPages.map((page) => ({ range: String(page), angle: rotations[page] }));
      const result = await pdfService.rotatePdfBatch(pdfBuffer, instructions, pdfFile.file.name, setProgress);
      showMessage('PDF rotated successfully.', 'success');
      showPostOperationSuccess(result);
    } catch (error) {
      showMessage(`Error: ${error instanceof Error ? error.message : 'Could not rotate PDF.'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const jsonLdWebPage = useMemo(() => JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: `Rotate PDF Pages with Preview | ${BRAND}`, url: PAGE_URL, description: 'Rotate PDF pages visually with draggable-style thumbnails and private in-browser processing.' }), []);
  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'PDF Page Rotator with Preview', applicationCategory: 'UtilityApplication', operatingSystem: 'Web', url: PAGE_URL, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, isAccessibleForFree: true, publisher: { '@type': 'Organization', name: BRAND }, featureList: ['Rotate PDF pages visually', 'Thumbnail page preview', 'Rotate selected pages', 'Private browser processing'] }), []);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Rotate PDF Pages with Preview | PDFClear</title>
        <meta name="description" content="Rotate PDF pages visually with thumbnails. Fix page orientation privately in your browser with no PDFClear server upload." />
        <meta name="keywords" content="rotate PDF, rotate PDF pages preview, PDF page thumbnails, fix PDF orientation, private PDF tools" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content={`Rotate PDF Pages with Preview | ${BRAND}`} />
        <meta property="og:description" content="Preview and rotate PDF pages visually before saving. No PDFClear server upload." />
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">Rotate PDF Pages</h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">Preview every page as a thumbnail, rotate individual pages or ranges, and save the corrected PDF locally in your browser.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <span className="inline-flex items-center gap-2"><ArrowPathIcon className="h-5 w-5 text-brand-500" /> Visual rotation</span>
          <span className="inline-flex items-center gap-2"><ArrowsRightLeftIcon className="h-5 w-5 text-brand-500" /> 90°, 180°, 270°</span>
          <span className="inline-flex items-center gap-2"><QueueListIcon className="h-5 w-5 text-brand-500" /> Page thumbnails</span>
          <span className="inline-flex items-center gap-2"><ShieldCheckIcon className="h-5 w-5 text-brand-500" /> Private & secure</span>
        </div>
      </header>

      {!operationCompleted && (
        <ToolActionBar title="Apply rotations and download your PDF">
          <button type="button" className="btn-secondary w-full" onClick={() => setRotations({})} disabled={processing || !changedPages.length}>Reset preview</button>
          <button type="button" className="btn-primary w-full" onClick={handleApplyChanges} disabled={processing || !changedPages.length}>Save Rotated PDF</button>
        </ToolActionBar>
      )}

      {!operationCompleted && <FileUpload showProcessingStatus={false} />}

      {!operationCompleted && pdfFile && (
        <>
          <section className="feature-card text-left space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Quick rotate by range</h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Type pages like “1-3, 7” or “all”, choose an angle, then preview the result below.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
              <input className="input-style" value={rangeInput} onChange={(e) => setRangeInput(e.target.value)} placeholder={`Pages to rotate, e.g. 1-3, ${numPages || 1}, all`} disabled={processing} />
              <select className="input-style md:!w-40" value={rangeAngle} onChange={(e) => setRangeAngle(Number(e.target.value))} disabled={processing}>
                <option value={90}>90° clockwise</option>
                <option value={180}>180°</option>
                <option value={270}>270° clockwise</option>
                <option value={0}>0° reset</option>
              </select>
              <button type="button" className="btn-secondary" onClick={applyRangeRotation} disabled={processing || !numPages}>Apply to preview</button>
            </div>
          </section>

          <PdfPageThumbnailGrid file={pdfFile.file} rotations={rotations} onRotatePage={rotatePage} actionLabel="Use the rotate buttons on thumbnails or apply a range above." />

        </>
      )}
    </div>
  );
};

export default RotatePage;
