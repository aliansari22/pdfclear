import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useFileContext } from "../hooks/useFileContext";
import FileUpload from "../components/FileUpload";
import Spinner from "../components/Spinner";
import { getDocument, GlobalWorkerOptions, PDFPageProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { env, pipeline } from "@huggingface/transformers";
import {
  aggregateModelProgress,
  detectModelDevice,
  getSafeAiDevicePreference,
} from "../utils/modelRuntime";
import { getErrorMessage, logError } from "../utils/logger";
import {
  ShieldCheckIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  DocumentArrowDownIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// === pdf.js setup ===
GlobalWorkerOptions.workerSrc = workerUrl as any;

// === transformers.js env (mirror summarizer.service.ts) ===
env.allowRemoteModels = true;
env.allowLocalModels = true;

// NOTE: transformers.js default localModelPath is '/models/'.
// Your Nougat files must be at: public/models/Xenova/nougat-small/*
// If you used a different folder, set env.localModelPath once globally.

const PAGE_URL = "https://www.pdfclear.com/pdf-to-markdown/";
const BRAND = "PDFClear";

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.debug(...args);
};

type NougatPipeline = any;
let nougatPipeline: NougatPipeline | null = null;
let nougatPipelinePromise: Promise<NougatPipeline> | null = null;
let nougatLoadRequestId = 0;

const NOUGAT_MODEL_ID = "Xenova/nougat-small";

interface ModelProgress {
  status: "progress" | "ready";
  progress: number;
  text: string;
  device?: "webgpu" | "wasm";
}

const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/jpg",
];
const MAX_TOKENS_PER_PAGE_DEFAULT = 512;

// Persist output so it survives remounts (very likely what's happening in your app)
const STORAGE_KEY_OUTPUT = "pdfclear_pdf_to_markdown_output_v1";
const STORAGE_KEY_SIG = "pdfclear_pdf_to_markdown_input_sig_v1";
// Remember that the user has loaded the model before, so we can auto-load on refresh.
const STORAGE_KEY_MODEL_LOADED = "pdfclear_pdf_to_markdown_model_loaded_v1";

function makeInputSignature(file: File): string {
  // Signature that changes only when the actual file changes
  return `${file.name}::${file.size}::${file.lastModified}::${file.type}`;
}

// --- Load Nougat model once ---
function cancelNougatModelLoad() {
  nougatLoadRequestId += 1;
}

async function loadNougatModel(
  onProgress?: (p: ModelProgress) => void,
): Promise<NougatPipeline> {
  if (nougatPipeline) {
    onProgress?.({
      status: "ready",
      progress: 100,
      text: "Model ready (cached, WASM)",
      device: "wasm",
    });
    return nougatPipeline;
  }

  // If another call is already loading the model, await it.
  if (nougatPipelinePromise) {
    const model = await nougatPipelinePromise;
    onProgress?.({
      status: "ready",
      progress: 100,
      text: "Model ready (WASM)",
      device: "wasm",
    });
    return model;
  }

  onProgress?.({
    status: "progress",
    progress: 0,
    text: "Preparing model files…",
  });
  debugLog("[PdfToMarkdown] Loading Nougat model:", NOUGAT_MODEL_ID);

  const detectedRuntime = detectModelDevice();
  const devices = getSafeAiDevicePreference();
  const requestId = ++nougatLoadRequestId;

  nougatPipelinePromise = (async () => {
    let lastError: unknown = null;

    for (const device of devices) {
      const fileProgress = new Map<string, { loaded: number; total: number }>();
      try {
        onProgress?.({
          status: "progress",
          progress: 0,
          text:
            detectedRuntime.device === "webgpu"
              ? "Using WebAssembly for PDF-to-Markdown because local vision models are more reliable there on this browser/GPU combination."
              : "WebGPU is unavailable. Initializing PDF-to-Markdown model with WebAssembly fallback...",
          device,
        });

        const model = await pipeline("image-to-text", NOUGAT_MODEL_ID, {
          device,
          progress_callback: (data: any) => {
            if (!onProgress || !data?.file) return;
            if (requestId !== nougatLoadRequestId)
              throw new Error("Model download cancelled.");
            const agg = aggregateModelProgress(fileProgress, data, device);
            onProgress({
              status: agg.status,
              progress: agg.progress,
              text: agg.text,
              device,
            });
          },
        });

        if (requestId !== nougatLoadRequestId)
          throw new Error("Model download cancelled.");
        nougatPipeline = model;
        onProgress?.({
          status: "ready",
          progress: 100,
          text: "Model ready: Nougat (small, WASM)",
          device,
        });
        debugLog("[PdfToMarkdown] Model loaded OK");
        return model;
      } catch (err: any) {
        lastError = err;
        logError(err, "PdfToMarkdown.loadNougatModel", { device });
        if (requestId !== nougatLoadRequestId) throw err;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to load PDF-to-Markdown model.");
  })().finally(() => {
    // Allow future retries if it failed, and avoid holding memory unnecessarily.
    nougatPipelinePromise = null;
  });

  return nougatPipelinePromise;
}

const PdfToMarkdownPage: React.FC = () => {
  const {
    uploadedFiles,
    processing,
    setProcessing,
    showMessage,
    clearMessages,
    operationCompleted,
    progress,
    setProgress,
  } = useFileContext();

  const [markdown, setMarkdown] = useState("");
  const [statusText, setStatusText] = useState("");
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelStatusText, setModelStatusText] = useState(
    "Model not loaded yet.",
  );
  const [runtimeMessage, setRuntimeMessage] = useState(
    () => detectModelDevice().reason,
  );
  const [maxTokensPerPage, setMaxTokensPerPage] = useState(
    MAX_TOKENS_PER_PAGE_DEFAULT,
  );
  const [copied, setCopied] = useState(false);

  const mountedRef = useRef(false);

  // Use first uploaded file as input (PDF or image)
  const inputFile = useMemo(
    () => (uploadedFiles.length > 0 ? uploadedFiles[0] : null),
    [uploadedFiles],
  );
  const isPdf = inputFile?.file.type === "application/pdf";
  const isImage = inputFile
    ? SUPPORTED_IMAGE_TYPES.includes(inputFile.file.type)
    : false;

  // Log mount/unmount to confirm remount behavior
  useEffect(() => {
    mountedRef.current = true;
    debugLog("[PdfToMarkdown] MOUNT");

    // If we already have a cached pipeline (SPA navigation), reflect it immediately.
    if (nougatPipeline) {
      setIsModelReady(true);
      setModelProgress(100);
      setModelStatusText("Model ready (cached)");
    }

    return () => {
      mountedRef.current = false;
      debugLog("[PdfToMarkdown] UNMOUNT");
    };
  }, []);

  // Auto-load model on refresh if the user has previously loaded it.
  useEffect(() => {
    const previouslyLoaded = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY_MODEL_LOADED) === "1";
      } catch {
        return false;
      }
    })();

    if (!previouslyLoaded) return;
    if (nougatPipeline) return;

    // Silent auto-load: no toast spam if something goes wrong.
    // The UI will still show status text.
    void (async () => {
      setIsModelLoading(true);
      setModelStatusText("Loading model…");
      try {
        setRuntimeMessage(detectModelDevice().reason);
        await loadNougatModel((p) => {
          setModelProgress(p.progress);
          setModelStatusText(p.text);
        });
        setIsModelReady(true);
        setModelProgress(100);
        setModelStatusText("Model ready: Nougat (small, WASM)");
      } catch (error: any) {
        logError(error, "PdfToMarkdown.autoLoadModel");
        setIsModelReady(false);
        setModelStatusText(
          "Auto-load failed. Click “Load Nougat model” to try again.",
        );
      } finally {
        setIsModelLoading(false);
      }
    })();
  }, []);

  // Restore saved output on mount (survives remount)
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY_OUTPUT);
    const savedSig = sessionStorage.getItem(STORAGE_KEY_SIG);
    if (saved && savedSig) {
      debugLog("[PdfToMarkdown] Restoring saved output from sessionStorage");
      setMarkdown(saved);
      setStatusText(`Restored previous output (${saved.length} chars).`);
    }
  }, []);

  // When the user uploads/selects a different file, clear messages/progress
  // and clear saved output if signature changed.
  useEffect(() => {
    setStatusText("");
    setProgress(0);
    clearMessages();

    if (!inputFile?.file) return;

    const sig = makeInputSignature(inputFile.file);
    const prevSig = sessionStorage.getItem(STORAGE_KEY_SIG);

    // If file changed, clear saved output so user doesn't see old markdown
    if (prevSig && prevSig !== sig) {
      debugLog("[PdfToMarkdown] Input changed -> clearing saved output");
      sessionStorage.removeItem(STORAGE_KEY_OUTPUT);
      sessionStorage.removeItem(STORAGE_KEY_SIG);
      setMarkdown("");
    }
  }, [
    inputFile?.file?.name,
    inputFile?.file?.size,
    inputFile?.file?.lastModified,
    inputFile?.file?.type,
    clearMessages,
    setProgress,
  ]);

  const handleLoadModel = async () => {
    if (isModelReady || isModelLoading) return;

    setIsModelLoading(true);
    setRuntimeMessage(detectModelDevice().reason);
    setModelStatusText("Loading model…");
    try {
      await loadNougatModel((p) => {
        setModelProgress(p.progress);
        setModelStatusText(p.text);
      });

      setIsModelReady(true);
      setModelProgress(100);
      setModelStatusText("Model ready: Nougat (small, WASM)");

      try {
        localStorage.setItem(STORAGE_KEY_MODEL_LOADED, "1");
      } catch {
        // ignore
      }
    } catch (error: any) {
      const message = getErrorMessage(
        error,
        "Unknown error while loading model. Check the browser console for details.",
      );
      logError(error, "PdfToMarkdown.handleLoadModel");
      showMessage(`Error loading Nougat model: ${message}`, "error");
      setModelStatusText("Failed to load model (see console).");
      setIsModelReady(false);
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleCancelModelLoad = () => {
    cancelNougatModelLoad();
    setIsModelLoading(false);
    setModelProgress(0);
    setModelStatusText("Model download cancelled.");
  };

  const renderPageToCanvas = async (
    page: PDFPageProxy,
  ): Promise<HTMLCanvasElement> => {
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: false });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (!context) throw new Error("Could not get 2D context for canvas.");
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    return canvas;
  };

  const persistOutput = (sig: string, text: string) => {
    try {
      sessionStorage.setItem(STORAGE_KEY_SIG, sig);
      sessionStorage.setItem(STORAGE_KEY_OUTPUT, text);
    } catch (e) {
      // Storage can fail in private mode or if quota is exceeded
      console.warn(
        "[PdfToMarkdown] Failed to persist output to sessionStorage",
        e,
      );
    }
  };

  const handleConvert = async () => {
    debugLog("[PdfToMarkdown] handleConvert called with", inputFile);

    if (!inputFile?.file) {
      showMessage("Please upload a PDF or image file first.", "warning");
      setStatusText("No file uploaded.");
      return;
    }

    if (!isPdf && !isImage) {
      const type = inputFile.file.type || "(unknown)";
      const msg = `Unsupported file type: ${type}. Please upload a PDF or an image (PNG/JPG/WebP).`;
      showMessage(msg, "error");
      setStatusText(msg);
      return;
    }

    const sig = makeInputSignature(inputFile.file);

    setProcessing(true);
    setStatusText("Preparing conversion…");
    setMarkdown("");
    setProgress(0);
    clearMessages();

    try {
      const model = await loadNougatModel((p) => {
        setModelProgress(p.progress);
        setModelStatusText(p.text);
      });

      // If we got here, model is ready -> reflect in UI + persist "loaded" so refresh auto-loads.
      setIsModelReady(true);
      try {
        localStorage.setItem(STORAGE_KEY_MODEL_LOADED, "1");
      } catch {
        // ignore
      }

      let combinedMarkdown = "";

      // --- PDF path ---
      if (isPdf) {
        const arrayBuffer = await inputFile.file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;

        if (!pdf.numPages || pdf.numPages < 1) {
          throw new Error("Could not read pages from this PDF.");
        }

        const totalPages = pdf.numPages;
        debugLog("[PdfToMarkdown] PDF with pages:", totalPages);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          setStatusText(`Processing page ${pageNum} of ${totalPages}…`);
          debugLog(
            `[PdfToMarkdown] Converting page ${pageNum}/${totalPages}`,
          );

          const page = await pdf.getPage(pageNum);
          const canvas = await renderPageToCanvas(page);

          const result = await (model as any)(canvas, {
            min_length: 1,
            max_new_tokens: maxTokensPerPage,
            bad_words_ids: [[(model as any).tokenizer.unk_token_id]],
          });

          debugLog("[PdfToMarkdown] Model result for page", pageNum, result);

          const pageMarkdown = String(result?.[0]?.generated_text ?? "").trim();
          if (pageMarkdown) {
            combinedMarkdown += `\n\n<!-- Page ${pageNum} -->\n` + pageMarkdown;

            // Update UI incrementally and persist incrementally too
            const trimmed = combinedMarkdown.trim();
            if (mountedRef.current) setMarkdown(trimmed);
            persistOutput(sig, trimmed);
          }

          const pct = Math.round((pageNum / totalPages) * 100);
          setProgress(pct);
        }
      }

      // --- Image path ---
      if (isImage) {
        setStatusText("Processing image…");
        debugLog("[PdfToMarkdown] Processing image input");

        const objectUrl = URL.createObjectURL(inputFile.file);
        try {
          const result = await (model as any)(objectUrl, {
            min_length: 1,
            max_new_tokens: maxTokensPerPage,
            bad_words_ids: [[(model as any).tokenizer.unk_token_id]],
          });

          debugLog("[PdfToMarkdown] Model result for image", result);

          const imageMarkdown = String(
            result?.[0]?.generated_text ?? "",
          ).trim();
          if (!imageMarkdown) {
            throw new Error(
              "The model did not generate any Markdown for this image.",
            );
          }

          combinedMarkdown = imageMarkdown;

          if (mountedRef.current) setMarkdown(imageMarkdown);
          persistOutput(sig, imageMarkdown);

          setProgress(100);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }

      if (!combinedMarkdown.trim()) {
        throw new Error(
          "The model did not generate any Markdown for this input.",
        );
      }

      setStatusText(
        `Conversion complete. Generated ${combinedMarkdown.trim().length} characters.`,
      );
      showMessage("Converted to Markdown successfully.", "success");
    } catch (error: any) {
      logError(error, "PdfToMarkdown.handleConvert");
      const message =
        error?.message ??
        "An unknown error occurred during conversion. Check the browser console for details.";
      setStatusText(`Error: ${message}`);
      showMessage(`Error: ${message}`, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!markdown) return;
    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        logError(err, "PdfToMarkdown.handleCopy");
        showMessage("Could not copy Markdown to clipboard.", "error");
      });
  };

  const handleDownload = () => {
    if (!markdown) return;

    const baseName =
      inputFile?.file.name.replace(/\.[^.]+$/i, "") || "document";
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const jsonLdWebPage = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `PDF to Markdown Converter | ${BRAND}`,
        url: PAGE_URL,
        description:
          "Convert PDFs and images to clean, editable Markdown in your browser. Powered by an open-source vision transformer (Nougat), no PDFClear server upload required.",
      }),
    [],
  );

  const jsonLdSoftwareApp = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PDF to Markdown Converter",
        applicationCategory: "UtilityApplication",
        operatingSystem: "Web",
        url: PAGE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        isAccessibleForFree: true,
        featureList: [
          "Convert PDF pages to Markdown",
          "Convert images (PNG/JPG/WebP) to Markdown",
          "Runs fully in the browser",
          "No PDFClear server upload or sign-up required",
          "Uses Xenova/nougat-small vision model",
        ],
      }),
    [],
  );

  const jsonLdFAQ = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Does PDF to Markdown run locally?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. The Nougat model runs entirely in your browser using WebAssembly/WebGPU. Your files are processed in your browser and are not uploaded to a PDFClear server.",
            },
          },
          {
            "@type": "Question",
            name: "What inputs are supported?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You can upload PDF files or images (PNG/JPG/WebP). Each page or image is read by the vision model and converted to Markdown.",
            },
          },
        ],
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <meta
          name="description"
          content="Convert PDFs or images to Markdown with Nougat running in your browser. Your files stay on your device, and once the model is loaded you can work offline."
        />
        <link rel="canonical" href={PAGE_URL} />
        <meta
          name="robots"
          content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
        />
        <title>PDF to Markdown Converter (AI) | PDFClear</title>

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta
          property="og:title"
          content={`PDF to Markdown Converter (AI) | ${BRAND}`}
        />
        <meta
          property="og:description"
          content="Convert PDFs or images to Markdown with a browser-side Nougat model and transparent on-demand model downloads."
        />
        <meta property="og:url" content={PAGE_URL} />
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:title"
          content={`PDF to Markdown Converter (AI) | ${BRAND}`}
        />
        <meta
          name="twitter:description"
          content="Convert PDFs or images to Markdown directly in your browser while your files stay on your device."
        />
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-xs font-medium border border-brand-100/70 dark:border-brand-800">
          <SparklesIcon className="w-4 h-4" />
          <span>New • AI PDF & Image to Markdown</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-light-primary dark:text-text-dark-primary">
          PDF to Markdown Converter
        </h1>
        <p className="text-base sm:text-lg text-text-light-secondary dark:text-text-dark-secondary max-w-3xl">
          Convert PDFs and images into clean Markdown with the open-source Nougat model while keeping documents on your device.
        </p>

        <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-dark-card border border-border-light dark:border-border-dark">
            <ShieldCheckIcon className="w-4 h-4" />
            <span>browser-based, no PDFClear server upload</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-dark-card border border-border-light dark:border-border-dark">
            <CpuChipIcon className="w-4 h-4" />
            <span>Runs in browser</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-dark-card border border-border-light dark:border-border-dark">
            <DocumentTextIcon className="w-4 h-4" />
            <span>Supports PDFs and images</span>
          </div>
        </div>
      </header>

      {/* Controls + Status */}
      <section
        className={`mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 ${processing ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-5 text-left dark:border-brand-800 dark:bg-brand-950/30">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              Download the required model assets, then convert your PDF in the
              browser.
            </h2>
            <p className="mt-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Load Nougat before choosing a file. Once the model is loaded, you can disconnect and convert documents offline while your files stay on your device.
            </p>
          </div>

          <div className="feature-card p-4 space-y-4 text-left">
            <h2 className="font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <CpuChipIcon className="w-5 h-5" />
              <span>1. Load AI model</span>
            </h2>

            <button
              type="button"
              onClick={handleLoadModel}
              disabled={isModelLoading || isModelReady}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isModelLoading ? (
                <>
                  <Spinner />
                  <span>Loading model…</span>
                </>
              ) : isModelReady ? (
                <>
                  <CpuChipIcon className="w-4 h-4" />
                  <span>Model loaded</span>
                </>
              ) : (
                <>
                  <CpuChipIcon className="w-4 h-4" />
                  <span>Load Nougat model</span>
                </>
              )}
            </button>

            <div className="space-y-2">
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {modelStatusText}
              </p>
              {(isModelLoading || isModelReady) && (
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all"
                    style={{ width: `${modelProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {!operationCompleted && (
            <div className="mt-4">
              <FileUpload />
            </div>
          )}

          <div className="feature-card p-4 space-y-4 text-left">
            <h2 className="font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5" />
              <span>2. Convert PDF or image to Markdown</span>
            </h2>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="max-tokens"
                  className="text-xs font-medium text-text-light-primary dark:text-text-dark-primary"
                >
                  Max tokens per page
                </label>
                <input
                  id="max-tokens"
                  type="number"
                  min={64}
                  max={2048}
                  step={64}
                  value={maxTokensPerPage}
                  onChange={(e) =>
                    setMaxTokensPerPage(
                      Number(e.target.value) || MAX_TOKENS_PER_PAGE_DEFAULT,
                    )
                  }
                  className="input-style !w-28 rounded-md border border-border-light dark:border-border-dark bg-white dark:bg-dark-card px-2 py-1 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleConvert}
                disabled={processing || !inputFile || !isModelReady}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Spinner />
                    <span>Converting…</span>
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Convert to Markdown</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              {statusText ||
                (!isModelReady
                  ? "Load the AI model first, then choose a PDF or image."
                  : !inputFile
                    ? "Upload a PDF or image file to begin."
                    : "Ready. Click “Convert to Markdown” to start.")}
            </p>

            {progress > 0 && (
              <div className="mt-2 w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="feature-card p-4 space-y-3 text-left">
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" />
              <span>Best results</span>
            </h3>
            <ul className="list-disc list-inside text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1">
              <li>Works best with academic articles and structured PDFs.</li>
              <li>
                For purely scanned documents, use &ldquo;Smart PDF to TXT
                (OCR)&rdquo; instead.
              </li>
              <li>
                For code-heavy PDFs, you may want to manually review fenced code
                blocks.
              </li>
            </ul>
          </div>
        </aside>
      </section>

      {/* Output */}
      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5" />
            <span>Markdown output</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!markdown}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark bg-white dark:bg-dark-card text-xs font-medium text-text-light-primary dark:text-text-dark-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
              <span>{copied ? "Copied!" : "Copy Markdown"}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!markdown}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Download .md</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
          Output length: <span className="font-mono">{markdown.length}</span>{" "}
          chars
        </div>

        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="Markdown output will appear here after you convert a PDF or image."
          className="input-style w-full min-h-[420px] rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-dark-card p-4 font-mono text-xs whitespace-pre-wrap"
        />
      </section>
    </div>
  );
};

export default PdfToMarkdownPage;
