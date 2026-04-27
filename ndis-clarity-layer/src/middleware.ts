import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Public routes that do not require a session
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
];

const PUBLIC_PREFIXES = ["/shared/", "/api/shared/"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("ndis_session")?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 24) {
    if (process.env.NODE_ENV === "production") return false;
  }
  try {
    const key = new TextEncoder().encode(
      secret && secret.length >= 24
        ? secret
        : "dev-only-insecure-secret-please-change-me-1234567890",
    );
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const valid = await hasValidSession(req);
  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Run on everything except static assets / next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp)).*)",
  ],
};
