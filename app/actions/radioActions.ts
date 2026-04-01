"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FF\w-]/g, "")
    .replace(/-+/g, "-");
}

const RADIO_TAG = "radios";
const RADIO_CACHE_PROFILE = "default";

function revalidateRadiosCache() {
  revalidateTag(RADIO_TAG, RADIO_CACHE_PROFILE);
}

type CreateRadioInput = {
  title: string;
  intro: string;
  cover?: string | null;
  audioUrl: string;
  publishedAt: string;
  sortDate?: string;
  durationSec?: number | null;
};

type UpdateRadioInput = Partial<CreateRadioInput>;

type CreateRadioSegmentInput = {
  title: string;
  audioUrl: string;
  durationSec?: number | null;
};

type UpdateRadioSegmentInput = Partial<
  Omit<
    Prisma.RadioSegmentUpdateInput,
    "id" | "createdAt" | "updatedAt" | "radio" | "number"
  >
>;

function resolveSortDate(value?: string): Date {
  if (!value) return new Date();

  const normalized = value.trim();
  if (!normalized) return new Date();

  const isoLike = /^\d{4}-\d{2}-\d{2}$/;
  const candidate = isoLike.test(normalized)
    ? new Date(`${normalized}T00:00:00.000Z`)
    : new Date(normalized);

  if (Number.isNaN(candidate.getTime())) {
    return new Date();
  }

  return candidate;
}

function resolveDisplayDate(displayDate?: string, sortDate?: string): string {
  const normalizedDisplayDate = displayDate?.trim();
  if (normalizedDisplayDate) {
    return normalizedDisplayDate;
  }

  const normalizedSortDate = sortDate?.trim();
  if (normalizedSortDate) {
    return normalizedSortDate;
  }

  return new Date().toISOString().split("T")[0];
}

async function requireAdmin() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false as const, error: "Unauthorized" };
  }

  return { success: true as const };
}

export async function getRadios() {
  try {
    const radios = await prisma.radio.findMany({
      include: { segments: { orderBy: { number: "asc" } } },
      orderBy: { sortDate: "desc" },
    });

    return { success: true, data: radios };
  } catch (error) {
    console.error("Get radios error:", error);
    return { success: false, error: "Failed to fetch radios" };
  }
}

export async function getRadio(id: string) {
  try {
    const radio = await prisma.radio.findUnique({
      where: { id },
      include: { segments: { orderBy: { number: "asc" } } },
    });

    return { success: true, data: radio };
  } catch (error) {
    console.error("Get radio error:", error);
    return { success: false, error: "Failed to fetch radio" };
  }
}

export async function createRadio(data: CreateRadioInput) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    const slug = generateSlug(data.title);

    const radio = await prisma.radio.create({
      data: {
        ...data,
        slug,
        publishedAt: resolveDisplayDate(data.publishedAt, data.sortDate),
        sortDate: resolveSortDate(data.sortDate),
      },
      include: { segments: { orderBy: { number: "asc" } } },
    });

    revalidateRadiosCache();

    return { success: true, data: radio };
  } catch (error) {
    console.error("Create radio error:", error);
    return { success: false, error: "Failed to create radio" };
  }
}

export async function updateRadio(id: string, data: UpdateRadioInput) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    const updateData: Prisma.RadioUpdateInput = {
      ...data,
    } as Prisma.RadioUpdateInput;

    if (data.title) {
      updateData.slug = generateSlug(data.title);
    }

    if (typeof data.sortDate === "string") {
      updateData.sortDate = resolveSortDate(data.sortDate);
    }

    if (typeof data.publishedAt === "string") {
      updateData.publishedAt = resolveDisplayDate(
        data.publishedAt,
        data.sortDate,
      );
    }

    const radio = await prisma.radio.update({
      where: { id },
      data: updateData,
      include: { segments: { orderBy: { number: "asc" } } },
    });

    revalidateRadiosCache();

    return { success: true, data: radio };
  } catch (error) {
    console.error("Update radio error:", error);
    return { success: false, error: "Failed to update radio" };
  }
}

export async function deleteRadio(id: string) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    await prisma.radio.delete({ where: { id } });
    revalidateRadiosCache();
    return { success: true };
  } catch (error) {
    console.error("Delete radio error:", error);
    return { success: false, error: "Failed to delete radio" };
  }
}

export async function addRadioSegment(
  radioId: string,
  segment: CreateRadioSegmentInput,
) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    const newSegment = await prisma.$transaction(async (tx) => {
      const segmentCount = await tx.radioSegment.count({
        where: { radioId },
      });

      return tx.radioSegment.create({
        data: {
          radioId,
          number: segmentCount + 1,
          title: segment.title,
          audioUrl: segment.audioUrl,
          durationSec: segment.durationSec ?? null,
        },
      });
    });

    revalidateRadiosCache();

    return { success: true, data: newSegment };
  } catch (error) {
    console.error("Add radio segment error:", error);
    return { success: false, error: "Failed to add radio segment" };
  }
}

export async function updateRadioSegment(
  segmentId: string,
  data: UpdateRadioSegmentInput,
) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    const segment = await prisma.radioSegment.update({
      where: { id: segmentId },
      data,
    });

    revalidateRadiosCache();

    return { success: true, data: segment };
  } catch (error) {
    console.error("Update radio segment error:", error);
    return { success: false, error: "Failed to update radio segment" };
  }
}

export async function deleteRadioSegment(segmentId: string) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingSegment = await tx.radioSegment.findUnique({
        where: { id: segmentId },
        select: { radioId: true },
      });

      if (!existingSegment) {
        throw new Error("Segment not found");
      }

      await tx.radioSegment.delete({ where: { id: segmentId } });

      const remaining = await tx.radioSegment.findMany({
        where: { radioId: existingSegment.radioId },
        orderBy: { number: "asc" },
        select: { id: true },
      });

      for (let i = 0; i < remaining.length; i++) {
        await tx.radioSegment.update({
          where: { id: remaining[i].id },
          data: { number: i + 1 },
        });
      }
    });

    revalidateRadiosCache();

    return { success: true };
  } catch (error) {
    console.error("Delete radio segment error:", error);
    return { success: false, error: "Failed to delete radio segment" };
  }
}

export async function reorderRadioSegments(
  radioId: string,
  segmentIds: string[],
) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    const existing = await prisma.radioSegment.findMany({
      where: { radioId },
      orderBy: { number: "asc" },
      select: { id: true },
    });

    const existingSet = new Set(existing.map((segment) => segment.id));

    if (existing.length !== segmentIds.length) {
      return { success: false, error: "Invalid segment ordering" };
    }

    for (const segmentId of segmentIds) {
      if (!existingSet.has(segmentId)) {
        return { success: false, error: "Invalid segment ordering" };
      }
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < segmentIds.length; i++) {
        await tx.radioSegment.update({
          where: { id: segmentIds[i] },
          data: { number: 1000 + i },
        });
      }

      for (let i = 0; i < segmentIds.length; i++) {
        await tx.radioSegment.update({
          where: { id: segmentIds[i] },
          data: { number: i + 1 },
        });
      }
    });

    const reordered = await prisma.radioSegment.findMany({
      where: { radioId },
      orderBy: { number: "asc" },
    });

    revalidateRadiosCache();

    return { success: true, data: reordered };
  } catch (error) {
    console.error("Reorder radio segments error:", error);
    return { success: false, error: "Failed to reorder radio segments" };
  }
}
