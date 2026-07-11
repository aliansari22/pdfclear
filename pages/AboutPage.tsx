import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { GITHUB_REPOSITORY_URL } from '../utils/siteConfig';

const PAGE_URL = 'https://www.pdfclear.com/about/';

const AboutPage: React.FC = () => {
  const jsonLdWebPage = useMemo(
    () =>
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        url: PAGE_URL,
        name: 'About PDFClear',
        description:
          'Learn about PDFClear, an open-source browser application for PDF editing, conversion, OCR, summarization, and semantic search.',
        publisher: {
          '@type': 'Organization',
          name: 'PDFClear',
          url: 'https://www.pdfclear.com',
        },
      }),
    [],
  );

  return (
    <>
      <Helmet>
        <title>About PDFClear — Open-Source Browser PDF Tools</title>
        <meta
          name="description"
          content="Learn why PDFClear is built as an open-source browser application for PDF editing, conversion, OCR, summarization, and semantic search."
        />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content="About PDFClear — Open-Source Browser PDF Tools" />
        <meta
          property="og:description"
          content="A privacy-first PDF toolkit designed to process document content in the browser."
        />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:image" content="https://www.pdfclear.com/assets/og/pdfclear-social-preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About PDFClear" />
        <meta
          name="twitter:description"
          content="Open-source browser-side PDF editing, conversion, OCR, summarization, and semantic search."
        />
        <meta name="twitter:image" content="https://www.pdfclear.com/assets/og/pdfclear-social-preview.png" />
        <script type="application/ld+json">{jsonLdWebPage}</script>
      </Helmet>

      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-6 shadow-soft dark:border-indigo-900/70 dark:from-indigo-950/30 dark:via-dark-card dark:to-fuchsia-950/20 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">About PDFClear</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-5xl">
            Powerful document tools should not require handing over your documents.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg">
            PDFClear is an open-source PDF workspace built around browser-side processing. Your PDF and image files stay on your device while you edit, convert, OCR, summarize, and search them.
          </p>
        </section>

        <section className="prose mt-10 max-w-none dark:prose-invert">
          <h2>Why the project exists</h2>
          <p>
            Many online PDF products combine useful tools with remote uploads, accounts, subscriptions, or opaque processing. PDFClear aims to make common document workflows available in a transparent application that can be inspected and self-hosted.
          </p>

          <h2>What PDFClear includes</h2>
          <ul>
            <li><strong>Organize and optimize:</strong> merge, split, reorder, rotate, flip, delete, compress, protect, and unlock PDFs.</li>
            <li><strong>Edit and annotate:</strong> add text, images, signatures, watermarks, page numbers, and metadata.</li>
            <li><strong>Convert and extract:</strong> transform images, text, HTML, and Markdown to PDF; export PDF pages to images; extract text with OCR.</li>
            <li><strong>Local AI workflows:</strong> summarize documents and run semantic search with browser-compatible models.</li>
          </ul>

          <h2>What “browser-side” means</h2>
          <p>
            Document content is processed by JavaScript, WebAssembly, OCR, and AI runtimes running in the browser. AI and OCR tools load their required models, language data, and runtimes first; once those assets are loaded, you can disconnect and continue working offline.
          </p>

          <h2>Open source and practical limits</h2>
          <p>
            PDFClear has no server-side processing quota. Performance is powered by your own device, so available memory, browser capabilities, file complexity, and model size determine how quickly large documents are handled.
          </p>

          <h2>Built for contributors and self-hosters</h2>
          <p>
            The repository includes Docker support, CI, issue templates, contribution guidance, security reporting instructions, and documentation for self-hosted model assets. The public roadmap identifies testing, accessibility, performance, and privacy-audit work that contributors can take on.
          </p>
        </section>

        <section className="mt-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-border-dark dark:bg-dark-card sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Explore the source or the privacy model</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Explore the code, privacy design, and self-hosting options.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={GITHUB_REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 dark:bg-white dark:text-gray-950 dark:hover:bg-indigo-200"
            >
              View GitHub
              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              to="/privacy/"
              className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
            >
              Privacy details
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default AboutPage;
