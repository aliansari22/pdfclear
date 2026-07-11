import { formatBytes, UploadedFile } from '../types';

export const LARGE_FILE_WARNING_BYTES = 100 * 1024 * 1024;

export function getTotalFileBytes(files: UploadedFile[] | File[]): number {
  return files.reduce((sum, entry: any) => sum + ('file' in entry ? entry.file.size : entry.size), 0);
}

export function getLargeFileWarning(files: UploadedFile[] | File[], threshold = LARGE_FILE_WARNING_BYTES): string | null {
  const total = getTotalFileBytes(files);
  if (total <= threshold) return null;
  return `Large file set detected (${formatBytes(total)} total). Performance may degrade above ${formatBytes(threshold)}.`;
}
