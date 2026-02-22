import { NextResponse, type NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "bbb_admin_session";

function adminAuthRequired(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function requestHasAdminSession(request: NextRequest): boolean {
  if (!adminAuthRequired()) return true;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  const [expiresRaw] = token.split(".");
  if (!expiresRaw) return false;
  const expires = Number.parseInt(expiresRaw, 10);
  if (!Number.isFinite(expires)) return false;
  return expires > Date.now();
}

export function middleware(request: NextRequest) {
  if (!adminAuthRequired()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (requestHasAdminSession(request)) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirect = request.nextUrl.clone();
  redirect.pathname = "/admin/login";
  redirect.searchParams.set("next", pathname);
  return NextResponse.redirect(redirect);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
