import React, { useEffect, useMemo, useState } from 'react';
import { UploadedFile } from '../types';

interface ImagePdfLivePreviewProps {
  files: UploadedFile[];
  marginMm: number;
}

interface ImagePreviewItem {
  id: string;
  name: string;
  src: string;
  error?: string;
}

const ImagePdfLivePreview: React.FC<ImagePdfLivePreviewProps> = ({ files, marginMm }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [previewItems, setPreviewItems] = useState<ImagePreviewItem[]>([]);

  useEffect(() => {
    setPageIndex((currentPage) => Math.min(currentPage, Math.max(0, files.length - 1)));
  }, [files.length]);

  useEffect(() => {
    let cancelled = false;
    const readers: FileReader[] = [];

    if (!files.length) {
      setPreviewItems([]);
      return () => {
        cancelled = true;
      };
    }

    setPreviewItems(files.map((item) => ({ id: item.id, name: item.file.name, src: '' })));

    files.forEach((item) => {
      const reader = new FileReader();
      readers.push(reader);

      reader.onload = () => {
        if (cancelled || typeof reader.result !== 'string') return;
        setPreviewItems((prev) =>
          prev.map((preview) =>
            preview.id === item.id
              ? { id: item.id, name: item.file.name, src: reader.result as string }
              : preview,
          ),
        );
      };

      reader.onerror = () => {
        if (cancelled) return;
        setPreviewItems((prev) =>
          prev.map((preview) =>
            preview.id === item.id
              ? { ...preview, error: 'Could not read this image preview.' }
              : preview,
          ),
        );
      };

      reader.readAsDataURL(item.file);
    });

    return () => {
      cancelled = true;
      readers.forEach((reader) => {
        if (reader.readyState === FileReader.LOADING) {
          reader.abort();
        }
      });
    };
  }, [files]);

  const safeMargin = Math.max(0, Math.min(60, marginMm));
  const paddingPercent = 3 + safeMargin * 0.55;
  const current = previewItems[pageIndex];

  const visiblePageNumber = useMemo(() => {
    if (!files.length) return 0;
    return Math.min(files.length, Math.max(1, pageIndex + 1));
  }, [files.length, pageIndex]);

  if (!files.length) {
    return <div className="feature-card text-sm text-text-light-secondary dark:text-text-dark-secondary">Upload images to see thumbnail previews and a live PDF page preview.</div>;
  }

  return (
    <section className="feature-card text-left overflow-hidden">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Thumbnail and page preview</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Click a thumbnail to preview that output page with the current margin.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" className="btn-secondary" disabled={pageIndex === 0} onClick={() => setPageIndex((p) => Math.max(0, p - 1))}>Previous</button>
          <label className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
            Page
            <input
              type="number"
              min={1}
              max={files.length}
              value={visiblePageNumber}
              onChange={(event) => {
                const next = Number(event.target.value) - 1;
                if (Number.isFinite(next)) setPageIndex(Math.max(0, Math.min(files.length - 1, next)));
              }}
              className="input-style !w-20 !py-1 text-sm"
            />
            / {files.length}
          </label>
          <button type="button" className="btn-secondary" disabled={pageIndex >= files.length - 1} onClick={() => setPageIndex((p) => Math.min(files.length - 1, p + 1))}>Next</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(150px,220px)_minmax(0,1fr)]">
        <aside className="max-h-[34rem] overflow-y-auto rounded-2xl border border-border-light bg-gray-50 p-3 dark:border-border-dark dark:bg-gray-900/60">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {previewItems.map((item, index) => {
              const selected = index === pageIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPageIndex(index)}
                  className={`rounded-xl border bg-white p-2 text-left shadow-sm transition dark:bg-dark-card ${selected ? 'border-brand-500 ring-2 ring-brand-300' : 'border-border-light hover:border-brand-300 dark:border-border-dark'}`}
                >
                  <div className="aspect-[8.5/11] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    {item.src ? (
                      <img src={item.src} alt={`Thumbnail for page ${index + 1}`} className="h-full w-full object-contain" />
                    ) : item.error ? (
                      <span className="flex h-full items-center justify-center px-2 text-center text-[11px] text-red-600 dark:text-red-300">Preview unavailable</span>
                    ) : (
                      <span className="flex h-full items-center justify-center px-2 text-center text-[11px] text-text-light-secondary dark:text-text-dark-secondary">Loading…</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">Page {index + 1}</span>
                    {selected && <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">Previewing</span>}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-text-light-secondary dark:text-text-dark-secondary">{item.name}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="max-h-[34rem] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-100 via-brand-50 to-accent-50 p-4 shadow-inner dark:from-slate-900 dark:via-brand-950/30 dark:to-rose-950/20">
          <div className="mx-auto aspect-[8.5/11] max-w-sm border border-gray-300 bg-white shadow-lg flex items-center justify-center" style={{ padding: `${paddingPercent}%` }}>
            {current?.src ? (
              <img src={current.src} alt={`PDF preview page ${visiblePageNumber}`} className="max-h-full max-w-full object-contain" />
            ) : current?.error ? (
              <span className="px-4 text-center text-sm text-red-600 dark:text-red-300">{current.error}</span>
            ) : (
              <span className="px-4 text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">Preparing preview…</span>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Current margin: {marginMm} mm on every side.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ImagePdfLivePreview;
