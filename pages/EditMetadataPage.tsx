import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload';
import { MetadataOptions } from '../services/pdf.service'; // Import the type
import Spinner from '../components/Spinner';
import { TagIcon, PencilIcon, MagnifyingGlassIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/edit-pdf-metadata/';
const BRAND = 'PDFClear';

const EditMetadataPage: React.FC = () => {
    const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
    const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');

    const [metadata, setMetadata] = useState<MetadataOptions>({
        title: '',
        author: '',
        subject: '',
        keywords: [],
    });
    const [keywordsInput, setKeywordsInput] = useState('');
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

    // Effect to load existing metadata when a PDF is uploaded
    useEffect(() => {
        const loadMetadata = async () => {
            if (pdfFile) {
                setIsLoadingMetadata(true);
                try {
                    // Use the new service function to read metadata
                    const existingMetadata = await pdfService.readPdfMetadata(pdfFile);
                    setMetadata(existingMetadata);
                    setKeywordsInput(existingMetadata.keywords?.join(', ') || '');
                } catch (error) {
                    showMessage('Could not read existing metadata. File may be encrypted or corrupt.', 'error');
                    setMetadata({ title: '', author: '', subject: '', keywords: [] });
                    setKeywordsInput('');
                } finally {
                    setIsLoadingMetadata(false);
                }
            } else {
                setMetadata({ title: '', author: '', subject: '', keywords: [] });
                setKeywordsInput('');
            }
        };
        loadMetadata();
    }, [pdfFile, showMessage]);

    const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMetadata(prev => ({ ...prev, [name]: value }));
    };

    const handleKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setKeywordsInput(e.target.value);
    };

    const handleApply = async () => {
        if (!pdfFile) {
            showMessage('Please upload a PDF file first.', 'error');
            return;
        }

        setProcessing(true);
        showMessage('Applying new metadata...', 'info');
        
        try {
            const finalMetadata: MetadataOptions = {
                ...metadata,
                // Convert comma-separated string back to array for pdf-lib
                keywords: keywordsInput.split(',').map(k => k.trim()).filter(k => k),
            };

            // Call the new service function to edit metadata
            const downloadResult = await pdfService.editMetadata(pdfFile, finalMetadata);
            showMessage('Metadata updated successfully!', 'success');
            showPostOperationSuccess(downloadResult);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'An unknown error occurred.';
            showMessage(`Error: ${message}`, 'error');
        } finally {
            setProcessing(false);
        }
    };

    // --- JSON-LD Structured Data ---
    const jsonLdWebPage = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `Edit PDF Metadata - Change Title, Author & More | ${BRAND}`,
        url: PAGE_URL,
        description: 'Edit the metadata (Title, Author, Subject, Keywords) of your PDF documents quickly and privately. All changes are made securely in your browser.'
    }), []);

    const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'PDF Metadata Editor',
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Web',
        url: PAGE_URL,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isAccessibleForFree: true,
        publisher: { '@type': 'Organization', name: BRAND },
        featureList: [ 'Edit PDF Title', 'Edit PDF Author', 'Edit PDF Subject', 'Edit PDF Keywords', 'Update PDF Properties', 'Client-side PDF processing', 'Free to use', 'Secure and private' ]
    }), []);

    const jsonLdFAQ = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'How do I edit PDF metadata?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your PDF file. The tool will automatically load the existing Title, Author, Subject, and Keywords. Edit the fields as needed, then click "Apply Metadata" to download the updated PDF.' } },
            { '@type': 'Question', name: 'What metadata fields can I edit?', acceptedAnswer: { '@type': 'Answer', text: 'You can edit the document Title, Author (Creator), Subject, and Keywords.' } },
            { '@type': 'Question', name: 'Is it safe to edit PDF metadata online with PDFClear?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, it is designed to be safe. All metadata editing operations are performed directly in your web browser. Your PDF files are processed in your browser and are not uploaded to a PDFClear server.' } },
            { '@type': 'Question', name: 'What are PDF keywords used for?', acceptedAnswer: { '@type': 'Answer', text: 'Keywords are used by search engines and document management systems to categorize and index your PDF file, making it easier to find and organize.' } }
        ]
    }), []);

    return (
        <div>
            <Helmet>
                {/* Core SEO */}
                <meta name="description" content="Edit the Title, Author, Subject, and Keywords of your PDF documents. Free, secure, and entirely browser-based metadata editor. No PDFClear server upload, browser-based." />
                <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
                <link rel="canonical" href={PAGE_URL} />

                {/* SEO: Standardized title */}
                <title>Edit PDF Metadata - Change Title, Author & More | PDFClear</title>
                
                {/* Open Graph */}
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={BRAND} />
                <meta property="og:title" content={`Edit PDF Metadata - Change Title, Author & More | ${BRAND}`} />
                <meta property="og:description" content="Edit the Title, Author, Subject, and Keywords of your PDF documents. Free, secure, and entirely browser-based metadata editor." />
                <meta property="og:url" content={PAGE_URL} />
                {/* Twitter */}
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={`Edit PDF Metadata - Change Title, Author & More | ${BRAND}`} />
                <meta name="twitter:description" content="Edit the Title, Author, Subject, and Keywords of your PDF documents. Free, secure, and entirely browser-based metadata editor." />
                {/* Keywords */}
                <meta name="keywords" content="edit PDF metadata, change PDF title, PDF author, PDF keywords, update pdf properties, pdf properties editor, free PDF metadata editor, online PDF tool, secure PDF, client-side PDF" />

                {/* JSON-LD */}
                <script type="application/ld+json">{jsonLdWebPage}</script>
                <script type="application/ld+json">{jsonLdSoftwareApp}</script>
                <script type="application/ld+json">{jsonLdFAQ}</script>
            </Helmet>

            <header className="mb-6">
                <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
                    Edit PDF Metadata - Update Document Properties
                </h1>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    Update the Title, Author, Subject, and Keywords of your PDF document. This information helps with organization and searchability.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <div className="inline-flex items-center gap-2">
                        <PencilIcon className="h-5 w-5 text-brand-500" />
                        <span>Edit Title & Author</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <TagIcon className="h-5 w-5 text-brand-500" />
                        <span>Update Keywords</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <MagnifyingGlassIcon className="h-5 w-5 text-brand-500" />
                        <span>Improve Searchability</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                        <span>Private Processing</span>
                    </div>
                </div>
            </header>

            {!operationCompleted && <FileUpload />}

            {!operationCompleted && pdfFile && (
                <>
                    <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
                        {isLoadingMetadata ? (
                            <span className="inline-flex items-center gap-2"><Spinner /> Loading existing metadata...</span>
                        ) : (
                            'Modify the fields below and click "Apply Metadata".'
                        )}
                    </p>
                    
                    <div className="max-w-xl mx-auto space-y-4 p-6 feature-card text-left">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium mb-1 text-text-light-primary dark:text-text-dark-primary">Document Title</label>
                            <input
                                id="title"
                                type="text"
                                name="title"
                                value={metadata.title || ''}
                                onChange={handleMetadataChange}
                                placeholder="Enter document title"
                                className="input-style"
                                disabled={processing || isLoadingMetadata}
                            />
                        </div>
                        <div>
                            <label htmlFor="author" className="block text-sm font-medium mb-1 text-text-light-primary dark:text-text-dark-primary">Author / Creator</label>
                            <input
                                id="author"
                                type="text"
                                name="author"
                                value={metadata.author || ''}
                                onChange={handleMetadataChange}
                                placeholder="Enter author name"
                                className="input-style"
                                disabled={processing || isLoadingMetadata}
                            />
                        </div>
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium mb-1 text-text-light-primary dark:text-text-dark-primary">Subject</label>
                            <input
                                id="subject"
                                type="text"
                                name="subject"
                                value={metadata.subject || ''}
                                onChange={handleMetadataChange}
                                placeholder="Enter document subject"
                                className="input-style"
                                disabled={processing || isLoadingMetadata}
                            />
                        </div>
                        <div>
                            <label htmlFor="keywords" className="block text-sm font-medium mb-1 text-text-light-primary dark:text-text-dark-primary">Keywords (Comma separated)</label>
                            <input
                                id="keywords"
                                type="text"
                                value={keywordsInput}
                                onChange={handleKeywordsChange}
                                placeholder="e.g., report, finance, 2024"
                                className="input-style"
                                disabled={processing || isLoadingMetadata}
                            />
                        </div>
                        
                        <div className="pt-4 text-center">
                            <button
                                onClick={handleApply}
                                disabled={processing || isLoadingMetadata}
                                className="btn-primary"
                            >
                                Apply Metadata & Download Result
                            </button>
                        </div>
                    </div>

                    {/* Feature Highlight Cards */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Preserve Privacy</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                All editing is done locally in your browser, ensuring your document content remains private.
                            </p>
                        </div>
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">SEO Friendly</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Improve how search engines and internal systems index your PDF files.
                            </p>
                        </div>
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Auto-Load Existing</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Existing metadata is automatically loaded for easy modification.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* Frequently Asked Questions Section */}
            {!operationCompleted && (
                <section className="mt-10">
                    <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Editing PDF Metadata</h2>

                    <details className="faq-details">
                        <summary className="faq-summary">How do I edit PDF metadata?</summary>
                        <p className="faq-answer">
                            Upload your PDF file. The tool will automatically load the existing Title, Author, Subject, and Keywords. Edit the fields as needed, then click "Apply Metadata" to download the updated PDF.
                        </p>
                    </details>

                    <details className="faq-details">
                        <summary className="faq-summary">What metadata fields can I edit?</summary>
                        <p className="faq-answer">
                            You can edit the document Title, Author (Creator), Subject, and Keywords.
                        </p>
                    </details>

                    <details className="faq-details">
                        <summary className="faq-summary">Is it safe to edit PDF metadata online with PDFClear?</summary>
                        <p className="faq-answer">
                            Yes, it is designed to be safe. All metadata editing operations are performed directly in your web browser. Your PDF files are processed in your browser and are not uploaded to a PDFClear server.
                        </p>
                    </details>
                    
                    <details className="faq-details">
                        <summary className="faq-summary">What are PDF keywords used for?</summary>
                        <p className="faq-answer">
                            Keywords are used by search engines and document management systems to categorize and index your PDF file, making it easier to find and organize.
                        </p>
                    </details>
                </section>
            )}
        </div>
    );
};

export default EditMetadataPage;
