import React from 'react';
import { NavLink } from 'react-router-dom';
import { SIDEBAR_TOOLS } from '../constants';
import { getThemeForCategory } from '../utils/toolTheme';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 transform border-r border-white/70 bg-white/95 shadow-2xl shadow-indigo-900/10 backdrop-blur dark:border-border-dark dark:bg-dark-body/95 md:relative md:translate-x-0 md:flex-shrink-0 md:block transition-transform duration-300 ease-in-out
                       ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Sidebar"
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark md:hidden">
          <h2 className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 bg-clip-text text-lg font-extrabold text-transparent">
            PDFClear Menu
          </h2>
          <button
            onClick={closeSidebar}
            className="text-text-light-secondary hover:text-indigo-700 dark:text-text-dark-secondary dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
            aria-label="Close sidebar menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex flex-col space-y-6 p-4 overflow-y-auto h-[calc(100%-65px)] md:h-auto">
          {SIDEBAR_TOOLS.map((category, index) => {
            const theme = getThemeForCategory(category.category);
            return (
              <div key={category.category} className="mb-4">
                <h3 aria-level={3} className={theme.sidebarHeading}>
                  {category.category}
                </h3>

                <ul className="space-y-1">
                  {category.links.map((link) => (
                    <li key={link.id}>
                      <NavLink
                        to={link.path}
                        onClick={() => {
                          closeSidebar();

                          setTimeout(() => {
                            const main = document.getElementById('main-content');
                            main?.focus({ preventScroll: true });
                          }, 0);
                        }}
                        className={({ isActive }) =>
                          `flex items-center rounded-r-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive ? theme.sidebarActive : theme.sidebarInactive
                          }`
                        }
                      >
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>

                {index < SIDEBAR_TOOLS.length - 1 && (
                  <hr className="mt-4 border-border-light dark:border-border-dark" />
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
