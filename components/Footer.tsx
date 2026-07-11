import React from 'react';
import { Link } from 'react-router-dom';
import { SIDEBAR_TOOLS } from '../constants';
import { getThemeForToolId } from '../utils/toolTheme';
import { GITHUB_DISCUSSIONS_URL, GITHUB_REPOSITORY_URL } from '../utils/siteConfig';

const Footer: React.FC = () => {
  const toolLinks = SIDEBAR_TOOLS.flatMap((category) => category.links);

  return (
    <footer className="mt-8 border-t border-white/70 bg-white/90 p-8 shadow-inner backdrop-blur dark:border-border-dark dark:bg-dark-card/90">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 text-center md:grid-cols-3 md:text-left">
        <div>
          <h3 className="mb-2 text-lg font-extrabold text-logo-600 dark:text-logo-400">PDFClear</h3>
          <p className="text-sm leading-6 text-text-light-secondary dark:text-text-dark-secondary">
            Open-source PDF editing, conversion, OCR, summarization, and semantic search. Your files stay on your device, and once required AI or OCR assets are loaded, you can keep working offline.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm md:justify-start">
            <a
              href={GITHUB_REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-700 transition hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100"
            >
              GitHub source
            </a>
            <a
              href={GITHUB_DISCUSSIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-700 transition hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100"
            >
              Discussions
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-text-light-primary dark:text-text-dark-primary">Tools</h4>
          <ul className="space-y-2 sm:columns-2">
            {toolLinks.map((link) => {
              const theme = getThemeForToolId(link.id);
              return (
                <li key={link.id}>
                  <Link
                    to={link.path}
                    className={`text-sm text-text-light-secondary transition-colors dark:text-text-dark-secondary ${theme.titleHover.replace('group-hover:', 'hover:').replace('dark:group-hover:', 'dark:hover:')}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-text-light-primary dark:text-text-dark-primary">Resources</h4>
          <ul className="space-y-2">
            <li>
              <Link to="/about/" className="text-sm text-text-light-secondary transition-colors hover:text-indigo-600 dark:text-text-dark-secondary dark:hover:text-indigo-300">
                About
              </Link>
            </li>
            <li>
              <Link to="/why-us/" className="text-sm text-text-light-secondary transition-colors hover:text-fuchsia-600 dark:text-text-dark-secondary dark:hover:text-fuchsia-300">
                Why PDFClear?
              </Link>
            </li>
            <li>
              <Link to="/privacy/" className="text-sm text-text-light-secondary transition-colors hover:text-emerald-600 dark:text-text-dark-secondary dark:hover:text-emerald-300">
                Privacy model
              </Link>
            </li>
            <li>
              <Link to="/contact/" className="text-sm text-text-light-secondary transition-colors hover:text-amber-600 dark:text-text-dark-secondary dark:hover:text-amber-300">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-border-light pt-6 text-center text-sm text-text-light-secondary dark:border-border-dark dark:text-text-dark-secondary">
        © {new Date().getFullYear()} PDFClear. Open-source under the Apache License 2.0.
      </div>
    </footer>
  );
};

export default Footer;
