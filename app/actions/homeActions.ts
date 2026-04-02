"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import {
  getDefaultHomeHeroConfig,
  readHomeHeroConfig,
  type HomeHeroConfig,
  type HomeHeroCtaMode,
  writeHomeHeroConfig,
} from "@/lib/homeHero";

export type UpdateHomeHeroInput = {
  badgeText?: string;
  heroHtml?: string;
  image?: string | null;
  ctaMode?: HomeHeroCtaMode;
  ctaTargetId?: string | null;
};

function normalizeInput(
  input: UpdateHomeHeroInput,
): Omit<HomeHeroConfig, "updatedAt"> {
  const fallback = getDefaultHomeHeroConfig();

  const ctaMode: HomeHeroCtaMode =
    input.ctaMode === "article" ||
    input.ctaMode === "radio" ||
    input.ctaMode === "magazine" ||
    input.ctaMode === "none"
      ? input.ctaMode
      : "none";

  const ctaTargetId =
    ctaMode === "none"
      ? null
      : (typeof input.ctaTargetId === "string" && input.ctaTargetId.trim()) ||
        null;

  return {
    badgeText:
      typeof input.badgeText === "string"
        ? input.badgeText.trim()
        : fallback.badgeText,
    heroHtml:
      typeof input.heroHtml === "string" && input.heroHtml.trim()
        ? input.heroHtml.trim()
        : fallback.heroHtml,
    image:
      typeof input.image === "string" && input.image.trim()
        ? input.image.trim()
        : null,
    ctaMode,
    ctaTargetId,
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
    return { success: false, error: "Failed to update home hero content" };
  }
}
