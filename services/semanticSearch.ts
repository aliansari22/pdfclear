import { pipeline } from "@huggingface/transformers";
import { get, set } from "idb-keyval";
import { aggregateModelProgress, AggregatedProgressData, detectModelDevice, getSafeAiDevicePreference } from '../utils/modelRuntime';
import { logError } from '../utils/logger';
import { configureTransformersEnv } from '../utils/transformersEnv';

configureTransformersEnv();

export interface ProgressData extends AggregatedProgressData {}

let currentModelId: string | null = null;
let embedder: any = null;
let loadRequestId = 0;
const mem = new Map<string, number[]>();

function isNomicEmbedModel(modelId: string | null): boolean {
  return !!modelId && modelId.includes("nomic-embed-text-v1");
}

function prepareModelInput(textId: string, text: string): string {
  if (!isNomicEmbedModel(currentModelId)) return text;
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("search_document:") ||
    lower.startsWith("search_query:") ||
    lower.startsWith("clustering:") ||
    lower.startsWith("classification:")
  ) return trimmed;
  const isQuery = textId.startsWith("q:");
  return `${isQuery ? "search_query: " : "search_document: "}${trimmed}`;
}

export function cancelSearchModelLoad(): void {
  loadRequestId += 1;
}

export async function loadSearchModel(
  modelId: string,
  onProgress?: (data: ProgressData) => void
): Promise<void> {
  if (currentModelId !== modelId) {
    mem.clear();
  } else if (embedder) {
    onProgress?.({ status: 'ready', progress: 100, text: 'Model ready (WASM)', device: 'wasm' });
    return;
  }

  const requestId = ++loadRequestId;
  const detectedRuntime = detectModelDevice();
  const devices = getSafeAiDevicePreference();
  let lastError: unknown = null;

  for (const device of devices) {
    const fileProgressMap = new Map<string, { loaded: number; total: number }>();
    try {
      onProgress?.({
        status: 'progress',
        progress: 0,
        text: detectedRuntime.device === 'webgpu'
          ? 'Using WebAssembly for AI Search because this embedding model is unstable on WebGPU in some Windows/browser combinations.'
          : 'WebGPU is unavailable. Initializing AI Search model with WebAssembly fallback...',
        device,
      });

      embedder = await pipeline("feature-extraction", modelId, {
        dtype: 'q8',
        device,
        progress_callback: (data: any) => {
          if (!onProgress || !data || !['initiate', 'progress', 'done'].includes(data.status)) return;
          if (requestId !== loadRequestId) {
            throw new Error('Model download cancelled.');
          }
          onProgress(aggregateModelProgress(fileProgressMap, data, device));
        },
      });

      if (requestId !== loadRequestId) {
        embedder = null;
        throw new Error('Model download cancelled.');
      }

      currentModelId = modelId;
      onProgress?.({ status: 'ready', progress: 100, text: `Model ready (${device.toUpperCase()})`, device });
      return;
    } catch (error) {
      lastError = error;
      if (requestId !== loadRequestId) {
        throw error;
      }
      logError(error, 'SemanticSearch.loadModel', { modelId, device });
      embedder = null;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to load AI Search model.');
}

export function getLoadedModelId(): string | null {
  return currentModelId;
}

async function embed(textId: string, text: string): Promise<number[]> {
  if (!currentModelId || !embedder) {
    throw new Error("Model not loaded. Please load a model before searching.");
  }

  const cacheKey = `${currentModelId}::${textId}`;
  const cached = mem.get(cacheKey);
  if (cached) return cached;

  const stored = await get(cacheKey);
  if (stored) {
    const vec = stored as number[];
    mem.set(cacheKey, vec);
    return vec;
  }

  const modelInput = prepareModelInput(textId, text);
  const out = await embedder(modelInput, { pooling: "mean", normalize: true });
  const vec = Array.from(out.data as Float32Array);
  mem.set(cacheKey, vec);
  set(cacheKey, vec).catch(() => undefined);
  return vec;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export type DocChunk = {
  id: string;
  text: string;
  pageNum: number;
};

export interface SearchResult extends DocChunk {
  similarity: number;
  index: number;
}

export async function precomputeChunkEmbeddings(
  chunks: DocChunk[],
  opts: { batchSize?: number; onProgress?: (progress: number) => void } = {}
): Promise<void> {
  if (!embedder || !currentModelId) {
    throw new Error("Model not loaded. Please load a model before indexing.");
  }
  if (!chunks.length) return;

  const batchSize = Math.max(1, opts.batchSize ?? 8);
  const totalChunks = chunks.length;
  let processedChunks = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    for (const c of batch) {
      await embed(c.id, c.text);
      processedChunks += 1;
      opts.onProgress?.(Math.round((processedChunks / totalChunks) * 100));
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

export async function semanticSearch(
  query: string,
  chunks: DocChunk[],
  opts: { limit?: number; onProgress?: (progress: number) => void } = {}
): Promise<SearchResult[]> {
  if (!chunks.length) return [];

  const queryEmbedding = await embed(`q:${query}`, query);
  const scored: SearchResult[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embed(chunk.id, chunk.text);
    scored.push({ ...chunk, similarity: cosine(queryEmbedding, embedding), index: i });
    opts.onProgress?.(Math.round(((i + 1) / chunks.length) * 100));
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return typeof opts.limit === 'number' ? scored.slice(0, opts.limit) : scored;
}
