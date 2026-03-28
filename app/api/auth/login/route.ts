import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    console.log("Login attempt with username:", username);

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    console.log("User found:", !!user);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);
    console.log("Password valid:", isValidPassword);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const token = await createToken(user.id);
    console.log("Token created");

    await setSessionCookie(token);
    console.log("Cookie set");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "خطایی در ورود به وجود آمد" },
      { status: 500 }
    );
  }
}
