import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequestWithAuth } from "next-auth/middleware";

export default async function middleware(req: NextRequestWithAuth) {
  const token = await getToken({ req });
  const isTokenPath = req.nextUrl.pathname.startsWith("/token/");

  // Allow access to token pages without auth
  if (isTokenPath) {
    return NextResponse.next();
  }

  // Require auth for all other paths
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - token paths
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!token/|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
