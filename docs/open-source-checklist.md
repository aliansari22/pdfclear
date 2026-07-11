# Open-source release checklist

Use this checklist before publishing PDFClear as a public GitHub repository.

## Included in this source package

- Apache-2.0 license, notice, README, contribution guide, code of conduct, support notes, security policy, privacy policy, and public roadmap.
- GitHub Actions CI, Dependabot, issue forms, pull request template, issue contact links, and generated-release-note categories.
- Reproducible npm installs with `package-lock.json` and a project `.npmrc` that disables unnecessary install scripts.
- Dockerfile, unprivileged nginx configuration, Docker Compose configuration, and self-hosting instructions.
- Configurable site and GitHub URLs through `.env.example`.
- Precise privacy wording for browser-side document processing and supporting model/runtime downloads.
- Documentation for optional self-hosted model assets and optional self-hosted font assets.
- A README product preview and an upload-ready 1280 × 640 GitHub social preview.
- Sitemap/robots generation and Open Graph image generation scripts.
- Ignore rules for generated output, secrets, model directories, caches, and large model formats.
- DOMPurify sanitization on HTML and Markdown-to-PDF input paths.

## Before making the repository public

- Confirm `https://github.com/aliansari22/pdfclear` is the final repository URL or update `package.json`, `.env.example`, README badges, issue contact links, and launch documentation.
- Run `npm ci`, `npm run check`, and `npm audit --omit=dev`.
- Confirm the CI workflow passes on the default branch.
- Upload `docs/assets/github-social-preview.png` in the repository social preview settings.
- Add the repository description, website, and topics from `docs/github-launch.md`.
- Enable Discussions, dependency alerts, and private vulnerability reporting.
- Protect `main` and require the CI check before merging.
- Create a tagged release and convert appropriate roadmap items into real issues.
- Verify application network requests and privacy wording against the production deployment.
- Do not commit large model directories or font binaries without verified redistribution rights and an intentional distribution strategy.

## Verification record

Update this section whenever a release archive is rebuilt:

- `npm ci`: completed successfully with install scripts disabled by the project `.npmrc`.
- `npm run typecheck`: completed successfully.
- `npm run build`: completed successfully; Vite reports expected large-chunk warnings for browser PDF/AI dependencies.
- `npm audit --omit=dev`: completed with 0 vulnerabilities.
