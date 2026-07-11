import React, { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import FileUpload from "../components/FileUpload";
import { useFileContext } from "../hooks/useFileContext";
import {
  semanticSearch,
  DocChunk,
  SearchResult,
  loadSearchModel,
  getLoadedModelId,
  precomputeChunkEmbeddings,
  cancelSearchModelLoad,
} from "../services/semanticSearch";
import { extractPdfTextPerPageSmart } from "../services/pdfExtract";
import { chunkTextByPage, formatExtractedText } from "../services/chunkText";
import Spinner from "../components/Spinner";
import { ShieldCheckIcon, CpuChipIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { clearAiTaskState, createFilesSignature, loadAiTaskState, saveAiTaskState } from '../utils/aiPersistence';
import { detectModelDevice } from '../utils/modelRuntime';
import { getLargeFileWarning } from '../utils/fileSize';
import { getErrorMessage, logError } from '../utils/logger';


const PAGE_URL = "https://www.pdfclear.com/pdf-semantic-search/"; // Updated URL
const STORAGE_KEY = 'pdfclear_ai_search_state_v1';
const MODEL_STORAGE_KEY = 'pdfclear_ai_search_loaded_model_v1';
const BRAND = "PDFClear";

const MODELS = [
  {
    id: "nomic-ai/nomic-embed-text-v1.5",
    name: "nomic-ai (Best Quality, Slower, English)",
  },
  {
    id: "Xenova/GIST-small-Embedding-v0",
    name: "GIST-Small (Lightweight, Good Quality, English)",
  },
  {
    id: "Xenova/all-MiniLM-L6-v2",
    name: "MiniLM-L6 (Ultra Fast, Low Quality, English)",
  },
  {
    id: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
    name: "Multilingual-MiniLM (Slower, Multilingual)",
  },
];

const languageOptions = [
  { code: "eng", label: "English" },
  { code: "spa", label: "Spanish" },
  { code: "deu", label: "German" },
  { code: "fra", label: "French" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
  { code: "fas", label: "Persian (Farsi)" },
];

const createDocumentEmbeddingKey = (
  docs: DocChunk[],
  documentConfigKey: string,
  modelId: string | null
): string => {
  const first = docs[0];
  const last = docs[docs.length - 1];
  return [
    documentConfigKey,
    modelId || "no-model",
    docs.length,
    first?.id || "",
    first?.pageNum || 0,
    first?.text.length || 0,
    last?.id || "",
    last?.pageNum || 0,
    last?.text.length || 0,
  ].join("|");
};

interface ResultCardProps {
  result: SearchResult;
  query: string;
  previousChunk?: DocChunk;
  nextChunk?: DocChunk;
  canShowInPage: boolean;
  onShowInPage: (result: SearchResult) => void;
  overlapWords: number;
}

const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function computeOverlapRegex(
  aText: string,
  bText: string,
  maxWords: number,
  minWords: number
): RegExp | null {
  const toWords = (t: string) =>
    t
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  const normalizeWord = (w: string) =>
    w.replace(/[^\p{L}\p{N}'’-]+/gu, "").toLowerCase();

  const aWords = toWords(aText);
  const bWords = toWords(bText);

  if (!aWords.length || !bWords.length) return null;

  const maxLen = Math.min(maxWords, aWords.length, bWords.length);
  if (maxLen < minWords) return null;

  for (let len = maxLen; len >= minWords; len--) {
    const aSlice = aWords.slice(aWords.length - len);
    const bSlice = bWords.slice(0, len);

    let matches = true;
    for (let i = 0; i < len; i++) {
      if (normalizeWord(aSlice[i]) !== normalizeWord(bSlice[i])) {
        matches = false;
        break;
      }
    }

    if (matches) {
      const patternWords = aSlice.map((w) => escapeRegex(w));
      const pattern = patternWords.join("\\s+");
      try {
        return new RegExp(pattern, "gi");
      } catch {
        return null;
      }
    }
  }
  return null;
}

const ResultCard: React.FC<ResultCardProps> = ({
  result,
  query,
  previousChunk,
  nextChunk,
  canShowInPage,
  onShowInPage,
  overlapWords,
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [source, chunkId] = useMemo(() => {
    const [src, idx] = result.id.split("#");
    return [src || "Document", idx || "?"];
  }, [result.id]);

  const similarityColor = (score: number) => {
    if (score >= 0.6) return "bg-emerald-500";
    if (score >= 0.45) return "bg-yellow-500";
    return "bg-red-500";
  };

  const queryTokens = useMemo(
    () =>
      Array.from(
        new Set(
          query
            .toLowerCase()
            .split(/\s+/)
            .map((t) => t.trim())
            .filter((t) => t.length > 2)
        )
      ),
    [query]
  );

  const highlightQueryOnly = (text: string) => {
    if (!queryTokens.length) return text;
    const escapedTokens = queryTokens.map((t) => escapeRegex(t));
    const pattern = new RegExp(`(${escapedTokens.join("|")})`, "gi");
    const parts = text.split(pattern);
    return parts.map((part, index) => {
      const lower = part.toLowerCase();
      if (queryTokens.includes(lower)) {
        return (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">
            {part}
          </mark>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  const splitByOverlapRegexes = (
    text: string,
    overlapRegexes: RegExp[]
  ): { text: string; isOverlap: boolean }[] => {
    let segments: { text: string; isOverlap: boolean }[] = [{ text, isOverlap: false }];
    overlapRegexes.forEach((regex) => {
      const newSegments: { text: string; isOverlap: boolean }[] = [];
      segments.forEach((seg) => {
        if (seg.isOverlap) { newSegments.push(seg); return; }
        const chunk = seg.text;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(chunk)) !== null) {
          const start = match.index;
          const end = start + match[0].length;
          if (start > lastIndex) { newSegments.push({ text: chunk.slice(lastIndex, start), isOverlap: false }); }
          newSegments.push({ text: chunk.slice(start, end), isOverlap: true });
          lastIndex = end;
        }
        if (lastIndex < chunk.length) { newSegments.push({ text: chunk.slice(lastIndex), isOverlap: false }); }
        regex.lastIndex = 0;
      });
      segments = newSegments;
    });
    return segments;
  };

  const { prevCurrOverlapRegex, currNextOverlapRegex }: { prevCurrOverlapRegex: RegExp | null; currNextOverlapRegex: RegExp | null; } = useMemo(() => {
    const maxWords = Math.max(20, overlapWords * 2 || 30);
    const minWords = Math.max(5, Math.floor((overlapWords || 20) * 0.4));
    const prevRegex = previousChunk && computeOverlapRegex(previousChunk.text, result.text, maxWords, minWords);
    const nextRegex = nextChunk && computeOverlapRegex(result.text, nextChunk.text, maxWords, minWords);
    return { prevCurrOverlapRegex: prevRegex || null, currNextOverlapRegex: nextRegex || null };
  }, [previousChunk, nextChunk, result.text, overlapWords]);

  const renderText = (
    text: string,
    position: "previous" | "current" | "next"
  ) => {
    if (!expanded) { return highlightQueryOnly(text); }
    const overlapRegexes: RegExp[] = [];
    if (position === "previous" && prevCurrOverlapRegex) { overlapRegexes.push(prevCurrOverlapRegex); }
    else if (position === "next" && currNextOverlapRegex) { overlapRegexes.push(currNextOverlapRegex); }
    else if (position === "current") {
      if (prevCurrOverlapRegex) overlapRegexes.push(prevCurrOverlapRegex);
      if (currNextOverlapRegex) overlapRegexes.push(currNextOverlapRegex);
    }
    if (!overlapRegexes.length) { return highlightQueryOnly(text); }
    const segments = splitByOverlapRegexes(text, overlapRegexes);
    return segments.map((seg, idx) =>
      seg.isOverlap ? (
        <mark key={`o-${idx}`} className="bg-blue-100 dark:bg-blue-900 rounded px-0.5">
          {seg.text}
        </mark>
      ) : (
        <React.Fragment key={`n-${idx}`}>{highlightQueryOnly(seg.text)}</React.Fragment>
      )
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleContext = () => { setExpanded((prev) => !prev); };
  const hasContext = Boolean(previousChunk || nextChunk);

  return (
    <article className="overflow-hidden p-4 border rounded-lg bg-light-card dark:bg-dark-card dark:border-border-dark transition-shadow hover:shadow-md">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-2">
        <div className="min-w-0">
          <p className="max-w-full truncate text-sm font-semibold text-text-light-primary dark:text-text-dark-primary" title={source}>
            Source: {source} {result.pageNum > 0 ? `(Page ${result.pageNum})` : ""}
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Chunk #{chunkId}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            Similarity: {result.similarity.toFixed(3)}
          </p>
          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
            <div className={`h-full rounded-full ${similarityColor(result.similarity)}`} style={{ width: `${Math.max(0, Math.min(1, result.similarity)) * 100}%` }} />
          </div>
        </div>
      </header>
      {expanded && previousChunk && (
        <div className="mb-3 border-b border-border-light dark:border-border-dark pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-light-secondary dark:text-text-dark-secondary mb-1">Previous context</p>
          <p className="text-sm text-text-light-primary dark:text-text-dark-primary bg-light-body dark:bg-dark-body p-2 rounded-md leading-relaxed">
            {renderText(previousChunk.text, "previous")}
          </p>
        </div>
      )}
      <p className="text-sm text-text-light-primary dark:text-text-dark-primary my-3 bg-light-body dark:bg-dark-body p-3 rounded-md leading-relaxed">
        “{renderText(result.text, "current")}”
      </p>
      {expanded && nextChunk && (
        <div className="mt-3 border-t border-border-light dark:border-border-dark pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-light-secondary dark:text-text-dark-secondary mb-1">Next context</p>
          <p className="text-sm text-text-light-primary dark:text-text-dark-primary bg-light-body dark:bg-dark-body p-2 rounded-md leading-relaxed">
            {renderText(nextChunk.text, "next")}
          </p>
        </div>
      )}
      <footer className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs font-semibold">
          <button type="button" onClick={handleCopy} className="text-brand-600 hover:underline">{copied ? "Copied!" : "Copy text"}</button>
          {hasContext && (<button type="button" onClick={handleToggleContext} className="text-brand-600 hover:underline">{expanded ? "Hide context" : "View more context"}</button>)}
          {canShowInPage && (<button type="button" onClick={() => onShowInPage(result)} className="text-brand-600 hover:underline">Show in page</button>)}
        </div>
        {result.pageNum > 0 && (<span className="text-[11px] text-text-light-secondary dark:text-text-dark-secondary">Page {result.pageNum}</span>)}
      </footer>
    </article>
  );
};

interface PdfPagePreviewModalProps { result: SearchResult; fileUrl?: string; onClose: () => void; }
const PdfPagePreviewModal: React.FC<PdfPagePreviewModalProps> = ({ result, fileUrl, onClose, }) => {
  const [source] = result.id.split("#");
  const pageNum = result.pageNum || 1;
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") { onClose(); } };
    window.addEventListener("keydown", handler);
    return () => { window.removeEventListener("keydown", handler); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-light-body dark:bg-dark-card rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-text-light-primary dark:text-text-dark-primary" title={`${source} — Page ${pageNum}`}>{source} — Page {pageNum}</h3>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Preview of the page that contains this result.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary">Close</button>
        </header>
        <main className="flex-1 overflow-hidden">
          {fileUrl ? (<iframe title={`Preview of ${source} page ${pageNum}`} src={`${fileUrl}#page=${pageNum}`} className="w-full h-[70vh] border-0" />) : (
            <div className="p-4"><p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">We could not find a PDF source for this result. This preview is only available for PDF files.</p></div>
          )}
        </main>
        <footer className="px-4 py-2 border-t border-border-light dark:border-border-dark text-[11px] text-text-light-secondary dark:text-text-dark-secondary">
          Tip: you can use your browser&apos;s built-in PDF controls (zoom, search, etc.) directly in this preview.
        </footer>
      </div>
    </div>
  );
};

const SemanticSearchPage: React.FC = () => {
  const { uploadedFiles, showMessage } = useFileContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [documents, setDocuments] = useState<DocChunk[] | null>(null);
  const [processedDocumentsKey, setProcessedDocumentsKey] = useState<string | null>(null);
  const [indexedDocumentsKey, setIndexedDocumentsKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isIndexingDocuments, setIsIndexingDocuments] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [chunkSize, setChunkSize] = useState(200);
  const [overlap, setOverlap] = useState(30);
  const [ocrLang, setOcrLang] = useState("eng");
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelStatusText, setModelStatusText] = useState("Please select and load a model to begin.");
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [runtimeMessage, setRuntimeMessage] = useState(() => detectModelDevice().reason);
  const [minScore, setMinScore] = useState(0.35);
  const [maxResultsToShow, setMaxResultsToShow] = useState(30);
  const [previewResult, setPreviewResult] = useState<SearchResult | null>(null);
  const [fileUrlMap, setFileUrlMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const urlsToRevoke: string[] = [];
    const map: Record<string, string> = {};
    uploadedFiles.forEach((entry: any) => {
      const file: File = entry.file;
      if (file.type === "application/pdf") {
        const url = URL.createObjectURL(file);
        map[file.name] = url;
        urlsToRevoke.push(url);
      }
    });
    setFileUrlMap(map);
    return () => { urlsToRevoke.forEach((url) => URL.revokeObjectURL(url)); };
  }, [uploadedFiles]);

  const fileSignature = useMemo(() => createFilesSignature(uploadedFiles.map((entry) => entry.file)), [uploadedFiles]);
  const documentConfigKey = useMemo(
    () => `${fileSignature}|chunk:${chunkSize}|overlap:${overlap}|ocr:${ocrLang}`,
    [fileSignature, chunkSize, overlap, ocrLang]
  );
  const largeFileWarning = useMemo(() => getLargeFileWarning(uploadedFiles), [uploadedFiles]);

  useEffect(() => {
    const alreadyLoaded = getLoadedModelId();
    if (alreadyLoaded) {
      setLoadedModel(alreadyLoaded);
      setSelectedModel(alreadyLoaded);
      const modelName = MODELS.find((m) => m.id === alreadyLoaded)?.name || alreadyLoaded;
      setModelStatusText(`Model ready: ${modelName} (WASM)`);
    }
  }, []);

  useEffect(() => {
    const saved = loadAiTaskState<{
      query: string;
      results: SearchResult[];
      documents: DocChunk[] | null;
      processedDocumentsKey?: string | null;
      indexedDocumentsKey?: string | null;
    }>(STORAGE_KEY);
    if (saved && saved.signature === fileSignature) {
      setQuery(saved.payload.query || '');
      setResults(saved.payload.results || []);
      setDocuments(saved.payload.documents || null);
      setProcessedDocumentsKey(saved.payload.processedDocumentsKey || null);
      setIndexedDocumentsKey(saved.payload.indexedDocumentsKey || null);
      setStatusText(saved.payload.results?.length ? 'Restored previous AI search state from this tab.' : '');
      return;
    }
    setDocuments(null);
    setProcessedDocumentsKey(null);
    setIndexedDocumentsKey(null);
    setResults([]);
    setStatusText('');
    setProgress(0);
  }, [uploadedFiles, fileSignature]);

  const handleLoadModel = async () => {
    setModelLoading(true);
    setRuntimeMessage(detectModelDevice().reason);
    setModelLoadProgress(0);
    setModelStatusText("Initializing model loading...");
    try {
      await loadSearchModel(selectedModel, (progressEvent) => {
        const pct = Math.round(progressEvent.progress ?? 0);
        const sizeLabel = progressEvent.totalLabel ? ` ${progressEvent.totalLabel}` : '';
        setModelStatusText(`${progressEvent.text}${sizeLabel && !progressEvent.text.includes(sizeLabel) ? ` (${sizeLabel.trim()})` : ''}`);
        setModelLoadProgress(pct);
      });
      setLoadedModel(selectedModel);
      const modelName = MODELS.find((m) => m.id === selectedModel)?.name || selectedModel;
      setModelStatusText(`Model loaded: ${modelName} (WASM)`);
      try { localStorage.setItem(MODEL_STORAGE_KEY, selectedModel); } catch { /* ignore */ }
    } catch (err) {
      const message = getErrorMessage(err, "Failed to load model.");
      logError(err, 'SemanticSearchPage.handleLoadModel');
      setModelStatusText(message);
      showMessage(message, 'error');
      setLoadedModel(null);
      return;
    } finally {
      setModelLoading(false);
      setModelLoadProgress(0);
    }
  };

  const processFilesCore = async (): Promise<DocChunk[] | null> => {
    if (uploadedFiles.length === 0) {
      setStatusText("Please upload at least one PDF or text file.");
      return null;
    }
    setDocuments(null);
    setProcessedDocumentsKey(null);
    setIndexedDocumentsKey(null);
    setResults([]);
    setProgress(0);
    setStatusText("Preparing documents...");
    try {
      const allChunks: DocChunk[] = [];
      const totalFiles = uploadedFiles.length;
      let filesProcessed = 0;
      for (const fileEntry of uploadedFiles) {
        filesProcessed += 1;
        const file: File = fileEntry.file;
        setStatusText(`Processing file ${filesProcessed}/${totalFiles}: ${file.name}`);
        let pagesWithText: { pageNum: number; text: string }[] = [];
        if (file.type === "application/pdf") {
          pagesWithText = await extractPdfTextPerPageSmart(file, {
            lang: ocrLang,
            onProgress: (p: any) => {
              const base = ((filesProcessed - 1) / totalFiles) * 100;
              const span = 100 / totalFiles;
              let withinFile = 0;
              if (p.type === "ocr" && typeof p.ocrProgress === "number") {
                withinFile = Math.max(0, Math.min(1, (p.ocrProgress ?? 0) / 100));
                setStatusText(`[File ${filesProcessed}/${totalFiles}] OCR on page ${p.page}/${p.total} (${Math.round(p.ocrProgress)}%).`);
              } else if (typeof p.page === "number" && typeof p.total === "number") {
                withinFile = p.total ? Math.max(0, Math.min(1, p.page / p.total)) : 0;
                setStatusText(`[File ${filesProcessed}/${totalFiles}] Reading page ${p.page}/${p.total}.`);
              }
              const overall = Math.min(100, Math.round(base + withinFile * span));
              setProgress(overall);
            },
          });
        } else if (file.type === "text/plain") {
          const text = await file.text();
          pagesWithText = [{ pageNum: 1, text }];
        } else {
          continue;
        }
        if (pagesWithText.length === 0 || pagesWithText.every((p) => !p.text.trim())) {
          continue;
        }
        const formattedPages = pagesWithText.map((page) => ({ ...page, text: formatExtractedText(page.text) }));
        const chunks = chunkTextByPage(formattedPages, file.name, chunkSize, overlap);
        allChunks.push(...chunks);
      }
      if (!allChunks.length) {
        throw new Error("Could not extract any text from the provided documents.");
      }
      setDocuments(allChunks);
      setProcessedDocumentsKey(documentConfigKey);
      setIndexedDocumentsKey(null);
      setStatusText(`Processed ${allChunks.length} text chunks from ${totalFiles} file${totalFiles > 1 ? "s" : ""}.`);
      return allChunks;
    } catch (err) {
      const message = getErrorMessage(err, "An unknown error occurred during processing.");
      logError(err, 'SemanticSearchPage.processFilesCore');
      setStatusText(message);
      return null;
    } finally {
      setProgress(0);
    }
  };

  const handleProcessFiles = async () => {
    if (isProcessing || isIndexingDocuments || isSearching) return;
    setIsProcessing(true);
    try { await processFilesCore(); }
    finally { setIsProcessing(false); }
  };

  const handleSearch = async () => {
    if (!query.trim() || isProcessing || isIndexingDocuments || isSearching) return;
    if (uploadedFiles.length === 0) {
      setStatusText("Please upload at least one file before searching.");
      return;
    }

    setProgress(0);
    setStatusText("");

    try {
      if (loadedModel !== selectedModel || getLoadedModelId() !== selectedModel) {
        setStatusText("Loading AI model for semantic search...");
        await handleLoadModel();
      }

      const activeModelId = getLoadedModelId();
      if (activeModelId !== selectedModel) {
        setStatusText("Please load the selected AI model before searching.");
        return;
      }

      let docs = documents;
      if (!docs || processedDocumentsKey !== documentConfigKey) {
        setIsProcessing(true);
        docs = await processFilesCore();
        setIsProcessing(false);
      }

      if (!docs || docs.length === 0) {
        setStatusText("Unable to prepare documents for search.");
        return;
      }

      const embeddingKey = createDocumentEmbeddingKey(docs, documentConfigKey, activeModelId);
      if (indexedDocumentsKey !== embeddingKey) {
        setIsIndexingDocuments(true);
        setProgress(0);
        setStatusText("Embedding document content with the AI model...");
        await precomputeChunkEmbeddings(docs, {
          onProgress: (p) => { setProgress(p); },
        });
        setIndexedDocumentsKey(embeddingKey);
        setIsIndexingDocuments(false);
        setProgress(0);
        setStatusText("");
      }

      setIsSearching(true);
      const res = await semanticSearch(query, docs);
      setResults(res);
      saveAiTaskState(STORAGE_KEY, fileSignature, {
        query,
        results: res,
        documents: docs,
        processedDocumentsKey: documentConfigKey,
        indexedDocumentsKey: embeddingKey,
      });
      setStatusText(res.length ? "" : "Search complete, but no matching chunks were found.");
    } catch (err) {
      const message = getErrorMessage(err, "An unknown error occurred during search.");
      logError(err, 'SemanticSearchPage.handleSearch');
      setStatusText(message);
    } finally {
      setIsSearching(false);
      setIsProcessing(false);
      setIsIndexingDocuments(false);
      setProgress(0);
    }
  };

  const handleCancelModelLoad = () => {
    cancelSearchModelLoad();
    setModelLoading(false);
    setModelLoadProgress(0);
    setModelStatusText('Model download cancelled.');
  };

  useEffect(() => {
    let cancelled = false;
    const cachedModel = (() => { try { return localStorage.getItem(MODEL_STORAGE_KEY); } catch { return null; } })();
    if (!cachedModel || getLoadedModelId() || modelLoading) return;
    const modelExists = MODELS.some((model) => model.id === cachedModel);
    if (!modelExists) return;
    setSelectedModel(cachedModel);
    setModelLoading(true);
    setModelStatusText('Restoring cached local AI model...');
    setModelLoadProgress(0);
    loadSearchModel(cachedModel, (progressEvent) => {
      if (cancelled) return;
      setModelStatusText(progressEvent.text);
      setModelLoadProgress(Math.round(progressEvent.progress ?? 0));
    }).then(() => {
      if (cancelled) return;
      setLoadedModel(cachedModel);
      const modelName = MODELS.find((m) => m.id === cachedModel)?.name || cachedModel;
      setModelStatusText(`Model ready: ${modelName} (cached locally)`);
      setModelLoadProgress(100);
    }).catch((error) => {
      if (cancelled) return;
      logError(error, 'SemanticSearchPage.autoLoadCachedModel');
      setModelStatusText('Cached model could not be restored. Click Load Model to try again.');
      try { localStorage.removeItem(MODEL_STORAGE_KEY); } catch { /* ignore */ }
    }).finally(() => {
      if (!cancelled) setModelLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleClear = () => { setQuery(""); setResults([]); clearAiTaskState(STORAGE_KEY); };
  const handleQueryKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isProcessing && !isIndexingDocuments && !isSearching && !modelLoading && query.trim() && uploadedFiles.length > 0) {
      e.preventDefault();
      void handleSearch();
    }
  };

  const filteredResults = useMemo(() => results.filter((r) => r.similarity >= minScore), [results, minScore]);
  const visibleResults = useMemo(() => filteredResults.slice(0, maxResultsToShow), [filteredResults, maxResultsToShow]);
  const bestScore = results.length > 0 ? results[0].similarity : null;
  const hasDownloadableResults = filteredResults.length > 0;
  const isBusy = isProcessing || isIndexingDocuments || isSearching;
  const shouldShowStatusPanel = uploadedFiles.length > 0 && ((isProcessing || isIndexingDocuments) || (Boolean(statusText) && results.length === 0 && !isSearching));
  const statusPanelText = statusText || (isIndexingDocuments ? "Embedding document content..." : isProcessing ? "Processing documents..." : "Ready");
  const shouldShowEmbeddingProgress = isIndexingDocuments;

  const handleDownloadResults = (format: "txt" | "md" | "json") => {
    if (!hasDownloadableResults) return;
    const now = new Date().toISOString();
    const safeQuery = query.trim().slice(0, 60).toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "results";
    let content = "";
    let mime = "text/plain;charset=utf-8";
    let extension = format;
    if (format === "json") {
      const payload = { query, generatedAt: now, results: filteredResults.map((r, idx) => ({ rank: idx + 1, id: r.id, source: r.id.split("#")[0] || "Document", pageNum: r.pageNum, similarity: r.similarity, text: r.text, })), };
      content = JSON.stringify(payload, null, 2);
      mime = "application/json;charset=utf-8";
      extension = "json";
    } else {
      const lines: string[] = [];
      if (format === "md") {
        lines.push("# Semantic search results", "", `**Query:** \`${query.trim()}\``, "", `_Generated at: ${now}_`, "");
      } else {
        lines.push("Semantic search results", `Query: ${query.trim()}`, `Generated at: ${now}`, "");
      }
      filteredResults.forEach((r, idx) => {
        const [source] = r.id.split("#");
        const heading = `${idx + 1}. ${source}${r.pageNum ? ` — page ${r.pageNum}` : ""}`;
        if (format === "md") {
          lines.push(`## ${heading}`, "", `- Similarity: \`${r.similarity.toFixed(3)}\``, `- Chunk ID: \`${r.id}\``, "", r.text, "");
        } else {
          lines.push(heading, `Similarity: ${r.similarity.toFixed(3)}`, `Chunk ID: ${r.id}`, "", r.text, "", "----", "");
        }
      });
      content = lines.join("\n");
      mime = "text/plain;charset=utf-8";
      extension = format === "md" ? "md" : "txt";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `semantic-search-${safeQuery}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const jsonLdWebPage = useMemo(() => JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: `Private AI PDF Search - Ask Questions in Your Browser | ${BRAND}`, url: PAGE_URL, description: "Ask questions and find information in your PDF documents using AI. Document processing happens in your browser. AI/OCR features may download model or runtime assets on first use." }), []);
  const jsonLdSoftwareApp = useMemo(() => JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Private AI PDF Search", applicationCategory: "UtilityApplication", operatingSystem: "Web", url: PAGE_URL, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, isAccessibleForFree: true, publisher: { "@type": "Organization", name: BRAND }, featureList: ["AI PDF search", "Chat with PDF", "Browser-side AI processing", "Ask questions to documents", "Private document analysis", "On-demand model assets", "In-browser AI model", "Semantic search"] }), []);
  const jsonLdFAQ = useMemo(() => JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "How is this different from other AI PDF tools?", acceptedAnswer: { "@type": "Answer", text: "The key difference is privacy. The AI model runs in your browser and analyzes the PDF directly on your device. Load the model once, then disconnect and keep searching offline." } }, { "@type": "Question", name: "Is my data secure?", acceptedAnswer: { "@type": "Answer", text: "PDF content, text extraction, OCR, and AI analysis all run in your browser. Your document stays on your device, and once the required assets are loaded you can work offline." } }, { "@type": "Question", name: "Why can the first search take a while?", acceptedAnswer: { "@type": "Answer", text: "The first time you search, the tool reads the document, performs OCR if needed, and creates 'embeddings' (numerical representations of meaning) for each text chunk. This is computationally intensive but is cached for subsequent searches on the same document, which will be much faster." } }, { "@type": "Question", name: "What about scanned documents or images in PDFs?", acceptedAnswer: { "@type": "Answer", text: "Our tool automatically detects scanned pages and uses Optical Character Recognition (OCR) to extract text before searching. This allows you to find information even in scanned documents." } }] }), []);

  return (
    <div className="space-y-6">
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Search PDFs with an AI model that runs in your browser. Your files stay on your device, and after the model and OCR assets are loaded you can work offline." />
        <link rel="canonical" href={PAGE_URL} />
        
        {/* SEO: Standardized title */}
        <title>Private AI PDF Search - Ask Questions to Your Documents Offline | PDFClear</title>
        
        {/* Open Graph */}
        <meta property="og:title" content={`Private AI PDF Search - Ask Questions Offline | ${BRAND}`} />
        <meta property="og:description" content="Find information in your PDFs by asking natural language questions. Secure, private, and powered by an AI model that runs entirely in your browser." />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Private AI PDF Search - Ask Questions Offline | ${BRAND}`} />
        <meta name="twitter:description" content="Find information in your PDFs by asking natural language questions. Secure, private, and powered by an AI model that runs entirely in your browser." />
        {/* Keywords */}
        <meta name="keywords" content="ai pdf search, private ai pdf, browser-side ai, chat with pdf, ask questions to pdf, local ai search, semantic search, document search, self-hosted pdf tools" />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      <header className="mb-6 text-center">
        <h1 className="mb-2 bg-gradient-to-r from-indigo-700 via-sky-600 to-fuchsia-600 bg-clip-text text-3xl font-extrabold text-transparent dark:from-indigo-300 dark:via-sky-300 dark:to-fuchsia-300">
          AI PDF Search
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-3xl mx-auto">
          Ask natural-language questions, find related passages, and review results without sending your document to a server.
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
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 font-semibold text-sky-800 shadow-sm dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                <LockClosedIcon className="h-5 w-5" />
                <span>Completely Private</span>
            </div>
        </div>
      </header>
      
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/80 px-4 py-4 text-left shadow-sm dark:border-indigo-900/70 dark:from-indigo-950/35 dark:via-dark-card dark:to-sky-950/25">
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Download the required model assets, then search your PDF in the browser.</h2>
        <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">Choose and load the AI model before selecting a document. Once the model and OCR assets are loaded, you can disconnect and search PDFs offline while your files stay on your device.</p>
      </section>

      <section className="space-y-4">
        <div className="p-4 feature-card text-left">
          <h2 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">1. Choose &amp; Load an AI Model</h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">Models run entirely in your browser. Heavier models give better quality but take longer to download and use more memory.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
            <label className="block">
              <span className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Embedding model</span>
              <select value={selectedModel} disabled={modelLoading || isBusy} onChange={(e) => setSelectedModel(e.target.value)} className="input-style w-full">
                {MODELS.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
              </select>
            </label>
            <button type="button" onClick={handleLoadModel} disabled={modelLoading || loadedModel === selectedModel} className="btn-primary flex h-[42px] w-full items-center justify-center md:w-auto">
              {modelLoading ? <Spinner /> : (loadedModel === selectedModel ? "Loaded" : "Load Model")}
            </button>
            {modelLoading && (<button type="button" onClick={handleCancelModelLoad} className="btn-secondary h-[42px] w-full md:w-auto">Cancel download</button>)}
          </div>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">{modelStatusText}</p>
          {modelLoading && (<div className="mt-3"><div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden"><div className="progress-gradient h-2 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${modelLoadProgress}%` }} /></div></div>)}
        </div>
      </section>

      <FileUpload />
      {largeFileWarning && (<div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{largeFileWarning}</div>)}
      <div className="rounded-lg border border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card px-4 py-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">{runtimeMessage}</div>

      {uploadedFiles.length > 0 && (
        <section className="space-y-4">
          <div className="p-4 feature-card text-left">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-semibold text-text-light-primary dark:text-text-dark-primary">2. Process documents</h2>
                <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Extract text, run OCR when needed, and create searchable chunks. This is optional because Search will run it automatically.
                </p>
              </div>
              <span className="inline-flex w-fit shrink-0 rounded-full border border-border-light dark:border-border-dark px-3 py-1 text-[11px] font-semibold text-text-light-secondary dark:text-text-dark-secondary">
                Extract text &amp; create chunks
              </span>
            </div>

            <details className="mt-4 overflow-hidden rounded-lg border border-border-light dark:border-border-dark bg-light-body dark:bg-dark-body" open>
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Advanced chunking options
              </summary>
              <div className="grid grid-cols-1 gap-3 border-t border-border-light dark:border-border-dark p-3 md:grid-cols-3">
                <div className="rounded-md border border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="chunk-size" className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">Chunk size</label>
                    <span className="shrink-0 text-xs font-mono text-text-light-secondary dark:text-text-dark-secondary">{chunkSize} words</span>
                  </div>
                  <input id="chunk-size" type="range" min={80} max={450} step={10} value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} className="mt-3 w-full accent-brand-500" disabled={isBusy} />
                  <p className="mt-2 min-h-[32px] text-xs text-text-light-secondary dark:text-text-dark-secondary">Larger chunks capture more context but use more memory.</p>
                </div>
                <div className="rounded-md border border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="overlap" className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">Overlap</label>
                    <span className="shrink-0 text-xs font-mono text-text-light-secondary dark:text-text-dark-secondary">{overlap} words</span>
                  </div>
                  <input id="overlap" type="range" min={0} max={chunkSize > 10 ? chunkSize - 10 : 0} step={5} value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} className="mt-3 w-full accent-brand-500" disabled={isBusy} />
                  <p className="mt-2 min-h-[32px] text-xs text-text-light-secondary dark:text-text-dark-secondary">Overlap helps connect ideas across chunk boundaries.</p>
                </div>
                <div className="rounded-md border border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card p-3">
                  <label htmlFor="ocr-lang-select" className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">OCR language</label>
                  <select id="ocr-lang-select" value={ocrLang} onChange={(e) => setOcrLang(e.target.value)} disabled={isBusy} className="input-style mt-3 h-[42px] w-full">
                    {languageOptions.map((opt) => (<option key={opt.code} value={opt.code}>{opt.label}</option>))}
                  </select>
                  <p className="mt-2 min-h-[32px] text-xs text-text-light-secondary dark:text-text-dark-secondary">Improves OCR accuracy for scanned pages.</p>
                </div>
              </div>
            </details>

            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border-light dark:border-border-dark bg-light-body dark:bg-dark-body px-3 py-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                <span className="font-semibold">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} uploaded</span>
                {documents && (<> <span aria-hidden="true">•</span> <span className="font-semibold">{documents.length} chunk{documents.length !== 1 ? "s" : ""} ready</span></>)}
              </p>
              <button type="button" onClick={handleProcessFiles} disabled={isBusy} className="btn-primary flex h-[42px] min-w-[176px] items-center justify-center self-stretch md:self-auto">
                {isProcessing ? <Spinner /> : documents ? "Re-process documents" : "Process documents"}
              </button>
            </div>
          </div>

          <div className="p-4 feature-card text-left">
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold text-text-light-primary dark:text-text-dark-primary">3. Search your documents</h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Ask a natural-language question. The model and document processing run automatically when needed.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleQueryKeyDown} placeholder="Ask a question (e.g. “What are the main findings?”)…" className="input-style h-[42px] w-full" disabled={isBusy || uploadedFiles.length === 0} />
                <p className="mt-2 min-h-[18px] text-[11px] text-text-light-secondary dark:text-text-dark-secondary">
                  Press Enter or click <span className="font-semibold">Search</span>.
                </p>
              </div>
              <button type="button" onClick={handleSearch} disabled={isBusy || modelLoading || !query.trim() || uploadedFiles.length === 0} className="btn-primary flex h-[42px] w-full items-center justify-center md:w-[112px]">
                {isSearching ? <Spinner /> : "Search"}
              </button>
            </div>
          </div>

          <section className="h-[92px] overflow-hidden rounded-lg border border-border-light dark:border-border-dark bg-light-card dark:bg-dark-card p-3" aria-live="polite" aria-busy={isProcessing || isIndexingDocuments}>
            <div className={shouldShowStatusPanel ? "opacity-100" : "pointer-events-none opacity-0"} aria-hidden={!shouldShowStatusPanel}>
              <p className="truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary" title={statusPanelText}>{statusPanelText}</p>
              <div className={`mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200 transition-opacity dark:bg-gray-700 ${shouldShowEmbeddingProgress ? "opacity-100" : "opacity-0"}`}>
                <div className="h-3 rounded-full progress-gradient transition-all duration-300 ease-in-out" style={{ width: `${shouldShowEmbeddingProgress ? progress : 0}%` }} />
              </div>
              <p className="mt-2 min-h-[18px] truncate text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {isIndexingDocuments ? "Embedding file content. This is cached and reused for later searches." : isProcessing ? "Reading files and preparing chunks." : ""}
              </p>
            </div>
          </section>
        </section>
      )}

      {results.length > 0 && (
        <section className={`mt-6 space-y-4 ${isBusy ? "opacity-75" : ""}`} aria-busy={isBusy}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center"><h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">Results</h2>
                <div className="flex min-h-[32px] flex-wrap items-center gap-3 text-xs md:justify-end md:text-sm">
                    <span className="inline-flex items-center gap-1 rounded-full bg-light-card dark:bg-dark-card px-3 py-1 border border-border-light dark:border-border-dark"><span className="font-semibold">{visibleResults.length}/{filteredResults.length}</span><span className="text-text-light-secondary dark:text-text-dark-secondary">chunks shown</span></span>
                    <span className="text-text-light-secondary dark:text-text-dark-secondary">from {results.length} total chunks</span>
                    <div className="flex items-center gap-1"><span className="hidden sm:inline text-text-light-secondary dark:text-text-dark-secondary">Download:</span>
                        <button type="button" onClick={() => handleDownloadResults("txt")} disabled={!hasDownloadableResults} className="px-2 py-1 rounded-full border border-border-light dark:border-border-dark text-[11px] font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-light-card dark:hover:bg-dark-card disabled:opacity-50 disabled:cursor-not-allowed">TXT</button>
                        <button type="button" onClick={() => handleDownloadResults("md")} disabled={!hasDownloadableResults} className="px-2 py-1 rounded-full border border-border-light dark:border-border-dark text-[11px] font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-light-card dark:hover:bg-dark-card disabled:opacity-50 disabled:cursor-not-allowed">MD</button>
                        <button type="button" onClick={() => handleDownloadResults("json")} disabled={!hasDownloadableResults} className="px-2 py-1 rounded-full border border-border-light dark:border-border-dark text-[11px] font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-light-card dark:hover:bg-dark-card disabled:opacity-50 disabled:cursor-not-allowed">JSON</button>
                    </div>
                    <button type="button" onClick={handleClear} className="text-xs md:text-sm font-semibold text-brand-600 hover:underline">Clear search</button>
                </div>
            </div>
            <div className="p-3 rounded-lg bg-light-card dark:bg-dark-card border border-border-light dark:border-border-dark space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div><label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Minimum similarity</label><input type="range" min={0} max={0.9} step={0.05} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full accent-brand-500" /><p className="text-[11px] text-text-light-secondary dark:text-text-dark-secondary mt-1">Hide weaker matches. Current: <span className="font-mono">{minScore.toFixed(2)}</span></p></div>
                    <div><label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Max results to display</label><input type="range" min={5} max={100} step={5} value={maxResultsToShow} onChange={(e) => setMaxResultsToShow(Number(e.target.value))} className="w-full accent-brand-500" /><p className="text-[11px] text-text-light-secondary dark:text-text-dark-secondary mt-1">Limits how many cards are rendered. Current: <span className="font-mono">{maxResultsToShow}</span></p></div>
                    {typeof bestScore === "number" && (<div className="text-xs md:text-sm text-text-light-secondary dark:text-text-dark-secondary md:text-right">Best match score: <span className="font-mono font-semibold">{bestScore.toFixed(3)}</span></div>)}
                </div>
            </div>
            <div className="space-y-3">{visibleResults.map((r) => { const prev = documents && r.index > 0 ? documents[r.index - 1] : undefined; const next = documents && r.index < (documents?.length ?? 0) - 1 ? documents[r.index + 1] : undefined; const [source] = r.id.split("#"); const sourceFile = uploadedFiles.find((f: any) => f.file.name === source); const canShowInPage = !!sourceFile && sourceFile.file.type === "application/pdf" && r.pageNum > 0; return (<ResultCard key={r.id} result={r} query={query} previousChunk={prev} nextChunk={next} canShowInPage={canShowInPage} onShowInPage={setPreviewResult} overlapWords={overlap} />); })}</div>
        </section>
      )}

      {results.length === 0 && !isProcessing && !isIndexingDocuments && !isSearching && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions</h2>
          <details className="faq-details"><summary className="faq-summary">How is this different from other AI PDF tools?</summary><p className="faq-answer">The key difference is <strong>privacy</strong>. Most AI tools upload your PDF to a server for analysis. We don&apos;t. Our AI model downloads to your browser and processes your files locally on your machine. Your document content stays in your browser during analysis.</p></details>
          <details className="faq-details"><summary className="faq-summary">Is my data secure and private?</summary><p className="faq-answer">Yes, absolutely. The entire process—from reading your PDFs and running OCR on scans to executing the AI model—happens locally in your web browser. Your files and search queries are processed in your browser.</p></details>
          <details className="faq-details"><summary className="faq-summary">Why does it take a while to process documents?</summary><p className="faq-answer">The initial processing step reads the entire document, performs Optical Character Recognition (OCR) on any scanned pages, and breaks the text into manageable chunks. This can be computationally intensive, especially for large or scanned documents, but it only needs to be done once per session for much faster searching afterwards.</p></details>
          <details className="faq-details"><summary className="faq-summary">What about scanned documents or images in PDFs?</summary><p className="faq-answer">Our tool automatically detects pages with little or no text and uses Optical Character Recognition (OCR) to extract text from these pages before searching. This allows you to find information even in scanned documents.</p></details>
        </section>
      )}

      {previewResult && (<PdfPagePreviewModal result={previewResult} fileUrl={fileUrlMap[previewResult.id.split("#")[0]]} onClose={() => setPreviewResult(null)} />)}
    </div>
  );
};

export default SemanticSearchPage;
