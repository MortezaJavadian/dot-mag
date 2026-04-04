import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const RADIO_TAG = "radios";
const RADIO_CACHE_PROFILE = "default";

type RadioQueryMode = "summary" | "full";

function resolveQueryMode(value: string | null): RadioQueryMode {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = resolveQueryMode(searchParams.get("mode"));
    const slug = searchParams.get("slug")?.trim() || undefined;
    const take = resolveTakeValue(searchParams.get("limit"));

    const where = slug ? { slug } : undefined;

    const radios =
      mode === "summary"
        ? await prisma.radio.findMany({
            where,
            take,
            orderBy: { sortDate: "desc" },
            select: {
              id: true,
              slug: true,
              title: true,
              summary: true,
              intro: true,
              cover: true,
              publishedAt: true,
              durationSec: true,
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
          })
        : await prisma.radio.findMany({
            where,
            take,
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
            orderBy: { sortDate: "desc" },
          });

    return NextResponse.json(radios);
  } catch (error) {
    console.error("GET /api/radios error:", error);
    return NextResponse.json(
      { error: "Failed to fetch radios" },
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
    const { personId: rawPersonId, ...radioData } = data;
    const slug = generateSlug(data.title);
    const personId =
      typeof rawPersonId === "string" && rawPersonId.trim()
        ? rawPersonId
        : null;
    const summary = normalizeOptionalText(data.summary);
    const audioUrlLow = normalizeOptionalText(data.audioUrlLow);
    const audioUrlMedium = normalizeOptionalText(data.audioUrlMedium);
    const audioUrlHigh = normalizeOptionalText(data.audioUrlHigh);
    const audioSizeLow = normalizeOptionalSize(data.audioSizeLow);
    const audioSizeMedium = normalizeOptionalSize(data.audioSizeMedium);
    const audioSizeHigh = normalizeOptionalSize(data.audioSizeHigh);
    const playerAudioQuality = normalizePlayerAudioQuality(
      data.playerAudioQuality,
    );

    const radio = await prisma.radio.create({
      data: {
        ...radioData,
        slug,
        person: personId ? { connect: { id: personId } } : undefined,
        summary,
        audioUrlLow,
        audioUrlMedium,
        audioUrlHigh,
        audioSizeLow,
        audioSizeMedium,
        audioSizeHigh,
        playerAudioQuality,
        publishedAt: resolveDisplayDate(data.publishedAt, data.sortDate),
        sortDate: resolveSortDate(data.sortDate),
      },
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

    return NextResponse.json(radio, { status: 201 });
  } catch (error) {
    console.error("POST /api/radios error:", error);
    return NextResponse.json(
      { error: "Failed to create radio" },
      { status: 500 },
    );
  }
}
