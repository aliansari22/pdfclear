import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ALL_TOOLS } from '../constants';

export default function NotFoundPage() {
  // Suggest the first available tool, or just home
  const firstToolPath = ALL_TOOLS.length > 0 ? ALL_TOOLS[0].path : '/';
  const firstToolLabel = ALL_TOOLS.length > 0 ? ALL_TOOLS[0].label : 'a PDF tool';

  return (
    <>
      <Helmet>
        {/* Core SEO */}
        <meta name="robots" content="noindex,follow" />
        <meta name="description" content="The page you are looking for could not be found. Please check the URL or return to the homepage." />
        
        {/* SEO: Standardized title */}
        <title>404 - Page Not Found | PDFClear</title>
        
        {/* Open Graph */}
        <meta property="og:title" content="404 - Page Not Found | PDFClear" />
        <meta property="og:description" content="The page you are looking for could not be found. Please check the URL or return to the homepage." />

        {/* Twitter */}
        <meta name="twitter:title" content="404 - Page Not Found | PDFClear" />
        <meta name="twitter:description" content="The page you are looking for could not be found. Please check the URL or return to the homepage." />
        
        {/* Keywords */}
        {/* No keywords needed for a 404 page */}

        {/* JSON-LD */}
        {/* No JSON-LD needed for a 404 page */}
      </Helmet>

      <div className="text-center py-16">
        <h1 className="text-3xl font-semibold mb-3 text-text-light-primary dark:text-text-dark-primary">Page not found</h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
          The URL may be wrong or the page moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="px-4 py-2 rounded bg-brand-500 text-white hover:bg-brand-600 transition-colors">
            Go to Home
          </Link>
          <Link to={firstToolPath} className="px-4 py-2 rounded border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-gray-50 dark:hover:bg-dark-card transition-colors">
            Try {firstToolLabel}
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
          {ALL_TOOLS.slice(0, 9).map(t => (
            <Link key={t.id} to={t.path} className="p-3 rounded border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-dark-card text-text-light-secondary dark:text-text-dark-secondary transition-colors">
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
