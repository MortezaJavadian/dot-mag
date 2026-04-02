import type { UploadTaskState } from "@/lib/clientUpload";

interface UploadStatusProps {
  status: UploadTaskState;
  uploadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  className?: string;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function UploadStatus({
  status,
  uploadingLabel = "در حال آپلود...",
  successLabel = "آپلود کامل شد",
  errorLabel = "آپلود انجام نشد",
  className = "",
}: UploadStatusProps) {
  if (status.phase === "idle") {
    return null;
  }

  if (status.phase === "uploading") {
    const progress = clampProgress(status.progress);

    return (
      <div className={`mt-2 ${className}`.trim()}>
        <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 mb-1">
          <span>{uploadingLabel}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-blue-100 dark:bg-blue-950/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (status.phase === "success") {
    return (
      <div
        className={`mt-2 inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 ${className}`.trim()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>{successLabel} (100%)</span>
      </div>
    );
  }

  return (
    <div
      className={`mt-2 inline-flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400 ${className}`.trim()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
      <span>{status.error || errorLabel}</span>
    </div>
  );
}
