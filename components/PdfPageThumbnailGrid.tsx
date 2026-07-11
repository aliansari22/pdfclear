import React, { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Spinner from './Spinner';

GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfPageThumb {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

interface PdfPageThumbnailGridProps {
  file?: File | null;
  rotations?: Record<number, number>;
  removedPages?: Set<number>;
  pageOrder?: number[];
  selectable?: boolean;
  selectedPages?: Set<number>;
  actionLabel?: string;
  emptyLabel?: string;
  onTogglePage?: (pageNumber: number) => void;
  onRotatePage?: (pageNumber: number, delta: number) => void;
  onMovePage?: (fromIndex: number, toIndex: number) => void;
  onRemovePage?: (pageNumber: number) => void;
  onRestorePage?: (pageNumber: number) => void;
}

const PdfPageThumbnailGrid: React.FC<PdfPageThumbnailGridProps> = ({
  file,
  rotations = {},
  removedPages,
  pageOrder,
  selectable = false,
  selectedPages,
  actionLabel,
  emptyLabel = 'Upload a PDF to preview its pages.',
  onTogglePage,
  onRotatePage,
  onMovePage,
  onRemovePage,
  onRestorePage,
}) => {
  const [thumbs, setThumbs] = useState<PdfPageThumb[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dragFromIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function renderThumbs() {
      if (!file) {
        setThumbs([]);
        setError('');
        return;
      }
      setLoading(true);
      setError('');
      setThumbs([]);
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: buffer }).promise;
        const rendered: PdfPageThumb[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 0.28 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Could not render PDF preview.');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
          if (!blob) throw new Error('Could not create page preview.');
          const imageUrl = URL.createObjectURL(blob);
          objectUrls.push(imageUrl);
          rendered.push({ pageNumber, imageUrl, width: canvas.width, height: canvas.height });
          if (!cancelled) setThumbs([...rendered]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load PDF preview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void renderThumbs();
    return () => {
      cancelled = true;
      objectUrls.forEach(URL.revokeObjectURL);
    };
  }, [file]);

  const visibleThumbs = pageOrder?.length
    ? pageOrder.map((pageNumber) => thumbs.find((thumb) => thumb.pageNumber === pageNumber)).filter(Boolean) as PdfPageThumb[]
    : thumbs;

  const handleDragStart = (index: number) => {
    dragFromIndex.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverIndex.current = index;
  };

  const handleDragEnd = () => {
    const from = dragFromIndex.current;
    const to = dragOverIndex.current;
    dragFromIndex.current = null;
    dragOverIndex.current = null;
    if (from === null || to === null || from === to) return;
    onMovePage?.(from, to);
  };

  if (!file) {
    return <div className="feature-card text-sm text-text-light-secondary dark:text-text-dark-secondary">{emptyLabel}</div>;
  }

  return (
    <section className="feature-card text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">PDF page preview</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {actionLabel || 'Review pages visually before applying changes.'}
          </p>
        </div>
        {thumbs.length > 0 && (
          <span className="text-xs font-semibold rounded-full px-3 py-1 bg-gray-100 dark:bg-gray-800 text-text-light-secondary dark:text-text-dark-secondary">
            {thumbs.length} page{thumbs.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading && thumbs.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <Spinner /> Rendering thumbnails...
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="max-h-[34rem] overflow-y-auto pr-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {visibleThumbs.map((thumb, index) => {
          const removed = removedPages?.has(thumb.pageNumber) ?? false;
          const selected = selectedPages?.has(thumb.pageNumber) ?? false;
          const rotation = ((rotations[thumb.pageNumber] || 0) % 360 + 360) % 360;
          return (
            <article
              key={`${thumb.pageNumber}-${index}`}
              draggable={Boolean(onMovePage) && !removed}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(event) => event.preventDefault()}
              className={`rounded-xl border bg-white dark:bg-dark-body shadow-sm overflow-hidden transition ${removed ? 'opacity-50 border-red-300 dark:border-red-800' : selected ? 'border-brand-500 ring-2 ring-brand-300' : 'border-border-light dark:border-border-dark'} ${onMovePage ? 'cursor-move' : ''}`}
            >
              <div className="p-2 bg-gray-50 dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => selectable && onTogglePage?.(thumb.pageNumber)}
                  className="block w-full rounded-md overflow-hidden bg-white dark:bg-dark-card border border-border-light dark:border-border-dark"
                  disabled={!selectable}
                  aria-label={`Page ${thumb.pageNumber}`}
                >
                  <img
                    src={thumb.imageUrl}
                    alt={`Page ${thumb.pageNumber} preview`}
                    className="mx-auto max-h-40 object-contain transition-transform duration-200"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                </button>
              </div>
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">Page {thumb.pageNumber}</span>
                  {removed && <span className="text-[10px] font-bold text-red-600 dark:text-red-400">Removed</span>}
                  {selected && !removed && <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">Selected</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {onRotatePage && (
                    <>
                      <button type="button" onClick={() => onRotatePage(thumb.pageNumber, -90)} className="btn-secondary !px-2 !py-1 text-[11px]" disabled={removed}>↶</button>
                      <button type="button" onClick={() => onRotatePage(thumb.pageNumber, 90)} className="btn-secondary !px-2 !py-1 text-[11px]" disabled={removed}>↷</button>
                    </>
                  )}
                  {onRemovePage && !removed && (
                    <button type="button" onClick={() => onRemovePage(thumb.pageNumber)} className="btn-secondary !px-2 !py-1 text-[11px] text-red-600 dark:text-red-300">Remove</button>
                  )}
                  {onRestorePage && removed && (
                    <button type="button" onClick={() => onRestorePage(thumb.pageNumber)} className="btn-secondary !px-2 !py-1 text-[11px]">Restore</button>
                  )}
                  {onMovePage && <span className="ml-auto text-[10px] text-text-light-secondary dark:text-text-dark-secondary">Drag</span>}
                </div>
              </div>
            </article>
          );
        })}
        </div>
      </div>

      {loading && thumbs.length > 0 && (
        <p className="mt-3 text-xs text-text-light-secondary dark:text-text-dark-secondary">Rendering more pages...</p>
      )}
    </section>
  );
};

export default PdfPageThumbnailGrid;
