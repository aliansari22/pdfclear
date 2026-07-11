import Tesseract from 'tesseract.js';

const readyLanguages = new Set<string>();
const inFlight = new Map<string, Promise<void>>();

export function isOcrLanguageReady(lang: string): boolean {
  return readyLanguages.has(lang);
}

export async function preloadOcrLanguage(
  lang: string,
  onProgress?: (progress: { status: string; progress: number }) => void
): Promise<void> {
  if (readyLanguages.has(lang)) return;
  const existing = inFlight.get(lang);
  if (existing) return existing;

  const promise = (async () => {
    let worker: any = null;
    try {
      onProgress?.({ status: 'loading OCR runtime', progress: 5 });
      worker = await Tesseract.createWorker(lang, 1 as any, {
        logger: (message: any) => {
          const status = message?.status || 'loading OCR data';
          const progress = typeof message?.progress === 'number' ? Math.round(message.progress * 100) : 0;
          onProgress?.({ status, progress });
        },
      } as any);
      onProgress?.({ status: 'OCR data ready', progress: 100 });
      readyLanguages.add(lang);
    } finally {
      if (worker) await worker.terminate();
      inFlight.delete(lang);
    }
  })();

  inFlight.set(lang, promise);
  return promise;
}
