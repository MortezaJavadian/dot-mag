"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import {
  getDefaultHomeHeroConfig,
  readHomeHeroConfig,
  type HomeHeroBannerConfig,
  type HomeHeroConfig,
  type HomeHeroCtaMode,
  type HomeHeroEffectPreset,
  writeHomeHeroConfig,
} from "@/lib/homeHero";

export type UpdateHomeHeroBannerInput = {
  id?: string;
  badgeText?: string;
  heroHtml?: string;
  secondLineAsTitle?: boolean;
  image?: string | null;
  backgroundMobileImage?: string | null;
  backgroundDesktopImage?: string | null;
  effectPreset?: HomeHeroEffectPreset;
  ctaMode?: HomeHeroCtaMode;
  ctaTargetId?: string | null;
};

export type UpdateHomeHeroInput = {
  featuredArticleIds?: string[];
  autoRotateSeconds?: number;
  banners?: UpdateHomeHeroBannerInput[];
};

function isValidEffectPreset(value: string): value is HomeHeroEffectPreset {
  return (
    value === "none" ||
    value === "soft-darken" ||
    value === "soft-lighten" ||
    value === "warm-film" ||
    value === "subtle-blur"
  );
}

function normalizeBannerInput(
  input: UpdateHomeHeroBannerInput,
  index: number,
  fallback: HomeHeroBannerConfig,
): HomeHeroBannerConfig {
  const ctaMode: HomeHeroCtaMode =
    input.ctaMode === "article" ||
    input.ctaMode === "radio" ||
    input.ctaMode === "magazine" ||
    input.ctaMode === "none"
      ? input.ctaMode
      : fallback.ctaMode;

  const ctaTargetId =
    ctaMode === "none"
      ? null
      : (typeof input.ctaTargetId === "string" && input.ctaTargetId.trim()) ||
        null;

  const backgroundMobileImage =
    typeof input.backgroundMobileImage === "string" &&
    input.backgroundMobileImage.trim()
      ? input.backgroundMobileImage.trim()
      : null;

  const backgroundDesktopImage =
    typeof input.backgroundDesktopImage === "string" &&
    input.backgroundDesktopImage.trim()
      ? input.backgroundDesktopImage.trim()
      : null;

  if (Boolean(backgroundMobileImage) !== Boolean(backgroundDesktopImage)) {
    throw new Error(
      "برای هر بنر باید تصویر پس زمینه موبایل و دسکتاپ با هم تنظیم شوند",
    );
  }

  const effectPresetRaw =
    typeof input.effectPreset === "string" ? input.effectPreset.trim() : "";
  const effectPreset = isValidEffectPreset(effectPresetRaw)
    ? effectPresetRaw
    : fallback.effectPreset;

  return {
    id:
      (typeof input.id === "string" && input.id.trim()) ||
      `home-banner-${index + 1}`,
    badgeText:
      typeof input.badgeText === "string"
        ? input.badgeText.trim()
        : fallback.badgeText,
    heroHtml:
      typeof input.heroHtml === "string"
        ? input.heroHtml.trim()
        : fallback.heroHtml,
    secondLineAsTitle:
      typeof input.secondLineAsTitle === "boolean"
        ? input.secondLineAsTitle
        : fallback.secondLineAsTitle,
    image:
      typeof input.image === "string" && input.image.trim()
        ? input.image.trim()
        : null,
    backgroundMobileImage,
    backgroundDesktopImage,
    effectPreset,
    ctaMode,
    ctaTargetId,
  };
}

function normalizeInput(
  input: UpdateHomeHeroInput,
): Omit<HomeHeroConfig, "updatedAt"> {
  const fallback = getDefaultHomeHeroConfig();

  const featuredArticleIds = Array.isArray(input.featuredArticleIds)
    ? input.featuredArticleIds
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, 3)
    : fallback.featuredArticleIds;

  const autoRotateSeconds =
    typeof input.autoRotateSeconds === "number" &&
    Number.isFinite(input.autoRotateSeconds)
      ? Math.max(0, Math.floor(input.autoRotateSeconds))
      : fallback.autoRotateSeconds;

  const fallbackBanner = fallback.banners[0];
  const rawBanners = Array.isArray(input.banners)
    ? input.banners
    : fallback.banners;

  const banners = rawBanners.map((banner, index) =>
    normalizeBannerInput(banner, index, fallbackBanner),
  );

  if (!banners.length) {
    throw new Error("حداقل یک بنر برای هدر صفحه خانه لازم است");
  }

  return {
    featuredArticleIds,
    autoRotateSeconds,
    banners,
  };
}

export async function getHomeHeroContent() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await readHomeHeroConfig();
    return { success: true, data };
  } catch (error) {
    console.error("Error loading home hero content:", error);
    return { success: false, error: "Failed to load home hero content" };
  }
}

export async function updateHomeHeroContent(input: UpdateHomeHeroInput) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const normalized = normalizeInput(input);
    const data = await writeHomeHeroConfig(normalized);

    revalidatePath("/");
    revalidatePath("/admin-panel");

    return { success: true, data };
  } catch (error) {
    console.error("Error updating home hero content:", error);
    if (error instanceof Error && error.message.trim()) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update home hero content" };
  }
}
