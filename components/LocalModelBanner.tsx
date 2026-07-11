import React from 'react';
import { CloudArrowDownIcon, ComputerDesktopIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

interface LocalModelBannerProps {
  title?: string;
  description?: string;
}

const LocalModelBanner: React.FC<LocalModelBannerProps> = ({
  title = 'Load the required assets once, then work offline.',
  description = 'AI and OCR tools load their models, language data, workers, and runtimes before use. Once everything is loaded, you can disconnect and continue processing files in your browser.',
}) => {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-rose-50/80 p-4 text-left shadow-sm dark:border-indigo-900/70 dark:from-indigo-950/35 dark:via-dark-card dark:to-rose-950/25">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-fuchsia-300/25 blur-2xl dark:bg-fuchsia-500/10" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Browser-side workflow</p>
          <h2 className="mt-1 text-xl font-bold text-text-light-primary dark:text-text-dark-primary">{title}</h2>
          <p className="mt-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">{description}</p>
        </div>
        <div className="relative grid grid-cols-3 gap-2 text-center text-xs font-semibold sm:min-w-72">
          <div className="rounded-xl border border-indigo-200 bg-white/85 p-3 text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-dark-card/70 dark:text-indigo-300">
            <CloudArrowDownIcon className="mx-auto mb-1 h-5 w-5" />
            Load once
          </div>
          <div className="rounded-xl border border-rose-200 bg-white/85 p-3 text-rose-700 shadow-sm dark:border-rose-900 dark:bg-dark-card/70 dark:text-rose-300">
            <SignalSlashIcon className="mx-auto mb-1 h-5 w-5" />
            Work offline
          </div>
          <div className="rounded-xl border border-sky-200 bg-white/85 p-3 text-sky-700 shadow-sm dark:border-sky-900 dark:bg-dark-card/70 dark:text-sky-300">
            <ComputerDesktopIcon className="mx-auto mb-1 h-5 w-5" />
            Files stay local
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocalModelBanner;
