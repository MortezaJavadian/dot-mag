"use client";

import { useMemo, useState } from "react";
import {
  addRadioSegment,
  createRadio,
  deleteRadio,
  deleteRadioSegment,
  reorderRadioSegments,
  updateRadio,
  updateRadioSegment,
} from "@/app/actions/radioActions";
import Button from "@/components/ui/Button";
import UploadStatus from "@/components/ui/UploadStatus";
import {
  createIdleUploadTaskState,
  uploadAssetWithProgress,
  type UploadTaskState,
} from "@/lib/clientUpload";
import { getUploadUrl } from "@/lib/uploads";
import RichTextEditor from "./RichTextEditor";

type PlayerAudioQuality = "low" | "medium" | "high";

type RadioSegmentSource = {
  id: string;
  number: number;
  title: string;
  summary?: string | null;
  audioUrl: string;
  durationSec?: number | null;
};

type RadioSource = {
  id?: string | null;
  title?: string;
  summary?: string | null;
  intro?: string;
  cover?: string | null;
  audioUrl?: string | null;
  audioUrlLow?: string | null;
  audioUrlMedium?: string | null;
  audioUrlHigh?: string | null;
  playerAudioQuality?: string | null;
  publishedAt?: string;
  sortDate?: string | Date;
  durationSec?: number | null;
  segments?: RadioSegmentSource[];
};

interface RadioEditorProps {
  radio: RadioSource;
  onSave: () => void;
  onCancel: () => void;
}

type ManagedSegment = {
  id: string;
  number: number;
  title: string;
  summary: string;
  audioUrl: string;
  durationSec: number | null;
};

const QUALITY_LABELS: Record<PlayerAudioQuality, string> = {
  low: "کیفیت پایین",
  medium: "کیفیت متوسط",
  high: "کیفیت بالا",
};

const QUALITY_HELP_TEXT: Record<PlayerAudioQuality, string> = {
  low: "برای اینترنت ضعیف",
  medium: "متعادل",
  high: "برای بهترین کیفیت",
};

const QUALITY_FIELD_BY_KEY = {
  low: "audioUrlLow",
  medium: "audioUrlMedium",
  high: "audioUrlHigh",
} as const;

const IDLE_UPLOAD_STATUS: UploadTaskState = {
  phase: "idle",
  progress: 0,
  error: "",
};

function normalizeSegments(
  segments: RadioSegmentSource[] = [],
): ManagedSegment[] {
  return [...segments]
    .sort((a, b) => a.number - b.number)
    .map((segment) => ({
      id: segment.id,
      number: segment.number,
      title: segment.title,
      summary: segment.summary || "",
      audioUrl: segment.audioUrl,
      durationSec:
        typeof segment.durationSec === "number" ? segment.durationSec : null,
    }));
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function parseDurationSeconds(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "-";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function toDateInputValue(value?: string | Date | null): string {
  if (!value) return new Date().toISOString().split("T")[0];

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().split("T")[0];
  }

  return parsed.toISOString().split("T")[0];
}

function normalizePlayerAudioQuality(
  value?: string | null,
): PlayerAudioQuality {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === "low" ||
    normalized === "medium" ||
    normalized === "high"
  ) {
    return normalized;
  }

  return "high";
}

function resolveSelectedAudioUrl(
  quality: PlayerAudioQuality,
  audioUrlLow: string,
  audioUrlMedium: string,
  audioUrlHigh: string,
): string {
  const selected =
    quality === "low"
      ? audioUrlLow
      : quality === "medium"
        ? audioUrlMedium
        : audioUrlHigh;

  return selected || audioUrlHigh || audioUrlMedium || audioUrlLow || "";
}

async function extractDurationFromAudioFile(
  file: File,
): Promise<number | null> {
  return new Promise((resolve) => {
    const previewUrl = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    let settled = false;
    let timeoutId: number | null = null;

    const finalize = (durationSec: number | null) => {
      if (settled) return;
      settled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(previewUrl);
      resolve(durationSec);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const nextDuration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.floor(audio.duration)
          : null;
      finalize(nextDuration);
    };

    audio.onerror = () => {
      finalize(null);
    };

    timeoutId = window.setTimeout(() => {
      finalize(null);
    }, 7000);

    audio.src = previewUrl;
  });
}

function buildQualityStatusState(): Record<
  PlayerAudioQuality,
  UploadTaskState
> {
  return {
    low: createIdleUploadTaskState(),
    medium: createIdleUploadTaskState(),
    high: createIdleUploadTaskState(),
  };
}

export default function RadioEditor({
  radio,
  onSave,
  onCancel,
}: RadioEditorProps) {
  const initialHighAudioUrl =
    getUploadUrl(radio?.audioUrlHigh) || getUploadUrl(radio?.audioUrl) || "";

  const [formData, setFormData] = useState({
    title: radio?.title || "",
    summary: radio?.summary || "",
    intro: radio?.intro || "",
    cover: getUploadUrl(radio?.cover) || "",
    audioUrlLow: getUploadUrl(radio?.audioUrlLow) || "",
    audioUrlMedium: getUploadUrl(radio?.audioUrlMedium) || "",
    audioUrlHigh: initialHighAudioUrl,
    playerAudioQuality: normalizePlayerAudioQuality(radio?.playerAudioQuality),
    publishedAt: radio?.publishedAt || toDateInputValue(radio?.sortDate),
    sortDate: toDateInputValue(radio?.sortDate),
    durationSec:
      typeof radio?.durationSec === "number" ? String(radio.durationSec) : "",
  });

  const [segments, setSegments] = useState<ManagedSegment[]>(
    normalizeSegments(radio?.segments),
  );
  const [newSegmentTitle, setNewSegmentTitle] = useState("");
  const [newSegmentSummary, setNewSegmentSummary] = useState("");
  const [newSegmentFile, setNewSegmentFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [coverUploadStatus, setCoverUploadStatus] = useState(
    createIdleUploadTaskState,
  );
  const [qualityUploadStatuses, setQualityUploadStatuses] = useState<
    Record<PlayerAudioQuality, UploadTaskState>
  >(buildQualityStatusState);
  const [segmentUploadStatus, setSegmentUploadStatus] = useState(
    createIdleUploadTaskState,
  );
  const [segmentReplaceUploadStatuses, setSegmentReplaceUploadStatuses] =
    useState<Record<string, UploadTaskState>>({});
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isExistingRadio = Boolean(radio?.id);
  const radioId = typeof radio.id === "string" ? radio.id : null;
  const sortedSegments = useMemo(() => normalizeSegments(segments), [segments]);

  const selectedQualitySource =
    formData.playerAudioQuality === "low"
      ? formData.audioUrlLow
      : formData.playerAudioQuality === "medium"
        ? formData.audioUrlMedium
        : formData.audioUrlHigh;

  const setQualityUploadStatus = (
    quality: PlayerAudioQuality,
    status: UploadTaskState,
  ) => {
    setQualityUploadStatuses((prev) => ({
      ...prev,
      [quality]: status,
    }));
  };

  const setSegmentReplaceUploadStatus = (
    segmentId: string,
    status: UploadTaskState,
  ) => {
    setSegmentReplaceUploadStatuses((prev) => ({
      ...prev,
      [segmentId]: status,
    }));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploadStatus({ phase: "uploading", progress: 0, error: "" });
    setError("");

    try {
      const result = await uploadAssetWithProgress(file, {
        retries: 4,
        onProgress: (percent) =>
          setCoverUploadStatus({
            phase: "uploading",
            progress: percent,
            error: "",
          }),
      });

      const uploadedUrl = result.url;
      setFormData((prev) => ({ ...prev, cover: uploadedUrl }));
      setCoverUploadStatus({ phase: "success", progress: 100, error: "" });
    } catch (uploadError: unknown) {
      const message = getErrorMessage(uploadError, "خطا در آپلود عکس جلد");
      setError(message);
      setCoverUploadStatus({ phase: "error", progress: 0, error: message });
    } finally {
      e.target.value = "";
    }
  };

  const handleQualityAudioUpload = async (
    quality: PlayerAudioQuality,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQualityUploadStatus(quality, {
      phase: "uploading",
      progress: 0,
      error: "",
    });
    setError("");

    try {
      const [uploadResult, extractedDuration] = await Promise.all([
        uploadAssetWithProgress(file, {
          retries: 4,
          onProgress: (percent) =>
            setQualityUploadStatus(quality, {
              phase: "uploading",
              progress: percent,
              error: "",
            }),
        }),
        extractDurationFromAudioFile(file),
      ]);

      const uploadedUrl = uploadResult.url;
      setFormData((prev) => {
        const field = QUALITY_FIELD_BY_KEY[quality];
        const next = {
          ...prev,
          [field]: uploadedUrl,
        };

        const activeQualityField =
          QUALITY_FIELD_BY_KEY[next.playerAudioQuality];
        if (!next[activeQualityField]) {
          next.playerAudioQuality = quality;
        }

        if (typeof extractedDuration === "number" && extractedDuration > 0) {
          next.durationSec = String(extractedDuration);
        }

        return next;
      });

      setQualityUploadStatus(quality, {
        phase: "success",
        progress: 100,
        error: "",
      });
    } catch (uploadError: unknown) {
      const message = getErrorMessage(uploadError, "خطا در آپلود فایل صوتی");
      setError(message);
      setQualityUploadStatus(quality, {
        phase: "error",
        progress: 0,
        error: message,
      });
    } finally {
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const durationSec = parseDurationSeconds(formData.durationSec);
      if (!selectedQualitySource) {
        setError("برای کیفیت انتخابی پلیر، فایل صوتی آپلود نشده است");
        setLoading(false);
        return;
      }

      const primaryAudioUrl = resolveSelectedAudioUrl(
        formData.playerAudioQuality,
        formData.audioUrlLow,
        formData.audioUrlMedium,
        formData.audioUrlHigh,
      );

      if (!primaryAudioUrl) {
        setError("حداقل یک فایل صوتی برای اپیزود کامل آپلود کنید");
        setLoading(false);
        return;
      }

      const payload = {
        title: formData.title,
        summary: formData.summary || null,
        intro: formData.intro,
        cover: formData.cover || null,
        audioUrl: primaryAudioUrl,
        audioUrlLow: formData.audioUrlLow || null,
        audioUrlMedium: formData.audioUrlMedium || null,
        audioUrlHigh: formData.audioUrlHigh || null,
        playerAudioQuality: formData.playerAudioQuality,
        publishedAt: formData.publishedAt,
        sortDate: formData.sortDate,
        durationSec,
      };

      const result = isExistingRadio
        ? radioId
          ? await updateRadio(radioId, payload)
          : { success: false, error: "شناسه رادیو نامعتبر است" }
        : await createRadio(payload);

      if (!result.success) {
        setError(result.error || "خطا در ذخیره رادیو");
        setLoading(false);
        return;
      }

      onSave();
    } catch (submitError) {
      console.error(submitError);
      setError("خطا در ذخیره رادیو");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSegment = async () => {
    if (!isExistingRadio || !radioId) {
      setError("ابتدا رادیو را ذخیره کنید");
      return;
    }

    if (!newSegmentTitle.trim()) {
      setError("عنوان بخش برگزیده را وارد کنید");
      return;
    }

    if (!newSegmentFile) {
      setError("فایل صوتی بخش برگزیده را انتخاب کنید");
      return;
    }

    setSegmentUploadStatus({ phase: "uploading", progress: 0, error: "" });
    setError("");

    try {
      const [uploadResult, extractedDuration] = await Promise.all([
        uploadAssetWithProgress(newSegmentFile, {
          retries: 4,
          onProgress: (percent) =>
            setSegmentUploadStatus({
              phase: "uploading",
              progress: percent,
              error: "",
            }),
        }),
        extractDurationFromAudioFile(newSegmentFile),
      ]);

      const result = await addRadioSegment(radioId, {
        title: newSegmentTitle.trim(),
        summary: newSegmentSummary.trim() || null,
        audioUrl: uploadResult.url,
        durationSec: extractedDuration,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "خطا در افزودن بخش برگزیده");
      }

      const createdSegment = result.data;
      setSegments((prev) => normalizeSegments([...prev, createdSegment]));
      setNewSegmentTitle("");
      setNewSegmentSummary("");
      setNewSegmentFile(null);
      setSegmentUploadStatus({ phase: "success", progress: 100, error: "" });
    } catch (segmentError: unknown) {
      const message = getErrorMessage(
        segmentError,
        "خطا در افزودن بخش برگزیده",
      );
      setError(message);
      setSegmentUploadStatus({ phase: "error", progress: 0, error: message });
    }
  };

  const handleSegmentFieldChange = (
    segmentId: string,
    field: "title" | "summary" | "durationSec",
    value: string,
  ) => {
    setSegments((prev) =>
      prev.map((segment) => {
        if (segment.id !== segmentId) return segment;

        if (field === "durationSec") {
          return {
            ...segment,
            durationSec: parseDurationSeconds(value),
          };
        }

        return {
          ...segment,
          [field]: value,
        };
      }),
    );
  };

  const handleSaveSegment = async (segmentId: string) => {
    const segment = segments.find((item) => item.id === segmentId);
    if (!segment) return;

    setActiveSegmentId(segmentId);
    setError("");

    try {
      const result = await updateRadioSegment(segmentId, {
        title: segment.title,
        summary: segment.summary.trim() || null,
        durationSec: segment.durationSec,
      });

      if (!result.success) {
        throw new Error(result.error || "خطا در ذخیره بخش برگزیده");
      }
    } catch (segmentError: unknown) {
      setError(getErrorMessage(segmentError, "خطا در ذخیره بخش برگزیده"));
    } finally {
      setActiveSegmentId(null);
    }
  };

  const handleReplaceSegmentAudio = async (
    segmentId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActiveSegmentId(segmentId);
    setSegmentReplaceUploadStatus(segmentId, {
      phase: "uploading",
      progress: 0,
      error: "",
    });
    setError("");

    try {
      const [uploadResult, extractedDuration] = await Promise.all([
        uploadAssetWithProgress(file, {
          retries: 4,
          onProgress: (percent) =>
            setSegmentReplaceUploadStatus(segmentId, {
              phase: "uploading",
              progress: percent,
              error: "",
            }),
        }),
        extractDurationFromAudioFile(file),
      ]);

      const result = await updateRadioSegment(segmentId, {
        audioUrl: uploadResult.url,
        durationSec: extractedDuration,
      });

      if (!result.success) {
        throw new Error(result.error || "خطا در جایگزینی فایل صوتی");
      }

      setSegments((prev) =>
        prev.map((segment) =>
          segment.id === segmentId
            ? {
                ...segment,
                audioUrl: uploadResult.url,
                durationSec:
                  typeof extractedDuration === "number"
                    ? extractedDuration
                    : segment.durationSec,
              }
            : segment,
        ),
      );

      setSegmentReplaceUploadStatus(segmentId, {
        phase: "success",
        progress: 100,
        error: "",
      });
    } catch (segmentError: unknown) {
      const message = getErrorMessage(
        segmentError,
        "خطا در جایگزینی فایل صوتی",
      );
      setError(message);
      setSegmentReplaceUploadStatus(segmentId, {
        phase: "error",
        progress: 0,
        error: message,
      });
    } finally {
      setActiveSegmentId(null);
      e.target.value = "";
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    setActiveSegmentId(segmentId);
    setError("");

    try {
      const result = await deleteRadioSegment(segmentId);
      if (!result.success) {
        throw new Error(result.error || "خطا در حذف بخش برگزیده");
      }

      const compacted = segments
        .filter((segment) => segment.id !== segmentId)
        .sort((a, b) => a.number - b.number)
        .map((segment, index) => ({
          ...segment,
          number: index + 1,
        }));

      setSegments(compacted);
    } catch (segmentError: unknown) {
      setError(getErrorMessage(segmentError, "خطا در حذف بخش برگزیده"));
    } finally {
      setActiveSegmentId(null);
    }
  };

  const moveSegment = async (segmentId: string, direction: "up" | "down") => {
    const currentIndex = sortedSegments.findIndex(
      (segment) => segment.id === segmentId,
    );

    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedSegments.length) return;

    const reordered = [...sortedSegments];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const normalized = reordered.map((segment, index) => ({
      ...segment,
      number: index + 1,
    }));

    setSegments(normalized);
    setActiveSegmentId(segmentId);
    setError("");

    if (!radioId) {
      setError("شناسه رادیو نامعتبر است");
      return;
    }

    try {
      const result = await reorderRadioSegments(
        radioId,
        normalized.map((segment) => segment.id),
      );

      if (!result.success) {
        throw new Error(result.error || "خطا در جابجایی بخش‌ها");
      }

      setSegments(normalizeSegments(result.data || normalized));
    } catch (moveError: unknown) {
      setError(getErrorMessage(moveError, "خطا در جابجایی بخش‌ها"));
      setSegments(sortedSegments);
    } finally {
      setActiveSegmentId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl text-slate-900 dark:text-slate-100">
      <h2 className="text-2xl font-bold">
        {isExistingRadio ? "ویرایش رادیودات" : "ایجاد رادیودات"}
      </h2>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">عنوان</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">خلاصه</label>
          <input
            type="text"
            value={formData.summary}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, summary: e.target.value }))
            }
            placeholder="یک خلاصه کوتاه برای کارت و هدر"
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">متن معرفی</label>
          <RichTextEditor
            value={formData.intro}
            onChange={(nextIntro) =>
              setFormData((prev) => ({ ...prev, intro: nextIntro }))
            }
            placeholder="متن معرفی رادیودات را وارد کنید..."
            minHeightClass="min-h-[220px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              عکس جلد (اختیاری)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleCoverUpload}
              disabled={coverUploadStatus.phase === "uploading"}
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
            <UploadStatus
              status={coverUploadStatus}
              uploadingLabel="در حال آپلود عکس جلد..."
              successLabel="عکس جلد با موفقیت آپلود شد"
              errorLabel="آپلود عکس جلد انجام نشد"
            />
            {formData.cover && (
              <img
                src={getUploadUrl(formData.cover) || ""}
                alt="Radio cover"
                className="mt-2 h-32 w-full object-cover rounded-md"
              />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                تاریخ نمایشی
              </label>
              <input
                type="text"
                value={formData.publishedAt}
                placeholder="Any date text"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    publishedAt: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                تاریخ مرتب‌سازی
              </label>
              <input
                type="date"
                value={formData.sortDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sortDate: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                مدت کل (ثانیه - خودکار و قابل اصلاح)
              </label>
              <input
                type="number"
                min={1}
                value={formData.durationSec}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    durationSec: e.target.value,
                  }))
                }
                placeholder="بعد از آپلود خودکار پر می‌شود"
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 dark:border-slate-700 p-4 md:p-5 space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold">
              فایل اپیزود کامل
            </h3>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              می‌توانید یک، دو یا سه کیفیت آپلود کنید. دانلودهای صفحه رادیودات
              فقط بر اساس کیفیت‌های آپلود شده نمایش داده می‌شوند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["low", "medium", "high"] as PlayerAudioQuality[]).map(
              (quality) => {
                const qualityField = QUALITY_FIELD_BY_KEY[quality];
                const audioUrl = formData[qualityField];
                const status =
                  qualityUploadStatuses[quality] || IDLE_UPLOAD_STATUS;

                return (
                  <div
                    key={quality}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {QUALITY_LABELS[quality]}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {QUALITY_HELP_TEXT[quality]}
                      </p>
                    </div>

                    <input
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm"
                      onChange={(e) => handleQualityAudioUpload(quality, e)}
                      disabled={status.phase === "uploading"}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />

                    <UploadStatus
                      status={status}
                      uploadingLabel="در حال آپلود..."
                      successLabel="فایل با موفقیت آپلود شد"
                      errorLabel="آپلود فایل انجام نشد"
                    />

                    {audioUrl ? (
                      <audio
                        controls
                        preload="metadata"
                        src={audioUrl}
                        className="w-full"
                      />
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        هنوز فایلی آپلود نشده است.
                      </p>
                    )}
                  </div>
                );
              },
            )}
          </div>

          <div className="max-w-xs">
            <label className="block text-sm font-medium mb-1">
              کیفیت پخش داخلی سایت
            </label>
            <select
              value={formData.playerAudioQuality}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  playerAudioQuality: normalizePlayerAudioQuality(
                    e.target.value,
                  ),
                }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            >
              <option value="low">
                کیفیت پایین {formData.audioUrlLow ? "" : "(آپلود نشده)"}
              </option>
              <option value="medium">
                کیفیت متوسط {formData.audioUrlMedium ? "" : "(آپلود نشده)"}
              </option>
              <option value="high">
                کیفیت بالا {formData.audioUrlHigh ? "" : "(آپلود نشده)"}
              </option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading
              ? "در حال ذخیره..."
              : isExistingRadio
                ? "بروزرسانی رادیودات"
                : "ایجاد رادیودات"}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            className="bg-slate-500 hover:bg-slate-600"
          >
            انصراف
          </Button>
          {isExistingRadio && (
            <Button
              type="button"
              onClick={async () => {
                if (
                  confirm("آیا از حذف کامل این رادیودات مطمئن هستید؟") &&
                  radioId
                ) {
                  await deleteRadio(radioId);
                  onSave();
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              حذف رادیودات
            </Button>
          )}
        </div>
      </form>

      {isExistingRadio && (
        <section className="space-y-4 pt-6 border-t border-slate-300 dark:border-slate-700">
          <h3 className="text-lg font-semibold">
            بخش‌های برگزیده ({sortedSegments.length})
          </h3>

          <div className="p-4 border rounded-lg dark:border-slate-700 space-y-3">
            <h4 className="font-medium">افزودن بخش جدید</h4>

            <div>
              <label className="block text-sm font-medium mb-1">
                عنوان بخش
              </label>
              <input
                type="text"
                value={newSegmentTitle}
                onChange={(e) => setNewSegmentTitle(e.target.value)}
                placeholder="عنوان بخش"
                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                خلاصه بخش
              </label>
              <RichTextEditor
                value={newSegmentSummary}
                onChange={setNewSegmentSummary}
                placeholder="خلاصه بخش برگزیده را بنویسید..."
                minHeightClass="min-h-[140px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                فایل صوتی بخش
              </label>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm"
                onChange={(e) => setNewSegmentFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>

            <Button
              type="button"
              onClick={handleAddSegment}
              disabled={segmentUploadStatus.phase === "uploading"}
            >
              {segmentUploadStatus.phase === "uploading"
                ? "در حال افزودن..."
                : "افزودن بخش برگزیده"}
            </Button>

            <UploadStatus
              status={segmentUploadStatus}
              uploadingLabel="در حال آپلود فایل بخش برگزیده..."
              successLabel="فایل بخش برگزیده با موفقیت آپلود شد"
              errorLabel="آپلود فایل بخش برگزیده انجام نشد"
            />
          </div>

          {sortedSegments.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              هنوز بخشی ثبت نشده است.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedSegments.map((segment, index) => {
                const segmentBusy = activeSegmentId === segment.id;
                const segmentAudioUrl = getUploadUrl(segment.audioUrl) || "";
                const segmentReplaceStatus =
                  segmentReplaceUploadStatuses[segment.id] ||
                  IDLE_UPLOAD_STATUS;

                return (
                  <div
                    key={segment.id}
                    className="p-4 border rounded-lg dark:border-slate-700 space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        بخش {segment.number}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        مدت: {formatDuration(segment.durationSec)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        عنوان
                      </label>
                      <input
                        type="text"
                        value={segment.title}
                        onChange={(e) =>
                          handleSegmentFieldChange(
                            segment.id,
                            "title",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        خلاصه
                      </label>
                      <RichTextEditor
                        value={segment.summary}
                        onChange={(nextSummary) =>
                          handleSegmentFieldChange(
                            segment.id,
                            "summary",
                            nextSummary,
                          )
                        }
                        placeholder="خلاصه بخش برگزیده..."
                        minHeightClass="min-h-[120px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        مدت (ثانیه - خودکار و قابل اصلاح)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={segment.durationSec ?? ""}
                        onChange={(e) =>
                          handleSegmentFieldChange(
                            segment.id,
                            "durationSec",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      />
                    </div>

                    {segmentAudioUrl && (
                      <audio
                        controls
                        preload="metadata"
                        src={segmentAudioUrl}
                        className="w-full"
                      />
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => moveSegment(segment.id, "up")}
                        disabled={index === 0 || segmentBusy}
                        className="text-xs"
                      >
                        بالا
                      </Button>
                      <Button
                        type="button"
                        onClick={() => moveSegment(segment.id, "down")}
                        disabled={
                          index === sortedSegments.length - 1 || segmentBusy
                        }
                        className="text-xs"
                      >
                        پایین
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSaveSegment(segment.id)}
                        disabled={segmentBusy}
                        className="text-xs"
                      >
                        ذخیره تغییرات
                      </Button>

                      <label className="inline-flex items-center px-3 py-2 rounded-md bg-slate-700 text-white text-xs cursor-pointer hover:bg-slate-800 transition-colors">
                        تعویض فایل
                        <input
                          type="file"
                          accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm"
                          onChange={(e) =>
                            handleReplaceSegmentAudio(segment.id, e)
                          }
                          disabled={segmentBusy}
                          className="hidden"
                        />
                      </label>

                      <UploadStatus
                        status={segmentReplaceStatus}
                        uploadingLabel="در حال آپلود فایل جایگزین..."
                        successLabel="فایل جایگزین با موفقیت آپلود شد"
                        errorLabel="آپلود فایل جایگزین انجام نشد"
                      />

                      <Button
                        type="button"
                        onClick={() => {
                          if (confirm("این بخش حذف شود؟")) {
                            handleDeleteSegment(segment.id);
                          }
                        }}
                        disabled={segmentBusy}
                        className="text-xs bg-red-500 hover:bg-red-600"
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
