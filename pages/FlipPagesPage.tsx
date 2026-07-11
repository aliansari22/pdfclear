import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  ArrowsRightLeftIcon,
  QueueListIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import FileUpload from "../components/FileUpload";
import PdfPageThumbnailGrid from "../components/PdfPageThumbnailGrid";
import ToolActionBar from "../components/ToolActionBar";
import { useFileContext } from "../hooks/useFileContext";
import * as pdfService from "../services/pdf.service";
import { getDocument } from "pdfjs-dist";

const PAGE_URL = "https://www.pdfclear.com/flip-pdf-pages/";
const BRAND = "PDFClear";

const FlipPagesPage: React.FC = () => {
  const {
    uploadedFiles,
    processing,
    setProcessing,
    showMessage,
    showPostOperationSuccess,
    operationCompleted,
    setProgress,
  } = useFileContext();
  const pdfFile = uploadedFiles.find((f) => f.file.type === "application/pdf");
  const [numPages, setNumPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [direction, setDirection] =
    useState<pdfService.FlipDirection>("horizontal");
  const [rangeInput, setRangeInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPageCount() {
      setSelectedPages(new Set());
      setNumPages(0);
      if (!pdfFile) return;
      try {
        const buffer = await pdfFile.file.arrayBuffer();
        const pdf = await getDocument({ data: buffer }).promise;
        if (!cancelled) setNumPages(pdf.numPages);
      } catch {
        if (!cancelled)
          showMessage(
            "Could not read this PDF. It may be corrupt or password-protected.",
            "error",
          );
      }
    }
    void loadPageCount();
    return () => {
      cancelled = true;
    };
  }, [pdfFile, showMessage]);

  const pagesToFlip = useMemo<number[]>(
    () =>
      Array.from(selectedPages)
        .map(Number)
        .sort((a: number, b: number) => a - b),
    [selectedPages],
  );

  const togglePage = (pageNumber: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      next.has(pageNumber) ? next.delete(pageNumber) : next.add(pageNumber);
      return next;
    });
  };

  const addRange = () => {
    if (!numPages) return;
    try {
      const pages = pdfService.parsePageRanges(rangeInput || "all", numPages);
      setSelectedPages((prev) => new Set([...prev, ...pages]));
      setRangeInput("");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Invalid page range.",
        "error",
      );
    }
  };

  const handleFlip = async () => {
    if (!pdfFile) return showMessage("Please upload a PDF first.", "error");
    if (!pagesToFlip.length)
      return showMessage("Select at least one page to flip.", "error");
    setProgress(0);
    setProcessing(true, "Flipping selected pages...");
    try {
      const result = await pdfService.flipPdfPages(
        pdfFile,
        pagesToFlip,
        direction,
        setProgress,
      );
      showMessage("PDF pages flipped successfully.", "success");
      showPostOperationSuccess(result);
    } catch (error) {
      showMessage(
        `Error: ${error instanceof Error ? error.message : "Could not flip pages."}`,
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  const jsonLdWebPage = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `Flip PDF Pages with Preview | ${BRAND}`,
        url: PAGE_URL,
        description:
          "Flip or mirror PDF pages horizontally or vertically with thumbnail preview. Private browser processing.",
      }),
    [],
  );
  const jsonLdSoftwareApp = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PDF Page Flip Tool",
        applicationCategory: "UtilityApplication",
        operatingSystem: "Web",
        url: PAGE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        isAccessibleForFree: true,
        publisher: { "@type": "Organization", name: BRAND },
        featureList: [
          "Flip PDF pages",
          "Mirror PDF pages horizontally",
          "Flip PDF vertically",
          "Thumbnail preview",
          "Private browser processing",
        ],
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Flip PDF Pages Online with Preview | PDFClear</title>
        <meta
          name="description"
          content="Flip or mirror PDF pages horizontally or vertically with page thumbnails. Private in-browser PDF tool with no PDFClear server upload."
        />
        <meta
          name="keywords"
          content="flip PDF pages, mirror PDF pages, flip PDF horizontally, flip PDF vertically, PDF thumbnail preview"
        />
        <link rel="canonical" href={PAGE_URL} />
        <meta
          property="og:title"
          content={`Flip PDF Pages with Preview | ${BRAND}`}
        />
        <meta
          property="og:description"
          content="Select pages visually and flip them horizontally or vertically before saving."
        />
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          Flip PDF Pages
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Mirror selected PDF pages horizontally or vertically. Use thumbnails
          to choose pages before saving the final file locally.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <span className="inline-flex items-center gap-2">
            <ArrowsRightLeftIcon className="h-5 w-5 text-brand-500" />{" "}
            Horizontal or vertical flip
          </span>
          <span className="inline-flex items-center gap-2">
            <QueueListIcon className="h-5 w-5 text-brand-500" /> Thumbnail
            preview
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-brand-500" /> Private &
            secure
          </span>
        </div>
      </header>

      {!operationCompleted && (
        <ToolActionBar title="Apply page flips and download your PDF">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={handleFlip}
            disabled={processing || !pagesToFlip.length}
          >
            Flip {pagesToFlip.length || ""} Page
            {pagesToFlip.length === 1 ? "" : "s"}
          </button>
        </ToolActionBar>
      )}

      {!operationCompleted && <FileUpload showProcessingStatus={false} />}

      {!operationCompleted && pdfFile && (
        <>
          <section className="feature-card text-left space-y-4">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              Flip settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
              <input
                className="input-style"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder={`Pages to flip, e.g. 1-3, ${numPages || 1}, all`}
                disabled={processing}
              />
              <select
                className="input-style md:!w-44"
                value={direction}
                onChange={(e) =>
                  setDirection(e.target.value as pdfService.FlipDirection)
                }
                disabled={processing}
              >
                <option value="horizontal">Horizontal mirror</option>
                <option value="vertical">Vertical flip</option>
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={addRange}
                disabled={processing || !numPages}
              >
                Select range
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setSelectedPages(
                    new Set(Array.from({ length: numPages }, (_, i) => i + 1)),
                  )
                }
                disabled={processing || !numPages}
              >
                Select all
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedPages(new Set())}
                disabled={processing || !pagesToFlip.length}
              >
                Clear selection
              </button>
            </div>
          </section>

          <PdfPageThumbnailGrid
            file={pdfFile.file}
            selectable
            selectedPages={selectedPages}
            onTogglePage={togglePage}
            actionLabel="Click thumbnails to select pages, or select a range above."
          />

        </>
      )}
    </div>
  );
};

export default FlipPagesPage;
