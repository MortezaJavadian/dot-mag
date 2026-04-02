import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const MAGAZINE_TAG = "magazines";
const MAGAZINE_CACHE_PROFILE = "default";

type MagazineQueryMode = "summary" | "full";

function resolveQueryMode(value: string | null): MagazineQueryMode {
  if (value?.trim().toLowerCase() === "summary") {
    return "summary";
  }

  return "full";
}

function resolveTakeValue(value: string | null): number | undefined {
  if (!value) return undefined;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.min(parsed, 50);
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = resolveQueryMode(searchParams.get("mode"));
    const slug = searchParams.get("slug")?.trim() || undefined;
    const take = resolveTakeValue(searchParams.get("limit"));

    const where = slug ? { slug } : undefined;

    const magazines =
      mode === "summary"
        ? await prisma.magazine.findMany({
            where,
            take,
            orderBy: [{ sortDate: "desc" }, { createdAt: "desc" }],
            select: {
              id: true,
              slug: true,
              title: true,
              subtitle: true,
              cover: true,
              publishedAt: true,
              pageCount: true,
            },
          })
        : await prisma.magazine.findMany({
            where,
            take,
            include: { pages: { orderBy: { number: "asc" } } },
            orderBy: [{ sortDate: "desc" }, { createdAt: "desc" }],
          });

    return NextResponse.json(magazines);
  } catch (error) {
    console.error("GET /api/magazines error:", error);
    return NextResponse.json(
      { error: "Failed to fetch magazines" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const slug = generateSlug(data.title);

    const magazine = await prisma.magazine.create({
      data: {
        ...data,
        slug,
        publishedAt: resolveDisplayDate(data.publishedAt, data.sortDate),
        sortDate: resolveSortDate(data.sortDate),
      },
      include: { pages: { orderBy: { number: "asc" } } },
    });

    revalidateTag(MAGAZINE_TAG, MAGAZINE_CACHE_PROFILE);

    return NextResponse.json(magazine, { status: 201 });
  } catch (error) {
    console.error("POST /api/magazines error:", error);
    return NextResponse.json(
      { error: "Failed to create magazine" },
      { status: 500 },
    );
  }
}
