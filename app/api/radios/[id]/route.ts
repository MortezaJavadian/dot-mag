import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const updateData: Record<string, unknown> = { ...data };
    if (typeof data.title === "string") {
      updateData.slug = generateSlug(data.title);
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
