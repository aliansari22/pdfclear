import React, { useEffect, useMemo, useState } from 'react';
import { UploadedFile } from '../types';

export interface ImagePdfMarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ImageToPdfControlsProps {
  files: UploadedFile[];
  margins: ImagePdfMarginsMm;
  onMarginsChange: (margins: ImagePdfMarginsMm) => void;
  disabled?: boolean;
  imageLabel: string;
}

const clampMargin = (value: number): number => Math.max(0, Math.min(80, Number.isFinite(value) ? value : 0));

const ImageToPdfControls: React.FC<ImageToPdfControlsProps> = ({ files, margins, onMarginsChange, disabled = false, imageLabel }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState('');

  const currentFile = files[pageIndex]?.file;

  useEffect(() => {
    setPageIndex((prev) => Math.min(prev, Math.max(0, files.length - 1)));
  }, [files.length]);

  useEffect(() => {
    setImageUrl('');
    if (!currentFile) return;

    const reader = new FileReader();
    let cancelled = false;

    reader.onload = () => {
      if (!cancelled && typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(currentFile);

    return () => {
      cancelled = true;
      if (reader.readyState === FileReader.LOADING) {
        reader.abort();
      }
    };
  }, [currentFile]);

  const pageNumberValue = files.length === 0 ? 0 : pageIndex + 1;

  const previewStyle = useMemo(() => ({
    paddingTop: `${(margins.top / 297) * 100}%`,
    paddingRight: `${(margins.right / 210) * 100}%`,
    paddingBottom: `${(margins.bottom / 297) * 100}%`,
    paddingLeft: `${(margins.left / 210) * 100}%`,
  }), [margins]);

  const updateMargin = (key: keyof ImagePdfMarginsMm, value: number) => {
    onMarginsChange({ ...margins, [key]: clampMargin(value) });
  };

  const applyAll = (value: number) => {
    const next = clampMargin(value);
    onMarginsChange({ top: next, right: next, bottom: next, left: next });
  };

  return (
    <section className="feature-card my-6 text-left">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Margin controls</h3>
          <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Set custom page margins for your {imageLabel} to PDF output. The preview updates instantly for one page at a time.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">All margins (mm)</span>
              <input
                type="number"
                min={0}
                max={80}
                value={margins.top === margins.right && margins.top === margins.bottom && margins.top === margins.left ? margins.top : ''}
                placeholder="Mixed"
                onChange={(event) => applyAll(Number(event.target.value))}
                className="input-style"
                disabled={disabled}
              />
            </label>
            {(['top', 'right', 'bottom', 'left'] as (keyof ImagePdfMarginsMm)[]).map((key) => (
              <label key={key} className="block">
                <span className="mb-1 block text-sm font-medium capitalize text-text-light-primary dark:text-text-dark-primary">{key} margin (mm)</span>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={margins[key]}
                  onChange={(event) => updateMargin(key, Number(event.target.value))}
                  className="input-style"
                  disabled={disabled}
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" className="btn-secondary" disabled={disabled || pageIndex <= 0} onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}>Previous</button>
            <label className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Page
              <input
                type="number"
                min={files.length ? 1 : 0}
                max={files.length || 0}
                value={pageNumberValue}
                onChange={(event) => {
                  const value = Math.max(1, Math.min(files.length, Number(event.target.value) || 1));
                  setPageIndex(value - 1);
                }}
                className="input-style !w-20 py-1 text-center"
                disabled={disabled || files.length === 0}
              />
              / {files.length}
            </label>
            <button type="button" className="btn-secondary" disabled={disabled || pageIndex >= files.length - 1} onClick={() => setPageIndex((prev) => Math.min(files.length - 1, prev + 1))}>Next</button>
          </div>

          <div className="mx-auto aspect-[210/297] w-full max-w-xs rounded-xl border border-border-light bg-white p-0 shadow-inner dark:border-border-dark dark:bg-dark-body">
            <div className="flex h-full w-full" style={previewStyle}>
              <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded bg-gray-50 dark:bg-dark-card">
                {imageUrl ? (
                  <img src={imageUrl} alt={`Live PDF preview page ${pageNumberValue}`} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="px-4 text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">Upload images to preview the PDF page.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImageToPdfControls;
