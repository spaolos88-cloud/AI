import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  isAccessProtectionEnabled,
  isAuthorizedCookieValue,
} from "./src/lib/auth";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/session/unlock") ||
    pathname.startsWith("/api/session/logout")
  );
}

export function middleware(request: NextRequest) {
  if (!isAccessProtectionEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isAuthorized = isAuthorizedCookieValue(
    request.cookies.get(ACCESS_COOKIE_NAME)?.value,
  );

  if (pathname === "/login" && isAuthorized) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isAuthorized) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
