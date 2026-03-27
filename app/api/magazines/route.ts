import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const magazines = await prisma.magazine.findMany({
      include: { pages: { orderBy: { number: "asc" } } },
      orderBy: { publishedAt: "desc" },
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

    const magazine = await prisma.magazine.create({
      data,
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
