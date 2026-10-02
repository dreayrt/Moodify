import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Giai ma payload JWT tren Edge Runtime (Next.js Middleware)
 */
function parseJwtPayload(token: string): { role?: string; sub?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Danh sach duong dan dashboard tuong ung voi tung role
 */
const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  USER: "/dashboard/user",
  MODERATOR: "/dashboard/moderator",
  ARTIST: "/dashboard/content-lead",
  CONTENT_LEAD: "/dashboard/content-lead",
  ADMIN: "/dashboard/admin",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lay token tu cookie
  const tokenCookie =
    request.cookies.get("moodify_token")?.value ||
    request.cookies.get('accessToken')?.value ||
    request.cookies.get('token')?.value;

  // Chi ap dung bao ve cho cac route bat dau bang /dashboard
  if (pathname.startsWith("/dashboard")) {
    // 1. Neu chua dang nhap (khong co token trong cookie)
    if (!tokenCookie) {
      const homeUrl = new URL("/", request.url);
      homeUrl.searchParams.set("auth", "signin");
      homeUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(homeUrl);
    }

    // 2. Lay role tu cookie moodify_role hoac decode tu JWT payload
    let role = request.cookies.get("moodify_role")?.value?.toUpperCase();
    if (!role) {
      const payload = parseJwtPayload(tokenCookie);
      role = payload?.role?.toUpperCase();
    }

    // Neu token loi hoac khong co role hop le
    if (!role) {
      const homeUrl = new URL("/", request.url);
      const response = NextResponse.redirect(homeUrl);
      response.cookies.delete("moodify_token");
      response.cookies.delete("moodify_role");
      return response;
    }

    const correctDashboard = ROLE_DASHBOARD_ROUTES[role] || "/dashboard/user";

    // 3. Neu truy cap /dashboard hoac /dashboard/ -> Chuyen huong ve dung dashboard cua role do
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      const redirectUrl = new URL(correctDashboard, request.url);
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }

    // 4. KIEM TRA PHAN QUYEN TUNG ROUTE:
    // Moderator hoac role khac co tinh vao /dashboard/user
    if (pathname.startsWith("/dashboard/user") && role !== "USER") {
      return NextResponse.redirect(new URL(correctDashboard, request.url));
    }

    // Nguoi khong phai MODERATOR/ADMIN co tinh vao /dashboard/moderator
    if (pathname.startsWith("/dashboard/moderator") && role !== "MODERATOR" && role !== "ADMIN") {
      return NextResponse.redirect(new URL(correctDashboard, request.url));
    }

    // Chuyen huong /dashboard/artist sang /dashboard/content-lead
    if (pathname.startsWith("/dashboard/artist")) {
      return NextResponse.redirect(new URL("/dashboard/content-lead", request.url));
    }

    // Nguoi khong phai CONTENT_LEAD/ADMIN co tinh vao /dashboard/content-lead
    if (
      pathname.startsWith("/dashboard/content-lead") &&
      role !== "CONTENT_LEAD" &&
      role !== "ARTIST" &&
      role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL(correctDashboard, request.url));
    }

    // Nguoi khong phai ADMIN co tinh vao /dashboard/admin
    if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL(correctDashboard, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
