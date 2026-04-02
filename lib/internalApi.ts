type InternalFetchOptions = Omit<RequestInit, "next"> & {
  revalidate?: number;
  tags?: string[];
  timeoutMs?: number;
};

const DEFAULT_INTERNAL_API_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_REVALIDATE_SECONDS = 60;

function resolveInternalApiBaseUrl(): string {
  return (
    process.env.INTERNAL_API_BASE_URL?.trim() || DEFAULT_INTERNAL_API_BASE_URL
  );
}

function toInternalApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveInternalApiBaseUrl()}${normalizedPath}`;
}

export async function fetchInternalJson<T>(
  path: string,
  options: InternalFetchOptions = {},
): Promise<T | null> {
  const {
    revalidate = DEFAULT_REVALIDATE_SECONDS,
    tags = [],
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...init
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(toInternalApiUrl(path), {
      ...init,
      signal: controller.signal,
      next: tags.length ? { revalidate, tags } : { revalidate },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as unknown;
    return data as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchInternalArray<T>(
  path: string,
  options: InternalFetchOptions = {},
): Promise<T[]> {
  const data = await fetchInternalJson<unknown>(path, options);
  return Array.isArray(data) ? (data as T[]) : [];
}
