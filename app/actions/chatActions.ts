"use server";

import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";

type ChatRoomSummary = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessageSenderName: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
  updatedAt: string;
};

type ChatMessagePayload = {
  id: string;
  roomId: string;
  content: string;
  createdAt: string;
  senderPerson: {
    id: string;
    name: string;
    image: string;
  } | null;
};

const DEFAULT_ROOM_NAME = "همگانی";
const DEFAULT_ROOM_SLUG = "general";
const DEFAULT_HISTORY_LIMIT = 30;
const MAX_HISTORY_LIMIT = 50;
const MIN_HISTORY_LIMIT = 10;
const MAX_MESSAGE_LENGTH = 4000;

function normalizeRoomName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function normalizeMessageContent(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

function toRoomSummary(room: {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { messages: number };
  messages: {
    content: string;
    createdAt: Date;
    senderPerson: { name: string } | null;
  }[];
}): ChatRoomSummary {
  const lastMessage = room.messages[0] ?? null;

  return {
    id: room.id,
    name: room.name,
    slug: room.slug,
    isDefault: room.isDefault,
    messageCount: room._count.messages,
    lastMessageAt: lastMessage ? lastMessage.createdAt.toISOString() : null,
    lastMessageSenderName: lastMessage?.senderPerson?.name ?? null,
    lastMessagePreview: lastMessage ? lastMessage.content.slice(0, 120) : null,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

function toMessagePayload(message: {
  id: string;
  roomId: string;
  content: string;
  createdAt: Date;
  senderPerson: { id: string; name: string; image: string } | null;
}): ChatMessagePayload {
  return {
    id: message.id,
    roomId: message.roomId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    senderPerson: message.senderPerson,
  };
}

async function requireAdmin() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false as const, error: "Unauthorized" };
  }

  return { success: true as const, userId: adminUser };
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

function resolveLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_HISTORY_LIMIT;
  }

  const normalized = Math.floor(limit);
  if (normalized < MIN_HISTORY_LIMIT) {
    return MIN_HISTORY_LIMIT;
  }

  if (normalized > MAX_HISTORY_LIMIT) {
    return MAX_HISTORY_LIMIT;
  }

  return normalized;
}

export async function getChatRooms() {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  try {
    await ensureDefaultRoom(authResult.userId);

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
            senderPerson: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true as const,
      data: rooms.map(toRoomSummary),
    };
  } catch (error) {
    console.error("Get chat rooms error:", error);
    return { success: false as const, error: "Failed to fetch chat rooms" };
  }
}

export async function createChatRoom(rawName: string) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  const name = normalizeRoomName(rawName);
  if (!name) {
    return { success: false as const, error: "Group name is required" };
  }

  if (name.length > 100) {
    return {
      success: false as const,
      error: "Group name must be 100 characters or fewer",
    };
  }

  try {
    const slug = await getUniqueRoomSlug(generateBaseSlug(name));

    const room = await prisma.chatRoom.create({
      data: {
        name,
        slug,
        createdByUserId: authResult.userId,
      },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            senderPerson: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true as const,
      data: toRoomSummary(room),
    };
  } catch (error) {
    console.error("Create chat room error:", error);
    return { success: false as const, error: "Failed to create chat room" };
  }
}

export async function getChatMessages(options: {
  roomId: string;
  beforeMessageId?: string | null;
  limit?: number;
}) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  const roomId = options.roomId?.trim();
  if (!roomId) {
    return { success: false as const, error: "Room id is required" };
  }

  const limit = resolveLimit(options.limit);

  try {
    const roomExists = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    if (!roomExists) {
      return { success: false as const, error: "Chat room not found" };
    }

    let beforeDate: Date | undefined;
    if (options.beforeMessageId) {
      const cursorMessage = await prisma.chatMessage.findFirst({
        where: {
          id: options.beforeMessageId,
          roomId,
        },
        select: { createdAt: true },
      });

      if (!cursorMessage) {
        return { success: false as const, error: "Invalid message cursor" };
      }

      beforeDate = cursorMessage.createdAt;
    }

    const rows = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        senderPerson: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const selectedRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? (selectedRows[selectedRows.length - 1]?.id ?? null)
      : null;

    return {
      success: true as const,
      data: {
        roomId,
        messages: selectedRows.reverse().map(toMessagePayload),
        hasMore,
        nextCursor,
      },
    };
  } catch (error) {
    console.error("Get chat messages error:", error);
    return { success: false as const, error: "Failed to fetch chat messages" };
  }
}

export async function createChatMessage(data: {
  roomId: string;
  personId: string;
  content: string;
}) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult;
  }

  const roomId = data.roomId?.trim();
  const personId = data.personId?.trim();
  const content = normalizeMessageContent(data.content || "");

  if (!roomId) {
    return { success: false as const, error: "Room id is required" };
  }

  if (!personId) {
    return { success: false as const, error: "Sender identity is required" };
  }

  if (!content) {
    return { success: false as const, error: "Message cannot be empty" };
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false as const,
      error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
    };
  }

  try {
    const [room, person] = await Promise.all([
      prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { id: true },
      }),
      prisma.person.findUnique({
        where: { id: personId },
        select: {
          id: true,
          name: true,
          image: true,
        },
      }),
    ]);

    if (!room) {
      return { success: false as const, error: "Chat room not found" };
    }

    if (!person) {
      return { success: false as const, error: "Selected identity not found" };
    }

    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderUserId: authResult.userId,
        senderPersonId: personId,
        content,
      },
      include: {
        senderPerson: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return {
      success: true as const,
      data: toMessagePayload(message),
    };
  } catch (error) {
    console.error("Create chat message error:", error);
    return { success: false as const, error: "Failed to create chat message" };
  }
}
