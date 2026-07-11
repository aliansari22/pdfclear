import React, { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import FileUpload from "../components/FileUpload";
import { useFileContext } from "../hooks/useFileContext";
import {
  loadSummarizerModel,
  summarize,
  getLoadedSummarizerId,
  getLoadedSummarizerDevice,
  cancelSummarizerModelLoad,
} from "../services/summarizer.service";
import { textToPdf } from "../services/pdf.service";
import { extractPdfTextPerPageSmart } from "../services/pdfExtract";
import {
  chunkTextWithStrategy,
  formatExtractedText,
} from "../services/chunkText";
import Spinner from "../components/Spinner";
import {
  ShieldCheckIcon,
  CpuChipIcon,
  LockClosedIcon,
  ClipboardDocumentIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  clearAiTaskState,
  createFilesSignature,
  loadAiTaskState,
  saveAiTaskState,
} from "../utils/aiPersistence";
import { detectModelDevice } from "../utils/modelRuntime";
import { getLargeFileWarning } from "../utils/fileSize";
import { getErrorMessage, logError } from "../utils/logger";

const PAGE_URL = "https://www.pdfclear.com/ai-pdf-summarizer/";
const STORAGE_KEY = "pdfclear_ai_summarize_state_v1";
const MODEL_STORAGE_KEY = "pdfclear_ai_summarizer_loaded_model_v1";
const BRAND = "PDFClear";

const MODELS = [
  {
    id: "onnx-community/text_summarization-ONNX",
    name: "ONNX Text Summarization (Fast, Good Quality, Recommended)",
  },
  {
    id: "Xenova/distilbart-cnn-6-6",
    name: "DistilBART (Slower, Good Quality, English)",
  },
];

/**
 * NEW FUNCTION: Cleans repetitive artifacts from AI-generated summaries.
 *
 * @param text The raw summary text from the model.
 * @returns Cleaned text with reduced repetition.
 */
const cleanRepetitiveSummary = (text: string): string => {
  if (!text) return "";

  // 1. Remove long sequences of the same word (e.g., "Wonder. Wonder. Wonder.")
  // This regex looks for a word boundary, captures a word, and then checks if that same word (plus optional punctuation and space) repeats 3 or more times.
  const cleanedWordRepetitions = text.replace(/(\b\w+\b.?,?\s?)\1{2,}/gi, "$1");

  // 2. Split into sentences to handle sentence-level repetition.
  // This regex splits by periods, question marks, or exclamation marks, followed by whitespace. It keeps the delimiters.
  const sentences = cleanedWordRepetitions.match(/[^.!?]+[.!?]+\s*/g) || [
    cleanedWordRepetitions,
  ];

  // 3. Filter out duplicate adjacent sentences.
  const uniqueSentences: string[] = [];
  if (sentences.length > 0) {
    uniqueSentences.push(sentences[0]);
    for (let i = 1; i < sentences.length; i++) {
      const currentSentence = sentences[i].trim().toLowerCase();
      const previousSentence = sentences[i - 1].trim().toLowerCase();
      if (currentSentence !== previousSentence) {
        uniqueSentences.push(sentences[i]);
      }
    }
  }

  return uniqueSentences.join("").trim();
};

const SummarizePage: React.FC = () => {
  const { uploadedFiles, operationCompleted } = useFileContext();
  const [summary, setSummary] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  // Model state
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelStatusText, setModelStatusText] = useState(
    "Please load a model to begin.",
  );
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [runtimeMessage, setRuntimeMessage] = useState(
    () => detectModelDevice().reason,
  );

  // Advanced settings
  const [chunkSize, setChunkSize] = useState(2500);
  const [temperature, setTemperature] = useState(0.3);
  const [maxNewTokens, setMaxNewTokens] = useState(512);
  const [chunkStrategy, setChunkStrategy] = useState<"sentence" | "simple">(
    "sentence",
  );
  const [summarizeFinal, setSummarizeFinal] = useState(true);
  const [ocrLang, setOcrLang] = useState("eng");

  const [copied, setCopied] = useState(false);

  const fileSignature = useMemo(
    () => createFilesSignature(uploadedFiles.map((entry) => entry.file)),
    [uploadedFiles],
  );
  const largeFileWarning = useMemo(
    () => getLargeFileWarning(uploadedFiles),
    [uploadedFiles],
  );

  useEffect(() => {
    const alreadyLoaded = getLoadedSummarizerId();
    if (alreadyLoaded) {
      setLoadedModel(alreadyLoaded);
      setSelectedModel(alreadyLoaded);
      const modelName =
        MODELS.find((m) => m.id === alreadyLoaded)?.name || alreadyLoaded;
      setModelStatusText(
        `Model ready: ${modelName}${getLoadedSummarizerDevice() ? ` (${getLoadedSummarizerDevice()!.toUpperCase()})` : ""}`,
      );
    }
  }, []);

  useEffect(() => {
    const saved = loadAiTaskState<{ summary: string; statusText: string }>(
      STORAGE_KEY,
    );
    if (saved && saved.signature === fileSignature && saved.payload.summary) {
      setSummary(saved.payload.summary);
      setStatusText(
        saved.payload.statusText || "Restored previous summary from this tab.",
      );
    }
  }, [fileSignature]);

  useEffect(() => {
    if (!uploadedFiles.length) {
      clearAiTaskState(STORAGE_KEY);
      setSummary("");
    } else {
      const saved = loadAiTaskState<{ summary: string; statusText: string }>(
        STORAGE_KEY,
      );
      if (!saved || saved.signature !== fileSignature) {
        setSummary("");
      }
    }
    setStatusText("");
    setProgress(0);
  }, [uploadedFiles, fileSignature]);

  const handleLoadModel = async () => {
    setIsModelLoading(true);
    setRuntimeMessage(detectModelDevice().reason);
    setModelLoadProgress(0);
    setModelStatusText("Initializing model loading...");
    try {
      await loadSummarizerModel(selectedModel, (progressEvent) => {
        const pct = Math.round(progressEvent.progress ?? 0);
        setModelStatusText(progressEvent.text);
        setRuntimeMessage(
          progressEvent.device === "wasm"
            ? "Using WebAssembly fallback. This is more compatible, but it may be slower than WebGPU."
            : detectModelDevice().reason,
        );
        setModelLoadProgress(pct);
      });
      setLoadedModel(selectedModel);
      try {
        localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
      } catch {
        /* ignore */
      }
      const modelName =
        MODELS.find((m) => m.id === selectedModel)?.name || selectedModel;
      setModelStatusText(
        `Model loaded: ${modelName}${getLoadedSummarizerDevice() ? ` (${getLoadedSummarizerDevice()!.toUpperCase()})` : ""}`,
      );
    } catch (err) {
      const message = getErrorMessage(err, "Failed to load model.");
      logError(err, "SummarizePage.handleLoadModel");
      setModelStatusText(`Error: ${message}`);
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (uploadedFiles.length === 0) {
      setStatusText("Please upload at least one PDF or TXT file.");
      return;
    }
    setIsProcessing(true);
    setSummary("");
    setProgress(0);

    try {
      if (!loadedModel) {
        setStatusText("Loading AI model for summarization...");
        await handleLoadModel();
        if (!getLoadedSummarizerId()) throw new Error("Model failed to load.");
      }

      let combinedText = "";
      for (const [index, fileEntry] of uploadedFiles.entries()) {
        const file = fileEntry.file;
        setStatusText(
          `Processing file ${index + 1}/${uploadedFiles.length}: ${file.name}`,
        );
        if (file.type === "application/pdf") {
          const pages = await extractPdfTextPerPageSmart(file, {
            lang: ocrLang,
            onProgress: (p) => {
              if (p.type === "ocr") {
                setStatusText(
                  `OCR on page ${p.page}/${p.total} (${p.ocrProgress}%)`,
                );
              }
            },
          });
          combinedText += pages
            .map((p) => formatExtractedText(p.text))
            .join("\n\n");
        } else if (file.type === "text/plain") {
          combinedText += await file.text();
        }
        combinedText += "\n\n";
      }

      if (!combinedText.trim()) {
        throw new Error("Could not extract any text from the provided files.");
      }

      const chunks = chunkTextWithStrategy(
        combinedText,
        chunkSize,
        chunkStrategy,
      );
      if (chunks.length === 0) {
        throw new Error("Text is too short to be chunked and summarized.");
      }

      const generationParams = { max_new_tokens: maxNewTokens, temperature };
      const individualSummaries: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setStatusText(`Summarizing chunk ${i + 1} of ${chunks.length}...`);
        setProgress(
          Math.round(
            ((i + 1) / (chunks.length + (summarizeFinal ? 1 : 0))) * 100,
          ),
        );

        await new Promise((resolve) => setTimeout(resolve, 0));

        const rawChunkSummary = await summarize(chunks[i], generationParams);
        const cleanedChunkSummary = cleanRepetitiveSummary(rawChunkSummary); // CLEANING STEP
        individualSummaries.push(cleanedChunkSummary);
        setSummary(individualSummaries.join(" "));
      }

      if (summarizeFinal && individualSummaries.length > 1) {
        setStatusText("Performing final summarization...");
        setProgress(95);

        await new Promise((resolve) => setTimeout(resolve, 0));

        const combinedSummary = individualSummaries.join(" ");
        const rawFinalSummary = await summarize(
          combinedSummary,
          generationParams,
        );
        const finalSummary = cleanRepetitiveSummary(rawFinalSummary); // FINAL CLEANING STEP
        setSummary(finalSummary);
        saveAiTaskState(STORAGE_KEY, fileSignature, {
          summary: finalSummary,
          statusText: "Summarization complete!",
        });
      } else {
        saveAiTaskState(STORAGE_KEY, fileSignature, {
          summary: individualSummaries.join(" "),
          statusText: "Summarization complete!",
        });
      }

      setStatusText("Summarization complete!");
      setProgress(100);
    } catch (err) {
      const message = getErrorMessage(err, "An unknown error occurred.");
      logError(err, "SummarizePage.handleSummarize");
      setStatusText(`Error: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelModelLoad = () => {
    cancelSummarizerModelLoad();
    setIsModelLoading(false);
    setModelLoadProgress(0);
    setModelStatusText("Model download cancelled.");
  };

  useEffect(() => {
    const cachedModel = (() => {
      try {
        return localStorage.getItem(MODEL_STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    if (!cachedModel || loadedModel || isModelLoading) return;

    let cancelled = false;
    setSelectedModel(cachedModel);
    setIsModelLoading(true);
    setModelLoadProgress(0);
    setModelStatusText("Restoring locally cached model...");
    setRuntimeMessage(detectModelDevice().reason);

    void loadSummarizerModel(cachedModel, (progressEvent) => {
      if (cancelled) return;
      setModelLoadProgress(Math.round(progressEvent.progress ?? 0));
      setModelStatusText(progressEvent.text);
      setRuntimeMessage(
        progressEvent.device === "wasm"
          ? "Using WebAssembly fallback. This is more compatible, but it may be slower than WebGPU."
          : detectModelDevice().reason,
      );
    })
      .then(() => {
        if (cancelled) return;
        setLoadedModel(cachedModel);
        const modelName =
          MODELS.find((m) => m.id === cachedModel)?.name || cachedModel;
        setModelLoadProgress(100);
        setModelStatusText(
          `Model ready: ${modelName}${getLoadedSummarizerDevice() ? ` (${getLoadedSummarizerDevice()!.toUpperCase()})` : ""}`,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        logError(err, "SummarizePage.autoLoadModel");
        setModelStatusText(
          "Saved model could not be restored. Click Load Model to try again.",
        );
        try {
          localStorage.removeItem(MODEL_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      })
      .finally(() => {
        if (!cancelled) setIsModelLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadedModel, isModelLoading]);

  const triggerDownload = (data: Blob, filename: string) => {
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    if (!summary) return;
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    triggerDownload(blob, "ai_summary.txt");
  };

  const handleDownloadPdf = async () => {
    if (!summary) return;
    setIsDownloadingPdf(true);
    setStatusText("Generating PDF...");
    try {
      const result = await textToPdf(summary, "ai_summary.pdf");
      triggerDownload(result.data as Blob, result.filename);
      setStatusText("PDF generated successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatusText(`Error creating PDF: ${message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const jsonLdWebPage = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `Private AI PDF Summarizer | ${BRAND}`,
        url: PAGE_URL,
        description:
          "Summarize long PDF and text documents using an AI that runs in your browser. Your documents are not uploaded to a PDFClear server, though AI/OCR features may download model or runtime assets on first use.",
      }),
    [],
  );
  const jsonLdSoftwareApp = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Private AI PDF Summarizer",
        applicationCategory: "UtilityApplication",
        operatingSystem: "Web",
        url: PAGE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        isAccessibleForFree: true,
        publisher: { "@type": "Organization", name: BRAND },
        featureList: [
          "AI PDF summarization",
          "Summarize document",
          "Browser-side AI processing",
          "Summarize long documents",
          "Private document analysis",
          "On-demand model assets",
          "In-browser AI model",
          "Secure summarization",
          "OCR for scanned PDFs",
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
            name: "How is this summarizer private?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Unlike most AI tools, our summarizer downloads the AI model to your browser. Document processing happens in your browser. AI/OCR features may download model or runtime assets on first use, but your documents are not uploaded to a PDFClear server.",
            },
          },
          {
            "@type": "Question",
            name: "Can it summarize scanned PDFs?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. The tool automatically detects scanned pages and uses Optical Character Recognition (OCR) to extract the text before summarizing it, allowing you to get insights from image-based documents.",
            },
          },
          {
            "@type": "Question",
            name: "Why does it sometimes take a while to start?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The first time you use a model, it needs to be downloaded to your browser. This can take a moment depending on your connection. For long documents, the tool also processes the text in smaller chunks, which can add to the processing time but ensures even very large files can be handled.",
            },
          },
          {
            "@type": "Question",
            name: "What are the advanced settings for?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "They give you control over the summarization process. 'Chunk Size' determines how much text the AI looks at once. 'Temperature' controls creativity (lower is more factual). 'Max New Tokens' sets the length of each summary piece. 'Chunking Strategy' changes how the text is split. 'Model Selection' lets you choose between faster or higher-quality AI models.",
            },
          },
        ],
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <Helmet>
        {/* Core SEO */}
        <meta
          name="description"
          content="Summarize PDFs with an AI model that runs in your browser. Your files stay on your device, and after the model and OCR assets are loaded you can work offline."
        />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>
          Private AI PDF Summarizer - Summarize Documents Offline | PDFClear
        </title>

        {/* Open Graph */}
        <meta
          property="og:title"
          content={`Private AI PDF Summarizer - Summarize Documents Offline | ${BRAND}`}
        />
        <meta
          property="og:description"
          content="Summarize PDFs with an AI model that runs in your browser. Your files stay on your device, and after the model and OCR assets are loaded you can work offline."
        />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:title"
          content={`Private AI PDF Summarizer - Summarize Documents Offline | ${BRAND}`}
        />
        <meta
          name="twitter:description"
          content="Summarize PDFs with an AI model that runs in your browser. Your files stay on your device, and after the model and OCR assets are loaded you can work offline."
        />
        {/* Keywords */}
        <meta
          name="keywords"
          content="ai pdf summarizer, summarize pdf, document summarizer, private ai, browser-side ai, local ai pdf summary, get key points from pdf, ai document analysis, tldr generator"
        />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      <header className="mb-6 text-center">
        <h1 className="mb-2 bg-gradient-to-r from-indigo-700 via-fuchsia-600 to-rose-500 bg-clip-text text-3xl font-extrabold text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-rose-300">
          AI PDF Summarizer (Private & Local)
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-3xl mx-auto">
          Create concise summaries, key takeaways, and readable notes from long PDFs with AI that runs in your browser.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <ShieldCheckIcon className="h-5 w-5" />
            <span>Runs in your browser</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 font-semibold text-indigo-800 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
            <CpuChipIcon className="h-5 w-5" />
            <span>Runs in Your Browser</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 font-semibold text-rose-800 shadow-sm dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <LockClosedIcon className="h-5 w-5" />
            <span>Completely Private</span>
          </div>
        </div>
      </header>

      {!operationCompleted && (
        <section className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-rose-50/80 p-5 text-left shadow-sm dark:border-indigo-900/70 dark:from-indigo-950/35 dark:via-dark-card dark:to-rose-950/25">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              Download the required model assets, then summarize your PDF in
              the browser.
            </h2>
            <p className="mt-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Choose and load an AI model before selecting files. Once the model is loaded, you can disconnect and summarize documents offline while your files stay on your device.
            </p>
          </div>

          <div className="p-4 feature-card text-left">
            <h2 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
              1. AI Model & Settings
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end mb-4">
              <select
                value={selectedModel}
                disabled={isModelLoading || isProcessing}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="input-style w-full"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleLoadModel}
                disabled={isModelLoading || loadedModel === selectedModel}
                className="btn-primary flex h-[42px] w-full items-center justify-center md:w-auto"
              >
                {isModelLoading ? (
                  <Spinner />
                ) : loadedModel === selectedModel ? (
                  "Loaded"
                ) : (
                  "Load Model"
                )}
              </button>
              {isModelLoading && (
                <button
                  type="button"
                  onClick={handleCancelModelLoad}
                  className="btn-secondary h-[42px] w-full md:w-auto"
                >
                  Cancel download
                </button>
              )}
            </div>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              {modelStatusText}
            </p>
            {isModelLoading && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                <div
                  className="progress-gradient h-2 rounded-full transition-all"
                  style={{ width: `${modelLoadProgress}%` }}
                />
              </div>
            )}
            <div className="mt-4 rounded-lg border border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card px-4 py-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {runtimeMessage}
            </div>

            <details className="mt-4" open>
              <summary className="cursor-pointer text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                Advanced Settings
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-border-light dark:border-border-dark pt-4">
                <div>
                  <label
                    htmlFor="chunkSize"
                    className="block text-xs font-medium mb-1"
                  >
                    Chunk Size: {chunkSize} chars
                  </label>
                  <input
                    id="chunkSize"
                    type="range"
                    min="500"
                    max="20000"
                    step="100"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label
                    htmlFor="temperature"
                    className="block text-xs font-medium mb-1"
                  >
                    Temperature: {temperature}
                  </label>
                  <input
                    id="temperature"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full accent-fuchsia-500"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label
                    htmlFor="maxNewTokens"
                    className="block text-xs font-medium mb-1"
                  >
                    Max Tokens: {maxNewTokens}
                  </label>
                  <input
                    id="maxNewTokens"
                    type="range"
                    min="50"
                    max="1024"
                    step="10"
                    value={maxNewTokens}
                    onChange={(e) => setMaxNewTokens(Number(e.target.value))}
                    className="w-full accent-amber-500"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label
                    htmlFor="chunkStrategy"
                    className="block text-xs font-medium mb-1"
                  >
                    Chunking Strategy
                  </label>
                  <select
                    id="chunkStrategy"
                    value={chunkStrategy}
                    onChange={(e) => setChunkStrategy(e.target.value as any)}
                    className="input-style text-xs"
                    disabled={isProcessing}
                  >
                    <option value="sentence">Sentence Aware</option>
                    <option value="simple">Simple Split</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="ocrLang"
                    className="block text-xs font-medium mb-1"
                  >
                    OCR Language
                  </label>
                  <select
                    id="ocrLang"
                    value={ocrLang}
                    onChange={(e) => setOcrLang(e.target.value)}
                    className="input-style text-xs"
                    disabled={isProcessing}
                  >
                    <option value="eng">English</option>
                    <option value="spa">Spanish</option>
                    <option value="deu">German</option>
                    <option value="fra">French</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={summarizeFinal}
                      onChange={(e) => setSummarizeFinal(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      disabled={isProcessing}
                    />
                    <span className="ml-2 text-xs">Summarize Final Result</span>
                  </label>
                </div>
              </div>
            </details>
          </div>

          <div className="mt-4">
            <FileUpload />
            {largeFileWarning && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                {largeFileWarning}
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="p-4 feature-card text-left">
              <h2 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                2. Generate Summary
              </h2>
              <button
                onClick={handleSummarize}
                disabled={isProcessing || isModelLoading || !loadedModel}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                {isProcessing && <Spinner />}
                Summarize Document(s)
              </button>
            </div>
          )}
        </section>
      )}

      {(isProcessing || statusText) && (
        <div className="text-center my-4" aria-live="polite">
          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            {statusText}
          </p>
          {isProcessing && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
              <div
                className="progress-gradient h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {summary && !isProcessing && (
        <section className="mt-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
              Generated Summary
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadTxt}
                disabled={isDownloadingPdf}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <DocumentArrowDownIcon className="h-4 w-4" /> TXT
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                {isDownloadingPdf ? (
                  <Spinner />
                ) : (
                  <DocumentArrowDownIcon className="h-4 w-4" />
                )}{" "}
                PDF
              </button>
              <button
                onClick={handleCopy}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <pre className="p-4 bg-light-body dark:bg-dark-body rounded-lg whitespace-pre-wrap text-text-light-secondary dark:text-text-dark-secondary leading-relaxed">
            {summary}
          </pre>
        </section>
      )}

      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">
            Frequently Asked Questions
          </h2>
          <details className="faq-details">
            <summary className="faq-summary">
              How is this summarizer private?
            </summary>
            <p className="faq-answer">
              Unlike most AI tools, our summarizer downloads the AI model to
              your browser. All processing, including text extraction, OCR, and
              summarization, happens locally on your machine. Your documents are
              not uploaded to a PDFClear server.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">
              Can it summarize scanned PDFs?
            </summary>
            <p className="faq-answer">
              Yes. The tool automatically detects scanned pages and uses Optical
              Character Recognition (OCR) to extract the text before summarizing
              it, allowing you to get insights from image-based documents.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">
              Why does it take a while to start?
            </summary>
            <p className="faq-answer">
              The first time you use a model, it needs to be downloaded to your
              browser. This can take a moment depending on your connection. For
              long documents, the tool also processes the text in smaller
              chunks, which can add to the processing time but ensures even very
              large files can be handled.
            </p>
          </details>
          <details className="faq-details">
            <summary className="faq-summary">
              What are the advanced settings for?
            </summary>
            <p className="faq-answer">
              They give you control over the summarization process. 'Chunk Size'
              determines how much text the AI looks at once. 'Temperature'
              controls creativity (lower is more factual). 'Max New Tokens' sets
              the length of each summary piece. 'Chunking Strategy' changes how
              the text is split. 'Model Selection' lets you choose between
              faster or higher-quality AI models.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default SummarizePage;
