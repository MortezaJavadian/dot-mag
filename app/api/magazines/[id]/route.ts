import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const MAGAZINE_TAG = "magazines";
const MAGAZINE_CACHE_PROFILE = "default";

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
    const magazine = await prisma.magazine.findUnique({
      where: { id },
      include: { pages: { orderBy: { number: "asc" } } },
    });

    if (!magazine) {
      return NextResponse.json(
        { error: "Magazine not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(magazine);
  } catch (error) {
    console.error("GET /api/magazines/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch magazine" },
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

    // Generate slug if title changed
    const updateData: Prisma.MagazineUpdateInput = {
      ...data,
    } as Prisma.MagazineUpdateInput;
    if (data.title) {
      function generateSlug(title: string): string {
        return title
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\u0600-\u06FF\w-]/g, "")
          .replace(/-+/g, "-");
      }
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

    const magazine = await prisma.magazine.update({
      where: { id },
      data: updateData,
      include: { pages: { orderBy: { number: "asc" } } },
    });

    revalidateTag(MAGAZINE_TAG, MAGAZINE_CACHE_PROFILE);

    return NextResponse.json(magazine);
  } catch (error) {
    console.error("PUT /api/magazines/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update magazine" },
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

    await prisma.magazine.delete({
      where: { id },
    });

    revalidateTag(MAGAZINE_TAG, MAGAZINE_CACHE_PROFILE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/magazines/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete magazine" },
      { status: 500 },
    );
  }
}
