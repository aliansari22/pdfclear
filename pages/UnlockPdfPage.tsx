import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload'; // Ensure FileUpload is imported
import { LockOpenIcon, KeyIcon, DocumentArrowDownIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/unlock-pdf/';
const BRAND = 'PDFClear';

const UnlockPdfPage: React.FC = () => {
    const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
    const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');

    const [password, setPassword] = useState('');

    const handleUnlock = async () => {
        if (!pdfFile) {
            showMessage('Please upload a PDF file first.', 'error');
            return;
        }
        if (!password) {
            showMessage('Password is required to unlock the file.', 'error');
            return;
        }
        setProcessing(true);
        showMessage('Attempting to unlock PDF...');
        try {
            const downloadResult = await pdfService.unlockPdf(pdfFile, password);
            showPostOperationSuccess(downloadResult);
            showMessage('PDF unlocked successfully!', 'success');
        } catch (e) {
            let message: string;
            if (e instanceof Error) {
                // Check for specific error messages from pdf-lib and our worker
                if (e.message.toLowerCase().includes('password')) {
                    message = 'Incorrect password. Please try again.';
                } else {
                    // Display other specific errors from the worker (e.g., "This PDF is not encrypted.")
                    message = e.message;
                }
            } else {
                message = 'An unknown error occurred while unlocking the PDF.';
            }
            showMessage(message, 'error');
        } finally {
            setProcessing(false);
        }
    };
    
    // --- JSON-LD Structured Data ---
    const jsonLdWebPage = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `Unlock PDF - Free PDF Password Remover | ${BRAND}`,
        url: PAGE_URL,
        description: 'Remove the password from an encrypted PDF file directly in your browser. PDFClear offers a free and private tool to unlock your documents.'
    }), []);

    const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'PDF Unlocker',
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Web',
        url: PAGE_URL,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isAccessibleForFree: true,
        publisher: { '@type': 'Organization', name: BRAND },
        featureList: [ 'Remove PDF password', 'Unlock encrypted PDF files', 'Decrypt PDF', 'Client-side PDF processing', 'Free to use', 'No software installation required', 'Secure and private' ]
    }), []);

    const jsonLdFAQ = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'How do I remove a password from my PDF?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your password-protected PDF, enter the correct current password in the designated field, and click "Unlock PDF". Your unlocked document will be downloaded.' } },
            { '@type': 'Question', name: 'Is it safe to unlock my PDF with PDFClear?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, it is designed to be safe. PDF unlocking runs directly in your browser. Your file is processed in your browser and is not uploaded to a PDFClear server.' } },
            { '@type': 'Question', name: 'What if I forget the password?', acceptedAnswer: { '@type': 'Answer', text: 'Unfortunately, if you forget the password, there is no way for this tool (or any legitimate tool) to unlock your PDF. The encryption is designed to prevent access without the correct password.' } },
            { '@type': 'Question', name: 'Can this tool remove all types of PDF passwords?', acceptedAnswer: { '@type': 'Answer', text: 'This tool is designed to remove "owner" or "user" passwords that prevent opening or modifying the document. It requires you to provide the correct password. It may not work with highly complex or proprietary encryption methods.' } }
        ]
    }), []);

    return (
        <div>
            <Helmet>
                {/* Core SEO */}
                <meta name="description" content="Remove the password from an encrypted PDF file. You must know the current password to unlock the document. Fast, free, and private client-side processing." />
                <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
                <link rel="canonical" href={PAGE_URL} />

                {/* SEO: Standardized title */}
                <title>Unlock PDF - Remove Password from PDF Online | PDFClear</title>
                
                {/* Open Graph */}
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={BRAND} />
                <meta property="og:title" content={`Unlock PDF - Remove Password from PDF Online | ${BRAND}`} />
                <meta property="og:description" content="Remove the password from an encrypted PDF file. You must know the current password to unlock the document. Fast, free, and private client-side processing." />
                <meta property="og:url" content={PAGE_URL} />
                {/* Twitter */}
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={`Unlock PDF - Remove Password from PDF Online | ${BRAND}`} />
                <meta name="twitter:description" content="Remove the password from an encrypted PDF file. You must know the current password to unlock the document. Fast, free, and private client-side processing." />
                {/* Keywords */}
                <meta name="keywords" content="unlock PDF, remove PDF password, pdf password remover, decrypt PDF, open protected PDF, free PDF unlocker, online PDF tools, client-side PDF" />

                {/* JSON-LD */}
                <script type="application/ld+json">{jsonLdWebPage}</script>
                <script type="application/ld+json">{jsonLdSoftwareApp}</script>
                <script type="application/ld+json">{jsonLdFAQ}</script>
            </Helmet>

            {/* Enhanced Header / Value props */}
            <header className="mb-6">
                <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
                    Unlock PDF - Remove Passwords
                </h1>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    Easily remove password protection from a PDF using the correct current password. Unlocking runs in your browser, and your PDF stays on your device.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <div className="inline-flex items-center gap-2">
                        <LockOpenIcon className="h-5 w-5 text-brand-500" />
                        <span>Remove Password</span>
                    </div>
                  
                    <div className="inline-flex items-center gap-2">
                        <DocumentArrowDownIcon className="h-5 w-5 text-brand-500" />
                        <span>Instant Download</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                        <span>Private & Secure</span>
                    </div>
                </div>
            </header>

            {/* File Upload Component */}
            {!operationCompleted && (
                <div className="mt-6">
                    <FileUpload />
                </div>
            )}

            {!operationCompleted && pdfFile && (
                <>
                    <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
                        Enter the current password to unlock your PDF.
                    </p>
                    <div className="md:w-1/2 lg:w-1/3 space-y-4 p-4 feature-card text-center mx-auto">
                        <div className="md:col-span-1 space-y-4 p-4 feature-card text-left">
                            <div>
                                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Current Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="input-style"
                                    disabled={processing}
                                />
                            </div>
                            <button
                                onClick={handleUnlock}
                                disabled={processing || !password}
                                className="btn-primary"
                            >
                                Unlock PDF
                            </button>
                        </div>
                        <div className="md:col-span-2 text-center p-4 bg-light-body dark:bg-dark-body/50 rounded-lg">
                            <p className="text-text-light-secondary dark:text-text-dark-secondary">A preview cannot be shown for a password-protected file.</p>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-400 mx-auto mt-4" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm-2 5.5a2.5 2.5 0 115 0V9H8v-2.5z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    {/* Feature Highlight Cards */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Private & Secure</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Your PDF is processed locally in your browser, not uploaded to a PDFClear server.
                            </p>
                        </div>
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Maintain Original Quality</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                The unlocked PDF retains the original quality and formatting of your document.
                            </p>
                        </div>
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Simple & Fast</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Unlock your documents quickly with an intuitive user interface.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* Frequently Asked Questions Section */}
            {!operationCompleted && (
                <section className="mt-10">
                    <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Unlocking PDFs</h2>

                    <details className="faq-details">
                        <summary className="faq-summary">How do I remove a password from my PDF?</summary>
                        <p className="faq-answer">
                            Upload your password-protected PDF document. Then, in the provided field, enter the correct current password for the file. Click the "Unlock PDF" button, and your unlocked document will be downloaded instantly.
                        </p>
                    </details>

                    <details className="faq-details">
                        <summary className="faq-summary">Is it safe to unlock my PDF with PDFClear?</summary>
                        <p className="faq-answer">
                            Yes, absolutely. PDFClear prioritizes your privacy. PDF unlocking runs in your browser. Your file is not uploaded to a PDFClear server.
                        </p>
                    </details>

                    <details className="faq-details">
                        <summary className="faq-summary">What if I forget the password?</summary>
                        <p className="faq-answer">
                            If you have forgotten the password for your PDF, this tool cannot help you recover or remove it. For security reasons, a legitimate PDF unlocker requires the correct password to decrypt the document. There is no "backdoor" to bypass strong encryption.
                        </p>
                    </details>

                    <details className="faq-details">
                        <summary className="faq-summary">Can this tool remove all types of PDF passwords?</summary>
                        <p className="faq-answer">
                            This tool is designed to remove "user passwords" (passwords required to open the document) and "owner passwords" (passwords restricting editing, printing, etc.). As long as you provide the correct password, it will remove these standard protections. It may not be compatible with highly complex or non-standard encryption methods.
                        </p>
                    </details>
                </section>
            )}
        </div>
    );
};

export default UnlockPdfPage;
