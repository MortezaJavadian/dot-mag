import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";

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
    console.log("GET /api/magazines - fetching magazines...");
    const magazines = await prisma.magazine.findMany({
      include: { pages: { orderBy: { number: "asc" } } },
      orderBy: { publishedAt: "desc" },
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
      },
      include: { pages: { orderBy: { number: "asc" } } },
    });

    return NextResponse.json(magazine, { status: 201 });
  } catch (error) {
    console.error("POST /api/magazines error:", error);
    return NextResponse.json(
      { error: "Failed to create magazine" },
      { status: 500 },
    );
  }
}
