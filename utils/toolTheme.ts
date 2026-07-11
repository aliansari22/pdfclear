import { SIDEBAR_TOOLS } from '../constants';

export interface ToolTheme {
  eyebrow: string;
  sidebarHeading: string;
  sidebarActive: string;
  sidebarInactive: string;
  dropdownActive: string;
  dropdownHover: string;
  sectionHeading: string;
  iconWrap: string;
  icon: string;
  cardHover: string;
  cardStripe: string;
  titleHover: string;
  chip: string;
}

const DEFAULT_THEME: ToolTheme = {
  eyebrow: 'text-indigo-700 dark:text-indigo-300',
  sidebarHeading: 'relative px-3 py-2 text-sm font-bold tracking-wide uppercase rounded mb-3 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-950/60 dark:to-transparent text-indigo-700 dark:text-indigo-300 border-l-4 border-indigo-500',
  sidebarActive: 'bg-indigo-50 border-l-2 border-indigo-500 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:border-indigo-400 dark:text-indigo-300',
  sidebarInactive: 'border-l-2 border-transparent text-text-light-secondary hover:bg-indigo-50 hover:text-indigo-700 dark:text-text-dark-secondary dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300',
  dropdownActive: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200',
  dropdownHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300',
  sectionHeading: 'sticky top-16 z-30 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/95 via-white/95 to-transparent pl-3 py-2 text-lg font-bold text-indigo-800 shadow-sm backdrop-blur dark:border-indigo-900/60 dark:from-indigo-950/70 dark:via-dark-body/90 dark:text-indigo-200',
  iconWrap: 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 group-hover:shadow-glow',
  icon: 'text-indigo-600 dark:text-indigo-300',
  cardHover: 'hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-indigo-900/10',
  cardStripe: 'bg-indigo-500',
  titleHover: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300',
  chip: 'hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300',
};

export const CATEGORY_THEMES: Record<string, ToolTheme> = {
  'AI & Text Extraction': {
    eyebrow: 'text-indigo-700 dark:text-indigo-300',
    sidebarHeading: 'relative px-3 py-2 text-sm font-bold tracking-wide uppercase rounded mb-3 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-950/60 dark:to-transparent text-indigo-700 dark:text-indigo-300 border-l-4 border-indigo-500',
    sidebarActive: 'bg-indigo-50 border-l-2 border-indigo-500 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:border-indigo-400 dark:text-indigo-300',
    sidebarInactive: 'border-l-2 border-transparent text-text-light-secondary hover:bg-indigo-50 hover:text-indigo-700 dark:text-text-dark-secondary dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300',
    dropdownActive: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200',
    dropdownHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300',
    sectionHeading: 'sticky top-16 z-30 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/95 via-white/95 to-transparent pl-3 py-2 text-lg font-bold text-indigo-800 shadow-sm backdrop-blur dark:border-indigo-900/60 dark:from-indigo-950/70 dark:via-dark-body/90 dark:text-indigo-200',
    iconWrap: 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 group-hover:shadow-glow',
    icon: 'text-indigo-600 dark:text-indigo-300',
    cardHover: 'hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-indigo-900/10',
    cardStripe: 'bg-indigo-500',
    titleHover: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300',
    chip: 'hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300',
  },
  'Convert from PDF': {
    eyebrow: 'text-sky-700 dark:text-sky-300',
    sidebarHeading: 'relative px-3 py-2 text-sm font-bold tracking-wide uppercase rounded mb-3 bg-gradient-to-r from-sky-50 to-transparent dark:from-sky-950/60 dark:to-transparent text-sky-700 dark:text-sky-300 border-l-4 border-sky-500',
    sidebarActive: 'bg-sky-50 border-l-2 border-sky-500 text-sky-700 font-semibold dark:bg-sky-950/60 dark:border-sky-400 dark:text-sky-300',
    sidebarInactive: 'border-l-2 border-transparent text-text-light-secondary hover:bg-sky-50 hover:text-sky-700 dark:text-text-dark-secondary dark:hover:bg-sky-950/40 dark:hover:text-sky-300',
    dropdownActive: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-200',
    dropdownHover: 'hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-300',
    sectionHeading: 'sticky top-16 z-30 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/95 via-white/95 to-transparent pl-3 py-2 text-lg font-bold text-sky-800 shadow-sm backdrop-blur dark:border-sky-900/60 dark:from-sky-950/70 dark:via-dark-body/90 dark:text-sky-200',
    iconWrap: 'bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/40 dark:to-cyan-950/30 group-hover:shadow-glow-sky',
    icon: 'text-sky-600 dark:text-sky-300',
    cardHover: 'hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-sky-900/10',
    cardStripe: 'bg-sky-500',
    titleHover: 'group-hover:text-sky-700 dark:group-hover:text-sky-300',
    chip: 'hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-300',
  },
  'Convert to PDF': {
    eyebrow: 'text-amber-700 dark:text-amber-300',
    sidebarHeading: 'relative px-3 py-2 text-sm font-bold tracking-wide uppercase rounded mb-3 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/60 dark:to-transparent text-amber-700 dark:text-amber-300 border-l-4 border-amber-500',
    sidebarActive: 'bg-amber-50 border-l-2 border-amber-500 text-amber-700 font-semibold dark:bg-amber-950/60 dark:border-amber-400 dark:text-amber-300',
    sidebarInactive: 'border-l-2 border-transparent text-text-light-secondary hover:bg-amber-50 hover:text-amber-700 dark:text-text-dark-secondary dark:hover:bg-amber-950/40 dark:hover:text-amber-300',
    dropdownActive: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-200',
    dropdownHover: 'hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300',
    sectionHeading: 'sticky top-16 z-30 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50/95 via-white/95 to-transparent pl-3 py-2 text-lg font-bold text-amber-800 shadow-sm backdrop-blur dark:border-amber-900/60 dark:from-amber-950/70 dark:via-dark-body/90 dark:text-amber-200',
    iconWrap: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 group-hover:shadow-glow-amber',
    icon: 'text-amber-600 dark:text-amber-300',
    cardHover: 'hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-amber-900/10',
    cardStripe: 'bg-amber-500',
    titleHover: 'group-hover:text-amber-700 dark:group-hover:text-amber-300',
    chip: 'hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
  },
  'Edit & Annotate': {
    eyebrow: 'text-rose-700 dark:text-rose-300',
    sidebarHeading: 'relative px-3 py-2 text-sm font-bold tracking-wide uppercase rounded mb-3 bg-gradient-to-r from-rose-50 to-transparent dark:from-rose-950/60 dark:to-transparent text-rose-700 dark:text-rose-300 border-l-4 border-rose-500',
    sidebarActive: 'bg-rose-50 border-l-2 border-rose-500 text-rose-700 font-semibold dark:bg-rose-950/60 dark:border-rose-400 dark:text-rose-300',
    sidebarInactive: 'border-l-2 border-transparent text-text-light-secondary hover:bg-rose-50 hover:text-rose-700 dark:text-text-dark-secondary dark:hover:bg-rose-950/40 dark:hover:text-rose-300',
    dropdownActive: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200',
    dropdownHover: 'hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300',
    sectionHeading: 'sticky top-16 z-30 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50/95 via-white/95 to-transparent pl-3 py-2 text-lg font-bold text-rose-800 shadow-sm backdrop-blur dark:border-rose-900/60 dark:from-rose-950/70 dark:via-dark-body/90 dark:text-rose-200',
    iconWrap: 'bg-gradient-to-br from-rose-50 to-fuchsia-50 dark:from-rose-950/40 dark:to-fuchsia-950/30 group-hover:shadow-glow-accent',
    icon: 'text-rose-600 dark:text-rose-300',
    cardHover: 'hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-rose-900/10',
    cardStripe: 'bg-rose-500',
    titleHover: 'group-hover:text-rose-700 dark:group-hover:text-rose-300',
    chip: 'hover:border-rose-400 hover:text-rose-700 dark:hover:text-rose-300',
  },
  'Organize Pages': {
    eyebrow: 'text-violet-700 dark:text-violet-300',
    sidebarHeading: 'relative px-3 py-2 text-sm font-bold tracking-wide uppercase rounded mb-3 bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-950/60 dark:to-transparent text-violet-700 dark:text-violet-300 border-l-4 border-violet-500',
    sidebarActive: 'bg-violet-50 border-l-2 border-violet-500 text-violet-700 font-semibold dark:bg-violet-950/60 dark:border-violet-400 dark:text-violet-300',
    sidebarInactive: 'border-l-2 border-transparent text-text-light-secondary hover:bg-violet-50 hover:text-violet-700 dark:text-text-dark-secondary dark:hover:bg-violet-950/40 dark:hover:text-violet-300',
    dropdownActive: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-200',
    dropdownHover: 'hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-700 dark:hover:text-violet-300',
    sectionHeading: 'sticky top-16 z-30 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/95 via-white/95 to-transparent pl-3 py-2 text-lg font-bold text-violet-800 shadow-sm backdrop-blur dark:border-violet-900/60 dark:from-violet-950/70 dark:via-dark-body/90 dark:text-violet-200',
    iconWrap: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30 group-hover:shadow-glow',
    icon: 'text-violet-600 dark:text-violet-300',
    cardHover: 'hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-violet-900/10',
    cardStripe: 'bg-violet-500',
    titleHover: 'group-hover:text-violet-700 dark:group-hover:text-violet-300',
    chip: 'hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300',
  },
  Security: {
    eyebrow: 'text-emerald-700 dark:text-emerald-300',
    sidebarHeading: 'relative px-3 py-2 text-sm font-bold tracking-wide uppercase rounded mb-3 bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/60 dark:to-transparent text-emerald-700 dark:text-emerald-300 border-l-4 border-emerald-500',
    sidebarActive: 'bg-emerald-50 border-l-2 border-emerald-500 text-emerald-700 font-semibold dark:bg-emerald-950/60 dark:border-emerald-400 dark:text-emerald-300',
    sidebarInactive: 'border-l-2 border-transparent text-text-light-secondary hover:bg-emerald-50 hover:text-emerald-700 dark:text-text-dark-secondary dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300',
    dropdownActive: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-200',
    dropdownHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300',
    sectionHeading: 'sticky top-16 z-30 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/95 via-white/95 to-transparent pl-3 py-2 text-lg font-bold text-emerald-800 shadow-sm backdrop-blur dark:border-emerald-900/60 dark:from-emerald-950/70 dark:via-dark-body/90 dark:text-emerald-200',
    iconWrap: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 group-hover:shadow-glow-sky',
    icon: 'text-emerald-600 dark:text-emerald-300',
    cardHover: 'hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-emerald-900/10',
    cardStripe: 'bg-emerald-500',
    titleHover: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-300',
    chip: 'hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300',
  },
};

export const getThemeForCategory = (category: string): ToolTheme => CATEGORY_THEMES[category] || DEFAULT_THEME;

export const getThemeForToolId = (toolId: string): ToolTheme => {
  const category = SIDEBAR_TOOLS.find(group => group.links.some(link => link.id === toolId));
  return category ? getThemeForCategory(category.category) : DEFAULT_THEME;
};
