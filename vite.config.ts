// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      path: 'path-browserify',
      '@': path.resolve(__dirname, '.'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  server: {
    host: 'localhost',
    port: 4000,
    strictPort: true,
    hmr: false,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: [
      'pdfjs-dist/build/pdf',
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@huggingface/transformers')) {
              return 'vendor-huggingface-transformers';
            }
            if (id.includes('tesseract.js')) {
              return 'vendor-tesseract';
            }
            if (id.includes('html2pdf.js')) {
              return 'vendor-html2pdf';
            }
            if (id.includes('@jspawn/qpdf-wasm')) {
              return 'vendor-qpdf';
            }
            if (id.includes('pdf-lib')) {
              return 'vendor-pdflib';
            }
            if (id.includes('jspdf')) {
              return 'vendor-jspdf';
            }
            if (id.includes('marked')) {
              return 'vendor-marked';
            }
            return 'vendor';
          }
        },
      },
    },
  },
});
