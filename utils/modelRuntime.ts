import { formatBytes } from '../types';

export type ModelDevice = 'webgpu' | 'wasm';

export interface AggregatedProgressData {
  status: 'progress' | 'ready';
  progress: number;
  text: string;
  file?: string;
  loadedBytes?: number;
  totalBytes?: number;
  totalLabel?: string;
  device: ModelDevice;
  etaMs?: number;
  etaLabel?: string;
}

export interface RuntimeDetection {
  device: ModelDevice;
  supported: boolean;
  reason: string;
}

type FileProgressRecord = {
  loaded: number;
  total: number;
  startedAt: number;
  lastUpdatedAt: number;
  completed: boolean;
};

export function detectModelDevice(): RuntimeDetection {
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  if (hasWebGpu) {
    return { device: 'webgpu', supported: true, reason: 'WebGPU is available, but browser AI models are currently loaded with WebAssembly for stability on Windows/Chrome and compatible GPU drivers.' };
  }
  return {
    device: 'wasm',
    supported: false,
    reason: 'WebGPU is unavailable in this browser. Browser AI models will use WebAssembly; processing may be slower.',
  };
}

export function getModelDevicePreference(): ModelDevice[] {
  return detectModelDevice().device === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
}

export function getSafeAiDevicePreference(): ModelDevice[] {
  return ['wasm'];
}

export function getSafeSummarizerDevicePreference(): ModelDevice[] {
  return ['wasm'];
}

export function isWebGpuSessionFailure(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message} ${error.stack || ''}` : String(error || '');
  return /webgpu|requestAdapter|requestDevice|create a session|protobuf parsing failed|ERROR_CODE:\s*7|Failed to load model/i.test(message);
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'less than a second';
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Aggregates transformers.js progress callbacks across all model files.
 *
 * Several model files are downloaded in sequence and browsers may discover their
 * sizes at different times. Reporting each individual file makes the bar jump or
 * appear to restart. This tracker keeps the visible percentage monotonic and
 * reports a single estimated remaining time for the whole model download.
 */
export function aggregateModelProgress(
  fileProgressMap: Map<string, { loaded: number; total: number }>,
  data: any,
  device: ModelDevice,
): AggregatedProgressData {
  const now = Date.now();
  const fileName = data.file || data.name || 'model';
  const existing = fileProgressMap.get(fileName) as FileProgressRecord | undefined;
  const total = Math.max(Number(data.total ?? existing?.total ?? data.loaded ?? 0), 0);
  const loadedFromEvent = Number(data.loaded ?? (data.status === 'done' ? total : existing?.loaded ?? 0));
  const loaded = Math.max(0, Math.min(total || loadedFromEvent, loadedFromEvent));

  fileProgressMap.set(fileName, {
    loaded: data.status === 'done' && total > 0 ? total : loaded,
    total,
    startedAt: existing?.startedAt ?? now,
    lastUpdatedAt: now,
    completed: data.status === 'done',
  } as any);

  let totalLoaded = 0;
  let totalExpected = 0;
  let activeElapsedMs = 0;
  let activeLoadedBytes = 0;

  for (const value of fileProgressMap.values()) {
    const record = value as FileProgressRecord;
    const recordTotal = Math.max(record.total || record.loaded || 0, 0);
    totalLoaded += Math.max(0, Math.min(record.loaded || 0, recordTotal || record.loaded || 0));
    totalExpected += recordTotal;

    if (!record.completed && record.loaded > 0 && record.startedAt) {
      activeElapsedMs += Math.max(1, now - record.startedAt);
      activeLoadedBytes += record.loaded;
    }
  }

  const rawProgress = totalExpected > 0 ? Math.min(100, Math.round((totalLoaded / totalExpected) * 100)) : 0;
  const previousProgress = Number((fileProgressMap as any).__lastProgress ?? 0);
  // Individual model files can emit `done` before the next file is discovered.
  // Cap aggregated progress below 100 until the pipeline itself reports ready.
  const cappedRawProgress = data.status === 'ready' ? 100 : Math.min(99, rawProgress);
  const progress = Math.max(previousProgress, cappedRawProgress);
  (fileProgressMap as any).__lastProgress = progress;

  const totalLabel = totalExpected > 0 ? formatBytes(totalExpected) : undefined;
  const remainingBytes = Math.max(totalExpected - totalLoaded, 0);
  const bytesPerMs = activeLoadedBytes > 0 && activeElapsedMs > 0 ? activeLoadedBytes / activeElapsedMs : 0;
  const etaMs = bytesPerMs > 0 && remainingBytes > 0 ? remainingBytes / bytesPerMs : undefined;
  const etaLabel = etaMs ? formatDuration(etaMs) : undefined;

  let text = 'Downloading model files';
  if (totalLabel) text += ` (${totalLabel})`;
  if (etaLabel && progress < 100) text += ` — about ${etaLabel} remaining`;
  text += '...';

  if (data.status === 'done' && remainingBytes <= 0 && progress < 100) {
    text = `Finalizing cached model files${totalLabel ? ` (${totalLabel})` : ''}...`;
  }

  return {
    status: data.status === 'ready' || progress >= 100 ? 'ready' : 'progress',
    progress,
    text,
    file: fileName,
    loadedBytes: totalLoaded,
    totalBytes: totalExpected,
    totalLabel,
    device,
    etaMs,
    etaLabel,
  };
}
