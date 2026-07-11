import type { FC, ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  CloudArrowDownIcon,
  ComputerDesktopIcon,
  EyeSlashIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import { GITHUB_REPOSITORY_URL, PRIVACY_PAGE_URL } from '../utils/siteConfig';

type PrivacyCard = {
  icon: ReactNode;
  title: string;
  body: string;
  accent: string;
};

const JSON_LD_WEB_PAGE = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Privacy and offline use | PDFClear',
  url: PRIVACY_PAGE_URL,
  description:
    'Learn how PDFClear keeps documents on your device, processes files in the browser, and continues working offline after required assets are loaded.',
});

const PRIVACY_CARDS: PrivacyCard[] = [
  {
    icon: <ComputerDesktopIcon className="h-7 w-7" aria-hidden="true" />,
    title: 'Your files stay on your device',
    body: 'PDFClear processes PDFs and images directly in your browser. Your document content stays with you throughout the workflow.',
    accent:
      'border-sky-200 bg-sky-50/70 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200',
  },
  {
    icon: <CloudArrowDownIcon className="h-7 w-7" aria-hidden="true" />,
    title: 'Load once, then work offline',
    body: 'AI and OCR tools load the models, language data, fonts, and runtimes they need. Once those assets are ready, you can disconnect and keep working.',
    accent:
      'border-indigo-200 bg-indigo-50/70 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200',
  },
  {
    icon: <EyeSlashIcon className="h-7 w-7" aria-hidden="true" />,
    title: 'No analytics or ads',
    body: 'PDFClear does not include analytics, advertising trackers, or an advertising network. The focus is simply on getting your document work done.',
    accent:
      'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200',
  },
  {
    icon: <ServerStackIcon className="h-7 w-7" aria-hidden="true" />,
    title: 'Open source and self-hostable',
    body: 'Run PDFClear from the public website or host the static application and model assets yourself for complete control over your setup.',
    accent:
      'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
  },
];

const PrivacyPage: FC = () => (
  <>
    <Helmet>
      <title>Privacy and Offline Use | PDFClear</title>
      <meta
        name="description"
        content="PDFClear processes documents in your browser, keeps files on your device, and works offline after required AI and OCR assets are loaded."
      />
      <link rel="canonical" href={PRIVACY_PAGE_URL} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Privacy and Offline Use | PDFClear" />
      <meta
        property="og:description"
        content="Your files stay on your device. Load required AI and OCR assets once, then disconnect and keep working offline."
      />
      <meta property="og:url" content={PRIVACY_PAGE_URL} />
      <meta
        property="og:image"
        content="https://www.pdfclear.com/assets/og/pdfclear-social-preview.png"
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Privacy and Offline Use | PDFClear" />
      <meta
        name="twitter:description"
        content="Process PDFs on your device and continue offline after required assets are loaded."
      />
      <meta
        name="twitter:image"
        content="https://www.pdfclear.com/assets/og/pdfclear-social-preview.png"
      />
      <script type="application/ld+json">{JSON_LD_WEB_PAGE}</script>
    </Helmet>

    <div className="mx-auto max-w-5xl">
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 shadow-soft dark:border-indigo-900/70 dark:from-indigo-950/35 dark:via-dark-card dark:to-sky-950/25 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
          Privacy by design
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-5xl">
          Your documents stay on your device.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg">
          PDFClear edits, converts, OCRs, summarizes, and searches documents directly in your
          browser. AI and OCR tools load their required assets first; once they are ready, you can
          disconnect from the internet and continue working offline.
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {PRIVACY_CARDS.map((card) => (
          <article key={card.title} className={`rounded-2xl border p-5 ${card.accent}`}>
            {card.icon}
            <h2 className="mt-4 text-lg font-bold">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 opacity-90">{card.body}</p>
          </article>
        ))}
      </section>

      <section className="prose mt-10 max-w-none dark:prose-invert">
        <h2>Files stay with you</h2>
        <p>
          PDFClear processes your PDFs, images, and text on your device. Files are opened in the
          browser, processed there, and saved back to your device when you download the result.
        </p>

        <h2>How offline use works</h2>
        <p>
          Standard PDF tools run directly in the browser. AI and OCR tools first load the models,
          language data, fonts, workers, and WebAssembly runtimes they need. After those assets are
          loaded, you can disconnect from the internet and continue your work offline.
        </p>

        <h2>Browser storage</h2>
        <p>
          Your browser can cache the application, AI models, and OCR resources so they are ready
          for repeat use. You can remove those cached resources at any time by clearing PDFClear's
          site data in your browser.
        </p>

        <h2>No analytics, ads, or accounts</h2>
        <p>
          PDFClear does not include analytics or advertising trackers, and you do not need an
          account to use the tools. Open the app, choose a tool, and work with your files directly.
        </p>

        <h2>Self-hosting</h2>
        <p>
          PDFClear is open source and ships as a static web application. You can self-host the app
          and its model assets with Docker or any static hosting platform for a fully controlled
          setup.
        </p>
      </section>

      <section className="mt-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-border-dark dark:bg-dark-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">
            Explore or self-host PDFClear
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            The repository includes Docker instructions and model-hosting guidance.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={GITHUB_REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 dark:bg-white dark:text-gray-950 dark:hover:bg-indigo-200"
          >
            View source
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
          </a>
          <Link
            to="/about/"
            className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
          >
            About PDFClear
          </Link>
        </div>
      </section>
    </div>
  </>
);

export default PrivacyPage;
