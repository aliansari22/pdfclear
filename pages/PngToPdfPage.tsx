import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useFileContext } from "../hooks/useFileContext";
import * as pdfService from "../services/pdf.service";
import FileUpload from "../components/FileUpload";
import ImagePdfLivePreview from "../components/ImagePdfLivePreview";
import ToolActionBar from "../components/ToolActionBar";
import {
  PhotoIcon,
  RectangleStackIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// === Page-specific Constants ===
const PAGE_URL = "https://www.pdfclear.com/png-to-pdf/";
const BRAND = "PDFClear";

const PngToPdfPage: React.FC = () => {
  const {
    uploadedFiles,
    processing,
    setProcessing,
    showMessage,
    showPostOperationSuccess,
    operationCompleted,
    setProgress,
  } = useFileContext();
  const [marginMm, setMarginMm] = useState(() => {
    if (typeof localStorage === "undefined") return 10;
    const saved = Number(localStorage.getItem("pdfclear-png-to-pdf-margin-mm"));
    return Number.isFinite(saved) ? Math.max(0, Math.min(50, saved)) : 10;
  });

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("pdfclear-png-to-pdf-margin-mm", String(marginMm));
    }
  }, [marginMm]);
  const convertibleFiles = useMemo(
    () => uploadedFiles.filter((f) => f.file.type === "image/png"),
    [uploadedFiles],
  );

  const handleConvert = async () => {
    if (convertibleFiles.length === 0) {
      showMessage("Please upload PNG images to convert.", "error");
      return;
    }
    setProgress(0);
    setProcessing(true, "Preparing images for PDF conversion...");
    showMessage("Converting images to PDF...", "info");
    try {
      const downloadResult = await pdfService.convertImagesToPdf(
        convertibleFiles,
        { marginMm },
        setProgress,
      );

      showMessage("Files converted to PDF successfully!", "success");
      showPostOperationSuccess(downloadResult);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      showMessage(`Error: ${message}`, "error");
    } finally {
      setProcessing(false);
    }
  };

  // --- JSON-LD Structured Data ---
  const jsonLdWebPage = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `PNG to PDF Converter - Combine PNGs into PDF | ${BRAND}`,
        url: PAGE_URL,
        description:
          "Convert PNG images to PDF documents with custom margins and a live page preview. Combine multiple PNGs securely in your browser. No PDFClear server upload, browser-based.",
      }),
    [],
  );

  const jsonLdSoftwareApp = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PNG to PDF Converter",
        applicationCategory: "UtilityApplication",
        operatingSystem: "Web",
        url: PAGE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        isAccessibleForFree: true,
        publisher: { "@type": "Organization", name: BRAND },
        featureList: [
          "Convert PNG to PDF",
          "Combine multiple PNGs into one PDF",
          "Accepts ZIP file of images",
          "Client-side PDF processing",
          "Supports transparency",
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
            name: "How do I convert PNG to PDF?",
            acceptedAnswer: {
              "@type": "Answer",
              text: 'Upload one or more PNG images, or a ZIP file containing them. Once uploaded, click the "Convert to PDF" button to combine them into a single PDF document.',
            },
          },
          {
            "@type": "Question",
            name: "Can I upload a ZIP file with my PNGs?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. You can upload a ZIP archive containing your PNG files. The tool will automatically extract them and prepare them for conversion into a single PDF.",
            },
          },
          {
            "@type": "Question",
            name: "Is it safe to convert PNG to PDF online with PDFClear?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, it is designed to be safe. PNG-to-PDF conversion runs directly in your browser. Your files are processed in your browser and are not uploaded to a PDFClear server.",
            },
          },
          {
            "@type": "Question",
            name: "Will converting PNGs affect their quality or transparency?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Our PNG to PDF converter is designed to preserve the original quality of your images and their transparency. The output PDF will retain the resolution, colors, and transparent backgrounds of your PNG files.",
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
          content="Convert PNG images to high-quality PDF files with custom margins and a live single-page preview. Merge multiple PNGs privately with PDFClear. No PDFClear server upload, browser-based."
        />
        <meta
          name="robots"
          content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
        />
        <link rel="canonical" href={PAGE_URL} />

        {/* SEO: Standardized title */}
        <title>PNG to PDF Converter - Combine PNGs into PDF | PDFClear</title>

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta
          property="og:title"
          content={`PNG to PDF Converter - Combine PNGs into PDF | ${BRAND}`}
        />
        <meta
          property="og:description"
          content="Convert PNG images to high-quality PDF files. Merge multiple PNGs or a ZIP file into one PDF privately and for free with PDFClear. browser-based."
        />
        <meta property="og:url" content={PAGE_URL} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:title"
          content={`PNG to PDF Converter - Combine PNGs into PDF | ${BRAND}`}
        />
        <meta
          name="twitter:description"
          content="Convert PNG images to high-quality PDF files. Merge multiple PNGs or a ZIP file into one PDF privately and for free with PDFClear. browser-based."
        />
        {/* Keywords */}
        <meta
          name="keywords"
          content="PNG to PDF, convert PNG to PDF, image to PDF, custom PDF margin, live PDF preview, png with transparency to pdf, combine pngs to pdf, free PNG to PDF, secure PNG to PDF, client-side PDF, zip to pdf"
        />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdWebPage}</script>
        <script type="application/ld+json">{jsonLdSoftwareApp}</script>
        <script type="application/ld+json">{jsonLdFAQ}</script>
      </Helmet>

      {/* Enhanced Header / Value props */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          PNG to PDF Converter - Free & Secure
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Convert one or multiple PNG images into a high-quality PDF document
          with custom margins and a live page preview, while preserving
          transparency. You can also upload a ZIP file containing your images.
          Image conversion runs in your browser, so your files stay on your device.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <div className="inline-flex items-center gap-2">
            <PhotoIcon className="h-5 w-5 text-brand-500" />
            <span>Image to PDF</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <RectangleStackIcon className="h-5 w-5 text-brand-500" />
            <span>Combine Multiple PNGs</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-brand-500" />
            <span>Preserves Transparency</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
            <span>Private & Secure</span>
          </div>
        </div>
      </header>

      {/* Action and upload area */}
      {!operationCompleted && (
        <>
          <ToolActionBar title="Convert images and download your PDF">
            <button
              onClick={handleConvert}
              disabled={processing || convertibleFiles.length === 0}
              className="btn-primary w-full"
            >
              Download PDF
            </button>
          </ToolActionBar>

          <div className="mt-6">
            <FileUpload showProcessingStatus={false} />
          </div>
        </>
      )}

      {/* Main Tool Content */}
      {!operationCompleted && (
        <>
          <div className="feature-card text-left space-y-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                Margin and preview
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Set the PDF page margin before conversion. The live preview
                shows one output page at a time and lets you navigate through
                uploaded images.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                Margin size: {marginMm} mm
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={marginMm}
                  onChange={(event) => setMarginMm(Number(event.target.value))}
                  className="mt-2 w-full accent-brand-500"
                  disabled={processing}
                />
              </label>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                Exact margin (mm)
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={marginMm}
                  onChange={(event) =>
                    setMarginMm(
                      Math.max(
                        0,
                        Math.min(50, Number(event.target.value) || 0),
                      ),
                    )
                  }
                  className="input-style mt-2 !w-32"
                  disabled={processing}
                />
              </label>
            </div>
          </div>

          <ImagePdfLivePreview files={convertibleFiles} marginMm={marginMm} />


          {/* Feature Highlight Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">
                Preserve Quality
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Your PNG images will be converted to PDF without any loss in
                visual quality.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">
                Transparency Support
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Maintain transparent backgrounds from your PNGs in the final PDF
                document.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">
                Client-Side Processing
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                All conversions happen locally in your browser for ultimate
                privacy.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Frequently Asked Questions Section */}
      {!operationCompleted && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">
            Frequently asked questions about PNG to PDF Conversion
          </h2>

          <details className="faq-details">
            <summary className="faq-summary">
              How do I convert PNG to PDF?
            </summary>
            <p className="faq-answer">
              Upload your PNG images using the drag-and-drop area or the "Select
              Files" button. You can select multiple images or a single ZIP
              file. Once your images are listed, click the "Convert to PDF"
              button to create a single PDF.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">
              Can I upload a ZIP file with my PNGs?
            </summary>
            <p className="faq-answer">
              Yes. You can upload a ZIP archive containing your PNG files. The
              tool will automatically extract them and prepare them for
              conversion into a single PDF.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">
              Is it safe to convert PNG to PDF online with PDFClear?
            </summary>
            <p className="faq-answer">
              Absolutely. PDFClear prioritizes your privacy. All PNG to PDF
              conversion operations are performed directly within your web
              browser. Your images are processed in your browser and are not uploaded to a PDFClear server, helping keep
              complete confidentiality and security.
            </p>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">
              Will converting PNGs affect their quality or transparency?
            </summary>
            <p className="faq-answer">
              Our PNG to PDF converter is specifically designed to preserve the
              high quality of your images, including any transparent
              backgrounds. The output PDF will accurately reflect your original
              PNG files.
            </p>
          </details>
        </section>
      )}
    </div>
  );
};

export default PngToPdfPage;
