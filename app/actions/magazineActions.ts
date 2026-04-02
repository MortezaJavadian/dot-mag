"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FF\w-]/g, "")
    .replace(/-+/g, "-");
}

const MAGAZINE_TAG = "magazines";
const MAGAZINE_CACHE_PROFILE = "default";

function revalidateMagazinesCache() {
  revalidateTag(MAGAZINE_TAG, MAGAZINE_CACHE_PROFILE);
}

type CreateMagazineInput = {
  title: string;
  subtitle: string;
  description: string;
  cover?: string | null;
  pdfUrl?: string | null;
  publishedAt: string;
  sortDate?: string;
  pageCount: number;
};

type UpdateMagazineInput = Partial<CreateMagazineInput>;
type MagazinePageInput = {
  number: number;
  image: string;
};

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

async function syncPageCount(
  magazineId: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  const count = await client.magazinePage.count({
    where: { magazineId },
  });

  await client.magazine.update({
    where: { id: magazineId },
    data: { pageCount: count },
  });
}

export async function getMagazines() {
  try {
    const magazines = await prisma.magazine.findMany({
      include: { pages: { orderBy: { number: "asc" } } },
      orderBy: [{ sortDate: "desc" }, { createdAt: "desc" }],
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
        publishedAt: resolveDisplayDate(data.publishedAt, data.sortDate),
        sortDate: resolveSortDate(data.sortDate),
      },
      include: { pages: { orderBy: { number: "asc" } } },
    });

    revalidateMagazinesCache();

    return { success: true, data: magazine };
  } catch (error) {
    console.error("Create magazine error:", error);
    return { success: false, error: "Failed to create magazine" };
  }
}

export async function updateMagazine(id: string, data: UpdateMagazineInput) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const updateData: Prisma.MagazineUpdateInput = {
      ...data,
    } as Prisma.MagazineUpdateInput;

    if (data.title) {
      updateData.slug = generateSlug(data.title);
    }

    if (typeof data.sortDate === "string") {
      updateData.sortDate = resolveSortDate(data.sortDate);
    }

    if (typeof data.publishedAt === "string") {
      updateData.publishedAt = resolveDisplayDate(
        data.publishedAt,
        data.sortDate,
      );
    }

    const magazine = await prisma.magazine.update({
      where: { id },
      data: updateData,
    });

    revalidateMagazinesCache();

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
    revalidateMagazinesCache();
    return { success: true };
  } catch (error) {
    console.error("Delete magazine error:", error);
    return { success: false, error: "Failed to delete magazine" };
  }
}

export async function addMagazinePage(
  magazineId: string,
  page: MagazinePageInput,
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const newPage = await prisma.magazinePage.create({
      data: {
        number: page.number,
        image: page.image,
        title: `Page ${page.number}`,
        type: "article",
        magazineId,
      },
    });

    await syncPageCount(magazineId);

    revalidateMagazinesCache();

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
    const existingPage = await prisma.magazinePage.findUnique({
      where: { id: pageId },
      select: { magazineId: true, number: true },
    });

    if (!existingPage) {
      return { success: false, error: "Page not found" };
    }

    const nextNumber =
      typeof page.number === "number" ? page.number : existingPage.number;

    const updatedPage = await prisma.magazinePage.update({
      where: { id: pageId },
      data: {
        ...page,
        type: "article",
        title: `Page ${nextNumber}`,
      },
    });

    await syncPageCount(existingPage.magazineId);

    revalidateMagazinesCache();

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
    const existingPage = await prisma.magazinePage.findUnique({
      where: { id: pageId },
      select: { magazineId: true },
    });

    if (!existingPage) {
      return { success: false, error: "Page not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.magazinePage.delete({
        where: { id: pageId },
      });

      const pages = await tx.magazinePage.findMany({
        where: { magazineId: existingPage.magazineId },
        orderBy: { number: "asc" },
        select: { id: true },
      });

      for (let i = 0; i < pages.length; i++) {
        await tx.magazinePage.update({
          where: { id: pages[i].id },
          data: {
            number: i + 1,
            title: `Page ${i + 1}`,
            type: "article",
          },
        });
      }

      await syncPageCount(existingPage.magazineId, tx);
    });

    revalidateMagazinesCache();

    return { success: true };
  } catch (error) {
    console.error("Delete magazine page error:", error);
    return { success: false, error: "Failed to delete page" };
  }
}

export async function reorderMagazinePages(
  magazineId: string,
  pageIds: string[],
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const pages = await prisma.magazinePage.findMany({
      where: { magazineId },
      orderBy: { number: "asc" },
      select: { id: true },
    });

    const knownIds = new Set(pages.map((page) => page.id));
    const incomingIds = new Set(pageIds);

    if (knownIds.size !== incomingIds.size || pages.length !== pageIds.length) {
      return { success: false, error: "Invalid page ordering" };
    }

    for (const pageId of pageIds) {
      if (!knownIds.has(pageId)) {
        return { success: false, error: "Invalid page ordering" };
      }
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < pageIds.length; i++) {
        await tx.magazinePage.update({
          where: { id: pageIds[i] },
          data: { number: 1000 + i },
        });
      }

      for (let i = 0; i < pageIds.length; i++) {
        await tx.magazinePage.update({
          where: { id: pageIds[i] },
          data: {
            number: i + 1,
            title: `Page ${i + 1}`,
            type: "article",
          },
        });
      }

      await syncPageCount(magazineId, tx);
    });

    const reorderedPages = await prisma.magazinePage.findMany({
      where: { magazineId },
      orderBy: { number: "asc" },
    });

    revalidateMagazinesCache();

    return { success: true, data: reorderedPages };
  } catch (error) {
    console.error("Reorder magazine pages error:", error);
    return { success: false, error: "Failed to reorder pages" };
  }
}
