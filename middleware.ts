import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple JWT-based middleware — check if session token cookie exists
// The actual session validation happens server-side in auth()
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for NextAuth session cookie
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // Protected routes: /, /onboarding, /link, /settings
  if (
    pathname === "/" ||
    pathname === "/onboarding" ||
    pathname === "/link" ||
    pathname === "/settings"
  ) {
    if (!sessionToken) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/onboarding", "/link", "/settings"],
};
