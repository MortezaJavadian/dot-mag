import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = await getSessionToken();
    console.log("[CHECK] Token exists:", !!token);

    if (!token) {
      return NextResponse.json({ authenticated: false, message: "No token" });
    }

    const payload = await verifyToken(token);
    console.log("[CHECK] Token valid:", !!payload);

    if (!payload) {
      return NextResponse.json({
        authenticated: false,
        message: "Invalid token",
      });
    }

    return NextResponse.json({
      authenticated: true,
      userId: payload.userId,
    });
  } catch (error) {
    console.error("[CHECK] Error:", error);
    return NextResponse.json(
      { authenticated: false, error: String(error) },
      { status: 500 },
    );
  }
}
