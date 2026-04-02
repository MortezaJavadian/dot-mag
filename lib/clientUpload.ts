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
};

type UploadAssetOptions = {
  onProgress?: (percent: number) => void;
  timeoutMs?: number;
  retries?: number;
};

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_RETRIES = 1;

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
      } | null;

      if (
        xhr.status < 200 ||
        xhr.status >= 300 ||
        !result?.success ||
        !result.url
      ) {
        reject(new Error(result?.error || "Upload failed"));
        return;
      }

      resolve({
        url: result.url,
        originalFileName: result.originalFileName,
        storedFileName: result.storedFileName,
      });
    };

    xhr.send(payload);
  });
}

export async function uploadAssetWithProgress(
  file: File,
  options: UploadAssetOptions = {},
): Promise<UploadAssetResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = Math.max(0, options.retries ?? DEFAULT_RETRIES);

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= retries) {
    try {
      return await uploadAssetOnce(file, timeoutMs, options.onProgress);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown upload error");
      attempt += 1;
    }
  }

  throw lastError || new Error("Upload failed");
}
