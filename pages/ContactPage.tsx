import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';

const ContactPage: React.FC = () => {
  const jsonLdContactPage = useMemo(() => JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "url": "https://www.pdfclear.com/contact/",
    "name": "PDFClear - Contact Us",
    "description": "Get in touch with the PDFClear team for feedback, questions, or suggestions.",
    "mainEntity": {
        "@type": "Organization",
        "name": "PDFClear",
        "email": "support@pdfclear.com"
    }
  }), []);

  return (
    <>
      <Helmet>
        {/* Core SEO */}
        <meta name="description" content="Get in touch with the PDFClear team. We welcome your feedback, questions, and suggestions to improve our free PDF tools." />
        <link rel="canonical" href="https://www.pdfclear.com/contact/" />

        {/* SEO: Standardized title */}
        <title>PDFClear - Contact Us</title>
        
        {/* Open Graph */}
        <meta property="og:title" content="PDFClear - Contact Us" />
        <meta property="og:description" content="Get in touch with the PDFClear team. We welcome your feedback, questions, and suggestions to improve our free PDF tools." />
        <meta property="og:url" content="https://www.pdfclear.com/contact/" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="PDFClear - Contact Us" />
        <meta name="twitter:description" content="Get in touch with the PDFClear team. We welcome your feedback, questions, and suggestions to improve our free PDF tools." />

        {/* Keywords */}
        <meta name="keywords" content="contact pdfclear, pdfclear support, feedback, questions, suggestions" />

        {/* JSON-LD */}
        <script type="application/ld+json">{jsonLdContactPage}</script>
      </Helmet>
      <div className="prose dark:prose-invert max-w-none text-text-light-primary dark:text-text-dark-primary">
        <h1 className="text-3xl font-bold mb-4 text-brand-600 dark:text-brand-400">Contact Us</h1>
        
        <p>
          We're building this for you, so we'd love to know what you think. A suggestion, a question, a bug report – it’s all incredibly helpful.
        </p>

        <br></br>
        <p>
          The best way to reach us is right here:
        </p>
        <br></br>
        <p>
          <strong>Support Email:</strong>{' '}
          <a 
            href="mailto:support@pdfclear.com" 
            className="text-brand-600 hover:underline dark:text-brand-400"
          >
            support@pdfclear.com
          </a>
        </p>

        
      </div>
    </>
  );
};

export default ContactPage;
