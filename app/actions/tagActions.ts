"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FF\w-]/g, "")
    .replace(/-+/g, "-");
}

function normalizeName(name: string): string {
  return name.trim().normalize("NFC");
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function getTags() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { articles: true } } },
    });
    return { success: true, data: tags };
  } catch (error) {
    console.error("Get tags error:", error);
    return { success: false, error: "Failed to fetch tags" };
  }
}

export async function createTag(name: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const normalizedName = normalizeName(name);
    const slug = generateSlug(normalizedName);
    const lastTag = await prisma.tag.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const tag = await prisma.tag.create({
      data: {
        name: normalizedName,
        slug,
        sortOrder: (lastTag?.sortOrder ?? -1) + 1,
      },
    });

    return { success: true, data: tag };
  } catch (error) {
    console.error("Create tag error:", error);
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "برچسب با این نام از قبل وجود دارد" };
    }
    return { success: false, error: "Failed to create tag" };
  }
}

export async function deleteTag(id: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.tag.delete({
      where: { id },
    });

    const remainingTags = await prisma.tag.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    await prisma.$transaction(
      remainingTags.map((tag, index) =>
        prisma.tag.update({
          where: { id: tag.id },
          data: { sortOrder: index },
        }),
      ),
    );

    return { success: true };
  } catch (error) {
    console.error("Delete tag error:", error);
    return { success: false, error: "Failed to delete tag" };
  }
}

export async function reorderTag(id: string, direction: "up" | "down") {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const orderedTags = await prisma.tag.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    const currentIndex = orderedTags.findIndex((tag) => tag.id === id);
    if (currentIndex === -1) {
      return { success: false, error: "برچسب پیدا نشد" };
    }

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= orderedTags.length) {
      return { success: false, error: "امکان جابه‌جایی بیشتر نیست" };
    }

    const reorderedTags = [...orderedTags];
    const [movedTag] = reorderedTags.splice(currentIndex, 1);
    reorderedTags.splice(targetIndex, 0, movedTag);

    await prisma.$transaction(
      reorderedTags.map((tag, index) =>
        prisma.tag.update({
          where: { id: tag.id },
          data: { sortOrder: index },
        }),
      ),
    );

    return { success: true };
  } catch (error) {
    console.error("Reorder tag error:", error);
    return { success: false, error: "Failed to reorder tag" };
  }
}

export async function updateTag(id: string, name: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const normalizedName = normalizeName(name);
    const slug = generateSlug(normalizedName);

    const tag = await prisma.tag.update({
      where: { id },
      data: { name: normalizedName, slug },
    });

    return { success: true, data: tag };
  } catch (error) {
    console.error("Update tag error:", error);
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "برچسب با این نام از قبل وجود دارد" };
    }
    return { success: false, error: "Failed to update tag" };
  }
}
