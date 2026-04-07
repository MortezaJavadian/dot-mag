import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";

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

const DEFAULT_HISTORY_LIMIT = 30;
const MAX_HISTORY_LIMIT = 50;
const MIN_HISTORY_LIMIT = 10;
const MAX_MESSAGE_LENGTH = 4000;

function toMessagePayload(message: {
  id: string;
  roomId: string;
  content: string;
  createdAt: Date;
  senderPerson: {
    id: string;
    name: string;
    image: string;
  } | null;
}): ChatMessagePayload {
  return {
    id: message.id,
    roomId: message.roomId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    senderPerson: message.senderPerson,
  };
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

function normalizeMessageContent(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

function resolveGetStatusCode(error: string): number {
  if (error === "Room id is required" || error === "Invalid message cursor") {
    return 400;
  }

  if (error === "Chat room not found") {
    return 404;
  }

  return 500;
}

function resolvePostStatusCode(error: string): number {
  if (
    error === "Room id is required" ||
    error === "Sender identity is required" ||
    error === "Message cannot be empty" ||
    error.includes("characters or fewer")
  ) {
    return 400;
  }

  if (
    error === "Chat room not found" ||
    error === "Selected identity not found"
  ) {
    return 404;
  }

  return 500;
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  const userId = await requireAdminUser();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);

  const roomId = (searchParams.get("roomId") || "").trim();
  const beforeMessageId = searchParams.get("beforeMessageId");
  const limit = resolveLimit(parseLimit(searchParams.get("limit")));

  if (!roomId) {
    return errorResponse("Room id is required", 400);
  }

  try {
    const roomExists = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    if (!roomExists) {
      return errorResponse("Chat room not found", 404);
    }

    let beforeDate: Date | undefined;

    if (beforeMessageId) {
      const cursorMessage = await prisma.chatMessage.findFirst({
        where: {
          id: beforeMessageId,
          roomId,
        },
        select: { createdAt: true },
      });

      if (!cursorMessage) {
        return errorResponse("Invalid message cursor", 400);
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

    return NextResponse.json(
      {
        success: true,
        data: {
          roomId,
          messages: selectedRows.reverse().map(toMessagePayload),
          hasMore,
          nextCursor,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/chat/messages error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch chat messages";
    return errorResponse(message, resolveGetStatusCode(message));
  }
}

export async function POST(request: NextRequest) {
  const userId = await requireAdminUser();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await request.json();

    const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";
    const personId =
      typeof body?.personId === "string" ? body.personId.trim() : "";
    const content = normalizeMessageContent(
      typeof body?.content === "string" ? body.content : "",
    );

    if (!roomId) {
      return errorResponse("Room id is required", 400);
    }

    if (!personId) {
      return errorResponse("Sender identity is required", 400);
    }

    if (!content) {
      return errorResponse("Message cannot be empty", 400);
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return errorResponse(
        `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
        400,
      );
    }

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
      return errorResponse("Chat room not found", 404);
    }

    if (!person) {
      return errorResponse("Selected identity not found", 404);
    }

    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          roomId: room.id,
          senderUserId: userId,
          senderPersonId: person.id,
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
      }),
      prisma.chatRoom.update({
        where: { id: room.id },
        data: { updatedAt: new Date() },
        select: { id: true },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: toMessagePayload(message),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/chat/messages error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create chat message";
    return errorResponse(message, resolvePostStatusCode(message));
  }
}
