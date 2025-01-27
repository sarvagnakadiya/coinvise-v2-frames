import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequestWithAuth } from "next-auth/middleware";

export default async function middleware(req: NextRequestWithAuth) {
  const token = await getToken({ req });

  // List of paths that require authentication
  const protectedPaths = ["/campaign"];

  // Check if current path needs authentication
  const isProtectedPath = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  // Only check auth for protected paths
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/campaign/:path*",
    // Add other protected paths here
  ],
};
