import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";

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

    // Generate slug if title changed
    const updateData: any = { ...data };
    if (data.title) {
      function generateSlug(title: string): string {
        return title
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\u0600-\u06FF\w-]/g, "")
          .replace(/-+/g, "-");
      }
      updateData.slug = generateSlug(data.title);
    }

    const magazine = await prisma.magazine.update({
      where: { id },
      data: updateData,
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
