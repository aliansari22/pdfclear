import "./index.css";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // <--- Changed to BrowserRouter
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { FileProvider } from './context/FileContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter> {/* <--- Changed to BrowserRouter */}
        <FileProvider>
          <App />
        </FileProvider>
      </BrowserRouter> {/* <--- Changed to BrowserRouter */}
    </HelmetProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('[PWA] Service worker registration failed', error);
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    }).catch(() => undefined);
  }
}
