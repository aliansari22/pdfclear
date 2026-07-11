import React, { useEffect, useRef, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ToolPageWrapper from './components/ToolPageWrapper';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import { useFileContext } from './hooks/useFileContext';
import Spinner from './components/Spinner';

// Existing Lazy Imports
const SemanticSearchPage = React.lazy(() => import("./pages/SemanticSearchPage"));
const WhyUsPage = React.lazy(() => import('./pages/WhyUsPage'));
const SummarizePage = React.lazy(() => import('./pages/SummarizePage'));
const SmartPdfToTxtPage = React.lazy(() => import('./pages/SmartPdfToTxtPage'));
const CompressPage = React.lazy(() => import('./pages/CompressPage'));
const JpgToPdfPage = React.lazy(() => import('./pages/JpgToPdfPage'));
const PngToPdfPage = React.lazy(() => import('./pages/PngToPdfPage'));
const TxtToPdfPage = React.lazy(() => import('./pages/TxtToPdfPage'));
const PdfToJpgPage = React.lazy(() => import('./pages/PdfToJpgPage'));
const PdfToPngPage = React.lazy(() => import('./pages/PdfToPngPage'));
const PdfToMarkdownPage = React.lazy(() => import('./pages/PdfToMarkdownPage'));
const HtmlToPdfPage = React.lazy(() => import('./pages/HtmlToPdfPage'));
const MarkdownToPdfPage = React.lazy(() => import('./pages/MarkdownToPdfPage'));
const WatermarkPage = React.lazy(() => import('./pages/WatermarkPage'));
const MergePage = React.lazy(() => import('./pages/MergePage'));
const SplitPage = React.lazy(() => import('./pages/SplitPage'));
const RotatePage = React.lazy(() => import('./pages/RotatePage'));
const DeletePagesPage = React.lazy(() => import('./pages/DeletePagesPage'));
const ReorderPagesPage = React.lazy(() => import('./pages/ReorderPagesPage'));
const FlipPagesPage = React.lazy(() => import('./pages/FlipPagesPage'));
const AddPageNumbersPage = React.lazy(() => import('./pages/AddPageNumbersPage'));
const ProtectPdfPage = React.lazy(() => import('./pages/ProtectPdfPage'));
const UnlockPdfPage = React.lazy(() => import('./pages/UnlockPdfPage'));
const AddImagePage = React.lazy(() => import('./pages/AddImagePage'));
const AddTextPage = React.lazy(() => import('./pages/AddTextPage'));
const EditMetadataPage = React.lazy(() => import('./pages/EditMetadataPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));

// NEW LAZY IMPORTS
const SignPdfPage = React.lazy(() => import('./pages/SignPdfPage'));
const FillFormPage = React.lazy(() => import('./pages/FillFormPage'));

const normalizePath = (p: string) => {
  if (!p || p === '/') return '/';
  return p.replace(/\/+$/, '')
};


const ToolSuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToolPageWrapper>
    <Suspense fallback={<div className="flex justify-center items-center gap-2 h-48"><Spinner /> Loading tool...</div>}>
      {children}
    </Suspense>
  </ToolPageWrapper>
);

const NonToolSuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex justify-center items-center gap-2 h-48"><Spinner /> Loading page...</div>}>
    {children}
  </Suspense>
);

const App: React.FC = () => {
  const location = useLocation();
  const { 
    reset, 
    clearMessages,
    setProgress
  } = useFileContext();

  const prevPathname = useRef(location.pathname);

  const isHomePage = normalizePath(location.pathname) === '/';

  useEffect(() => {
    clearMessages();
    setProgress(0);
  }, [location.pathname, clearMessages, setProgress]);

  useEffect(() => {
    if (prevPathname.current !== location.pathname) {
      reset();
    }
    prevPathname.current = location.pathname;
  }, [location.pathname, reset]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [location.pathname]);

  return (
    <Layout isHomePage={isHomePage}>
      <div className="min-h-screen">
        {/* Skip link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
        >
          Skip to main content
        </a>

        {/* Main content container */}
        <div id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />

            {/* AI + Organize */}
            <Route path="/pdf-semantic-search/" element={<ToolSuspenseWrapper><SemanticSearchPage /></ToolSuspenseWrapper>} />
            <Route path="/ai-pdf-summarizer/" element={<ToolSuspenseWrapper><SummarizePage /></ToolSuspenseWrapper>} />
            <Route path="/smart-pdf-to-txt/" element={<ToolSuspenseWrapper><SmartPdfToTxtPage /></ToolSuspenseWrapper>} />

            {/* Core PDF Tools */}
            <Route path="/merge-pdf/" element={<ToolSuspenseWrapper><MergePage /></ToolSuspenseWrapper>} />
            <Route path="/split-pdf/" element={<ToolSuspenseWrapper><SplitPage /></ToolSuspenseWrapper>} />
            <Route path="/rotate-pdf/" element={<ToolSuspenseWrapper><RotatePage /></ToolSuspenseWrapper>} />
            <Route path="/delete-pdf-pages/" element={<ToolSuspenseWrapper><DeletePagesPage /></ToolSuspenseWrapper>} />
            <Route path="/reorder-pdf-pages/" element={<ToolSuspenseWrapper><ReorderPagesPage /></ToolSuspenseWrapper>} />
            <Route path="/flip-pdf-pages/" element={<ToolSuspenseWrapper><FlipPagesPage /></ToolSuspenseWrapper>} />
            <Route path="/compress-pdf/" element={<ToolSuspenseWrapper><CompressPage /></ToolSuspenseWrapper>} />

            {/* Edit & Annotate */}
            <Route path="/sign-pdf/" element={<ToolSuspenseWrapper><SignPdfPage /></ToolSuspenseWrapper>} />
            <Route path="/fill-pdf-form/" element={<ToolSuspenseWrapper><FillFormPage /></ToolSuspenseWrapper>} />
            <Route path="/add-page-numbers/" element={<ToolSuspenseWrapper><AddPageNumbersPage /></ToolSuspenseWrapper>} />
            <Route path="/watermark-pdf/" element={<ToolSuspenseWrapper><WatermarkPage /></ToolSuspenseWrapper>} />
            <Route path="/add-image-to-pdf/" element={<ToolSuspenseWrapper><AddImagePage /></ToolSuspenseWrapper>} />
            <Route path="/add-text-to-pdf/" element={<ToolSuspenseWrapper><AddTextPage /></ToolSuspenseWrapper>} />
            <Route path="/edit-pdf-metadata/" element={<ToolSuspenseWrapper><EditMetadataPage /></ToolSuspenseWrapper>} /> {/* NEW ROUTE */}

            {/* PDF Security Routes */}
            <Route path="/protect-pdf/" element={<ToolSuspenseWrapper><ProtectPdfPage /></ToolSuspenseWrapper>} />
            <Route path="/unlock-pdf/" element={<ToolSuspenseWrapper><UnlockPdfPage /></ToolSuspenseWrapper>} />

            {/* Convert to PDF Routes */}
            <Route path="/jpg-to-pdf/" element={<ToolSuspenseWrapper><JpgToPdfPage /></ToolSuspenseWrapper>} />
            <Route path="/png-to-pdf/" element={<ToolSuspenseWrapper><PngToPdfPage /></ToolSuspenseWrapper>} />
            <Route path="/txt-to-pdf/" element={<ToolSuspenseWrapper><TxtToPdfPage /></ToolSuspenseWrapper>} />
            <Route path="/html-to-pdf/" element={<ToolSuspenseWrapper><HtmlToPdfPage /></ToolSuspenseWrapper>} />
            <Route path="/markdown-to-pdf/" element={<ToolSuspenseWrapper><MarkdownToPdfPage /></ToolSuspenseWrapper>} />
            
            {/* Convert from PDF Routes */}
            <Route path="/pdf-to-jpg/" element={<ToolSuspenseWrapper><PdfToJpgPage /></ToolSuspenseWrapper>} />
            <Route path="/pdf-to-png/" element={<ToolSuspenseWrapper><PdfToPngPage /></ToolSuspenseWrapper>} />
            <Route path="/pdf-to-markdown/" element={<ToolSuspenseWrapper><PdfToMarkdownPage /></ToolSuspenseWrapper>} />
            
            
            {/* Non-tool pages (also lazy loaded) */}
            <Route path="/about/" element={<NonToolSuspenseWrapper><AboutPage /></NonToolSuspenseWrapper>} />
            <Route path="/contact/" element={<NonToolSuspenseWrapper><ContactPage /></NonToolSuspenseWrapper>} />
            <Route path="/privacy/" element={<NonToolSuspenseWrapper><PrivacyPage /></NonToolSuspenseWrapper>} />
            
            

          {/* Why PDFClear? */}
          <Route path="/why-us/" element={
            <NonToolSuspenseWrapper>
              <WhyUsPage />
            </NonToolSuspenseWrapper>
          } />

          {/* Catch-all route */}
          <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>

      </div>
    </Layout>
  );
};

export default App;
