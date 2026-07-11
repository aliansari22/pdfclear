/* scripts/generate-og.ts */
import fs from 'fs';
import path from 'path';
import puppeteer, { type LaunchOptions } from 'puppeteer-core';

// -------------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------------
const BRAND_NAME = 'PDFClear';
const BRAND_URL = 'pdfclear.com';
const BRAND_COLOR = '#ff7a00'; // The vibrant orange from your theme

const OUT_DIR = path.resolve('public/assets/og');
const VIEWPORT = { width: 1200, height: 630, deviceScaleFactor: 2  } as const;
const JPEG_QUALITY = 90;

function getPuppeteerLaunchOptions(): LaunchOptions {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const channel = (process.env.PUPPETEER_BROWSER_CHANNEL?.trim() || 'chrome') as LaunchOptions['channel'];

  return {
    headless: true,
    ...(executablePath ? { executablePath } : { channel }),
  };
}

function isMissingBrowserError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /Could not find|Chrome executable|Failed to launch the browser process|An `executablePath` or `channel` must be specified/i.test(message);
}

// Page list (from your constants) - ensures consistency
const PAGES = [
  { slug: 'add-image-to-pdf', title: 'Add Image to PDF', tagline: 'Visually place and resize images on your PDF pages.' },
  { slug: 'add-page-numbers', title: 'Add Page Numbers', tagline: 'Customize position, format, and style of page numbers.' },
  { slug: 'add-text-to-pdf', title: 'Add Text to PDF', tagline: 'Type, resize, and style text directly onto your PDF.' },
  { slug: 'sign-pdf', title: 'Sign PDF', tagline: 'Draw, type, or upload a signature and place it on your PDF.' },
  { slug: 'fill-pdf-form', title: 'Fill PDF Form', tagline: 'Click anywhere to type and fill out PDF forms.' },
  { slug: 'compress-pdf', title: 'Compress PDF', tagline: 'Reduce file size while maintaining document quality.' },
  { slug: 'delete-pdf-pages', title: 'Delete PDF Pages', tagline: 'Cut or remove unwanted PDF pages by range.' },
  { slug: 'html-to-pdf', title: 'HTML to PDF', tagline: 'Convert web pages into high-quality PDF documents.' },
  { slug: 'jpg-to-pdf', title: 'JPG to PDF', tagline: 'Combine multiple JPG images into a single PDF file.' },
  { slug: 'protect-pdf', title: 'Protect PDF', tagline: 'Encrypt and secure your PDF with a strong password.' },
  { slug: 'unlock-pdf', title: 'Unlock PDF', tagline: 'Remove password protection from your documents.' },
  { slug: 'markdown-to-pdf', title: 'Markdown to PDF', tagline: 'Turn your .md files into professionally styled PDFs.' },
  { slug: 'merge-pdf', title: 'Merge PDFs', tagline: 'Combine multiple PDF files into one unified document.' },
  { slug: 'png-to-pdf', title: 'PNG to PDF', tagline: 'Convert PNG images, preserving transparency.' },
  { slug: 'semantic-search', title: 'Semantic PDF Search (Private)', tagline: 'Ask questions and find answers using AI-powered search.' },
  { slug: 'ai-pdf-summarizer', title: 'AI PDF Summarizer (Private)', tagline: 'Get the key points from your long documents using AI.' },
  { slug: 'rotate-pdf', title: 'Rotate PDF Pages', tagline: 'Fix the orientation of individual or all pages.' },
  { slug: 'pdf-image-to-text-ocr', title: 'PDF to Text OCR', tagline: 'Extract text from scanned PDFs and images in your browser.' },
  { slug: 'smart-pdf-to-txt', title: 'PDF to Text OCR', tagline: 'Extract text from scanned PDFs and images in your browser.' },
  { slug: 'split-pdf', title: 'Split PDF', tagline: 'Separate, unmerge, or extract PDF pages by range.' },
  { slug: 'txt-to-pdf', title: 'TXT to PDF', tagline: 'Convert plain text files into simple PDF documents.' },
  { slug: 'watermark-pdf', title: 'Watermark PDF', tagline: 'Apply custom text or image watermarks to your files.' },
  { slug: 'edit-pdf-metadata', title: 'Edit PDF Metadata', tagline: 'Update the Title, Author, Subject, and Keywords of your PDF document.' },
  { slug: 'pdfclear-homepage', title: 'Private PDF Tools in Your Browser', tagline: 'Open-source editing, conversion, OCR, summarization, and semantic search.' },
  { slug: 'pdf-to-markdown', title: 'PDF to Markdown', tagline: 'Convert PDFs to clean, editable Markdown with browser-side AI.' },
  { slug: 'pdf-to-jpg', title: 'PDF to JPG', tagline: 'Convert PDF pages into high-quality JPG images.' },
  { slug: 'pdf-to-png', title: 'PDF to PNG', tagline: 'Convert PDF pages into PNG images.' },
  { slug: 'reorder-pdf-pages', title: 'Reorder PDF Pages', tagline: 'Rearrange PDF pages visually with drag-and-drop thumbnails.' },
  { slug: 'flip-pdf-pages', title: 'Flip PDF Pages', tagline: 'Mirror PDF pages horizontally or vertically with thumbnail preview.' },

  { slug: 'why-us', title: 'Why PDFClear?', tagline: 'Open-source, browser-side PDF workflows with transparent privacy.' },
  { slug: 'privacy', title: 'Privacy & Local Processing', tagline: 'See what stays in your browser and which supporting assets may be downloaded.' },

];

function loadLogoAsDataUri(): string | null {
  const logoPath = path.resolve('public/logo.png');
  if (fs.existsSync(logoPath)) {
    const data = fs.readFileSync(logoPath);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  console.warn("Warning: logo.png not found in /public directory. Logo will be omitted.");
  return null;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]!)
  );
}

function makeHtml(opts: { title: string; tagline: string; logoDataUri: string | null }) {
  const { title, tagline, logoDataUri } = opts;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body {
      margin: 0;
      width: ${VIEWPORT.width}px;
      height: ${VIEWPORT.height}px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(120deg, #f0f9ff 0%, #eef2ff 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    }
    .card {
      width: 1100px;
      height: 500px;
      background: #fff;
      border-radius: 24px;
      padding: 50px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      overflow: hidden;
      position: relative;
    }
    .content {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      width: 60%;
      z-index: 2;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 38px;
      font-weight: 800;
      color: #1e293b;
    }
    .brand img {
        width: 68px;
        height: 68px;
    }
    .main {
      padding-bottom: 20px;
    }
    .title { 
      font-size: 72px; 
      font-weight: 800; 
      line-height: 1.1;
      color: #0f172a; 
      letter-spacing: -2px;
    }
    .tagline { 
      font-size: 32px; 
      margin-top: 16px; 
      color: #475569; 
      line-height: 1.3;
    }
    .footer { 
      font-size: 24px; 
      font-weight: 700;
      color: #64748b;
    }
    .graphic {
        position: absolute;
        right: -150px;
        top: -150px;
        width: 700px;
        height: 700px;
        z-index: 1;
    }
    .shape1, .shape2 {
        position: absolute;
        border-radius: 50%;
    }
    .shape1 {
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, ${BRAND_COLOR} 0%, rgba(255,122,0,0) 60%);
        opacity: 0.15;
    }
    .shape2 {
        width: 60%;
        height: 60%;
        top: 20%;
        left: 20%;
        background: radial-gradient(circle, #818cf8 0%, rgba(129,140,248,0) 60%);
        opacity: 0.1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="content">
      <div class="brand">
        ${logoDataUri ? `<img src="${logoDataUri}" alt="Logo"/>` : ''}
        <span>${escapeHtml(BRAND_NAME)}</span>
      </div>
      <div class="main">
        <div class="title">${escapeHtml(title)}</div>
        <div class="tagline">${escapeHtml(tagline)}</div>
      </div>
      <div class="footer">${escapeHtml(BRAND_URL)}</div>
    </div>
    <div class="graphic">
        <div class="shape1"></div>
        <div class="shape2"></div>
    </div>
  </div>
</body>
</html>
  `;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const logoDataUri = loadLogoAsDataUri();
  const browser = await puppeteer.launch(getPuppeteerLaunchOptions());
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  for (const p of PAGES) {
    const html = makeHtml({
      title: p.title,
      tagline: p.tagline,
      logoDataUri,
    });

    // Use page.setContent() which is faster and more reliable for self-contained HTML
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const outFile = path.join(OUT_DIR, `${p.slug}.jpg`);
    await page.screenshot({ path: outFile, type: 'jpeg', quality: JPEG_QUALITY });
    console.log(`✓ Generated ${outFile}`);
  }

  await browser.close();
  console.log(`\nAll OG images generated successfully into ${OUT_DIR}`);
}

main().catch(err => {
  if (isMissingBrowserError(err)) {
    const message = "No local Chrome/Chromium executable was found. Install Chrome or set PUPPETEER_EXECUTABLE_PATH.";
    if (process.env.REQUIRE_BROWSER === 'true') {
      console.error(`OG image generation failed: ${message}`);
      process.exit(1);
    }
    console.warn(`Skipping OG image generation: ${message}`);
    process.exit(0);
  }
  console.error("Error generating OG images:", err);
  process.exit(1);
});