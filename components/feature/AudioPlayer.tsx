"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { getUploadOriginalFileName } from "@/lib/uploads";

type DownloadOption = {
  label: string;
  url: string;
  fileName?: string;
};

interface AudioPlayerProps {
  src: string;
  title: string;
  downloadFileName?: string;
  downloadOptions?: DownloadOption[];
  compact?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function buildDefaultFileName(title: string): string {
  return `${title.replace(/\s+/g, "-").toLowerCase() || "audio"}.mp3`;
}

function sanitizeDownloadName(name: string): string {
  return name
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/]+/g, "-")
    .trim();
}

function parseContentDispositionFileName(
  contentDisposition: string | null,
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(
    /filename\*\s*=\s*UTF-8''([^;]+)/i,
  );
  if (utf8Match?.[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1].trim());
      const normalized = sanitizeDownloadName(decoded);
      if (normalized) {
        return normalized;
      }
    } catch {
      // Ignore malformed encodings and continue with fallback parsing.
    }
  }

  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch?.[1]) {
    const normalized = sanitizeDownloadName(quotedMatch[1]);
    if (normalized) {
      return normalized;
    }
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (plainMatch?.[1]) {
    const normalized = sanitizeDownloadName(plainMatch[1].trim());
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function dedupeDownloadOptions(options: DownloadOption[]): DownloadOption[] {
  const seen = new Set<string>();
  const output: DownloadOption[] = [];

  for (const option of options) {
    const key = `${option.label}::${option.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(option);
  }

  return output;
}

export function AudioPlayer({
  src,
  title,
  downloadFileName,
  downloadOptions,
  compact = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedUntil, setBufferedUntil] = useState(0);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const normalizedDownloadOptions = useMemo(() => {
    const provided = (downloadOptions || [])
      .filter((option) => option.url)
      .map((option) => ({
        label: option.label,
        url: option.url,
        fileName: option.fileName,
      }));

    if (provided.length > 0) {
      return dedupeDownloadOptions(provided);
    }

    return [
      {
        label: "دانلود فایل",
        url: src,
        fileName: downloadFileName,
      },
    ];
  }, [downloadFileName, downloadOptions, src]);

  const [selectedDownloadUrl, setSelectedDownloadUrl] = useState(
    normalizedDownloadOptions[0]?.url || "",
  );

  useEffect(() => {
    setSelectedDownloadUrl(normalizedDownloadOptions[0]?.url || "");
  }, [normalizedDownloadOptions]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateBuffered = () => {
      if (!audio.buffered.length) {
        setBufferedUntil(0);
        return;
      }

      const end = audio.buffered.end(audio.buffered.length - 1);
      setBufferedUntil(Number.isFinite(end) ? end : 0);
    };

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      updateBuffered();
    };

    const onCanPlay = () => {
      setIsReady(true);
      setIsBuffering(false);
    };

    const onTimeUpdate = () => {
      setCurrentTime(
        Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      );
    };

    const onProgress = () => {
      updateBuffered();
    };

    const onWaiting = () => {
      setIsBuffering(true);
    };

    const onPlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onError = () => {
      setError("پخش فایل با مشکل مواجه شد");
      setIsPlaying(false);
      setIsBuffering(false);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("progress", onProgress);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("progress", onProgress);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  const progressPercent = useMemo(() => {
    if (!duration) return 0;
    return Math.min((currentTime / duration) * 100, 100);
  }, [currentTime, duration]);

  const bufferedPercent = useMemo(() => {
    if (!duration) return 0;
    return Math.min((bufferedUntil / duration) * 100, 100);
  }, [bufferedUntil, duration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    setError("");

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (playError) {
      console.error(playError);
      setError("شروع پخش ممکن نبود");
    }
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;

    const bounded = Math.max(0, Math.min(value, duration || 0));
    audio.currentTime = bounded;
    setCurrentTime(bounded);
  };

  const selectedDownloadOption =
    normalizedDownloadOptions.find(
      (option) => option.url === selectedDownloadUrl,
    ) || normalizedDownloadOptions[0];

  const handleDownload = async () => {
    if (!selectedDownloadOption?.url) {
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const response = await fetch(selectedDownloadOption.url, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Download request failed");
      }

      const blob = await response.blob();
      const originalNameFromUrl = getUploadOriginalFileName(
        selectedDownloadOption.url,
      );
      const originalNameFromHeader = parseContentDispositionFileName(
        response.headers.get("content-disposition"),
      );

      if ("caches" in window) {
        const audioCache = await caches.open("dotmag-audio-v1");
        await audioCache.put(
          selectedDownloadOption.url,
          new Response(blob, {
            headers: {
              "Content-Type": blob.type || "audio/mpeg",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          }),
        );
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download =
        originalNameFromUrl ||
        originalNameFromHeader ||
        selectedDownloadOption.fileName ||
        downloadFileName ||
        buildDefaultFileName(title);
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      console.error(downloadError);
      setError("دانلود فایل انجام نشد");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-card-border bg-card-bg p-4 md:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_32px_rgba(0,0,0,0.36)] ${
        compact ? "space-y-3" : "space-y-4"
      }`}
    >
      <audio ref={audioRef} src={src} preload="auto" />

      <div className="flex items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
          aria-label={isPlaying ? "pause" : "play"}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect
                x="6"
                y="5"
                width="4"
                height="14"
                rx="1"
                fill="currentColor"
              />
              <rect
                x="14"
                y="5"
                width="4"
                height="14"
                rx="1"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8 6v12l10-6-10-6Z" fill="currentColor" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h3
            className={`${compact ? "text-base" : "text-lg md:text-xl"} font-bold line-clamp-1`}
          >
            {title}
          </h3>
          <p className="mt-1 text-xs md:text-sm text-foreground-secondary">
            {isBuffering
              ? "در حال بافر..."
              : isReady
                ? isPlaying
                  ? "در حال پخش"
                  : "آماده پخش"
                : "در حال آماده‌سازی"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative h-3">
          <div className="absolute inset-0 rounded-full bg-foreground/10" />
          <div
            className="absolute inset-y-0 right-0 rounded-full bg-foreground/25"
            style={{ width: `${bufferedPercent}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 rounded-full bg-primary"
            style={{ width: `${progressPercent}%` }}
          />

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={1}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="audio-seek absolute inset-0 h-3 w-full"
            aria-label="seek"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-foreground-secondary">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {normalizedDownloadOptions.length > 1 ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedDownloadUrl}
              onChange={(e) => setSelectedDownloadUrl(e.target.value)}
              className="min-w-[150px] rounded-lg border border-card-border bg-background px-3 py-1.5 text-xs md:text-sm"
            >
              {normalizedDownloadOptions.map((option) => (
                <option
                  key={`${option.label}-${option.url}`}
                  value={option.url}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              size="sm"
              className="bg-slate-700 hover:bg-slate-800"
            >
              {downloading ? "در حال دانلود..." : "دانلود"}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            size="sm"
            className="w-fit bg-slate-700 hover:bg-slate-800"
          >
            {downloading ? "در حال دانلود..." : "دانلود"}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
