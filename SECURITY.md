# Security policy

PDFClear processes user-selected files in the browser, so security review is especially important around file parsing, HTML rendering, Markdown rendering, WebAssembly, OCR, and model loading.

## Supported versions

Security fixes are expected to target the latest version on the default branch.

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities.

Report security issues privately by emailing the project maintainer or by using GitHub private vulnerability reporting after the repository is published.

Include:

- A clear description of the issue
- Steps to reproduce
- A proof of concept if available
- Browser and operating system details
- The potential impact

## Security expectations

- User documents should not be uploaded to a server without explicit user action and documentation.
- HTML and Markdown input should be treated as untrusted.
- Model files and WASM runtimes should be loaded only from trusted origins.
- Dependencies should be reviewed and updated regularly.
