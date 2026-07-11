import React, { useState, useEffect, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useFileContext } from "../hooks/useFileContext";
import { getDocument, GlobalWorkerOptions, PDFPageProxy } from "pdfjs-dist";
import Tesseract from "tesseract.js";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import FileUpload from "../components/FileUpload";
import Spinner from "../components/Spinner";
import ToolActionBar from "../components/ToolActionBar";
import {
  postProcessExtractedText,
  PostProcessOptions,
} from "../services/chunkText";
import {
  SparklesIcon,
  LanguageIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Set up the worker for pdf.js
GlobalWorkerOptions.workerSrc = workerUrl;

const PAGE_URL = "https://www.pdfclear.com/smart-pdf-to-txt/";
const BRAND = "PDFClear";

type UploadItem = {
  file: File;
};

const languageOptions = [
  { code: "eng", label: "English" },
  { code: "spa", label: "Spanish" },
  { code: "deu", label: "German" },
  { code: "fra", label: "French" },
  { code: "fas", label: "Persian (فارسی)" },
  { code: "ita", label: "Italian" },
  { code: "por", label: "Portuguese" },
  { code: "nld", label: "Dutch" },
  { code: "pol", label: "Polish" },
  { code: "rus", label: "Russian" },
  { code: "tur", label: "Turkish" },
  { code: "ara", label: "Arabic" },
  { code: "heb", label: "Hebrew" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
  { code: "chi_tra", label: "Chinese (Traditional)" },
  { code: "jpn", label: "Japanese" },
  { code: "kor", label: "Korean" },
  { code: "hin", label: "Hindi" },
  { code: "vie", label: "Vietnamese" },
  { code: "tha", label: "Thai" },
];

const getLanguageLabel = (code: string) =>
  languageOptions.find((option) => option.code === code)?.label || code;

const isPersianOrArabic = (code: string) => code === "fas" || code === "ara";

const OCR_OPTIONS_STORAGE_KEY = "pdfclear-ocr-options";

const defaultOcrOptions: PostProcessOptions = {
  removeHeadersFooters: true,
  fixHyphenation: true,
  reflowParagraphs: true,
  includePageNumbers: false,
};

const readSavedOcrOptions = (): PostProcessOptions => {
  try {
    if (typeof localStorage === "undefined") return defaultOcrOptions;
    const raw = localStorage.getItem(OCR_OPTIONS_STORAGE_KEY);
    if (!raw) return defaultOcrOptions;
    return { ...defaultOcrOptions, ...JSON.parse(raw) };
  } catch {
    return defaultOcrOptions;
  }
};

const SmartPdfToTxtPage: React.FC = () => {
  const {
    uploadedFiles,
    processing,
    setProcessing,
    showMessage,
    clearMessages,
    showPostOperationSuccess,
    operationCompleted,
    setProgress,
  } = useFileContext();

  const [lang, setLang] = useState(() => {
    if (typeof localStorage === "undefined") return "eng";
    return localStorage.getItem("pdfclear-ocr-language") || "eng";
  });
  const [statusText, setStatusText] = useState("");
  const [ocrReady, setOcrReady] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrLoadProgress, setOcrLoadProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState("Preparing OCR engine...");
  const preloadRequestRef = useRef(0);
  const lastOcrLoadProgressRef = useRef(0);
  const ocrWorkerRef = useRef<any>(null);
  const recognitionProgressRef = useRef<null | {
    pageLabel?: string;
    completedWorkUnits: number;
    totalWorkUnits: number;
  }>(null);
  const [options, setOptions] = useState<PostProcessOptions>(readSavedOcrOptions);

  const supportedFiles: UploadItem[] = useMemo(
    () =>
      uploadedFiles.filter(
        (f) =>
          f.file.type === "application/pdf" || f.file.type.startsWith("image/"),
      ),
    [uploadedFiles],
  );

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("pdfclear-ocr-language", lang);
    }
  }, [lang]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(OCR_OPTIONS_STORAGE_KEY, JSON.stringify(options));
    }
  }, [options]);

  const normalizeOcrPunctuation = (text: string, language = lang): string => {
    if (!text || !isPersianOrArabic(language)) return text;

    return text.replace(/[^.!?؟\n]+[.!?؟]?/g, (sentence) => {
      const closingCount = (sentence.match(/»/g) || []).length;
      const openingCount = (sentence.match(/«/g) || []).length;

      // Persian/Arabic OCR can confuse the Persian comma (،) with a single
      // guillemet. A real quote normally appears as a pair, so a lone closing
      // mark in one sentence is safer to normalize back to a comma.
      if (closingCount === 1 && openingCount === 0) {
        return sentence.replace("»", "،");
      }

      return sentence;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const requestId = ++preloadRequestRef.current;
    const languageLabel = getLanguageLabel(lang);

    const terminatePreviousWorker = async () => {
      const previousWorker = ocrWorkerRef.current;
      ocrWorkerRef.current = null;
      recognitionProgressRef.current = null;
      if (previousWorker) {
        try {
          await previousWorker.terminate?.();
        } catch {
          /* ignore */
        }
      }
    };

    const preloadOcr = async () => {
      await terminatePreviousWorker();
      if (cancelled || requestId !== preloadRequestRef.current) return;

      setOcrReady(false);
      setOcrLoading(true);
      setOcrLoadProgress(0);
      lastOcrLoadProgressRef.current = 0;
      setOcrStatusText(
        `Pre-loading OCR assets for ${languageLabel}...`,
      );

      let worker: any = null;
      try {
        worker = await (Tesseract as any).createWorker(lang, 1, {
          logger: (event: any) => {
            if (cancelled || requestId !== preloadRequestRef.current) return;

            const recognition = recognitionProgressRef.current;
            if (recognition && event?.status === "recognizing text") {
              const tesseractProgress = Math.max(0, Math.min(1, Number(event?.progress || 0)));
              const overallProgress =
                ((recognition.completedWorkUnits + tesseractProgress) / recognition.totalWorkUnits) * 100;
              setProgress(Math.min(99, Math.round(overallProgress)));
              const status = `${recognition.pageLabel ? recognition.pageLabel + " – " : ""}OCR: ${Math.round(tesseractProgress * 100)}%`;
              setStatusText(status);
              showMessage(status, "info");
              return;
            }

            if (!ocrWorkerRef.current) {
              const rawPct = Math.round((event?.progress || 0) * 100);
              const pct = Number.isFinite(rawPct)
                ? Math.max(0, Math.min(100, rawPct))
                : 0;
              const stablePct = Math.max(lastOcrLoadProgressRef.current, pct);
              lastOcrLoadProgressRef.current = stablePct;
              setOcrLoadProgress(stablePct);
              if (event?.status) {
                setOcrStatusText(
                  `Pre-loading OCR for ${languageLabel}: ${event.status}${stablePct ? ` (${stablePct}%)` : ""}`,
                );
              }
            }
          },
        });

        if (cancelled || requestId !== preloadRequestRef.current) {
          await worker?.terminate?.();
          return;
        }

        ocrWorkerRef.current = worker;
        lastOcrLoadProgressRef.current = 100;
        setOcrLoadProgress(100);
        setOcrReady(true);
        setOcrStatusText(
          `OCR resources are ready for ${languageLabel}. Offline use now depends on your browser cache and deployment.`,
        );
      } catch (error) {
        if (cancelled || requestId !== preloadRequestRef.current) return;
        const message =
          error instanceof Error
            ? error.message
            : "Could not preload OCR assets.";
        setOcrReady(false);
        setOcrStatusText(`OCR preload failed for ${languageLabel}: ${message}`);
        try {
          await worker?.terminate?.();
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled && requestId === preloadRequestRef.current) {
          setOcrLoading(false);
        }
      }
    };

    void preloadOcr();

    return () => {
      cancelled = true;
      const worker = ocrWorkerRef.current;
      ocrWorkerRef.current = null;
      recognitionProgressRef.current = null;
      if (worker) {
        void worker.terminate?.();
      }
    };
  }, [lang, setProgress, showMessage]);

  useEffect(() => {
    setStatusText("");
    if (!operationCompleted) clearMessages();
  }, [supportedFiles.length, operationCompleted, clearMessages]);

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setOptions((prev) => ({ ...prev, [name]: checked }));
  };

  const ocrCanvas = async (
    canvas: HTMLCanvasElement,
    pageLabel: string | undefined,
    completedWorkUnits: number,
    totalWorkUnits: number,
    languageForRun = lang,
  ): Promise<string> => {
    const worker = ocrWorkerRef.current;
    if (!worker) {
      throw new Error("OCR is not ready for the selected language yet.");
    }

    recognitionProgressRef.current = {
      pageLabel,
      completedWorkUnits,
      totalWorkUnits,
    };

    try {
      const {
        data: { text },
      } = await worker.recognize(canvas);
      return normalizeOcrPunctuation(text || "", languageForRun);
    } finally {
      recognitionProgressRef.current = null;
    }
  };

  const performPdfPageOCR = async (
    page: PDFPageProxy,
    label: string,
    completedWorkUnits: number,
    totalWorkUnits: number,
    languageForRun = lang,
  ): Promise<string> => {
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not get canvas context");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
    context.putImageData(imageData, 0, 0);

    return ocrCanvas(canvas, label, completedWorkUnits, totalWorkUnits, languageForRun);
  };

  const performImageOCR = async (
    file: File,
    completedWorkUnits: number,
    totalWorkUnits: number,
    languageForRun = lang,
  ): Promise<string> => {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });

      const MAX_PIXELS = 6_000_000;
      const ratio = Math.min(
        1,
        Math.sqrt(MAX_PIXELS / (img.width * img.height)),
      );
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Could not get canvas context");
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
      ctx.putImageData(imageData, 0, 0);

      const pageLabel = `Page ${completedWorkUnits + 1}/${totalWorkUnits}`;
      return ocrCanvas(canvas, pageLabel, completedWorkUnits, totalWorkUnits, languageForRun);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleProcess = async () => {
    if (supportedFiles.length === 0) {
      showMessage(
        "Please upload a PDF or image (JPG, PNG, WebP, GIF).",
        "error",
      );
      return;
    }
    if (!ocrReady) {
      showMessage(
        "Please wait until OCR is pre-loaded for the selected language.",
        "error",
      );
      return;
    }

    const processLang = lang;

    setProcessing(true, "Starting OCR extraction...");
    setProgress(0);

    const updateRunStatus = (message: string) => {
      setStatusText(message);
      showMessage(message, "info");
    };

    updateRunStatus(`Analyzing pages with ${getLanguageLabel(processLang)} OCR…`);

    try {
      // 1. Calculate total work units (pages + images) for accurate progress
      let totalWorkUnits = 0;
      for (const item of supportedFiles) {
        const file = item.file;
        if (file.type === "application/pdf") {
          const buffer = await file.arrayBuffer();
          const pdf = await getDocument({ data: buffer }).promise;
          totalWorkUnits += pdf.numPages;
        } else if (file.type.startsWith("image/")) {
          totalWorkUnits += 1;
        }
      }

      if (totalWorkUnits === 0) {
        throw new Error(
          "No processable pages or images found in the uploaded files.",
        );
      }

      const OCR_TEXT_THRESHOLD = 50;
      const allPages: { pageNum: number; text: string }[] = [];
      let completedWorkUnits = 0;

      for (const item of supportedFiles) {
        const file = item.file;
        const type = file.type;

        if (type === "application/pdf") {
          updateRunStatus(`Loading PDF: ${file.name}…`);
          const buffer = await file.arrayBuffer();
          const pdf = await getDocument({ data: buffer }).promise;
          const numPages = pdf.numPages;

          for (let i = 1; i <= numPages; i++) {
            const pageLabel = `Page ${completedWorkUnits + 1}/${totalWorkUnits}`;
            updateRunStatus(`Extracting text from ${pageLabel}…`);

            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            let pageText = (textContent.items as any[])
              .map((item) => item.str)
              .join(" ");

            if (
              pageText.trim().replace(/\s/g, "").length < OCR_TEXT_THRESHOLD
            ) {
              updateRunStatus(`${pageLabel} seems scanned. Switching to OCR…`);
              pageText = await performPdfPageOCR(
                page,
                pageLabel,
                completedWorkUnits,
                totalWorkUnits,
                processLang,
              );
            }

            allPages.push({ pageNum: completedWorkUnits + 1, text: normalizeOcrPunctuation(pageText, processLang) });
            completedWorkUnits++;
            setProgress(
              Math.round((completedWorkUnits / totalWorkUnits) * 100),
            );
          }
        } else if (type.startsWith("image/")) {
          updateRunStatus(`Preparing image page ${completedWorkUnits + 1}/${totalWorkUnits}…`);
          const text = await performImageOCR(
            file,
            completedWorkUnits,
            totalWorkUnits,
            processLang,
          );
          allPages.push({ pageNum: completedWorkUnits + 1, text });
          completedWorkUnits++;
          setProgress(Math.round((completedWorkUnits / totalWorkUnits) * 100));
        }
      }

      if (allPages.length === 0) {
        throw new Error("Could not extract any text from the provided files.");
      }

      updateRunStatus("Applying formatting options…");
      const formattedText = postProcessExtractedText(allPages, options);

      const base =
        supportedFiles.length === 1
          ? supportedFiles[0].file.name.replace(
              /\.(pdf|png|jpe?g|webp|gif)$/i,
              "",
            )
          : "batch_extraction";

      const outputFilename = `${base}_smart_extracted.txt`;
      const textBlob = new Blob([formattedText], {
        type: "text/plain;charset=utf-8",
      });

      showPostOperationSuccess({
        data: textBlob,
        filename: outputFilename,
        mimeType: "text/plain",
      });

      setProgress(100);
      setStatusText("");
      showMessage(
        "Extraction successful! Your file is ready for download.",
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      showMessage(`Error: ${message}`, "error");
      updateRunStatus(`An error occurred: ${message}`);
    } finally {
      setProcessing(false);
    }
  };

  const jsonLdWebPage = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `PDF to Text OCR - Extract Text from Scanned PDFs | ${BRAND}`,
        url: PAGE_URL,
        description:
          "Load OCR resources, then extract text from PDFs, scanned documents, and images with browser-side processing.",
      }),
    [],
  );
  const jsonLdSoftwareApp = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PDF & Image to Text Converter (OCR)",
        applicationCategory: "UtilityApplication",
        operatingSystem: "Web",
        url: PAGE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        isAccessibleForFree: true,
        publisher: { "@type": "Organization", name: BRAND },
        featureList: [
          "Free OCR",
          "PDF to Text",
          "Image to Text",
          "No signup required",
          "Multilingual OCR",
          "Scanned files to editable text",
          "Fast and secure processing",
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
            name: "Is the OCR really free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes—converting PDFs and images to text is free. No signup is required.",
            },
          },
          {
            "@type": "Question",
            name: "Which file types are supported?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "PDF, JPG, PNG, WebP, and GIF. If a page or image is a scan, OCR is applied automatically.",
            },
          },
          {
            "@type": "Question",
            name: "Which languages are supported?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Many languages are supported, including English, Spanish, German, French, Chinese (Simplified/Traditional), Persian, and more.",
            },
          },
        ],
      }),
    [],
  );

  return (
    <div>
      <Helmet>
        {/* Core SEO */}
        <meta
          name="description"
          content="Load OCR resources, then extract text from PDFs, scanned documents, and images with browser-side processing."
        />
        <meta
          name="robots"
          content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
        />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>
          PDF to Text OCR - Extract Text from Scanned PDFs | PDFClear
        </title>

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta
          property="og:title"
          content={`PDF to Text OCR - Extract Text from Scanned PDFs | ${BRAND}`}
        />
        <meta
          property="og:description"
          content="Convert PDF pages, scanned documents, and images to editable text with OCR running in your browser."
        />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:title"
          content={`PDF to Text OCR - Extract Text from Scanned PDFs | ${BRAND}`}
        />
        <meta
          name="twitter:description"
          content="Extract text from scanned PDFs and images with browser-side OCR and on-demand language data."
        />
        {/* Keywords */}
        <meta
          name="keywords"
          content="PDF to text, scanned PDF to text, OCR PDF, extract text from PDF, image to text, JPG to text, PNG to text, pre-load OCR disconnect internet extract text locally, private OCR, browser-based OCR, multilingual OCR, no signup OCR"
        />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          PDF to Text OCR - Extract Text from Scanned PDFs
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Extract clean text from PDFs, scanned documents, and images with browser-based OCR, multilingual recognition, and professional formatting controls.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <div className="inline-flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-brand-500" />
            <span>Free OCR for Scans</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <LanguageIcon className="h-5 w-5 text-brand-500" />
            <span>Multilingual Support</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-brand-500" />
            <span>Clean, Formatted Text</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
            <span>No Signup Required</span>
          </div>
        </div>
      </header>
      {!operationCompleted && (
        <section className="mt-6 space-y-6">
          <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-5 text-left dark:border-brand-800 dark:bg-brand-950/30">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              Load the required OCR resources, then extract text in the browser.
            </h2>
            <p className="mt-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Load the OCR language data and WebAssembly files before selecting a PDF or image. Once loaded, you can disconnect and extract text offline while your files stay on your device.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 feature-card text-left space-y-3">
              <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                1. Output Formatting
              </h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="reflowParagraphs"
                  checked={options.reflowParagraphs}
                  onChange={handleOptionChange}
                  disabled={processing}
                  className="h-4 w-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                />
                <span className="ml-2 text-sm text-text-light-primary dark:text-text-dark-primary">
                  Re-flow text into paragraphs
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="fixHyphenation"
                  checked={options.fixHyphenation}
                  onChange={handleOptionChange}
                  disabled={processing}
                  className="h-4 w-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                />
                <span className="ml-2 text-sm text-text-light-primary dark:text-text-dark-primary">
                  Join words split across lines
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="removeHeadersFooters"
                  checked={options.removeHeadersFooters}
                  onChange={handleOptionChange}
                  disabled={processing}
                  className="h-4 w-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                />
                <span className="ml-2 text-sm text-text-light-primary dark:text-text-dark-primary">
                  Remove common headers & footers
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="includePageNumbers"
                  checked={options.includePageNumbers}
                  onChange={handleOptionChange}
                  disabled={processing}
                  className="h-4 w-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                />
                <span className="ml-2 text-sm text-text-light-primary dark:text-text-dark-primary">
                  Include page numbers in output file
                </span>
              </label>
            </div>

            <div className="p-4 feature-card text-left space-y-3">
              <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                2. OCR Language & Preload
              </h3>
              <label
                htmlFor="lang-select"
                className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary -mb-2"
              >
                Language for scanned images
              </label>
              <select
                id="lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                disabled={processing || ocrLoading}
                className="input-style"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="rounded-lg border border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card px-4 py-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                <div className="flex items-center gap-2">
                  {ocrLoading && <Spinner />}
                  <span>{ocrStatusText}</span>
                </div>
                {ocrLoading ? (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="progress-gradient h-2 rounded-full transition-[width] duration-300 ease-out"
                      style={{ width: `${ocrLoadProgress}%` }}
                    />
                  </div>
                ) : ocrReady ? (
                  <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Ready for local OCR
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <ToolActionBar title="Extract OCR text and download the result">
            <button
              onClick={handleProcess}
              disabled={
                processing ||
                supportedFiles.length === 0 ||
                !ocrReady ||
                ocrLoading
              }
              className="btn-primary w-full py-3 text-base"
              aria-label="Convert uploaded PDFs and images to text using OCR"
            >
              Convert Files to Clean Text
            </button>
          </ToolActionBar>

          <div>
            <FileUpload showProcessingStatus={false} />
          </div>
        </section>
      )}

      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">
            Frequently asked questions
          </h2>
          <details className="faq-details">
            <summary className="faq-summary">Is the OCR really free?</summary>
            <p className="faq-answer">
              Yes—converting PDFs and images to text is free. No signup is
              required.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">
              Which file types are supported?
            </summary>
            <p className="faq-answer">
              PDF, JPG, PNG, WebP, and GIF. If a page or image is a scan, OCR is
              applied automatically.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">
              How does the 'clean output' work?
            </summary>
            <p className="faq-answer">
              After extracting text, our tool applies several formatting rules.
              It can intelligently remove repeating headers or footers, join
              words that were hyphenated and split between lines, and re-flow
              lines of text into proper paragraphs for easier reading and
              editing.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">
              Which languages are supported?
            </summary>
            <p className="faq-answer">
              Many languages are supported, including English, Spanish, German,
              French, Chinese (Simplified/Traditional), Persian, and more.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default SmartPdfToTxtPage;
