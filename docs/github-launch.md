# GitHub launch guide

Use this guide for the repository settings that cannot be configured from source files alone.

## Repository profile

**Description**

> Open-source, privacy-first PDF toolkit with browser-side editing, conversion, OCR, summarization, and semantic search.

**Website**

> https://www.pdfclear.com

**Suggested topics**

`pdf`, `pdf-tools`, `pdf-editor`, `pdf-converter`, `privacy`, `local-first`, `browser`, `webassembly`, `react`, `typescript`, `vite`, `ocr`, `tesseract`, `transformers-js`, `semantic-search`, `pdf-summarizer`, `self-hosted`, `docker`, `open-source`

## Social preview

Upload `public/assets/og/pdfclear-social-preview.png` in the repository's social preview settings. The file is 1280 × 640 and is also used by the website's Open Graph metadata.

## Before announcing

1. Confirm the CI workflow passes on `main`.
2. Enable Discussions, dependency alerts, and private vulnerability reporting.
3. Protect `main` and require the CI check before merging.
4. Create a `v0.1.0` tag and GitHub Release using the changelog as a starting point.
5. Create real roadmap issues from `ROADMAP.md`, including several tightly scoped `good first issue` items.
6. Add a welcome discussion, a roadmap/feature-request discussion, and a self-hosting support discussion.

## Release notes outline

- What PDFClear does.
- What runs in the browser and which supporting assets may be downloaded.
- Major tools included in the release.
- Browser and memory limitations.
- Docker and self-hosting instructions.
- Known issues and contribution priorities.

## Launch positioning

Lead with the technically distinctive value:

> Open-source PDF editing, OCR, summarization, and semantic search that processes document content in the browser.

Avoid claims that imply no network requests at all. Model, OCR, WebAssembly, and application assets can require downloads.
