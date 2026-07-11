import { logError } from './logger';

export interface WorkerRequest {
  type: string;
  payload?: any;
  transferables?: Transferable[];
}

export interface WorkerBridgeResult<T> {
  promise: Promise<T>;
  cancel: () => void;
}

export function createWorkerBridge(worker: Worker) {
  const pending = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    onProgress?: (progress: number) => void;
  }>();

  worker.onmessage = (event: MessageEvent) => {
    const { id, status, result, message, progress } = event.data || {};
    const entry = pending.get(id);
    if (!entry) return;

    if (status === 'success') {
      entry.resolve(result);
      pending.delete(id);
      return;
    }

    if (status === 'progress') {
      entry.onProgress?.(progress);
      return;
    }

    entry.reject(new Error(message || 'Worker request failed.'));
    pending.delete(id);
  };

  worker.onerror = (error: ErrorEvent) => {
    logError(error, 'WorkerBridge');
    pending.forEach((entry) => entry.reject(new Error('Worker encountered an error.')));
    pending.clear();
  };

  return {
    call<T = any>(request: WorkerRequest, onProgress?: (progress: number) => void): WorkerBridgeResult<T> {
      const id = crypto.randomUUID();
      const transferables = request.transferables ?? [];
      const payload = request.payload ?? {};

      const promise = new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve, reject, onProgress });
        worker.postMessage({ id, type: request.type, payload }, transferables);
      });

      return {
        promise,
        cancel: () => {
          worker.postMessage({ id, type: '__cancel__' });
          const entry = pending.get(id);
          if (entry) {
            entry.reject(new Error('Operation cancelled.'));
            pending.delete(id);
          }
        },
      };
    },
  };
}
