# Model assets

PDFClear can use browser-side AI/OCR models. These files can be large, so they should not be committed to the normal source repository.

## Recommended setup

Keep the public GitHub repository source-first:

- Commit application source code, configuration, documentation, and small required runtime assets.
- Do not commit large model weights or generated cache directories.
- Let the app download supported model files from remote model hosts on first use, or document how users can self-host them. Local model lookup is disabled by default in this source package because no large `public/models/` directory is committed.

The `.gitignore` file excludes common local model locations:

- `public/models/`
- `public/.cache/`
- `public/onnx/`
- `public/tessdata/`
- `public/tesseract/`
- `public/assets/models/`
- common model file extensions such as `.onnx`, `.safetensors`, `.bin`, `.gguf`, and `.tflite`

## Offline or self-hosted model files

For an offline deployment, place compatible model files in your static hosting directory, for example:

```text
public/models/
  Xenova/
    example-model/
      config.json
      tokenizer.json
      model.onnx
```

Then enable local lookup in your environment configuration:

```bash
VITE_TRANSFORMERS_LOCAL_MODELS=true
VITE_TRANSFORMERS_LOCAL_MODEL_PATH=/models/
```

If the local path differs from the Transformers.js default, update `VITE_TRANSFORMERS_LOCAL_MODEL_PATH` accordingly.

## Distribution options

Use one of these patterns for large models:

1. Keep models remote and download them on first use.
2. Publish a separate `pdfclear-models` release artifact.
3. Use Git LFS only for an optional model repository, not the main source repository.
4. Host models on your own CDN/static bucket and document the expected paths.

## Privacy wording

Use precise wording in public docs and product pages:

> PDF files are processed locally in your browser and are not uploaded to a PDFClear server. Some AI/OCR features may download model or runtime files on first use.


## Font assets

This source package does not include font binaries. The text-to-PDF paths use jsPDF's built-in Helvetica fallback unless `VITE_PDF_CUSTOM_FONT_URL` points to a self-hosted, properly licensed TrueType font. Keep redistributed font files out of the source repository unless you have verified the license and intentionally manage them through Git LFS or release artifacts.
