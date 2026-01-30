import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
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

// Admin routes that require admin privileges
const adminRoutes = ["/admin"]

// Auth routes for unauthenticated users
const authRoutes = ["/login", "/signup", "/reset-password", "/"]

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // Fast path: skip middleware for static files, images, and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)
  ) {
    return NextResponse.next()
  }

  // Check route protection status before making Supabase call
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => pathname === route)

  // If accessing public routes, skip Supabase session check
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next()
  }

  try {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    // Use Promise.race with timeout to prevent hanging requests
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Session check timeout")), 5000)
    )

    const {
      data: { session },
    } = await Promise.race([sessionPromise, timeoutPromise]) as any

    // Protected route handling
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL("/login", req.url)
      redirectUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Auth route handling for authenticated users
    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL("/home", req.url))
    }

    return res
  } catch (error) {
    console.error("[middleware] Session check error:", error)

    // If session check fails and it's a protected route, redirect to login
    if (isProtectedRoute) {
      const redirectUrl = new URL("/login", req.url)
      redirectUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // For public routes, allow access even if session check fails
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
