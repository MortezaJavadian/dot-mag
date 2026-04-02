export type UploadTaskPhase = "idle" | "uploading" | "success" | "error";

export type UploadTaskState = {
  phase: UploadTaskPhase;
  progress: number;
  error: string;
};

export type UploadAssetResponse = {
  url: string;
  originalFileName?: string;
  storedFileName?: string;
  size?: number;
};

export type UploadRetryMeta = {
  attempt: number;
  maxRetries: number;
  error: string;
  waitingForNetwork: boolean;
};

type UploadAssetOptions = {
  onProgress?: (percent: number) => void;
  onRetry?: (meta: UploadRetryMeta) => void;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  offlineWaitMs?: number;
  chunkSizeBytes?: number;
  chunkingThresholdBytes?: number;
};

const DEFAULT_TIMEOUT_MS = 8 * 60 * 1000;
const DEFAULT_RETRIES = 4;
const DEFAULT_RETRY_DELAY_MS = 1_500;
const DEFAULT_OFFLINE_WAIT_MS = 20_000;
const DEFAULT_CHUNK_SIZE_BYTES = 512 * 1024;
const DEFAULT_CHUNKING_THRESHOLD_BYTES = 1 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
};

export function createIdleUploadTaskState(): UploadTaskState {
  return {
    phase: "idle",
    progress: 0,
    error: "",
  };
}

function resolveUploadMimeType(file: File): string {
  const rawType = (file.type || "").trim().toLowerCase();
  if (rawType && rawType !== "application/octet-stream") {
    return rawType;
  }

  const ext = file.name.split(".").pop()?.trim().toLowerCase() || "";
  return MIME_BY_EXTENSION[ext] || "application/octet-stream";
}

function uploadAssetOnce(
  file: File,
  timeoutMs: number,
  onProgress?: (percent: number) => void,
): Promise<UploadAssetResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const payload = new FormData();
    payload.append("file", file);

    xhr.open("POST", "/api/upload", true);
    xhr.withCredentials = true;
    xhr.timeout = timeoutMs;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.min(
        100,
        Math.max(0, Math.round((event.loaded / event.total) * 100)),
      );
      onProgress(percent);
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading file"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload request timed out"));
    };

    xhr.onabort = () => {
      reject(new Error("Upload request was aborted"));
    };

    xhr.onload = () => {
      let parsed: unknown;
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        reject(new Error("Invalid upload response"));
        return;
      }

      const result = parsed as {
        success?: boolean;
        error?: string;
        url?: string;
        originalFileName?: string;
        storedFileName?: string;
        size?: number;
      } | null;

      if (
        xhr.status < 200 ||
        xhr.status >= 300 ||
        !result?.success ||
        !result.url
      ) {
        reject(
          new Error(result?.error || `Upload failed (status ${xhr.status})`),
        );
        return;
      }

      resolve({
        url: result.url,
        originalFileName: result.originalFileName,
        storedFileName: result.storedFileName,
        size: typeof result.size === "number" ? result.size : undefined,
      });
    };

    xhr.send(payload);
  });
}

type ChunkUploadResult = {
  response?: UploadAssetResponse;
};

type UploadChunkRequestInput = {
  file: File;
  chunk: Blob;
  chunkIndex: number;
  totalChunks: number;
  uploadId: string;
  timeoutMs: number;
  onProgress?: (loaded: number, total: number) => void;
};

function uploadChunkRequest({
  file,
  chunk,
  chunkIndex,
  totalChunks,
  uploadId,
  timeoutMs,
  onProgress,
}: UploadChunkRequestInput): Promise<ChunkUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const payload = new FormData();
    payload.append("file", chunk, file.name || `chunk-${chunkIndex}`);
    payload.append("chunkIndex", String(chunkIndex));
    payload.append("totalChunks", String(totalChunks));
    payload.append("uploadId", uploadId);
    payload.append("originalFileName", file.name || "file");
    payload.append("fileType", resolveUploadMimeType(file));
    payload.append("totalSize", String(file.size));

    xhr.open("POST", "/api/upload", true);
    xhr.withCredentials = true;
    xhr.timeout = timeoutMs;

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;

      const total =
        event.lengthComputable && event.total > 0 ? event.total : chunk.size;
      onProgress(event.loaded, total);
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading file chunk"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload chunk request timed out"));
    };

    xhr.onabort = () => {
      reject(new Error("Upload chunk request was aborted"));
    };

    xhr.onload = () => {
      let parsed: unknown;
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        reject(new Error("Invalid chunk upload response"));
        return;
      }

      const result = parsed as {
        success?: boolean;
        error?: string;
        url?: string;
        originalFileName?: string;
        storedFileName?: string;
        size?: number;
      } | null;

      if (xhr.status < 200 || xhr.status >= 300 || !result?.success) {
        reject(
          new Error(
            result?.error || `Chunk upload failed (status ${xhr.status})`,
          ),
        );
        return;
      }

      if (result.url) {
        resolve({
          response: {
            url: result.url,
            originalFileName: result.originalFileName,
            storedFileName: result.storedFileName,
            size: typeof result.size === "number" ? result.size : undefined,
          },
        });
        return;
      }

      resolve({});
    };

    xhr.send(payload);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitUntilOnline(maxWaitMs: number): Promise<boolean> {
  if (typeof navigator === "undefined") {
    return true;
  }

  if (navigator.onLine) {
    return true;
  }

  return new Promise((resolve) => {
    const onOnline = () => {
      cleanup();
      resolve(true);
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve(false);
    }, maxWaitMs);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("online", onOnline);
    };

    window.addEventListener("online", onOnline);
  });
}

function isPayloadTooLargeError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("413") ||
    message.includes("payload too large") ||
    message.includes("request entity too large")
  );
}

function createUploadId(): string {
  const rawId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  return `upl-${rawId}`.replace(/[^a-zA-Z0-9_-]/g, "");
}

type ChunkedUploadInput = {
  file: File;
  retries: number;
  timeoutMs: number;
  retryDelayMs: number;
  offlineWaitMs: number;
  chunkSizeBytes: number;
  onProgress?: (percent: number) => void;
  onRetry?: (meta: UploadRetryMeta) => void;
};

async function uploadAssetInChunks({
  file,
  retries,
  timeoutMs,
  retryDelayMs,
  offlineWaitMs,
  chunkSizeBytes,
  onProgress,
  onRetry,
}: ChunkedUploadInput): Promise<UploadAssetResponse> {
  const safeChunkSize = Math.max(128 * 1024, chunkSizeBytes);
  const totalChunks = Math.max(1, Math.ceil(file.size / safeChunkSize));
  const uploadId = createUploadId();

  let finalResponse: UploadAssetResponse | null = null;
  let completedBytes = 0;
  let bestProgress = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * safeChunkSize;
    const end = Math.min(file.size, start + safeChunkSize);
    const chunk = file.slice(start, end);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const { response } = await uploadChunkRequest({
          file,
          chunk,
          chunkIndex,
          totalChunks,
          uploadId,
          timeoutMs,
          onProgress: (loaded) => {
            if (!onProgress || file.size <= 0) return;

            const currentLoaded = Math.min(file.size, completedBytes + loaded);
            const percent = Math.min(
              99,
              Math.max(0, Math.round((currentLoaded / file.size) * 100)),
            );
            bestProgress = Math.max(bestProgress, percent);
            onProgress(bestProgress);
          },
        });

        completedBytes = end;
        const chunkCompletedPercent = Math.min(
          99,
          Math.max(0, Math.round((completedBytes / file.size) * 100)),
        );
        bestProgress = Math.max(bestProgress, chunkCompletedPercent);
        onProgress?.(bestProgress);

        if (response) {
          finalResponse = response;
        }

        lastError = null;
        break;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("Unknown upload error");

        if (attempt >= retries) {
          break;
        }

        const onlineReady = await waitUntilOnline(offlineWaitMs);
        onRetry?.({
          attempt: attempt + 1,
          maxRetries: retries,
          error: lastError.message,
          waitingForNetwork: !onlineReady,
        });

        await sleep(retryDelayMs * (attempt + 1));
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  if (!finalResponse) {
    throw new Error("Upload did not complete");
  }

  if (
    typeof finalResponse.size === "number" &&
    finalResponse.size !== file.size
  ) {
    throw new Error("Uploaded file integrity check failed");
  }

  onProgress?.(100);
  return finalResponse;
}

export async function uploadAssetWithProgress(
  file: File,
  options: UploadAssetOptions = {},
): Promise<UploadAssetResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = Math.max(0, options.retries ?? DEFAULT_RETRIES);
  const retryDelayMs = Math.max(
    250,
    options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
  );
  const offlineWaitMs = Math.max(
    1_000,
    options.offlineWaitMs ?? DEFAULT_OFFLINE_WAIT_MS,
  );
  const chunkSizeBytes = Math.max(
    128 * 1024,
    options.chunkSizeBytes ?? DEFAULT_CHUNK_SIZE_BYTES,
  );
  const chunkingThresholdBytes = Math.max(
    chunkSizeBytes,
    options.chunkingThresholdBytes ?? DEFAULT_CHUNKING_THRESHOLD_BYTES,
  );

  if (file.size >= chunkingThresholdBytes) {
    return uploadAssetInChunks({
      file,
      retries,
      timeoutMs,
      retryDelayMs,
      offlineWaitMs,
      chunkSizeBytes,
      onProgress: options.onProgress,
      onRetry: options.onRetry,
    });
  }

  let bestProgress = 0;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await uploadAssetOnce(file, timeoutMs, (percent) => {
        if (!options.onProgress) return;

        const bounded = Math.min(97, Math.max(0, percent));
        bestProgress = Math.max(bestProgress, bounded);
        options.onProgress(bestProgress);
      });

      if (typeof response.size === "number" && response.size !== file.size) {
        throw new Error("Uploaded file integrity check failed");
      }

      options.onProgress?.(100);
      return response;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown upload error");

      if (isPayloadTooLargeError(lastError)) {
        return uploadAssetInChunks({
          file,
          retries,
          timeoutMs,
          retryDelayMs,
          offlineWaitMs,
          chunkSizeBytes,
          onProgress: options.onProgress,
          onRetry: options.onRetry,
        });
      }

      if (attempt >= retries) {
        break;
      }

      const onlineReady = await waitUntilOnline(offlineWaitMs);

      options.onRetry?.({
        attempt: attempt + 1,
        maxRetries: retries,
        error: lastError.message,
        waitingForNetwork: !onlineReady,
      });

      const delayMs = retryDelayMs * (attempt + 1);
      await sleep(delayMs);
    }
  }

  throw lastError || new Error("Upload failed");
}
