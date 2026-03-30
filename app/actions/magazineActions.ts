"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type CreateMagazineInput = Omit<
  Prisma.MagazineCreateInput,
  "id" | "createdAt" | "updatedAt" | "slug"
>;
type CreateMagazinePageInput = Omit<
  Prisma.MagazinePageCreateInput,
  "id" | "createdAt" | "updatedAt"
>;

export async function getMagazines() {
  try {
    const magazines = await prisma.magazine.findMany({
      include: { pages: { orderBy: { number: "asc" } } },
      orderBy: { publishedAt: "desc" },
    });
    return { success: true, data: magazines };
  } catch (error) {
    console.error("Get magazines error:", error);
    return { success: false, error: "Failed to fetch magazines" };
  }
}

export async function getMagazine(id: string) {
  try {
    const magazine = await prisma.magazine.findUnique({
      where: { id },
      include: { pages: { orderBy: { number: "asc" } } },
    });
    return { success: true, data: magazine };
  } catch (error) {
    console.error("Get magazine error:", error);
    return { success: false, error: "Failed to fetch magazine" };
  }
}

export async function createMagazine(data: CreateMagazineInput) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const slug = generateSlug(data.title);

    const magazine = await prisma.magazine.create({
      data: {
        ...data,
        slug,
      },
    });

    return { success: true, data: magazine };
  } catch (error) {
    console.error("Create magazine error:", error);
    return { success: false, error: "Failed to create magazine" };
  }
}

export async function updateMagazine(
  id: string,
  data: Partial<
    Omit<Prisma.MagazineUpdateInput, "id" | "createdAt" | "updatedAt" | "slug">
  >,
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const updateData: Prisma.MagazineUpdateInput = { ...data };

    if (data.title) {
      updateData.slug = generateSlug(data.title as string);
    }

    const magazine = await prisma.magazine.update({
      where: { id },
      data: updateData,
    });

    return { success: true, data: magazine };
  } catch (error) {
    console.error("Update magazine error:", error);
    return { success: false, error: "Failed to update magazine" };
  }
}

export async function deleteMagazine(id: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.magazine.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error("Delete magazine error:", error);
    return { success: false, error: "Failed to delete magazine" };
  }
}

export async function addMagazinePage(
  magazineId: string,
  page: Omit<CreateMagazinePageInput, "magazine">,
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const newPage = await prisma.magazinePage.create({
      data: {
        ...page,
        magazineId,
      },
    });

    return { success: true, data: newPage };
  } catch (error) {
    console.error("Add magazine page error:", error);
    return { success: false, error: "Failed to add page" };
  }
}

export async function updateMagazinePage(
  pageId: string,
  page: Partial<
    Omit<
      Prisma.MagazinePageUpdateInput,
      "id" | "createdAt" | "updatedAt" | "magazine"
    >
  >,
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const updatedPage = await prisma.magazinePage.update({
      where: { id: pageId },
      data: page,
    });

    return { success: true, data: updatedPage };
  } catch (error) {
    console.error("Update magazine page error:", error);
    return { success: false, error: "Failed to update page" };
  }
}

export async function deleteMagazinePage(pageId: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.magazinePage.delete({
      where: { id: pageId },
    });

    return { success: true };
  } catch (error) {
    console.error("Delete magazine page error:", error);
    return { success: false, error: "Failed to delete page" };
  }
}
