# PDFClear privacy

PDFClear processes PDFs, images, and text directly in your browser. Your files stay on your device throughout the workflow.

## Files stay with you

Documents are opened and processed on your device using browser-based JavaScript, WebAssembly, OCR, and AI tools. When the result is ready, you save it directly back to your device.

## Load once, then work offline

AI and OCR features load the resources they need before use, including:

- AI models and tokenizers.
- OCR language data and workers.
- WebAssembly runtimes.
- Application files and fonts.

Once the required resources are loaded, you can disconnect from the internet and continue processing your documents offline.

## Browser storage

Your browser can cache the application, models, OCR data, and runtime files for repeat use. Clearing PDFClear's site data removes these cached resources.

## No analytics, ads, or accounts

PDFClear does not include analytics or advertising trackers. You do not need an account to use the tools.

## Self-hosting

PDFClear is an open-source static web application. You can host the app and compatible model assets yourself using Docker or any static hosting platform. See [`docs/model-assets.md`](docs/model-assets.md) and the Docker instructions in [`README.md`](README.md).

## Reporting concerns

For security issues, follow [`SECURITY.md`](SECURITY.md). For privacy documentation corrections, open a GitHub issue without attaching private documents or sensitive data.
