import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";

type ChatRoomSummary = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_ROOM_NAME = "همگانی";
const DEFAULT_ROOM_SLUG = "general";

function normalizeRoomName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function toRoomSummary(room: {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { messages: number };
  messages: { content: string; createdAt: Date }[];
}): ChatRoomSummary {
  const lastMessage = room.messages[0] ?? null;

  return {
    id: room.id,
    name: room.name,
    slug: room.slug,
    isDefault: room.isDefault,
    messageCount: room._count.messages,
    lastMessageAt: lastMessage ? lastMessage.createdAt.toISOString() : null,
    lastMessagePreview: lastMessage ? lastMessage.content.slice(0, 120) : null,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

async function ensureDefaultRoom(userId: string) {
  return prisma.chatRoom.upsert({
    where: { slug: DEFAULT_ROOM_SLUG },
    update: {
      name: DEFAULT_ROOM_NAME,
      isDefault: true,
    },
    create: {
      name: DEFAULT_ROOM_NAME,
      slug: DEFAULT_ROOM_SLUG,
      isDefault: true,
      createdByUserId: userId,
    },
  });
}

function generateBaseSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!base) {
    return `room-${Date.now().toString(36)}`;
  }

  return base;
}

async function getUniqueRoomSlug(baseSlug: string): Promise<string> {
  const existing = await prisma.chatRoom.findMany({
    where: {
      slug: {
        startsWith: baseSlug,
      },
    },
    select: { slug: true },
  });

  const existingSlugs = new Set(existing.map((room) => room.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status },
  );
}

async function requireAdminUser() {
  const userId = await getAdminUser();

  if (!userId) {
    return null;
  }

  return userId;
}

function resolveCreateErrorStatus(error: string): number {
  if (error === "Group name is required") {
    return 400;
  }

  if (error === "Group name must be 100 characters or fewer") {
    return 400;
  }

  return 500;
}

export async function GET() {
  const userId = await requireAdminUser();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    await ensureDefaultRoom(userId);

    const rooms = await prisma.chatRoom.findMany({
      orderBy: [
        { isDefault: "desc" },
        { updatedAt: "desc" },
        { createdAt: "asc" },
      ],
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: rooms.map(toRoomSummary),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/chat/rooms error:", error);
    return errorResponse("Failed to fetch chat rooms", 500);
  }
}

export async function POST(request: NextRequest) {
  const userId = await requireAdminUser();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await request.json();
    const roomName = typeof body?.name === "string" ? body.name : "";
    const normalizedName = normalizeRoomName(roomName);

    if (!normalizedName) {
      return errorResponse("Group name is required", 400);
    }

    if (normalizedName.length > 100) {
      return errorResponse("Group name must be 100 characters or fewer", 400);
    }

    const slug = await getUniqueRoomSlug(generateBaseSlug(normalizedName));

    const room = await prisma.chatRoom.create({
      data: {
        name: normalizedName,
        slug,
        createdByUserId: userId,
      },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: toRoomSummary(room),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/chat/rooms error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create chat room";
    return errorResponse(message, resolveCreateErrorStatus(message));
  }
}
