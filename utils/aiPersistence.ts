interface PersistedAiTaskState<T> {
  signature: string;
  payload: T;
  savedAt: string;
}

export function createFileSignature(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}::${file.type}`;
}

export function createFilesSignature(files: File[]): string {
  return files.map(createFileSignature).join('||');
}

export function saveAiTaskState<T>(key: string, signature: string, payload: T): void {
  try {
    const data: PersistedAiTaskState<T> = {
      signature,
      payload,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`[AiPersistence] Failed to persist ${key}`, error);
  }
}

export function loadAiTaskState<T>(key: string): PersistedAiTaskState<T> | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedAiTaskState<T>;
  } catch (error) {
    console.warn(`[AiPersistence] Failed to restore ${key}`, error);
    return null;
  }
}

export function clearAiTaskState(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(`[AiPersistence] Failed to clear ${key}`, error);
  }
}
