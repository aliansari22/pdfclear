import { pipeline, SummarizationPipeline } from "@huggingface/transformers";
import type { PretrainedModelOptions, SummarizationOutput, SummarizationSingle } from "@huggingface/transformers";
import {
  aggregateModelProgress,
  AggregatedProgressData,
  detectModelDevice,
  getSafeSummarizerDevicePreference,
  isWebGpuSessionFailure,
  ModelDevice,
} from '../utils/modelRuntime';
import { logError } from '../utils/logger';
import { configureTransformersEnv } from '../utils/transformersEnv';

configureTransformersEnv();

const createPipeline = pipeline as (
  task: 'summarization',
  model?: string,
  options?: PretrainedModelOptions,
) => Promise<SummarizationPipeline>;

export interface ProgressData extends AggregatedProgressData {}

let currentModelId: string | null = null;
let currentDevice: ModelDevice | null = null;
let generator: SummarizationPipeline | null = null;
let loadRequestId = 0;

export function cancelSummarizerModelLoad(): void {
  loadRequestId += 1;
}

async function createSummarizerPipeline(
  modelId: string,
  device: ModelDevice,
  requestId: number,
  onProgress?: (data: ProgressData) => void,
): Promise<SummarizationPipeline> {
  const fileProgressMap = new Map<string, { loaded: number; total: number }>();

  return await createPipeline("summarization", modelId, {
    dtype: 'q8',
    device,
    progress_callback: (data: any) => {
      if (!onProgress || !data || !['initiate', 'progress', 'done'].includes(data.status)) return;
      if (requestId !== loadRequestId) {
        throw new Error('Model download cancelled.');
      }
      onProgress(aggregateModelProgress(fileProgressMap, data, device));
    },
  }) as SummarizationPipeline;
}

export async function loadSummarizerModel(
  modelId: string,
  onProgress?: (data: ProgressData) => void
): Promise<void> {
  if (currentModelId === modelId && generator) {
    onProgress?.({
      status: 'ready',
      progress: 100,
      text: `Model ready${currentDevice ? ` (${currentDevice.toUpperCase()})` : ''}`,
      device: currentDevice || detectModelDevice().device,
    });
    return;
  }

  const requestId = ++loadRequestId;
  const devices = getSafeSummarizerDevicePreference();
  let lastError: unknown = null;

  for (const device of devices) {
    try {
      const webGpuDetected = detectModelDevice().device === 'webgpu';
      onProgress?.({
        status: 'progress',
        progress: 0,
        text: device === 'webgpu'
          ? 'Initializing model with WebGPU acceleration...'
          : webGpuDetected
            ? 'Using WebAssembly for summarization because this ONNX summarization model is unstable on WebGPU in some Windows/browser combinations.'
            : 'WebGPU is unavailable. Initializing model with WebAssembly fallback...',
        device,
      });

      generator = await createSummarizerPipeline(modelId, device, requestId, onProgress);

      if (requestId !== loadRequestId) {
        generator = null;
        throw new Error('Model download cancelled.');
      }

      currentModelId = modelId;
      currentDevice = device;
      onProgress?.({
        status: 'ready',
        progress: 100,
        text: device === 'wasm' && webGpuDetected
          ? 'Model ready (WASM fallback). WebGPU was skipped for summarization to avoid known ONNX protobuf/session failures.'
          : `Model ready (${device.toUpperCase()})`,
        device,
      });
      return;
    } catch (error) {
      lastError = error;
      generator = null;

      if (requestId !== loadRequestId) {
        throw error;
      }

      if (device === 'webgpu' && devices.includes('wasm') && isWebGpuSessionFailure(error)) {
        logError(error, 'SummarizerService.loadModel.webgpuFallback', { modelId });
        onProgress?.({
          status: 'progress',
          progress: 0,
          text: 'WebGPU could not initialize this model. Retrying with WebAssembly...',
          device: 'wasm',
        });
        continue;
      }

      break;
    }
  }

  logError(lastError, 'SummarizerService.loadModel', { modelId });
  if (requestId === loadRequestId) {
    currentModelId = null;
    currentDevice = null;
    generator = null;
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to load summarization model.');
}

export function getLoadedSummarizerId(): string | null {
  return currentModelId;
}

export function getLoadedSummarizerDevice(): ModelDevice | null {
  return currentDevice;
}

export async function summarize(
  text: string,
  generationParams: {
    max_new_tokens: number;
    temperature: number;
  }
): Promise<string> {
  if (!generator) {
    throw new Error("Summarization model not loaded. Please load a model first.");
  }

  const result = await generator(text, generationParams as Parameters<SummarizationPipeline>[1]);
  const outputs = result as SummarizationOutput | SummarizationOutput[];
  const firstOutput = Array.isArray(outputs[0]) ? outputs[0][0] : outputs[0];

  if (isSummarizationSingle(firstOutput)) {
    return firstOutput.summary_text.trim();
  }

  return "";
}

function isSummarizationSingle(value: unknown): value is SummarizationSingle {
  return typeof value === 'object'
    && value !== null
    && 'summary_text' in value
    && typeof (value as { summary_text?: unknown }).summary_text === 'string';
}
