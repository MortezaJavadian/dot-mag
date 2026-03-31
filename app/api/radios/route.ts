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

export async function GET() {
  try {
    const radios = await prisma.radio.findMany({
      include: { segments: { orderBy: { number: "asc" } } },
      orderBy: { publishedAt: "desc" },
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
    const slug = generateSlug(data.title);

    const radio = await prisma.radio.create({
      data: {
        ...data,
        slug,
      },
      include: { segments: { orderBy: { number: "asc" } } },
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
