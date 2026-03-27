import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { publishedAt: "desc" },
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

    const article = await prisma.article.create({
      data: {
        ...data,
        tags: data.tags || [],
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
