import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/book"];
const PROTECTED_PREFIXES = ["/admin", "/api/admin", "/api/appointments"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

function hasSupabaseSessionCookie(request: NextRequest) {
  const cookies = request.cookies.getAll();
  return cookies.some(({ name }) => {
    return (
      name === "sb-access-token" ||
      name === "supabase-auth-token" ||
      (name.startsWith("sb-") && name.endsWith("-auth-token"))
    );
  });
}

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    throw new Error("Skipped during build");
  }

  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const isAuthenticated = hasSupabaseSessionCookie(request);

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
