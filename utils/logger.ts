export function logError(error: unknown, context?: string, meta?: Record<string, unknown>) {
  const prefix = context ? `[${context}]` : '[App]';
  if (meta) {
    console.error(prefix, error, meta);
  } else {
    console.error(prefix, error);
  }
}

export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  return error instanceof Error ? error.message : fallback;
}
