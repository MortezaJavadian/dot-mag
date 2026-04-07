import { NextRequest, NextResponse } from "next/server";
import { createChatMessage, getChatMessages } from "@/app/actions/chatActions";

function resolveGetStatusCode(error: string | undefined): number {
  if (!error) return 500;

  if (error === "Unauthorized") {
    return 401;
  }

  if (error === "Room id is required" || error === "Invalid message cursor") {
    return 400;
  }

  if (error === "Chat room not found") {
    return 404;
  }

  return 500;
}

function resolvePostStatusCode(error: string | undefined): number {
  if (!error) return 500;

  if (error === "Unauthorized") {
    return 401;
  }

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
  const { searchParams } = new URL(request.url);

  const roomId = searchParams.get("roomId") || "";
  const beforeMessageId = searchParams.get("beforeMessageId");
  const limit = parseLimit(searchParams.get("limit"));

  const result = await getChatMessages({
    roomId,
    beforeMessageId,
    limit,
  });

  if (!result.success) {
    return NextResponse.json(result, {
      status: resolveGetStatusCode(result.error),
    });
  }

  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await createChatMessage({
      roomId: typeof body?.roomId === "string" ? body.roomId : "",
      personId: typeof body?.personId === "string" ? body.personId : "",
      content: typeof body?.content === "string" ? body.content : "",
    });

    if (!result.success) {
      return NextResponse.json(result, {
        status: resolvePostStatusCode(result.error),
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }
}
