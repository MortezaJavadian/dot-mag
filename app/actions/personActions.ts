"use server";

import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const PEOPLE_TAG = "people";
const PEOPLE_CACHE_PROFILE = "default";

function revalidatePeopleCache() {
  revalidateTag(PEOPLE_TAG, PEOPLE_CACHE_PROFILE);
}

async function requireAdmin() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false as const, error: "Unauthorized" };
  }

  return { success: true as const };
}

type PersonMutationInput = {
  name: string;
  image: string;
  bio: string;
  isDotTeamMember?: boolean;
};

type PersonUpdateInput = Partial<PersonMutationInput>;

function normalizeRequiredText(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function getPeople(options?: { teamOnly?: boolean }) {
  try {
    const people = await prisma.person.findMany({
      where: options?.teamOnly ? { isDotTeamMember: true } : undefined,
      orderBy: [{ isDotTeamMember: "desc" }, { createdAt: "desc" }],
    });

    return { success: true, data: people };
  } catch (error) {
    console.error("Get people error:", error);
    return { success: false, error: "Failed to fetch people" };
  }
}

export async function getPerson(id: string) {
  try {
    const person = await prisma.person.findUnique({ where: { id } });
    return { success: true, data: person };
  } catch (error) {
    console.error("Get person error:", error);
    return { success: false, error: "Failed to fetch person" };
  }
}

export async function createPerson(data: PersonMutationInput) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  const name = normalizeRequiredText(data.name);
  const image = normalizeRequiredText(data.image);
  const bio = normalizeRequiredText(data.bio);

  if (!name || !image || !bio) {
    return {
      success: false,
      error: "Name, image and short introduction are required",
    };
  }

  try {
    const person = await prisma.person.create({
      data: {
        name,
        image,
        bio,
        isDotTeamMember: Boolean(data.isDotTeamMember),
      },
    });

    revalidatePeopleCache();

    return { success: true, data: person };
  } catch (error) {
    console.error("Create person error:", error);
    return { success: false, error: "Failed to create person" };
  }
}

export async function updatePerson(id: string, data: PersonUpdateInput) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    const updateData: {
      name?: string;
      image?: string;
      bio?: string;
      isDotTeamMember?: boolean;
    } = {};

    if (data.name !== undefined) {
      updateData.name = normalizeRequiredText(data.name);
    }

    if (data.image !== undefined) {
      updateData.image = normalizeRequiredText(data.image);
    }

    if (data.bio !== undefined) {
      updateData.bio = normalizeRequiredText(data.bio);
    }

    if (data.isDotTeamMember !== undefined) {
      updateData.isDotTeamMember = Boolean(data.isDotTeamMember);
    }

    if (
      updateData.name !== undefined &&
      (!updateData.name || !updateData.name.trim())
    ) {
      return { success: false, error: "Name cannot be empty" };
    }

    if (
      updateData.image !== undefined &&
      (!updateData.image || !updateData.image.trim())
    ) {
      return { success: false, error: "Image cannot be empty" };
    }

    if (
      updateData.bio !== undefined &&
      (!updateData.bio || !updateData.bio.trim())
    ) {
      return { success: false, error: "Short introduction cannot be empty" };
    }

    const person = await prisma.person.update({
      where: { id },
      data: updateData,
    });

    revalidatePeopleCache();

    return { success: true, data: person };
  } catch (error) {
    console.error("Update person error:", error);
    return { success: false, error: "Failed to update person" };
  }
}

export async function deletePerson(id: string) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    await prisma.person.delete({ where: { id } });
    revalidatePeopleCache();
    return { success: true };
  } catch (error) {
    console.error("Delete person error:", error);
    return { success: false, error: "Failed to delete person" };
  }
}
