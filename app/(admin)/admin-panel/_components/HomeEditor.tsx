"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { updateHomeHeroContent } from "@/app/actions/homeActions";
import UploadStatus from "@/components/ui/UploadStatus";
import Button from "@/components/ui/Button";
import {
  createIdleUploadTaskState,
  uploadAssetWithProgress,
} from "@/lib/clientUpload";
import { getUploadUrl } from "@/lib/uploads";
import type { HomeHeroConfig, HomeHeroCtaMode } from "@/lib/homeHero";
import RichTextEditor from "./RichTextEditor";

type HeroTargetOption = {
  id: string;
  title: string;
};

type HomeEditorProps = {
  config: HomeHeroConfig;
  articleOptions: HeroTargetOption[];
  radioOptions: HeroTargetOption[];
  magazineOptions: HeroTargetOption[];
  onSave: () => void;
};

type HomeFormState = {
  badgeText: string;
  heroHtml: string;
  image: string | null;
  ctaMode: HomeHeroCtaMode;
  ctaTargetId: string | null;
};

function toInitialForm(config: HomeHeroConfig): HomeFormState {
  return {
    badgeText: config.badgeText || "",
    heroHtml: config.heroHtml || "",
    image: config.image || null,
    ctaMode: config.ctaMode || "none",
    ctaTargetId: config.ctaTargetId || null,
  };
}

export default function HomeEditor({
  config,
  articleOptions,
  radioOptions,
  magazineOptions,
  onSave,
}: HomeEditorProps) {
  const [formData, setFormData] = useState<HomeFormState>(() =>
    toInitialForm(config),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadStatus, setUploadStatus] = useState(createIdleUploadTaskState);

  useEffect(() => {
    setFormData(toInitialForm(config));
  }, [config]);

  const currentImage = getUploadUrl(formData.image || "");

  const currentTargetOptions = useMemo(() => {
    if (formData.ctaMode === "article") return articleOptions;
    if (formData.ctaMode === "radio") return radioOptions;
    if (formData.ctaMode === "magazine") return magazineOptions;
    return [];
  }, [articleOptions, formData.ctaMode, magazineOptions, radioOptions]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setUploadStatus({ phase: "uploading", progress: 0, error: "" });

    try {
      const uploaded = await uploadAssetWithProgress(file, {
        retries: 4,
        onProgress: (progress) =>
          setUploadStatus({ phase: "uploading", progress, error: "" }),
      });

      setFormData((prev) => ({ ...prev, image: uploaded.url }));
      setUploadStatus({ phase: "success", progress: 100, error: "" });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error && uploadError.message
          ? uploadError.message
          : "آپلود تصویر انجام نشد";
      setError(message);
      setUploadStatus({ phase: "error", progress: 0, error: message });
    } finally {
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await updateHomeHeroContent({
        badgeText: formData.badgeText,
        heroHtml: formData.heroHtml,
        image: formData.image,
        ctaMode: formData.ctaMode,
        ctaTargetId: formData.ctaMode === "none" ? null : formData.ctaTargetId,
      });

      if (!result.success) {
        setError(result.error || "ذخیره تنظیمات خانه انجام نشد");
        return;
      }

      setSuccess("تنظیمات صفحه خانه با موفقیت ذخیره شد");
      onSave();
    } catch (submitError) {
      console.error(submitError);
      setError("خطایی در ذخیره تنظیمات خانه رخ داد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-3xl text-slate-900 dark:text-slate-100"
    >
      <h2 className="text-2xl font-bold">تنظیمات صفحه خانه</h2>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded-md">
          {success}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">متن برچسب</label>
        <input
          type="text"
          value={formData.badgeText}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, badgeText: event.target.value }))
          }
          placeholder="مثل: شماره جدید منتشر شد"
          className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          اگر این فیلد خالی باشد، برچسب در صفحه خانه نمایش داده نمی شود.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          محتوای متنی هدر
        </label>
        <RichTextEditor
          value={formData.heroHtml}
          onChange={(nextContent) =>
            setFormData((prev) => ({ ...prev, heroHtml: nextContent }))
          }
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">تصویر هدر</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageUpload}
          disabled={uploadStatus.phase === "uploading"}
          className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <UploadStatus
          status={uploadStatus}
          uploadingLabel="در حال آپلود تصویر هدر..."
          successLabel="تصویر هدر با موفقیت آپلود شد"
          errorLabel="آپلود تصویر هدر انجام نشد"
        />

        {currentImage ? (
          <div className="mt-3 w-full max-w-xs sm:max-w-sm">
            <div className="image-frame-shell">
              <div className="image-frame-inner">
                <Image
                  src={currentImage}
                  alt="پیش نمایش تصویر هدر"
                  fill
                  className="image-frame-media object-cover"
                  sizes="(max-width: 640px) 90vw, 360px"
                  unoptimized
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            هنوز تصویری برای هدر صفحه خانه انتخاب نشده است.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">وضعیت دکمه اصلی</label>
        <select
          value={formData.ctaMode}
          onChange={(event) => {
            const nextMode = event.target.value as HomeHeroCtaMode;
            setFormData((prev) => ({
              ...prev,
              ctaMode: nextMode,
              ctaTargetId: nextMode === "none" ? null : prev.ctaTargetId,
            }));
          }}
          className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="none">عدم نمایش دکمه</option>
          <option value="article">نمایش دکمه نوشته</option>
          <option value="radio">نمایش دکمه رادیو</option>
          <option value="magazine">نمایش دکمه مجله</option>
        </select>
      </div>

      {formData.ctaMode !== "none" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">مقصد دکمه</label>
          <select
            value={formData.ctaTargetId || ""}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                ctaTargetId: event.target.value || null,
              }))
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">انتخاب مقصد</option>
            {currentTargetOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          {!currentTargetOptions.length && (
            <p className="text-xs text-amber-600 dark:text-amber-300">
              برای این نوع دکمه هنوز محتوایی ثبت نشده است.
            </p>
          )}
        </div>
      )}

      <div className="pt-2">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "در حال ذخیره..." : "ذخیره تنظیمات خانه"}
        </Button>
      </div>
    </form>
  );
}
