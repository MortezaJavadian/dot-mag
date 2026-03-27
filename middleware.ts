import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production",
);

export async function middleware(request: NextRequest) {
  // Only check admin panel routes
  if (request.nextUrl.pathname.startsWith("/panel-admin")) {
    const token = request.cookies.get("admin_session")?.value;

    // Allow access to login page without token
    if (request.nextUrl.pathname === "/panel-admin") {
      if (!token) {
        return NextResponse.next();
      }

      // Verify token
      try {
        await jwtVerify(token, SECRET);
        // Token is valid, continue to dashboard
        return NextResponse.next();
      } catch {
        // Token is invalid, show login
        return NextResponse.next();
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel-admin/:path*"],
};
