import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const RADIO_TAG = "radios";
const RADIO_CACHE_PROFILE = "default";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FF\w-]/g, "")
    .replace(/-+/g, "-");
}

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

function normalizeOptionalText(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalSize(value?: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value <= 0) {
    return null;
  }

  return Math.floor(value);
}

function normalizePlayerAudioQuality(
  value?: string,
): "low" | "medium" | "high" {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const radio = await prisma.radio.findUnique({
      where: { id },
      include: {
        segments: { orderBy: { number: "asc" } },
        person: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            isDotTeamMember: true,
          },
        },
      },
    });

    if (!radio) {
      return NextResponse.json({ error: "Radio not found" }, { status: 404 });
    }

    return NextResponse.json(radio);
  } catch (error) {
    console.error("GET /api/radios/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch radio" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const data = await request.json();
    const { personId, ...radioData } = data;

    const updateData: Prisma.RadioUpdateInput = {
      ...radioData,
    } as Prisma.RadioUpdateInput;
    if (typeof data.title === "string") {
      updateData.slug = generateSlug(data.title);
    }

    if (typeof data.sortDate === "string") {
      updateData.sortDate = resolveSortDate(data.sortDate);
    }

    if (data.summary !== undefined) {
      updateData.summary = normalizeOptionalText(data.summary);
    }

    if (data.audioUrlLow !== undefined) {
      updateData.audioUrlLow = normalizeOptionalText(data.audioUrlLow);
    }

    if (data.audioUrlMedium !== undefined) {
      updateData.audioUrlMedium = normalizeOptionalText(data.audioUrlMedium);
    }

    if (data.audioUrlHigh !== undefined) {
      updateData.audioUrlHigh = normalizeOptionalText(data.audioUrlHigh);
    }

    if (data.audioSizeLow !== undefined) {
      updateData.audioSizeLow = normalizeOptionalSize(data.audioSizeLow);
    }

    if (data.audioSizeMedium !== undefined) {
      updateData.audioSizeMedium = normalizeOptionalSize(data.audioSizeMedium);
    }

    if (data.audioSizeHigh !== undefined) {
      updateData.audioSizeHigh = normalizeOptionalSize(data.audioSizeHigh);
    }

    if (data.playerAudioQuality !== undefined) {
      updateData.playerAudioQuality = normalizePlayerAudioQuality(
        data.playerAudioQuality,
      );
    }

    if (typeof data.publishedAt === "string") {
      updateData.publishedAt = resolveDisplayDate(
        data.publishedAt,
        data.sortDate,
      );
    }

    if (Object.prototype.hasOwnProperty.call(data, "personId")) {
      const normalizedPersonId =
        typeof personId === "string" && personId.trim() ? personId : null;

      updateData.person = normalizedPersonId
        ? { connect: { id: normalizedPersonId } }
        : { disconnect: true };
    }

    const radio = await prisma.radio.update({
      where: { id },
      data: updateData,
      include: {
        segments: { orderBy: { number: "asc" } },
        person: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            isDotTeamMember: true,
          },
        },
      },
    });

    revalidateTag(RADIO_TAG, RADIO_CACHE_PROFILE);

    return NextResponse.json(radio);
  } catch (error) {
    console.error("PUT /api/radios/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update radio" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    await prisma.radio.delete({ where: { id } });

    revalidateTag(RADIO_TAG, RADIO_CACHE_PROFILE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/radios/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete radio" },
      { status: 500 },
    );
  }
}
