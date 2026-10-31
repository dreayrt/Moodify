import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type JwtPayload = {
  role?: string;
  exp?: number;
  tokenType?: string;
};

/**
 * Decode claims for route navigation only. The backend still verifies the JWT
 * signature and is the authority for every protected API request.
 */
function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split("")
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

function getActivePayload(token: string | undefined, tokenType: "ACCESS" | "REFRESH") {
  if (!token) return null;

  const payload = parseJwtPayload(token);
  if (
    !payload ||
    payload.tokenType !== tokenType ||
    typeof payload.exp !== "number" ||
    payload.exp <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return payload;
}

function clearAuthCookies(response: NextResponse) {
  for (const name of ["moodify_token", "moodify_refresh", "moodify_role", "accessToken", "token"]) {
    response.cookies.delete(name);
  }
}

/** Dashboard destinations for each authenticated role. */
const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  USER: "/dashboard/user",
  MODERATOR: "/dashboard/moderator",
  ARTIST: "/dashboard/content-lead",
  CONTENT_LEAD: "/dashboard/content-lead",
  ADMIN: "/dashboard/admin",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Only current Moodify cookies are trusted as session hints. Legacy cookie
  // names were long-lived and could keep an expired session looking logged in.
  const accessPayload = getActivePayload(
    request.cookies.get("moodify_token")?.value,
    "ACCESS",
  );
  const refreshPayload = accessPayload
    ? null
    : getActivePayload(request.cookies.get("moodify_refresh")?.value, "REFRESH");
  const sessionPayload = accessPayload ?? refreshPayload;

  if (!sessionPayload) {
    const isPublicDashboard =
      pathname === "/dashboard" ||
      pathname === "/dashboard/" ||
      pathname === "/dashboard/user" ||
      pathname === "/dashboard/user/" ||
      pathname === "/dashboard/search" ||
      pathname === "/dashboard/search/";

    if (isPublicDashboard) {
      const response = NextResponse.next();
      clearAuthCookies(response);
      return response;
    }

    const homeUrl = new URL("/", request.url);
    homeUrl.searchParams.set("auth", "signin");
    homeUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    const response = NextResponse.redirect(homeUrl);
    clearAuthCookies(response);
    return response;
  }

  // Both access and refresh JWTs carry the user's role. Ignore the separate
  // role cookie so a stale or edited cookie cannot choose the dashboard role.
  const role = sessionPayload.role?.toUpperCase();
  if (!role || !ROLE_DASHBOARD_ROUTES[role]) {
    const homeUrl = new URL("/", request.url);
    const response = NextResponse.redirect(homeUrl);
    clearAuthCookies(response);
    return response;
  }

  const correctDashboard = ROLE_DASHBOARD_ROUTES[role];

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    const redirectUrl = new URL(correctDashboard, request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/dashboard/user") && role !== "USER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(correctDashboard, request.url));
  }

  if (pathname === "/dashboard/artist" || pathname === "/dashboard/artist/") {
    if (role === "CONTENT_LEAD" || role === "ARTIST") {
      return NextResponse.redirect(new URL("/dashboard/content-lead", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard/search?type=ARTIST", request.url));
  }

  if (
    pathname.startsWith("/dashboard/content-lead") &&
    role !== "CONTENT_LEAD" &&
    role !== "ARTIST" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL(correctDashboard, request.url));
  }

  if (pathname.startsWith("/dashboard/moderator") && role !== "MODERATOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(correctDashboard, request.url));
  }

  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(correctDashboard, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
