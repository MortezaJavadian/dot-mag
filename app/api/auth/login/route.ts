import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const COOKIE_NAME = "admin_session";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 },
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 },
      );
    }

    const token = await createToken(user.id);

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "خطایی در ورود به وجود آمد" },
      { status: 500 },
    );
  }
}
