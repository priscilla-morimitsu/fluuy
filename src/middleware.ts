import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

// Uses the edge-safe authConfig (no Prisma adapter) — middleware runs on the
// Edge runtime and can't load Node-only modules. JWT session strategy means
// req.auth below is decoded straight from the cookie, no DB access needed.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/api/health",
  "/api/whatsapp/webhook",
  // MCP server for the Zatten agent: authenticated per-tenant via Bearer token
  // at the route (withMcpAuth), so the session middleware must not gate it.
  "/api/mcp",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // The marketing landing page ("/") is public for everyone — including
  // authenticated users, who see the landing rather than being redirected.
  // Matched exactly, since a `startsWith("/")` would make every route public.
  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon-dark.ico|logo.png|logo-dark.png).*)"],
};
