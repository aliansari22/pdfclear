import React, { useState, useRef, useEffect } from 'react';
import { useFileContext } from '../hooks/useFileContext';
import { Link, NavLink } from 'react-router-dom';
import { SIDEBAR_TOOLS } from '../constants';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { getToolIcon } from '../pages/HomePage'; // Import the icon function
import { getThemeForCategory, getThemeForToolId } from '../utils/toolTheme';
import { GITHUB_REPOSITORY_URL } from '../utils/siteConfig';

// The SVG logo is defined as a reusable React component.
// It uses `fill="currentColor"` so its color can be controlled by Tailwind's text color utilities.
const BrandLogo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 10240 10240"
    className={className}
    aria-hidden="true"
  >
    <g fill="currentColor">
      <path d="M7150 9424 c-61 -23 -218 -109 -213 -117 3 -6 1 -7 -5 -3 -16 10 -184 -83 -176 -96 4 -7 2 -8 -5 -4 -14 9 -117 -48 -125 -70 -3 -8 -10 -13 -16 -9 -5 3 -47 -18 -93 -47 -77 -49 -160 -109 -128 -92 9 5 12 3 7 -5 -4 -6 -12 -9 -17 -6 -15 10 -178 -109 -352 -257 l-32 -28 -1940 -3 c-1067 -2 -1953 -7 -1968 -11 -22 -7 -25 -11 -15 -18 8 -6 4 -7 -13 -3 -62 15 -229 -84 -334 -197 -76 -82 -138 -186 -129 -214 5 -15 4 -16 -4 -5 -8 11 -15 -2 -30 -51 -49 -159 -47 27 -47 -3538 0 -3191 1 -3348 18 -3410 38 -136 187 -384 219 -364 6 4 8 2 4 -4 -9 -15 99 -100 192 -150 44 -23 115 -50 163 -62 83 -20 111 -20 2064 -20 1089 0 1997 3 2017 6 22 4 35 11 31 17 -4 6 -1 7 6 2 20 -12 101 23 94 41 -4 11 2 14 24 12 18 -1 43 8 64 22 58 41 209 192 202 204 -3 6 -2 8 2 3 11 -9 196 174 188 186 -3 6 -2 7 4 4 13 -8 56 37 46 48 -5 4 -3 5 3 2 14 -8 47 26 37 38 -5 4 -3 5 3 2 11 -6 152 129 155 148 0 6 5 9 9 8 12 -4 786 786 782 798 -1 6 1 8 6 5 10 -6 357 342 392 393 13 19 19 32 13 28 -7 -5 -9 0 -6 13 3 11 10 20 15 20 5 0 6 -4 3 -10 -3 -5 -3 -10 0 -10 3 0 16 21 28 48 l22 47 3 1377 2 1377 28 5 c15 2 58 10 97 17 46 8 63 14 51 19 -10 3 10 7 45 7 35 0 111 10 169 21 58 11 128 24 155 28 40 5 46 8 30 15 -15 7 -11 8 15 4 40 -5 146 38 135 55 -3 5 -2 10 4 10 6 0 8 7 4 17 -5 13 -2 15 15 11 26 -7 47 15 67 71 20 57 22 386 3 394 -10 4 -10 7 0 14 17 13 9 217 -9 240 -9 11 -10 14 -2 10 9 -6 12 53 13 260 0 147 3 300 6 340 5 58 3 77 -10 97 -10 17 -12 24 -4 21 10 -4 12 20 6 112 -10 190 -55 415 -86 441 -9 7 -11 11 -4 7 16 -8 15 -2 -5 61 -9 29 -20 51 -25 48 -4 -3 -5 1 -3 8 11 29 -153 361 -216 438 -12 14 -17 19 -13 11 5 -9 3 -12 -5 -7 -6 4 -9 12 -6 17 11 17 -180 253 -196 243 -5 -3 -9 -2 -8 3 4 23 -2 35 -17 29 -8 -3 -12 -2 -9 4 8 13 -24 47 -161 170 -152 138 -206 180 -218 173 -5 -3 -6 -2 -3 4 11 18 -375 289 -395 277 -6 -4 -8 -3 -5 4 9 13 -180 125 -195 116 -7 -5 -8 -2 -3 6 6 10 4 12 -8 7 -9 -3 -19 -1 -23 5 -5 7 -2 8 6 3 7 -5 11 -4 7 1 -3 5 -53 34 -112 64 -101 52 -111 55 -188 57 -45 1 -89 0 -97 -3z m222 -604 c61 -35 114 -58 121 -54 6 4 9 4 5 -1 -11 -12 60 -58 75 -49 6 4 9 3 4 -1 -9 -11 111 -88 124 -79 5 3 8 1 7 -4 -2 -5 44 -45 102 -88 58 -44 155 -127 216 -186 61 -59 114 -106 117 -103 4 3 5 2 3 -1 -3 -3 26 -45 63 -93 132 -166 241 -356 301 -519 14 -40 30 -69 35 -65 4 5 5 2 1 -4 -4 -7 2 -43 13 -80 65 -227 72 -306 72 -911 l1 -527 -64 -17 c-34 -9 -74 -17 -88 -17 -20 -1 -22 -3 -10 -12 12 -8 10 -9 -8 -4 -34 10 -343 -65 -317 -77 16 -7 15 -7 -7 -3 -14 3 -66 -7 -115 -20 -137 -40 -127 -36 -112 -46 11 -7 9 -9 -6 -10 -19 -2 -31 -3 -78 -7 -11 -1 -15 -7 -11 -14 4 -7 3 -8 -5 -4 -14 9 -112 -24 -105 -36 3 -4 -3 -7 -13 -6 -10 0 -27 0 -38 -1 -17 -1 -18 -3 -5 -12 12 -9 12 -10 -3 -5 -21 7 -166 -49 -183 -70 -6 -8 -13 -11 -16 -9 -3 3 -48 -14 -100 -38 -90 -42 -150 -56 -145 -35 3 14 -254 148 -401 208 -81 34 -131 49 -145 45 -14 -4 -18 -3 -9 3 23 16 -387 131 -479 135 -26 1 -45 5 -43 8 6 10 -83 21 -109 14 -15 -4 -18 -3 -9 3 10 6 -10 13 -63 21 -41 6 -85 11 -96 11 -20 0 -20 3 -16 613 l4 612 28 120 c15 66 28 135 28 153 0 18 3 28 7 22 4 -6 12 8 19 30 6 22 9 46 5 52 -4 6 -3 8 3 5 5 -3 24 29 42 72 18 43 54 117 81 164 26 48 47 87 45 87 -2 0 9 15 26 32 16 18 27 39 24 46 -3 7 -1 11 4 8 10 -7 117 132 113 146 -1 5 1 7 6 4 12 -7 93 79 84 89 -4 4 -2 5 3 3 6 -2 45 28 87 66 65 59 75 72 65 85 -10 14 -10 14 4 3 14 -10 22 -7 55 19 21 17 65 49 96 70 31 21 60 48 63 60 4 13 12 18 22 15 8 -4 52 16 101 46 114 69 372 197 397 198 11 0 68 -27 127 -60z m-1746 -653 c2 -1 -30 -68 -70 -147 -114 -229 -184 -463 -220 -742 -13 -94 -16 -248 -16 -799 0 -378 4 -698 8 -715 17 -55 41 -91 87 -132 56 -49 108 -67 240 -82 55 -6 146 -18 202 -26 56 -9 113 -13 125 -9 18 5 20 4 8 -4 -13 -9 -12 -11 6 -11 11 0 94 -18 183 -40 89 -22 167 -37 173 -34 6 4 8 3 5 -3 -4 -6 12 -16 36 -22 80 -24 262 -102 375 -162 63 -32 118 -56 123 -53 5 3 8 1 7 -4 -5 -16 210 -151 265 -167 47 -14 132 -11 122 4 -2 4 11 7 28 7 30 0 172 72 162 82 -3 3 -11 -1 -20 -8 -13 -11 -14 -10 -9 4 4 10 16 16 33 15 27 -2 133 52 132 67 0 5 7 9 17 9 26 1 151 58 146 67 -3 4 2 5 10 2 10 -4 16 -1 16 7 0 9 3 10 10 3 7 -7 9 -393 8 -1140 l-3 -1129 -24 3 c-15 2 -21 0 -17 -7 4 -6 2 -11 -3 -11 -6 0 -11 5 -11 11 0 7 -160 9 -537 6 -580 -4 -579 -4 -753 -62 -85 -28 -225 -104 -225 -122 0 -6 -4 -15 -9 -20 -5 -5 -6 -3 -2 5 4 6 3 12 -2 12 -6 0 -49 -41 -97 -92 -69 -74 -96 -111 -135 -192 -53 -107 -95 -239 -110 -346 -5 -36 -10 -280 -10 -542 l0 -478 -737 0 c-406 0 -1210 0 -1787 0 l-1048 0 -58 24 c-101 40 -169 114 -201 217 -18 59 -19 116 -19 1680 0 1078 -3 1618 -10 1614 -5 -3 -10 1 -10 10 0 9 5 13 10 10 7 -4 10 340 10 1024 0 681 -3 1031 -10 1031 -5 0 -9 17 -9 38 l2 37 7 -35 c4 -19 8 206 9 500 0 428 3 546 15 589 8 30 11 62 8 70 -3 9 -2 13 3 9 4 -4 20 12 35 35 33 52 81 94 140 121 43 20 64 21 580 26 523 5 2811 3 2816 -3z m1667 -5626 c42 -2 67 2 67 8 0 6 12 11 28 10 24 0 25 -1 7 -9 -17 -7 -15 -9 13 -9 17 -1 32 -4 32 -8 0 -10 -1033 -1043 -1042 -1043 -12 0 -9 458 3 565 11 99 35 185 69 243 11 18 17 38 14 44 -4 6 -3 8 3 5 5 -3 27 13 49 35 21 22 56 52 78 65 49 31 159 73 192 73 14 0 23 3 21 8 -3 4 20 7 51 8 290 4 332 6 332 17 0 9 2 9 8 1 4 -6 37 -12 75 -13z"></path>
      <path d="M6889 7950 c-31 -16 -252 -239 -544 -548 -104 -109 -118 -134 -118 -203 0 -68 29 -135 98 -221 55 -70 83 -89 138 -95 54 -5 112 27 102 57 -5 16 -2 20 17 20 16 0 56 33 133 110 60 61 104 110 97 110 -7 0 -10 5 -7 10 4 6 10 8 15 5 11 -7 76 63 72 77 -1 5 2 7 7 4 5 -3 25 12 45 34 26 29 42 39 58 36 13 -1 23 -8 23 -14 0 -16 518 -537 530 -533 6 1 7 -1 3 -5 -11 -10 420 -442 464 -465 46 -23 127 -25 171 -3 65 33 147 129 132 155 -4 5 -1 8 6 7 15 -3 38 53 38 94 1 15 -4 39 -10 55 -13 36 -1273 1298 -1315 1318 -43 20 -111 18 -155 -5z"></path>
      <path d="M2570 5251 c-14 -4 -24 -13 -22 -20 1 -7 -2 -10 -7 -6 -29 17 -31 -54 -31 -951 l0 -918 25 -26 25 -25 398 0 c393 0 530 7 501 26 -9 7 -1 8 24 3 30 -5 37 -3 37 10 0 12 10 16 38 16 41 0 162 52 162 70 0 6 4 9 10 5 8 -5 46 25 108 82 7 7 10 18 6 24 -4 7 -3 9 4 5 23 -14 99 107 138 219 26 73 28 93 29 225 0 164 -19 253 -78 365 -42 79 -149 191 -228 238 -64 37 -97 47 -83 25 4 -7 3 -8 -5 -4 -6 4 -9 11 -6 16 5 9 -53 30 -145 51 -56 14 -280 17 -355 6 -37 -5 -37 -5 -5 2 29 7 21 9 -42 10 l-77 1 -3 255 c-4 326 16 299 -221 302 -94 1 -183 -2 -197 -6z m793 -1013 c15 0 25 -3 23 -6 -3 -2 16 -18 42 -36 96 -64 135 -213 84 -316 -11 -24 -18 -48 -15 -53 3 -6 1 -7 -4 -4 -6 4 -18 -2 -27 -12 -10 -11 -41 -29 -69 -42 -46 -20 -72 -23 -229 -27 l-178 -4 0 257 0 257 173 -6 c94 -4 184 -7 200 -8z"></path>
      <path d="M6224 5254 c-12 -3 -32 -16 -45 -30 l-24 -26 -3 -896 c-2 -886 -2 -897 18 -930 13 -20 39 -42 68 -55 46 -22 54 -22 567 -22 286 0 532 3 547 8 15 4 34 17 42 30 27 42 32 388 5 371 -5 -3 -6 1 -3 9 3 8 -6 23 -21 35 -25 20 -38 21 -333 21 -169 0 -322 0 -339 0 -26 1 -33 5 -33 21 0 14 -5 18 -17 13 -13 -5 -15 -2 -10 11 4 10 7 20 7 22 0 3 5 2 11 -1 7 -5 10 32 8 117 l-1 123 299 3 300 2 24 26 c23 25 24 30 24 182 0 86 -3 169 -8 184 -14 50 -29 53 -351 58 -243 4 -300 8 -304 19 -3 8 0 11 7 7 8 -5 10 67 9 276 -3 318 -5 325 -72 357 -92 44 -302 81 -372 65z"></path>
      <path d="M4272 5249 c-14 -5 -20 -13 -16 -20 4 -7 3 -9 -4 -5 -6 3 -18 -4 -26 -16 -14 -20 -16 -120 -15 -918 1 -492 4 -906 8 -919 3 -13 19 -34 34 -45 28 -21 38 -21 444 -21 288 0 417 3 420 11 2 6 17 8 35 6 18 -3 28 -1 25 5 -3 5 8 8 26 6 26 -3 28 -1 12 6 -25 12 -24 12 50 16 65 3 186 49 182 69 -1 6 7 12 18 12 11 1 25 2 32 3 7 1 29 18 50 38 20 21 33 31 28 23 -8 -13 -6 -13 11 -1 47 36 123 115 117 124 -3 6 -1 7 4 4 14 -9 37 19 27 34 -4 7 -3 9 4 5 17 -11 117 146 108 170 -3 8 0 13 6 11 18 -3 75 177 87 278 45 366 -46 686 -251 887 -56 54 -188 140 -205 133 -8 -2 -12 -1 -9 4 8 13 -73 43 -98 36 -14 -4 -17 -3 -8 3 19 13 -96 44 -139 37 -24 -4 -28 -3 -14 3 14 7 -5 12 -71 20 -109 14 -838 15 -872 1z m833 -434 c100 -28 188 -84 238 -152 13 -18 28 -29 33 -25 5 4 6 3 2 -2 -4 -5 4 -30 18 -57 35 -70 56 -171 57 -269 0 -155 -53 -290 -153 -390 -30 -30 -53 -59 -52 -63 1 -5 -2 -6 -7 -3 -5 3 -28 -5 -52 -18 -79 -44 -181 -65 -334 -68 l-140 -3 -3 525 c-1 289 0 531 3 539 8 20 306 9 390 -14z"></path>
    </g>
  </svg>
);

const GitHubRepoButton: React.FC = () => (
  <a
    href={GITHUB_REPOSITORY_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="View PDFClear on GitHub"
    className="inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:border-border-dark dark:bg-dark-body dark:text-text-dark-primary dark:hover:bg-indigo-950/40 dark:hover:text-white sm:px-4"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.605-3.369-1.342-3.369-1.342-.454-1.156-1.11-1.464-1.11-1.464-.908-.621.069-.608.069-.608 1.003.071 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.987 1.029-2.686-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0112 6.87c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.203 2.397.1 2.65.64.699 1.028 1.593 1.028 2.686 0 3.848-2.337 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.481C19.138 20.194 22 16.442 22 12.017 22 6.484 17.523 2 12 2z"
      />
    </svg>
    <span className="hidden sm:inline">GitHub</span>
  </a>
);

interface HeaderProps {
  toggleSidebar: () => void;
  isHomePage?: boolean;
}

const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useFileContext();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    toggleTheme();
    buttonRef.current?.blur();
  };

  const nextMode = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      aria-label={`Switch to ${nextMode} mode`}
      aria-pressed={theme === 'dark'}
      title={`Toggle ${nextMode} mode`}
      className="inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-full text-text-light-secondary dark:text-text-dark-secondary hover:bg-indigo-50 dark:hover:bg-indigo-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 motion-safe:transition"
    >
      {theme === 'light' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isHomePage = false }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navLinkClasses = "text-text-light-primary dark:text-text-dark-primary hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors";
  const activeNavLinkClasses = "text-brand-600 dark:text-brand-400";

  const activeCategoryData = SIDEBAR_TOOLS.find(c => c.category === activeCategory);
  const activeCategoryTheme = activeCategoryData ? getThemeForCategory(activeCategoryData.category) : undefined;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Set initial active category when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && activeCategory === null && SIDEBAR_TOOLS.length > 0) {
      setActiveCategory(SIDEBAR_TOOLS[0].category);
    }
  }, [isDropdownOpen, activeCategory]);


  return (
    <header
      className="sticky top-0 z-50
                 border-b border-white/70 bg-white/90 dark:border-border-dark dark:bg-dark-card/85
                 backdrop-blur-sm supports-[backdrop-filter]:bg-white/75 dark:supports-[backdrop-filter]:bg-dark-card/65
                 shadow-sm
                 pt-[max(env(safe-area-inset-top),0px)]"
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex items-center justify-between gap-4 py-2 sm:py-3">

          {/* Left side: Hamburger + Brand */}
          <div className="flex items-center gap-2">
            {!isHomePage && (
              <button
                onClick={toggleSidebar}
                className="md:hidden inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-full text-text-light-secondary dark:text-text-dark-secondary hover:bg-indigo-50 dark:hover:bg-indigo-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 motion-safe:transition"
                aria-label="Open sidebar menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <Link to="/" className="flex items-center no-underline gap-2">
              <BrandLogo className="h-11 w-11 sm:h-12 sm:w-12 text-logo-600 dark:text-logo-400" />
              <h1 className="hidden sm:block text-xl sm:text-2xl font-bold text-logo-600 dark:text-logo-400 select-none">
                PDFClear
              </h1>
            </Link>
          </div>

          {/* Center: Desktop Navigation */}
          <div className="flex-1 flex justify-center">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {isHomePage ? (
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-1 text-text-light-primary dark:text-text-dark-primary hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                  >
                    All Tools
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-full mt-2 w-[560px] -translate-x-1/2 left-1/2 overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-2xl shadow-indigo-900/10 backdrop-blur dark:border-border-dark dark:bg-dark-card/95 flex animate-fade-in-fast">
                      <div className="w-1/3 border-r border-border-light bg-slate-50/80 p-2 dark:border-border-dark dark:bg-dark-body/60">
                        {SIDEBAR_TOOLS.map(category => {
                          const theme = getThemeForCategory(category.category);
                          return (
                            <button
                              key={category.category}
                              onMouseEnter={() => setActiveCategory(category.category)}
                              className={`w-full text-left p-2 rounded-xl text-sm font-medium transition-colors ${activeCategory === category.category ? theme.dropdownActive : `${theme.dropdownHover} text-text-light-primary dark:text-text-dark-primary`}`}
                            >
                              {category.category}
                            </button>
                          );
                        })}
                      </div>
                      <div className="w-2/3 p-2">
                        {activeCategoryData && activeCategoryData.links.map(link => {
                          const theme = getThemeForToolId(link.id);
                          return (
                            <Link
                              key={link.id}
                              to={link.path}
                              onClick={() => setDropdownOpen(false)}
                              className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${activeCategoryTheme?.dropdownHover || 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40'}`}
                            >
                              <span className={`rounded-lg p-1.5 ${theme.iconWrap}`}>
                                {getToolIcon(link.id, `h-5 w-5 ${theme.icon} flex-shrink-0`)}
                              </span>
                              <div>
                                <p className={`font-semibold text-sm text-text-light-primary dark:text-text-dark-primary ${theme.titleHover}`}>{link.label}</p>
                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{link.description}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <NavLink to="/" className={({isActive}) => `${navLinkClasses} ${isActive && isHomePage ? activeNavLinkClasses : ''}`}>
                  Home
                </NavLink>
              )}
              <NavLink to="/about/" className={({isActive}) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                About
              </NavLink>
              <NavLink to="/why-us/" className={({isActive}) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                Why us?
              </NavLink>
              <NavLink to="/privacy/" className={({isActive}) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                Privacy
              </NavLink>
              <NavLink to="/contact/" className={({isActive}) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                Contact
              </NavLink>
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <GitHubRepoButton />
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;