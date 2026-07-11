# Public assets

This directory contains small static assets required by the browser application, including favicons, the web manifest, qpdf WebAssembly files, the service worker, and the website social preview image.

Do not add font binaries unless redistribution rights have been verified and the files are intentionally managed through Git LFS or release assets.

Do not commit large model files to this repository. Put optional self-hosted model files under `public/models/` locally or distribute them separately. If a custom PDF font is needed at runtime, host it separately and set `VITE_PDF_CUSTOM_FONT_URL`.

The Open Graph image at `public/assets/og/pdfclear-social-preview.png` is copied into production builds and can also be uploaded as the GitHub repository social preview.
