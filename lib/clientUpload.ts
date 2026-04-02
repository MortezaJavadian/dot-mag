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
};

const DEFAULT_TIMEOUT_MS = 8 * 60 * 1000;
const DEFAULT_RETRIES = 4;
const DEFAULT_RETRY_DELAY_MS = 1_500;
const DEFAULT_OFFLINE_WAIT_MS = 20_000;

export function createIdleUploadTaskState(): UploadTaskState {
  return {
    phase: "idle",
    progress: 0,
    error: "",
  };
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
