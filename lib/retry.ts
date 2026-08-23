export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    baseDelayMs?: number;
    label?: string;
    retryOn?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const retryOn = options.retryOn ?? (() => true);
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts - 1 || !retryOn(error)) break;
      const jitter = Math.floor(Math.random() * 150);
      await sleep(baseDelayMs * 2 ** i + jitter);
    }
  }

  const suffix = options.label ? ` (${options.label})` : "";
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`retry exhausted${suffix}: ${message}`);
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
