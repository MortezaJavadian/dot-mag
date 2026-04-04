"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FF\w-]/g, "")
    .replace(/-+/g, "-");
}

type ArticleMutationInput = {
  title: string;
  excerpt: string;
  content: string;
  category?: string;
  personId?: string | null;
  image: string;
  publishedAt: string;
  sortDate?: string;
  featured?: boolean;
  tagIds?: string[];
};

type ArticleUpdateInput = Partial<ArticleMutationInput>;

function resolveDisplayDate(displayDate?: string, sortDate?: string): string {
  const normalizedDisplayDate = displayDate?.trim();
  if (normalizedDisplayDate) {
    return normalizedDisplayDate;
  }

  const normalizedSortDate = sortDate?.trim();
  if (normalizedSortDate) {
    return normalizedSortDate;
  }

  return new Date().toISOString().split("T")[0];
}

function resolveSortDate(value?: string): Date {
  if (!value) return new Date();

  const normalized = value.trim();
  if (!normalized) return new Date();

  const isoLike = /^\d{4}-\d{2}-\d{2}$/;
  const candidate = isoLike.test(normalized)
    ? new Date(`${normalized}T00:00:00.000Z`)
    : new Date(normalized);

  if (Number.isNaN(candidate.getTime())) {
    return new Date();
  }

  return candidate;
}

export async function getArticles() {
  try {
    const articles = await prisma.article.findMany({
      orderBy: [{ sortDate: "desc" }, { createdAt: "desc" }],
      include: {
        tags: true,
        person: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            isDotTeamMember: true,
          },
        },
      },
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
      include: {
        tags: true,
        person: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            isDotTeamMember: true,
          },
        },
      },
    });
    return { success: true, data: article };
  } catch (error) {
    console.error("Get article error:", error);
    return { success: false, error: "Failed to fetch article" };
  }
}

export async function createArticle(data: ArticleMutationInput) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const slug = generateSlug(data.title);
    const { tagIds, sortDate, personId, ...articleData } = data;
    const category =
      typeof articleData.category === "string"
        ? articleData.category.trim()
        : "";
    const normalizedPersonId =
      typeof personId === "string" && personId.trim() ? personId : null;

    const article = await prisma.article.create({
      data: {
        ...articleData,
        category,
        slug,
        publishedAt: resolveDisplayDate(data.publishedAt, sortDate),
        sortDate: resolveSortDate(sortDate),
        person: normalizedPersonId
          ? { connect: { id: normalizedPersonId } }
          : undefined,
        tags: tagIds
          ? { connect: tagIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        tags: true,
        person: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            isDotTeamMember: true,
          },
        },
      },
    });

    return { success: true, data: article };
  } catch (error) {
    console.error("Create article error:", error);
    return { success: false, error: "Failed to create article" };
  }
}

export async function updateArticle(id: string, data: ArticleUpdateInput) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { tagIds, personId, ...updateData } = data;
    const finalUpdateData: Prisma.ArticleUpdateInput = {
      ...updateData,
    } as Prisma.ArticleUpdateInput;

    if (data.title) {
      finalUpdateData.slug = generateSlug(data.title);
    }

    if (typeof data.category === "string") {
      finalUpdateData.category = data.category.trim();
    }

    if (typeof data.publishedAt === "string") {
      finalUpdateData.publishedAt = resolveDisplayDate(
        data.publishedAt,
        data.sortDate,
      );
    }

    if (typeof data.sortDate === "string") {
      finalUpdateData.sortDate = resolveSortDate(data.sortDate);
    }

    if (tagIds !== undefined) {
      finalUpdateData.tags = {
        set: tagIds.map((id: string) => ({ id })),
      };
    }

    if (personId !== undefined) {
      const normalizedPersonId =
        typeof personId === "string" && personId.trim() ? personId : null;

      finalUpdateData.person = normalizedPersonId
        ? { connect: { id: normalizedPersonId } }
        : { disconnect: true };
    }

    const article = await prisma.article.update({
      where: { id },
      data: finalUpdateData,
      include: {
        tags: true,
        person: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            isDotTeamMember: true,
          },
        },
      },
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
