import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production",
);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const requestHeaders = new Headers(request.headers);
  const isAdminPanelRoute =
    pathname === "/admin-panel" || pathname.startsWith("/admin-panel/");
  requestHeaders.set("x-admin-route", isAdminPanelRoute ? "1" : "0");

  // Only check admin panel routes
  if (isAdminPanelRoute) {
    const token = request.cookies.get("admin_session")?.value;

    // Allow access to login page without token
    if (pathname === "/admin-panel") {
      if (!token) {
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }

      // Verify token
      try {
        await jwtVerify(token, SECRET);
        // Token is valid, continue to dashboard
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      } catch {
        // Token is invalid, show login
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/admin-panel/:path*"],
};
