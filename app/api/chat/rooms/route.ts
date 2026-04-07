import { NextRequest, NextResponse } from "next/server";
import { createChatRoom, getChatRooms } from "@/app/actions/chatActions";

function resolveStatusCode(error: string | undefined): number {
  if (!error) return 500;

  if (error === "Unauthorized") {
    return 401;
  }

  if (
    error === "Group name is required" ||
    error === "Group name must be 100 characters or fewer"
  ) {
    return 400;
  }

  return 500;
}

export async function GET() {
  const result = await getChatRooms();

  if (!result.success) {
    return NextResponse.json(result, {
      status: resolveStatusCode(result.error),
    });
  }

  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const roomName = typeof body?.name === "string" ? body.name : "";

    const result = await createChatRoom(roomName);

    if (!result.success) {
      return NextResponse.json(result, {
        status: resolveStatusCode(result.error),
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
