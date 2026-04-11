"use client";

import { useEffect, useMemo, useState } from "react";
import { updateHomeHeroContent } from "@/app/actions/homeActions";
import UploadStatus from "@/components/ui/UploadStatus";
import Button from "@/components/ui/Button";
import {
  createIdleUploadTaskState,
  uploadAssetWithProgress,
} from "@/lib/clientUpload";
import { getUploadUrl } from "@/lib/uploads";
import type {
  HomeHeroBannerConfig,
  HomeHeroConfig,
  HomeHeroCtaMode,
  HomeHeroEffectPreset,
} from "@/lib/homeHero";
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

type HomeBannerFormState = HomeHeroBannerConfig;

type HomeFormState = {
  featuredArticleIds: string[];
  autoRotateSeconds: number;
  banners: HomeBannerFormState[];
};

const DEFAULT_BANNER_TEMPLATE: Omit<HomeBannerFormState, "id"> = {
  badgeText: "",
  heroHtml: "",
  secondLineAsTitle: true,
  image: null,
  backgroundMobileImage: null,
  backgroundDesktopImage: null,
  effectPreset: "none",
  ctaMode: "none",
  ctaTargetId: null,
};

const EFFECT_PRESET_OPTIONS: Array<{
  value: HomeHeroEffectPreset;
  label: string;
}> = [
  { value: "none", label: "بدون افکت" },
  { value: "soft-darken", label: "تیره ملایم" },
  { value: "soft-lighten", label: "روشن ملایم" },
  { value: "warm-film", label: "گرم و سینمایی" },
  { value: "subtle-blur", label: "بلور بسیار ملایم" },
];

function createBannerId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `home-banner-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function toInitialForm(config: HomeHeroConfig): HomeFormState {
  const mappedBanners =
    config.banners?.map((banner) => ({
      id: banner.id || createBannerId(),
      badgeText: banner.badgeText || "",
      heroHtml: banner.heroHtml || "",
      secondLineAsTitle: banner.secondLineAsTitle,
      image: banner.image || null,
      backgroundMobileImage: banner.backgroundMobileImage || null,
      backgroundDesktopImage: banner.backgroundDesktopImage || null,
      effectPreset: banner.effectPreset || "none",
      ctaMode: banner.ctaMode || "none",
      ctaTargetId: banner.ctaTargetId || null,
    })) || [];

  return {
    featuredArticleIds: config.featuredArticleIds || [],
    autoRotateSeconds:
      typeof config.autoRotateSeconds === "number" &&
      Number.isFinite(config.autoRotateSeconds)
        ? Math.max(0, Math.floor(config.autoRotateSeconds))
        : 0,
    banners:
      mappedBanners.length > 0
        ? mappedBanners
        : [
            {
              id: createBannerId(),
              ...DEFAULT_BANNER_TEMPLATE,
            },
          ],
  };
}

function moveItemInArray<T>(
  items: T[],
  index: number,
  direction: "up" | "down",
): T[] {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function createEmptyBanner(): HomeBannerFormState {
  return {
    id: createBannerId(),
    ...DEFAULT_BANNER_TEMPLATE,
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
  const [activeBannerId, setActiveBannerId] = useState(
    config.banners[0]?.id || "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [frameUploadStatus, setFrameUploadStatus] = useState(
    createIdleUploadTaskState,
  );
  const [mobileBackgroundUploadStatus, setMobileBackgroundUploadStatus] =
    useState(createIdleUploadTaskState);
  const [desktopBackgroundUploadStatus, setDesktopBackgroundUploadStatus] =
    useState(createIdleUploadTaskState);
  const [nextFeaturedArticleId, setNextFeaturedArticleId] = useState("");

  useEffect(() => {
    const next = toInitialForm(config);
    setFormData(next);
    setActiveBannerId(next.banners[0]?.id || "");
  }, [config]);

  useEffect(() => {
    if (!formData.banners.length) {
      setActiveBannerId("");
      return;
    }

    if (formData.banners.some((banner) => banner.id === activeBannerId)) {
      return;
    }

    setActiveBannerId(formData.banners[0].id);
  }, [activeBannerId, formData.banners]);

  useEffect(() => {
    setFrameUploadStatus(createIdleUploadTaskState());
    setMobileBackgroundUploadStatus(createIdleUploadTaskState());
    setDesktopBackgroundUploadStatus(createIdleUploadTaskState());
  }, [activeBannerId]);

  const activeBannerIndex = useMemo(
    () => formData.banners.findIndex((banner) => banner.id === activeBannerId),
    [activeBannerId, formData.banners],
  );

  const activeBanner =
    activeBannerIndex >= 0 ? formData.banners[activeBannerIndex] : null;

  const selectedFeaturedArticles = useMemo(
    () =>
      formData.featuredArticleIds
        .map((id) => articleOptions.find((article) => article.id === id))
        .filter((article): article is HeroTargetOption => Boolean(article)),
    [articleOptions, formData.featuredArticleIds],
  );

  const availableFeaturedArticles = useMemo(
    () =>
      articleOptions.filter(
        (article) => !formData.featuredArticleIds.includes(article.id),
      ),
    [articleOptions, formData.featuredArticleIds],
  );

  useEffect(() => {
    if (
      nextFeaturedArticleId &&
      availableFeaturedArticles.some(
        (article) => article.id === nextFeaturedArticleId,
      )
    ) {
      return;
    }

    setNextFeaturedArticleId(availableFeaturedArticles[0]?.id || "");
  }, [availableFeaturedArticles, nextFeaturedArticleId]);

  const currentTargetOptions = useMemo(() => {
    if (!activeBanner) return [];
    if (activeBanner.ctaMode === "article") return articleOptions;
    if (activeBanner.ctaMode === "radio") return radioOptions;
    if (activeBanner.ctaMode === "magazine") return magazineOptions;
    return [];
  }, [activeBanner, articleOptions, magazineOptions, radioOptions]);

  const activeFrameImage = getUploadUrl(activeBanner?.image || "");
  const activeMobileBackgroundImage = getUploadUrl(
    activeBanner?.backgroundMobileImage || "",
  );
  const activeDesktopBackgroundImage = getUploadUrl(
    activeBanner?.backgroundDesktopImage || "",
  );

  const updateActiveBanner = (
    updater: (banner: HomeBannerFormState) => HomeBannerFormState,
  ) => {
    if (!activeBanner) return;

    setFormData((prev) => ({
      ...prev,
      banners: prev.banners.map((banner) =>
        banner.id === activeBanner.id ? updater(banner) : banner,
      ),
    }));
  };

  const addBanner = () => {
    setError("");
    setSuccess("");

    const nextBanner = createEmptyBanner();

    setFormData((prev) => ({
      ...prev,
      banners: [nextBanner, ...prev.banners],
    }));
    setActiveBannerId(nextBanner.id);
  };

  const moveBanner = (index: number, direction: "up" | "down") => {
    setFormData((prev) => ({
      ...prev,
      banners: moveItemInArray(prev.banners, index, direction),
    }));
  };

  const removeBanner = (bannerId: string) => {
    setError("");
    setSuccess("");

    if (formData.banners.length <= 1) {
      setError("آخرین بنر قابل حذف نیست");
      return;
    }

    let nextActiveId: string | null = null;

    setFormData((prev) => {
      const nextBanners = prev.banners.filter(
        (banner) => banner.id !== bannerId,
      );

      if (bannerId === activeBannerId) {
        nextActiveId = nextBanners[0]?.id || "";
      }

      return {
        ...prev,
        banners: nextBanners,
      };
    });

    if (nextActiveId !== null) {
      setActiveBannerId(nextActiveId);
    }
  };

  const addFeaturedArticle = () => {
    if (!nextFeaturedArticleId) return;

    setFormData((prev) => {
      if (prev.featuredArticleIds.includes(nextFeaturedArticleId)) return prev;
      if (prev.featuredArticleIds.length >= 3) return prev;

      return {
        ...prev,
        featuredArticleIds: [...prev.featuredArticleIds, nextFeaturedArticleId],
      };
    });
  };

  const removeFeaturedArticle = (articleId: string) => {
    setFormData((prev) => ({
      ...prev,
      featuredArticleIds: prev.featuredArticleIds.filter(
        (id) => id !== articleId,
      ),
    }));
  };

  const moveFeaturedArticle = (index: number, direction: "up" | "down") => {
    setFormData((prev) => ({
      ...prev,
      featuredArticleIds: moveItemInArray(
        prev.featuredArticleIds,
        index,
        direction,
      ),
    }));
  };

  const uploadBannerAsset = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "image" | "backgroundMobileImage" | "backgroundDesktopImage",
    setStatus: React.Dispatch<
      React.SetStateAction<ReturnType<typeof createIdleUploadTaskState>>
    >,
    uploadErrorLabel: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !activeBanner) return;

    setError("");
    setSuccess("");
    setStatus({ phase: "uploading", progress: 0, error: "" });

    try {
      const uploaded = await uploadAssetWithProgress(file, {
        retries: 4,
        onProgress: (progress) =>
          setStatus({ phase: "uploading", progress, error: "" }),
      });

      updateActiveBanner((banner) => ({
        ...banner,
        [field]: uploaded.url,
      }));

      setStatus({ phase: "success", progress: 100, error: "" });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error && uploadError.message
          ? uploadError.message
          : uploadErrorLabel;
      setError(message);
      setStatus({ phase: "error", progress: 0, error: message });
    } finally {
      event.target.value = "";
    }
  };

  const removeBackgroundImages = () => {
    if (!activeBanner) return;

    updateActiveBanner((banner) => ({
      ...banner,
      backgroundMobileImage: null,
      backgroundDesktopImage: null,
    }));

    setMobileBackgroundUploadStatus(createIdleUploadTaskState());
    setDesktopBackgroundUploadStatus(createIdleUploadTaskState());
  };

  const removeFrameImage = () => {
    if (!activeBanner) return;

    updateActiveBanner((banner) => ({
      ...banner,
      image: null,
    }));

    setFrameUploadStatus(createIdleUploadTaskState());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!formData.banners.length) {
        setError("حداقل یک بنر باید وجود داشته باشد");
        return;
      }

      const invalidBackgroundBannerIndex = formData.banners.findIndex(
        (banner) => {
          const hasMobile = Boolean(banner.backgroundMobileImage);
          const hasDesktop = Boolean(banner.backgroundDesktopImage);
          return hasMobile !== hasDesktop;
        },
      );

      if (invalidBackgroundBannerIndex >= 0) {
        setError(
          `بنر شماره ${invalidBackgroundBannerIndex + 1} باید تصویر پس زمینه موبایل و دسکتاپ را با هم داشته باشد`,
        );
        return;
      }

      const result = await updateHomeHeroContent({
        featuredArticleIds: formData.featuredArticleIds,
        autoRotateSeconds: Math.max(
          0,
          Math.floor(formData.autoRotateSeconds || 0),
        ),
        banners: formData.banners.map((banner) => ({
          id: banner.id,
          badgeText: banner.badgeText,
          heroHtml: banner.heroHtml,
          secondLineAsTitle: banner.secondLineAsTitle,
          image: banner.image,
          backgroundMobileImage: banner.backgroundMobileImage,
          backgroundDesktopImage: banner.backgroundDesktopImage,
          effectPreset: banner.effectPreset,
          ctaMode: banner.ctaMode,
          ctaTargetId:
            banner.ctaMode === "none" ? null : banner.ctaTargetId || null,
        })),
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
      className="space-y-6 max-w-4xl text-slate-900 dark:text-slate-100"
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

      <div className="space-y-6 rounded-xl border border-slate-300 dark:border-slate-700 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="block text-sm font-medium mb-1">
              زمان جابه جایی خودکار بنرها (ثانیه)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={formData.autoRotateSeconds}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  autoRotateSeconds: Math.max(
                    0,
                    Number.isFinite(Number(event.target.value))
                      ? Math.floor(Number(event.target.value))
                      : 0,
                  ),
                }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              اگر مقدار را روی 0 بگذارید، چرخش خودکار خاموش می شود.
            </p>
          </div>

          <Button type="button" onClick={addBanner} className="sm:w-auto">
            افزودن بنر جدید
          </Button>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">ترتیب بنرها</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            اولین بنر این لیست، اولین بنر نمایشی در صفحه خانه خواهد بود.
          </p>

          <div className="space-y-2">
            {formData.banners.map((banner, index) => {
              const isActive = banner.id === activeBannerId;
              return (
                <div
                  key={banner.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                    isActive
                      ? "border-primary/70 bg-primary/5"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveBannerId(banner.id)}
                    className="flex-1 text-right"
                  >
                    <span className="text-sm font-medium block truncate">
                      {index + 1}. {banner.badgeText || "بنر بدون برچسب"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {banner.ctaMode === "none"
                        ? "بدون دکمه"
                        : `دکمه: ${banner.ctaMode}`}
                    </span>
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveBanner(index, "up")}
                      disabled={index === 0}
                      className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      بالا
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBanner(index, "down")}
                      disabled={index === formData.banners.length - 1}
                      className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      پایین
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBanner(banner.id)}
                      disabled={formData.banners.length <= 1}
                      className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-40"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {activeBanner && (
          <div className="space-y-6 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
            <h3 className="text-lg font-bold">
              ویرایش بنر شماره {activeBannerIndex + 1}
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1">
                متن برچسب
              </label>
              <input
                type="text"
                value={activeBanner.badgeText}
                onChange={(event) =>
                  updateActiveBanner((banner) => ({
                    ...banner,
                    badgeText: event.target.value,
                  }))
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
                value={activeBanner.heroHtml}
                onChange={(nextContent) =>
                  updateActiveBanner((banner) => ({
                    ...banner,
                    heroHtml: nextContent,
                  }))
                }
              />
              <div className="mt-2 space-y-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={activeBanner.secondLineAsTitle}
                    onChange={(event) =>
                      updateActiveBanner((banner) => ({
                        ...banner,
                        secondLineAsTitle: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span>خط دوم تیتر هم درشت و بلد نمایش داده شود</span>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  خط اول همیشه به صورت تیتر درشت نمایش داده می شود. می توانید خط
                  دوم را هم درشت نگه دارید یا آن را مثل متن عادی نمایش دهید.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">تصویر قاب بنر</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) =>
                  uploadBannerAsset(
                    event,
                    "image",
                    setFrameUploadStatus,
                    "آپلود تصویر قاب انجام نشد",
                  )
                }
                disabled={frameUploadStatus.phase === "uploading"}
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <UploadStatus
                status={frameUploadStatus}
                uploadingLabel="در حال آپلود تصویر قاب..."
                successLabel="تصویر قاب با موفقیت آپلود شد"
                errorLabel="آپلود تصویر قاب انجام نشد"
              />

              {activeFrameImage ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeFrameImage}
                    alt="پیش نمایش تصویر قاب"
                    className="w-full max-w-sm h-auto max-h-64 rounded-xl border border-slate-300 dark:border-slate-700 object-cover"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={removeFrameImage}
                    className="px-3 py-1.5 text-xs rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    حذف تصویر قاب
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  هنوز تصویری برای قاب بنر انتخاب نشده است.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  افکت تصویر پس زمینه
                </label>
                <select
                  value={activeBanner.effectPreset}
                  onChange={(event) =>
                    updateActiveBanner((banner) => ({
                      ...banner,
                      effectPreset: event.target.value as HomeHeroEffectPreset,
                    }))
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {EFFECT_PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  شدت افکت ها ملایم است تا هویت اصلی تصویر حفظ شود.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    تصویر پس زمینه موبایل
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) =>
                      uploadBannerAsset(
                        event,
                        "backgroundMobileImage",
                        setMobileBackgroundUploadStatus,
                        "آپلود پس زمینه موبایل انجام نشد",
                      )
                    }
                    disabled={
                      mobileBackgroundUploadStatus.phase === "uploading"
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <UploadStatus
                    status={mobileBackgroundUploadStatus}
                    uploadingLabel="در حال آپلود پس زمینه موبایل..."
                    successLabel="پس زمینه موبایل آپلود شد"
                    errorLabel="آپلود پس زمینه موبایل انجام نشد"
                  />
                  {activeMobileBackgroundImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeMobileBackgroundImage}
                      alt="پیش نمایش پس زمینه موبایل"
                      className="mt-2 w-full max-w-xs h-auto max-h-52 rounded-lg border border-slate-300 dark:border-slate-700 object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    تصویر پس زمینه دسکتاپ
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) =>
                      uploadBannerAsset(
                        event,
                        "backgroundDesktopImage",
                        setDesktopBackgroundUploadStatus,
                        "آپلود پس زمینه دسکتاپ انجام نشد",
                      )
                    }
                    disabled={
                      desktopBackgroundUploadStatus.phase === "uploading"
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <UploadStatus
                    status={desktopBackgroundUploadStatus}
                    uploadingLabel="در حال آپلود پس زمینه دسکتاپ..."
                    successLabel="پس زمینه دسکتاپ آپلود شد"
                    errorLabel="آپلود پس زمینه دسکتاپ انجام نشد"
                  />
                  {activeDesktopBackgroundImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeDesktopBackgroundImage}
                      alt="پیش نمایش پس زمینه دسکتاپ"
                      className="mt-2 w-full max-w-sm h-auto max-h-52 rounded-lg border border-slate-300 dark:border-slate-700 object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={removeBackgroundImages}
                    disabled={
                      !activeBanner.backgroundMobileImage &&
                      !activeBanner.backgroundDesktopImage
                    }
                    className="px-3 py-1.5 text-xs rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    پاک کردن پس زمینه بنر
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تصویر پس زمینه باید برای موبایل و دسکتاپ با هم تنظیم شود.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                وضعیت دکمه اصلی
              </label>
              <select
                value={activeBanner.ctaMode}
                onChange={(event) => {
                  const nextMode = event.target.value as HomeHeroCtaMode;
                  updateActiveBanner((banner) => ({
                    ...banner,
                    ctaMode: nextMode,
                    ctaTargetId:
                      nextMode === "none" ? null : banner.ctaTargetId,
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

            {activeBanner.ctaMode !== "none" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">مقصد دکمه</label>
                <select
                  value={activeBanner.ctaTargetId || ""}
                  onChange={(event) =>
                    updateActiveBanner((banner) => ({
                      ...banner,
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
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-300 dark:border-slate-700 p-4 sm:p-5">
        <div>
          <label className="block text-sm font-medium">
            نوشته های برگزیده خانه
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            حداکثر 3 نوشته انتخاب کنید و ترتیب نمایش آنها را مشخص کنید.
          </p>
        </div>

        {selectedFeaturedArticles.length ? (
          <div className="space-y-2">
            {selectedFeaturedArticles.map((article, index) => (
              <div
                key={article.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
              >
                <span className="text-sm truncate">
                  {index + 1}. {article.title}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveFeaturedArticle(index, "up")}
                    disabled={index === 0}
                    className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    بالا
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFeaturedArticle(index, "down")}
                    disabled={index === selectedFeaturedArticles.length - 1}
                    className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    پایین
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFeaturedArticle(article.id)}
                    className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            هنوز نوشته ای برای بخش برگزیده انتخاب نشده است.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={nextFeaturedArticleId}
            onChange={(event) => setNextFeaturedArticleId(event.target.value)}
            disabled={
              formData.featuredArticleIds.length >= 3 ||
              availableFeaturedArticles.length === 0
            }
            className="flex-1 px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {availableFeaturedArticles.length === 0 ? (
              <option value="">نوشته جدیدی برای افزودن وجود ندارد</option>
            ) : (
              availableFeaturedArticles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title}
                </option>
              ))
            )}
          </select>
          <Button
            type="button"
            onClick={addFeaturedArticle}
            disabled={
              !nextFeaturedArticleId || formData.featuredArticleIds.length >= 3
            }
            className="sm:w-auto"
          >
            افزودن
          </Button>
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "در حال ذخیره..." : "ذخیره تنظیمات خانه"}
        </Button>
      </div>
    </form>
  );
}
