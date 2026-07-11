import fs from 'fs';
import path from 'path';

let ALL_TOOLS: Array<{ path: string }> = [];
try {
  ({ ALL_TOOLS } = await import('../constants.ts'));
} catch (error) {
  console.warn('Could not import tool routes from constants.ts. Continuing with static routes only.', error);
}

const BASE_URL = (process.env.SITE_URL || 'https://www.pdfclear.com').replace(/\/+$/g, '');
const DIST_DIR = 'dist';

const STATIC_ROUTES = [
  '/',
  '/about/',
  '/contact/',
  '/why-us/',
  '/privacy/',
];

const normalizeRoute = (route: string) => {
  if (!route || route === '/') return '/';
  return `/${route.replace(/^\/+|\/+$/g, '')}/`;
};

const ROUTES = Array.from(
  new Set([...STATIC_ROUTES, ...ALL_TOOLS.map((tool) => tool.path)].map(normalizeRoute)),
).sort((a, b) => {
  if (a === '/') return -1;
  if (b === '/') return 1;
  return a.localeCompare(b);
});

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function ensureDistDir() {
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });
}

function warnIfBuildIsMissing() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn(
      `Warning: ${indexPath} was not found. Run \`npm run build\` before \`npm run generate:seo\` for a complete production artifact.`,
    );
  }
}

function generateRobotsTxt() {
  const robotsTxtContent = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxtContent);
  console.log('Generated robots.txt');
}

function generateSitemapXml() {
  const urls = ROUTES.map((route) => {
    const loc = `${BASE_URL}${route}`;
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`;
  });

  const sitemapXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXmlContent);
  console.log(`Generated sitemap.xml with ${ROUTES.length} routes for the SPA build.`);
}

ensureDistDir();
warnIfBuildIsMissing();
generateRobotsTxt();
generateSitemapXml();
