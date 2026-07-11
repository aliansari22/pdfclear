const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const SITE_URL = stripTrailingSlash(
  import.meta.env.VITE_SITE_URL || 'https://www.pdfclear.com',
);

export const GITHUB_REPOSITORY_URL = stripTrailingSlash(
  import.meta.env.VITE_GITHUB_REPOSITORY_URL || 'https://github.com/aliansari22/pdfclear',
);

export const GITHUB_ISSUES_URL = `${GITHUB_REPOSITORY_URL}/issues`;
export const GITHUB_DISCUSSIONS_URL = `${GITHUB_REPOSITORY_URL}/discussions`;
export const PRIVACY_PAGE_URL = `${SITE_URL}/privacy/`;
