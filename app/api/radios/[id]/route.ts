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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const radio = await prisma.radio.findUnique({
      where: { id },
      include: { segments: { orderBy: { number: "asc" } } },
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

    const updateData: Prisma.RadioUpdateInput = {
      ...data,
    } as Prisma.RadioUpdateInput;
    if (typeof data.title === "string") {
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
