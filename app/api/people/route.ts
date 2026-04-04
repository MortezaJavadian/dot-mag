import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const PEOPLE_TAG = "people";
const PEOPLE_CACHE_PROFILE = "default";

type PeopleQueryMode = "summary" | "full";

function resolveQueryMode(value: string | null): PeopleQueryMode {
  if (value?.trim().toLowerCase() === "summary") {
    return "summary";
  }

  return "full";
}

function resolveTeamOnly(value: string | null): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

function normalizeRequiredText(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = resolveQueryMode(searchParams.get("mode"));
    const teamOnly = resolveTeamOnly(searchParams.get("teamOnly"));

    const where = teamOnly ? { isDotTeamMember: true } : undefined;

    const people =
      mode === "summary"
        ? await prisma.person.findMany({
            where,
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              name: true,
              image: true,
              bio: true,
              isDotTeamMember: true,
              sortOrder: true,
            },
          })
        : await prisma.person.findMany({
            where,
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          });

    return NextResponse.json(people);
  } catch (error) {
    console.error("GET /api/people error:", error);
    return NextResponse.json(
      { error: "Failed to fetch people" },
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

    const name = normalizeRequiredText(data.name);
    const image = normalizeRequiredText(data.image);
    const bio = normalizeRequiredText(data.bio);

    if (!name || !image || !bio) {
      return NextResponse.json(
        { error: "Name, image and short introduction are required" },
        { status: 400 },
      );
    }

    const lastPerson = await prisma.person.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const person = await prisma.person.create({
      data: {
        name,
        image,
        bio,
        isDotTeamMember: Boolean(data.isDotTeamMember),
        sortOrder: (lastPerson?.sortOrder ?? -1) + 1,
      },
    });

    revalidateTag(PEOPLE_TAG, PEOPLE_CACHE_PROFILE);

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error("POST /api/people error:", error);
    return NextResponse.json(
      { error: "Failed to create person" },
      { status: 500 },
    );
  }
}
