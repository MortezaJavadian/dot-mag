import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const magazine = await prisma.magazine.findUnique({
      where: { id },
      include: { pages: { orderBy: { number: "asc" } } },
    });

    if (!magazine) {
      return NextResponse.json(
        { error: "Magazine not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(magazine);
  } catch (error) {
    console.error("GET /api/magazines/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch magazine" },
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

    const magazine = await prisma.magazine.update({
      where: { id },
      data,
      include: { pages: { orderBy: { number: "asc" } } },
    });

    return NextResponse.json(magazine);
  } catch (error) {
    console.error("PUT /api/magazines/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update magazine" },
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

    await prisma.magazine.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/magazines/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete magazine" },
      { status: 500 },
    );
  }
}
