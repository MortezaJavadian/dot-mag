import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const PEOPLE_TAG = "people";
const PEOPLE_CACHE_PROFILE = "default";

function normalizeRequiredText(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const person = await prisma.person.findUnique({ where: { id } });

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json(person);
  } catch (error) {
    console.error("GET /api/people/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch person" },
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

    const updateData: {
      name?: string;
      image?: string;
      bio?: string;
      isDotTeamMember?: boolean;
    } = {};

    if (data.name !== undefined) {
      const name = normalizeRequiredText(data.name);
      if (!name) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 },
        );
      }
      updateData.name = name;
    }

    if (data.image !== undefined) {
      const image = normalizeRequiredText(data.image);
      if (!image) {
        return NextResponse.json(
          { error: "Image cannot be empty" },
          { status: 400 },
        );
      }
      updateData.image = image;
    }

    if (data.bio !== undefined) {
      const bio = normalizeRequiredText(data.bio);
      if (!bio) {
        return NextResponse.json(
          { error: "Short introduction cannot be empty" },
          { status: 400 },
        );
      }
      updateData.bio = bio;
    }

    if (data.isDotTeamMember !== undefined) {
      updateData.isDotTeamMember = Boolean(data.isDotTeamMember);
    }

    const person = await prisma.person.update({
      where: { id },
      data: updateData,
    });

    revalidateTag(PEOPLE_TAG, PEOPLE_CACHE_PROFILE);

    return NextResponse.json(person);
  } catch (error) {
    console.error("PUT /api/people/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update person" },
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

    await prisma.person.delete({ where: { id } });

    const remainingPeople = await prisma.person.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    await prisma.$transaction(
      remainingPeople.map((person, index) =>
        prisma.person.update({
          where: { id: person.id },
          data: { sortOrder: index },
        }),
      ),
    );

    revalidateTag(PEOPLE_TAG, PEOPLE_CACHE_PROFILE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/people/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete person" },
      { status: 500 },
    );
  }
}
