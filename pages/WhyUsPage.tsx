import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  CodeBracketSquareIcon,
  ComputerDesktopIcon,
  DocumentCheckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { GITHUB_REPOSITORY_URL } from '../utils/siteConfig';

const PAGE_URL = 'https://www.pdfclear.com/why-us/';

const WhyUsPage: React.FC = () => {
  const jsonLdWebPage = useMemo(
    () =>
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Why PDFClear?',
        url: PAGE_URL,
        description:
          'See why PDFClear uses browser-side document processing, open-source code, self-hosting, and a broad set of practical PDF tools.',
      }),
    [],
  );

  const reasons = [
    {
      icon: <ComputerDesktopIcon className="h-7 w-7" aria-hidden="true" />,
      title: 'Browser-side document processing',
      body: 'PDF and image content is processed directly in your browser, so your files stay on your device.',
    },
    {
      icon: <CodeBracketSquareIcon className="h-7 w-7" aria-hidden="true" />,
      title: 'Open source and reviewable',
      body: 'The application, build configuration, privacy documentation, and deployment files can be inspected and improved publicly.',
    },
    {
      icon: <WrenchScrewdriverIcon className="h-7 w-7" aria-hidden="true" />,
      title: 'Self-hostable',
      body: 'Run the static application with Docker and host compatible OCR, model, and font assets on infrastructure you control.',
    },
    {
      icon: <DocumentCheckIcon className="h-7 w-7" aria-hidden="true" />,
      title: 'One practical toolkit',
      body: 'Organize, edit, convert, protect, OCR, summarize, and semantically search documents without switching products.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Why PDFClear? — Open-Source, Browser-Side PDF Tools</title>
        <meta
          name="description"
          content="Choose PDFClear for browser-side document processing, open-source code, self-hosting, OCR, local AI, and a broad practical PDF toolkit."
        />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content="Why PDFClear? — Open-Source, Browser-Side PDF Tools" />
        <meta
          property="og:description"
          content="A transparent, self-hostable PDF toolkit for editing, conversion, OCR, summarization, and semantic search."
        />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:image" content="https://www.pdfclear.com/assets/og/pdfclear-social-preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Why PDFClear?" />
        <meta
          name="twitter:description"
          content="Browser-side PDF workflows, open-source code, self-hosting, OCR, and local AI tools."
        />
        <meta name="twitter:image" content="https://www.pdfclear.com/assets/og/pdfclear-social-preview.png" />
        <script type="application/ld+json">{jsonLdWebPage}</script>
      </Helmet>

      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-white to-indigo-50 p-6 shadow-soft dark:border-fuchsia-900/70 dark:from-fuchsia-950/25 dark:via-dark-card dark:to-indigo-950/30 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-700 dark:text-fuchsia-300">Why PDFClear?</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-5xl">
            A transparent PDF toolkit that keeps document processing close to the user.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg">
            PDFClear combines everyday PDF utilities with OCR and browser-compatible AI—no account required, and your files stay on your device.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {reasons.map((reason) => (
            <article key={reason.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-dark-card">
              <div className="inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                {reason.icon}
              </div>
              <h2 className="mt-4 text-lg font-bold text-gray-950 dark:text-white">{reason.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{reason.body}</p>
            </article>
          ))}
        </section>

        <section className="prose mt-10 max-w-none dark:prose-invert">
          <h2>Precise privacy rather than absolute promises</h2>
          <p>
            PDFClear processes document content on your device. AI and OCR tools load their models, language data, and runtimes first; once those assets are ready, you can disconnect and continue working offline.
          </p>

          <h2>No artificial server-side quota</h2>
          <p>
            Since document processing occurs in the browser, the source application does not meter jobs through a remote processing plan. Practical limits still exist and depend on available memory, CPU performance, browser behavior, document complexity, and model size.
          </p>

          <h2>Useful for sensitive workflows—with normal security caution</h2>
          <p>
            Local processing can reduce exposure to remote document-processing services. It cannot protect against a compromised computer, malicious extension, modified deployment, vulnerable dependency, or untrusted file. Use a trusted device and deployment for sensitive work.
          </p>
        </section>

        <section className="mt-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-border-dark dark:bg-dark-card sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Try it, inspect it, or host it yourself</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">The source repository includes Docker and model-hosting guidance.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Explore tools
            </Link>
            <a
              href={GITHUB_REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
            >
              View source
              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              to="/privacy/"
              className="inline-flex items-center rounded-xl px-3 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              Privacy details
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default WhyUsPage;
