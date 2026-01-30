import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Protected routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/sheets",
  "/profile",
  "/settings",
  "/trackers",
  "/reserve-tracker",
  "/settlement-tracker",
  "/home",
]

// Auth routes for unauthenticated users
const authRoutes = ["/login", "/signup", "/reset-password", "/"]

// Public routes that don't require auth
const publicRoutes = ["/material", "/public", "/reserve-tracker/permissions", "/settlement-tracker/permissions"]

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Fast path: skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/public/") ||
    pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)
  ) {
    return NextResponse.next()
  }

  // Check route types
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => pathname === route)
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Public routes don't need authentication checks
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Get session token from cookies
  const authToken = req.cookies.get("sb-access-token")?.value

  // Protected route: check if user has auth token
  if (isProtectedRoute && !authToken) {
    const redirectUrl = new URL("/login", req.url)
    redirectUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Auth routes: if user has token, redirect to home
  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL("/home", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
