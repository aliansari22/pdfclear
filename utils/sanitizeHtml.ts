import DOMPurify, { type Config } from 'dompurify';

const SANITIZE_CONFIG: Config = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: [
    'base',
    'button',
    'embed',
    'form',
    'iframe',
    'input',
    'link',
    'meta',
    'object',
    'option',
    'script',
    'select',
    'textarea',
  ],
  FORBID_ATTR: ['srcdoc'],
};

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
};
