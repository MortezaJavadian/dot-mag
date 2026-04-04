import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
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

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("GET /api/articles/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
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
    const { personId, ...articleData } = data;
    const updateData: Prisma.ArticleUpdateInput = {
      ...articleData,
    } as Prisma.ArticleUpdateInput;

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

    if (Object.prototype.hasOwnProperty.call(data, "personId")) {
      const normalizedPersonId =
        typeof personId === "string" && personId.trim() ? personId : null;

      updateData.person = normalizedPersonId
        ? { connect: { id: normalizedPersonId } }
        : { disconnect: true };
    }

    const article = await prisma.article.update({
      where: { id },
      data: updateData,
      include: {
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

    return NextResponse.json(article);
  } catch (error) {
    console.error("PUT /api/articles/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
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

    await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/articles/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 },
    );
  }
}
