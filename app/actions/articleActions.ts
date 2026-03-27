"use server";

import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";

const prisma = new PrismaClient();

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type CreateArticleInput = Omit<
  Prisma.ArticleCreateInput,
  "id" | "createdAt" | "updatedAt" | "slug"
>;

export async function getArticles() {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { publishedAt: "desc" },
    });
    return { success: true, data: articles };
  } catch (error) {
    console.error("Get articles error:", error);
    return { success: false, error: "Failed to fetch articles" };
  }
}

export async function getArticle(id: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { id },
    });
    return { success: true, data: article };
  } catch (error) {
    console.error("Get article error:", error);
    return { success: false, error: "Failed to fetch article" };
  }
}

export async function createArticle(data: CreateArticleInput) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const slug = generateSlug(data.title);

    const article = await prisma.article.create({
      data: {
        ...data,
        slug,
        tags: data.tags || [],
      },
    });

    return { success: true, data: article };
  } catch (error) {
    console.error("Create article error:", error);
    return { success: false, error: "Failed to create article" };
  }
}

export async function updateArticle(
  id: string,
  data: Partial<
    Omit<Prisma.ArticleUpdateInput, "id" | "createdAt" | "updatedAt" | "slug">
  >,
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const updateData: Prisma.ArticleUpdateInput = { ...data };

    // Only update slug if title changed
    if (data.title) {
      updateData.slug = generateSlug(data.title as string);
    }

    const article = await prisma.article.update({
      where: { id },
      data: updateData,
    });

    return { success: true, data: article };
  } catch (error) {
    console.error("Update article error:", error);
    return { success: false, error: "Failed to update article" };
  }
}

export async function deleteArticle(id: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.article.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error("Delete article error:", error);
    return { success: false, error: "Failed to delete article" };
  }
}
