"use server";

import { PrismaClient } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function getTags() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
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
    const slug = generateSlug(name);

    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
      },
    });

    return { success: true, data: tag };
  } catch (error) {
    console.error("Create tag error:", error);
    if ((error as any).code === "P2002") {
      return { success: false, error: "برچسب‌ با این نام از قبل وجود دارد" };
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
    return { success: true };
  } catch (error) {
    console.error("Delete tag error:", error);
    return { success: false, error: "Failed to delete tag" };
  }
}

export async function updateTag(id: string, name: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const slug = generateSlug(name);

    const tag = await prisma.tag.update({
      where: { id },
      data: { name, slug },
    });

    return { success: true, data: tag };
  } catch (error) {
    console.error("Update tag error:", error);
    if ((error as any).code === "P2002") {
      return { success: false, error: "برچسب‌ با این نام از قبل وجود دارد" };
    }
    return { success: false, error: "Failed to update tag" };
  }
}
