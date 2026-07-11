import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFileContext } from '../hooks/useFileContext';
import * as pdfService from '../services/pdf.service';
import FileUpload from '../components/FileUpload'; // Ensure FileUpload is imported
import { LockClosedIcon, KeyIcon, ShieldExclamationIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// === Page-specific Constants ===
const PAGE_URL = 'https://www.pdfclear.com/protect-pdf/';
const BRAND = 'PDFClear';

const ProtectPdfPage: React.FC = () => {
    const { uploadedFiles, processing, setProcessing, showMessage, showPostOperationSuccess, operationCompleted } = useFileContext();
    const pdfFile = uploadedFiles.find(f => f.file.type === 'application/pdf');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleProtect = async () => {
        if (!pdfFile) {
            showMessage('Please upload a PDF file first.', 'error');
            return;
        }
        if (!password) {
            showMessage('Password cannot be empty.', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showMessage('Passwords do not match.', 'error');
            return;
        }
        setProcessing(true);
        showMessage('Encrypting PDF...');
        try {
            const downloadResult = await pdfService.protectPdf(pdfFile, password);
            showPostOperationSuccess(downloadResult);
            showMessage('PDF protected successfully!', 'success');
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
        name: `Protect PDF - Add Password & Encrypt PDF Files | ${BRAND}`,
        url: PAGE_URL,
        description: 'Secure your PDF documents by adding a password. Encrypt files directly in your browser with PDFClear for free and private protection.'
    }), []);

    const jsonLdSoftwareApp = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'PDF Protector',
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Web',
        url: PAGE_URL,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isAccessibleForFree: true,
        publisher: { '@type': 'Organization', name: BRAND },
        featureList: [ 'Add password to PDF', 'Encrypt PDF files', 'PDF Encryption', 'Client-side PDF processing', 'Free to use', 'No software installation required', 'Secure and private' ]
    }), []);

    const jsonLdFAQ = useMemo(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'How do I add a password to my PDF?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your PDF, enter your desired password in the "Set a password" field, confirm it, and click "Protect PDF". Your document will be encrypted and downloaded.' } },
            { '@type': 'Question', name: 'Is it safe to protect my PDF with PDFClear?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, it is designed to be safe. All PDF protection operations are performed directly in your web browser. Your file is processed in your browser and is not uploaded to a PDFClear server.' } },
            { '@type': 'Question', name: 'What kind of encryption does this tool use?', acceptedAnswer: { '@type': 'Answer', text: 'Our tool uses standard PDF encryption (e.g., AES-256) to secure your document, making it password-protected and preventing unauthorized access. The exact encryption strength depends on the underlying PDF-LIB library.' } },
            { '@type': 'Question', name: 'Can I remove the password later?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, you can use our "Unlock PDF" tool. However, you will need to remember the password you set to unlock the document.' } }
        ]
    }), []);

    return (
        <div>
            <Helmet>
                {/* Core SEO */}
                <meta name="description" content="Secure your PDF files by adding a password. Encrypt your documents to prevent unauthorized access. Fast, free, and secure client-side protection." />
                <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
                <link rel="canonical" href={PAGE_URL} />

                {/* SEO: Standardized title */}
                <title>Protect PDF - Add Password & Encrypt PDF Files | PDFClear</title>
                
                {/* Open Graph */}
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={BRAND} />
                <meta property="og:title" content={`Protect PDF - Add Password & Encrypt PDF Files | ${BRAND}`} />
                <meta property="og:description" content="Secure your PDF files by adding a password. Encrypt your documents to prevent unauthorized access. Fast, free, and secure client-side protection." />
                <meta property="og:url" content={PAGE_URL} />
                {/* Twitter */}
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={`Protect PDF - Add Password & Encrypt PDF Files | ${BRAND}`} />
                <meta name="twitter:description" content="Secure your PDF files by adding a password. Encrypt your documents to prevent unauthorized access. Fast, free, and secure client-side protection." />
                {/* Keywords */}
                <meta name="keywords" content="protect PDF, password protect PDF, encrypt PDF, secure PDF, add password to PDF, pdf encryption, free PDF security, online PDF encryption, client-side PDF" />

                {/* JSON-LD */}
                <script type="application/ld+json">{jsonLdWebPage}</script>
                <script type="application/ld+json">{jsonLdSoftwareApp}</script>
                <script type="application/ld+json">{jsonLdFAQ}</script>
            </Helmet>

            {/* Enhanced Header / Value props */}
            <header className="mb-6">
                <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
                    Protect PDF with a Password
                </h1>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    Encrypt your PDF by setting a password so only authorized users can open it. Protection runs in your browser, and your PDF stays on your device.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <div className="inline-flex items-center gap-2">
                        <LockClosedIcon className="h-5 w-5 text-brand-500" />
                        <span>Add a Password</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <KeyIcon className="h-5 w-5 text-brand-500" />
                        <span>Strong Encryption</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <ShieldExclamationIcon className="h-5 w-5 text-brand-500" />
                        <span>Prevent Unauthorized Access</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
                        <span>Runs in your browser</span>
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
                        Enter and confirm a password to encrypt your PDF.
                    </p>
                    <div className="md:w-1/2 lg:w-1/3 space-y-4 p-4 feature-card text-center mx-auto">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-1 text-text-light-primary dark:text-text-dark-primary">Set a password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="input-style"
                                disabled={processing}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 text-text-light-primary dark:text-text-dark-primary">Confirm password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password"
                                className="input-style"
                                disabled={processing}
                            />
                        </div>
                        <button
                            onClick={handleProtect}
                            disabled={processing || !password || password !== confirmPassword}
                            className="btn-primary"
                        >
                            Protect PDF
                        </button>
                    </div>

                    {/* Feature Highlight Cards */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Client-Side Security</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Your document is encrypted directly in your browser, ensuring maximum privacy.
                            </p>
                        </div>
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Universal Access</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Protected PDFs can be opened with any standard PDF reader using your password.
                            </p>
                        </div>
                        <div className="feature-card">
                            <h3 className="font-semibold mb-1 text-text-light-primary dark:text-text-dark-primary">Easy to Use</h3>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Add a password in just a few clicks without complex settings.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* Frequently Asked Questions Section */}
            {!operationCompleted && (
                <section className="mt-10">
                    <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Frequently asked questions about Protecting PDFs</h2>

                    <details className="faq-details">
                        <summary className="faq-summary">How do I add a password to my PDF?</summary>
                        <p className="faq-answer">
                            First, upload the PDF document you wish to protect. Then, in the designated fields, type your desired password and confirm it by typing it again. Finally, click the "Protect PDF" button. Your encrypted PDF will be downloaded immediately.
                        </p>
                    </details>

                    <details className="faq-details">
                        <summary className="faq-summary">Is it safe to protect my PDF with PDFClear?</summary>
                        <p className="faq-answer">
                            Yes. PDF protection runs in your browser, and your PDF is not uploaded to a PDFClear server during the protection process.
                        </p>
                    </details>

                    <details className="faq-details">
                        <summary className="faq-summary">What kind of encryption does this tool use?</summary>
                        <p className="faq-answer">
                            Our tool utilizes robust standard PDF encryption methods (typically AES-256 bit encryption where supported by the underlying libraries) to secure your document. This level of encryption is widely accepted and provides strong protection against unauthorized access.
                        </p>
                    </details>

                    <details className="faq-details">
                        <summary className="faq-summary">Can I remove the password later?</summary>
                        <p className="faq-answer">
                            Yes, if you remember the password you set, you can easily remove it using our dedicated "Unlock PDF" tool. Simply upload the protected file, enter the correct password, and download the unlocked version.
                        </p>
                    </details>
                </section>
            )}
        </div>
    );
};

export default ProtectPdfPage;
