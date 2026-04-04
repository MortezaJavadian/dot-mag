import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";

type ArticleQueryMode = "summary" | "full";

function resolveQueryMode(value: string | null): ArticleQueryMode {
  if (value?.trim().toLowerCase() === "summary") {
    return "summary";
  }

  return "full";
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

    const articles =
      mode === "summary"
        ? await prisma.article.findMany({
            orderBy: [{ sortDate: "desc" }, { createdAt: "desc" }],
            select: {
              id: true,
              slug: true,
              title: true,
              excerpt: true,
              category: true,
              image: true,
              publishedAt: true,
              featured: true,
              person: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  bio: true,
                  isDotTeamMember: true,
                },
              },
              tags: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          })
        : await prisma.article.findMany({
            orderBy: [{ sortDate: "desc" }, { createdAt: "desc" }],
            include: {
              tags: true,
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

    return NextResponse.json(articles);
  } catch (error) {
    console.error("GET /api/articles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
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
    const { personId: rawPersonId, ...articleData } = data;
    const personId =
      typeof rawPersonId === "string" && rawPersonId.trim()
        ? rawPersonId
        : null;

    const article = await prisma.article.create({
      data: {
        ...articleData,
        publishedAt: resolveDisplayDate(data.publishedAt, data.sortDate),
        sortDate: resolveSortDate(data.sortDate),
        person: personId ? { connect: { id: personId } } : undefined,
        tags: data.tags || [],
      },
      include: {
        tags: true,
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

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("POST /api/articles error:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 },
    );
  }
}
