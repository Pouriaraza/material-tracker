import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next()

    // Skip middleware for static files and API routes that don't need auth
    const { pathname } = req.nextUrl

    // Skip for static files, images, and certain API routes
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/auth/") ||
      pathname.includes(".") ||
      pathname === "/favicon.ico"
    ) {
      return res
    }

    const supabase = createMiddlewareClient({ req, res })

    // Set a timeout for the auth check
    const authPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), 3000))

    let session
    try {
      const result = await Promise.race([authPromise, timeoutPromise])
      session = (result as any)?.data?.session
    } catch (error) {
      console.error("Auth check failed:", error)
      // If auth check fails, allow the request to continue
      // The page components will handle the redirect if needed
      return res
    }

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
      "/material",
      "/sites",
      "/admin",
    ]

    // Check if the route is protected and user is not authenticated
    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

    if (isProtectedRoute && !session) {
      const redirectUrl = new URL("/login", req.url)
      redirectUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is authenticated and trying to access auth pages or root, redirect to home
    const authRoutes = ["/login", "/signup", "/reset-password"]
    const isAuthRoute = authRoutes.includes(pathname)
    const isRoot = pathname === "/"

    if ((isAuthRoute || isRoot) && session) {
      return NextResponse.redirect(new URL("/home", req.url))
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    // If middleware fails, allow the request to continue
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
