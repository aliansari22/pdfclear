import React from 'react';
import { useFileContext } from '../hooks/useFileContext';

interface ToolActionBarProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

const ToolActionBar: React.FC<ToolActionBarProps> = ({
  title = 'Apply changes & download',
  description,
  children,
}) => {
  const { processing, progress, statusMessage } = useFileContext();
  const safeProgress = Math.max(0, Math.min(100, Number.isFinite(progress) ? Math.round(progress) : 0));
  const progressText = statusMessage?.text || 'Processing locally in your browser…';

  return (
    <section className="my-5 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/60 p-4 text-left shadow-sm dark:border-indigo-900/70 dark:from-dark-card dark:via-dark-card dark:to-indigo-950/25">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)] md:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase leading-5 tracking-wide text-fuchsia-700 dark:text-fuchsia-300">
            Apply &amp; download
          </p>
          <h3 className="truncate text-base font-bold leading-6 text-text-light-primary dark:text-text-dark-primary">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm leading-5 text-text-light-secondary dark:text-text-dark-secondary">
              {description}
            </p>
          )}
        </div>

        <div className="grid min-h-[2.5rem] content-center gap-2 md:w-72">
          {children}
        </div>
      </div>

      <div className="mt-3 h-10 overflow-hidden" aria-hidden={!processing}>
        <div className={`h-10 ${processing ? 'visible' : 'invisible'}`}>
          <div className="grid grid-cols-[minmax(0,1fr)_3.25rem] items-center gap-3 text-xs font-medium leading-5 text-text-light-secondary dark:text-text-dark-secondary">
            <span className="block min-w-0 truncate whitespace-nowrap">{progressText}</span>
            <span className="block w-[3.25rem] shrink-0 text-right tabular-nums">{safeProgress}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full progress-gradient"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ToolActionBar;
