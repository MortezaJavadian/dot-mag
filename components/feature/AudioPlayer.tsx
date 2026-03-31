"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";

interface AudioPlayerProps {
  src: string;
  title: string;
  downloadFileName?: string;
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

export function AudioPlayer({
  src,
  title,
  downloadFileName,
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

  const handleDownload = async () => {
    setDownloading(true);
    setError("");

    try {
      const response = await fetch(src, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Download request failed");
      }

      const blob = await response.blob();

      if ("caches" in window) {
        const audioCache = await caches.open("dotmag-audio-v1");
        await audioCache.put(
          src,
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
        downloadFileName ||
        `${title.replace(/\s+/g, "-").toLowerCase() || "audio"}.mp3`;
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
      className={`rounded-2xl border border-card-border bg-card-bg p-4 md:p-5 ${
        compact ? "space-y-3" : "space-y-4"
      }`}
    >
      <audio ref={audioRef} src={src} preload="auto" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`${compact ? "text-base" : "text-lg"} font-bold`}>
            {title}
          </h3>
          <p className="text-xs md:text-sm text-foreground-secondary mt-1">
            {isBuffering
              ? "در حال بافر..."
              : isReady
                ? "آماده پخش"
                : "در حال آماده‌سازی"}
          </p>
        </div>

        <Button
          type="button"
          onClick={togglePlay}
          size={compact ? "sm" : "md"}
          className="min-w-[92px]"
        >
          {isPlaying ? "توقف" : "پخش"}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="relative h-2 rounded-full bg-foreground/10 overflow-hidden">
          <div
            className="absolute top-0 right-0 h-full bg-foreground/25"
            style={{ width: `${bufferedPercent}%` }}
          />
          <div
            className="absolute top-0 right-0 h-full bg-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={currentTime}
          onChange={(e) => handleSeek(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label="seek"
        />

        <div className="flex items-center justify-between text-xs text-foreground-secondary">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-foreground-secondary">
          پخش با بافر تدریجی برای اینترنت ضعیف
        </p>
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

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
