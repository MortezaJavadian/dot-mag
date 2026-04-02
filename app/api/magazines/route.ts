import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const MAGAZINE_TAG = "magazines";
const MAGAZINE_CACHE_PROFILE = "default";

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

export async function GET() {
  try {
    console.log("GET /api/magazines - fetching magazines...");
    const magazines = await prisma.magazine.findMany({
      include: { pages: { orderBy: { number: "asc" } } },
      orderBy: [{ sortDate: "desc" }, { createdAt: "desc" }],
    });
    console.log(
      `Found ${magazines.length} magazines:`,
      magazines.map((m) => ({ id: m.id, slug: m.slug, title: m.title })),
    );
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
