import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public static assets and API routes (APIs handle their own status codes)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") || // static files like images, favicon, etc.
    pathname === "/auth" ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Check auth cookie or Authorization header
  const authCookie = request.cookies.get("chai_auth_token")?.value;
  const authHeader = request.headers.get("authorization");
  const authToken = authCookie || authHeader;

  // If no auth token and trying to access root or protected pages, redirect to /auth
  if (!authToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
