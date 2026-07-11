# Contributing to PDFClear

Thanks for your interest in contributing.

## Start here

Review the public [`ROADMAP.md`](ROADMAP.md) and existing issues before beginning substantial work. For a new feature or a change that affects network behavior, document processing, privacy, or bundle size, open a discussion first.

## Local setup

```bash
npm ci
npm run dev
```

Before opening a pull request, run:

```bash
npm run check
```

## Pull request guidelines

- Keep changes focused and easy to review.
- Include screenshots or short recordings for visible UI changes.
- Add or update tests when changing parsing, range handling, file processing, or privacy-sensitive behavior.
- Do not commit generated bundles, build output, local caches, private documents, or large model files.
- Do not add network calls that upload user documents unless the behavior is explicit, optional, reviewed, and documented.
- Update `PRIVACY.md` and the website privacy page when changing network requests, browser storage, model loading, analytics, or document handling.
- Be careful when handling untrusted files, HTML, Markdown, OCR output, models, and WebAssembly.

## Good first issues

Contributor-friendly work should be tightly scoped and include clear acceptance criteria. Documentation, accessibility, tests, browser compatibility, and small UI fixes are especially useful starting points.

## Large assets

Large AI/OCR model files should not be committed to the source repository. Use external hosting, release artifacts, or a separate model repository if needed. See [`docs/model-assets.md`](docs/model-assets.md).
