import { env } from '@huggingface/transformers';

let configured = false;

function readViteEnv(name: string): string | undefined {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[name];
}

function isEnabled(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Configures Transformers.js model resolution for the browser app.
 *
 * By default, the open-source package does not include large local model files.
 * Therefore local model lookup is disabled unless explicitly enabled. This avoids
 * Vite's SPA fallback returning index.html for missing /models/*.json files,
 * which otherwise appears as: Unexpected token '<', "<!DOCTYPE " is not valid JSON.
 */
export function configureTransformersEnv(): void {
  if (configured) return;

  env.allowRemoteModels = isEnabled(readViteEnv('VITE_TRANSFORMERS_REMOTE_MODELS'), true);
  env.allowLocalModels = isEnabled(readViteEnv('VITE_TRANSFORMERS_LOCAL_MODELS'), false);
  env.localModelPath = readViteEnv('VITE_TRANSFORMERS_LOCAL_MODEL_PATH') || '/models/';

  configured = true;
}
