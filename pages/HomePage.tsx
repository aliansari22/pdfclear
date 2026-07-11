import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SIDEBAR_TOOLS } from '../constants';
import type { ReactNode } from 'react';
import {
  Square2StackIcon,
  Squares2X2Icon,
  TrashIcon,
  ArrowPathIcon,
  ArrowsPointingInIcon,
  HashtagIcon,
  CheckBadgeIcon,
  PhotoIcon,
  PencilSquareIcon,
  LockClosedIcon,
  LockOpenIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
  Bars3BottomLeftIcon,
  DocumentIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  SignalSlashIcon,
  MagnifyingGlassIcon,
  TagIcon,
  ChatBubbleBottomCenterTextIcon,
  ClipboardDocumentListIcon,
  PencilIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { getThemeForCategory } from '../utils/toolTheme';
import { GITHUB_REPOSITORY_URL } from '../utils/siteConfig';

const PAGE_URL = 'https://www.pdfclear.com/';
const BRAND = 'PDFClear';

const quickActions = [
  { label: 'Merge PDF', className: 'hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300' },
  { label: 'Rotate', className: 'hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300' },
  { label: 'Reorder', className: 'hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300' },
  { label: 'Images to PDF', className: 'hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300' },
  { label: 'OCR', className: 'hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300' },
  { label: 'AI Search', className: 'hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300' },
];

// --- Icon Logic (Ideally move to a utils file, but kept here to preserve current imports) ---
export const getToolIcon = (id: string, customClass?: string): ReactNode => {
  const klass = customClass || 'h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-300';

  const icons: Record<string, ReactNode> = {
    'pdf-to-markdown-nougat': <CodeBracketSquareIcon className={klass} />,
    'pdf-to-markdown': <CodeBracketSquareIcon className={klass} />,
    'smart-pdf-to-txt-ocr': <SparklesIcon className={klass} />,
    merge: <Square2StackIcon className={klass} />,
    split: <Squares2X2Icon className={klass} />,
    'delete-pages': <TrashIcon className={klass} />,
    rotate: <ArrowPathIcon className={klass} />,
    compress: <ArrowsPointingInIcon className={klass} />,
    'add-page-numbers': <HashtagIcon className={klass} />,
    watermark: <CheckBadgeIcon className={klass} />,
    'add-image': <PhotoIcon className={klass} />,
    'add-text': <PencilSquareIcon className={klass} />,
    'edit-metadata': <TagIcon className={klass} />,
    'protect-pdf': <LockClosedIcon className={klass} />,
    'unlock-pdf': <LockOpenIcon className={klass} />,
    'jpg-to-pdf': <PhotoIcon className={klass} />,
    'png-to-pdf': <PhotoIcon className={klass} />,
    'txt-to-pdf': <DocumentTextIcon className={klass} />,
    'html-to-pdf': <CodeBracketIcon className={klass} />,
    'markdown-to-pdf': <CodeBracketSquareIcon className={klass} />,
    'zip-to-pdf': <ArchiveBoxIcon className={klass} />,
    'pdf-to-jpg': <PhotoIcon className={klass} />,
    'pdf-to-png': <PhotoIcon className={klass} />,
    'pdf-to-txt': <Bars3BottomLeftIcon className={klass} />,
    'smart-pdf-to-txt': <SparklesIcon className={klass} />,
    'semantic-search': <ChatBubbleBottomCenterTextIcon className={klass} />,
    summarize: <ClipboardDocumentListIcon className={klass} />,
    'pdf-to-zip': <ArchiveBoxArrowDownIcon className={klass} />,
    'sign-pdf': <PencilIcon className={klass} />,
    'fill-pdf-form': <DocumentTextIcon className={klass} />,
  };
  return icons[id] ?? <DocumentIcon className={klass} />;
};

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return SIDEBAR_TOOLS;
    const lowercasedQuery = searchQuery.toLowerCase();
    return SIDEBAR_TOOLS.map(category => ({
      ...category,
      links: category.links.filter(
        link =>
          link.label.toLowerCase().includes(lowercasedQuery) ||
          link.description.toLowerCase().includes(lowercasedQuery)
      ),
    })).filter(category => category.links.length > 0);
  }, [searchQuery]);

  const clearSearch = () => setSearchQuery('');

  const jsonLdWebSite = useMemo(
    () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BRAND,
      url: PAGE_URL,
      description: 'Open-source, privacy-first PDF tools for browser-side editing, conversion, OCR, summarization, and semantic search. Your files stay on your device.',
      publisher: {
        '@type': 'Organization',
        name: BRAND,
        url: PAGE_URL,
        logo: 'https://www.pdfclear.com/logo.png',
      },
    }),
    []
  );

  const jsonLdSoftwareApp = useMemo(
    () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: BRAND,
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Web',
      url: PAGE_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'Merge PDF files',
        'Split and extract PDF pages',
        'Compress PDF file size',
        'Rotate PDF pages',
        'Add page numbers to PDF',
        'Convert JPG, PNG, TXT, HTML, and Markdown to PDF',
        'Convert PDF pages to JPG or PNG',
        'Password protect and unlock PDFs',
        'Browser-side AI PDF search and summarization with on-demand model assets',
      ],
    }),
    []
  );

  return (
    <div className="pb-12">
      <Helmet>
        <title>PDFClear — Private PDF Tools in Your Browser</title>
        <meta
          name="description"
          content="Open-source PDF tools for editing, conversion, OCR, summarization, and semantic search. Your files stay on your device."
        />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={PAGE_URL} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta property="og:title" content={`Private PDF Tools in Your Browser | ${BRAND}`} />
        <meta
          property="og:description"
          content="Edit, convert, OCR, summarize, and search PDFs with an open-source browser application."
        />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:image" content="https://www.pdfclear.com/assets/og/pdfclear-social-preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Private PDF Tools in Your Browser | ${BRAND}`} />
        <meta
          name="twitter:description"
          content="Open-source browser-side PDF editing, conversion, OCR, summarization, and semantic search."
        />
        <meta
          name="keywords"
          content="open-source PDF tools, private PDF tools, browser-based PDF editor, local-first PDF, semantic PDF search, PDF summarizer, OCR PDF, merge PDF, split PDF, compress PDF, convert PDF, sign PDF, self-hosted PDF tools, PDFClear"
        />
        <meta name="twitter:image" content="https://www.pdfclear.com/assets/og/pdfclear-social-preview.png" />

        <script type="application/ld+json">{jsonLdWebSite}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
      </Helmet>

      <a href="#main-tools" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white rounded">
        Skip to tools
      </a>

      <section className="relative overflow-hidden rounded-b-[2.5rem] border-b border-white/80 bg-gradient-to-br from-indigo-50 via-white to-rose-50 px-4 pb-8 pt-6 text-center shadow-soft dark:border-border-dark dark:from-dark-body dark:via-indigo-950/30 dark:to-rose-950/20 sm:pb-10">
        <div className="pointer-events-none absolute -left-24 top-6 h-56 w-56 rounded-full bg-indigo-300/35 blur-3xl dark:bg-indigo-500/15" />
        <div className="pointer-events-none absolute left-1/3 top-24 h-40 w-40 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/10" />
        <div className="pointer-events-none absolute -right-16 bottom-4 h-56 w-56 rounded-full bg-rose-300/35 blur-3xl dark:bg-rose-500/12" />
        <div className="pointer-events-none absolute right-1/4 -bottom-20 h-52 w-52 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/10" />

        <div className="relative mx-auto max-w-5xl">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/75 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur dark:border-indigo-900/70 dark:bg-dark-card/70 dark:text-indigo-300">
            <ShieldCheckIcon className="h-4 w-4" />
            <span>Open-source · browser-side PDF processing</span>
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-5xl lg:text-6xl">
            Your PDFs <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-amber-500 bg-clip-text text-transparent">stay yours</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            Edit, convert, OCR, summarize, and search documents directly in your browser. Your files stay on your device, and after required AI or OCR assets are loaded, you can keep working offline.
          </p>

          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-indigo-200 bg-white/80 p-4 text-left shadow-sm backdrop-blur dark:border-indigo-900 dark:bg-dark-card/70">
              <CpuChipIcon className="mb-3 h-7 w-7 text-indigo-600 dark:text-indigo-300" />
              <p className="text-sm font-bold text-gray-900 dark:text-white">Load AI and OCR once</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Models, workers, and language data load before first use.</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-white/80 p-4 text-left shadow-sm backdrop-blur dark:border-rose-900 dark:bg-dark-card/70">
              <SignalSlashIcon className="mb-3 h-7 w-7 text-rose-600 dark:text-rose-300" />
              <p className="text-sm font-bold text-gray-900 dark:text-white">Disconnect and keep working</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Once required assets are loaded, your workflow continues offline.</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white/80 p-4 text-left shadow-sm backdrop-blur dark:border-sky-900 dark:bg-dark-card/70">
              <MagnifyingGlassIcon className="mb-3 h-7 w-7 text-sky-600 dark:text-sky-300" />
              <p className="text-sm font-bold text-gray-900 dark:text-white">Keep files on your device</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Document processing happens directly in your browser.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="#main-tools"
              className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Explore PDF tools
            </a>
            <a
              href={GITHUB_REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-dark-card/80 dark:text-slate-100 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
            >
              View source on GitHub
              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              to="/privacy/"
              className="inline-flex items-center rounded-xl px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              Read the privacy model
            </Link>
          </div>

          <div className="mx-auto mt-7 max-w-xl relative group">
            <label htmlFor="tool-search" className="sr-only">Search PDF Tools</label>
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="absolute left-3.5 h-5 w-5 text-indigo-400 pointer-events-none" aria-hidden="true" />
              <input
                id="tool-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools: merge, rotate, OCR, AI search…"
                className="w-full rounded-2xl border border-white/80 bg-white/90 py-3.5 pl-10 pr-10 text-base text-gray-900 shadow-lg shadow-indigo-900/10 backdrop-blur placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-fuchsia-500/50 dark:border-gray-700 dark:bg-dark-card/90 dark:text-white dark:placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  aria-label="Clear search"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => setSearchQuery(action.label)}
                  className={`rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 dark:border-gray-700 dark:bg-dark-card/70 dark:text-gray-300 sm:text-sm ${action.className}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div id="main-tools" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        <div className="space-y-8">
          {filteredTools.map(category => {
            const theme = getThemeForCategory(category.category);
            return (
              <section key={category.category}>
                <h3 className={theme.sectionHeading}>
                  {category.category}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                  {category.links.map(link => (
                    <Link
                      to={link.path}
                      key={link.id}
                      className={`group relative overflow-hidden flex items-start p-4 bg-white/90 dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-gray-800 hover:-translate-y-0.5 hover:shadow-soft transition-all duration-200 ${theme.cardHover}`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 ${theme.cardStripe}`} />
                      <div className={`mr-4 mt-1 rounded-xl p-2.5 transition-all ${theme.iconWrap}`}>
                        {getToolIcon(link.id, `h-6 w-6 ${theme.icon}`)}
                      </div>
                      <div>
                        <h4 className={`font-semibold text-gray-900 dark:text-white ${theme.titleHover}`}>
                          {link.label}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          {link.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {filteredTools.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No tools found matching "{searchQuery}"</p>
              <button onClick={clearSearch} className="mt-2 text-indigo-600 font-medium hover:underline dark:text-indigo-300">Clear search</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
