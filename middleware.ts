import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

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

  // Check if the route is protected and user is not authenticated
  const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/login", req.url)
    redirectUrl.searchParams.set("redirect", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // We'll handle admin access checks in the page components, not in middleware
  // This prevents redirection loops and allows for better error messages

  // If user is authenticated and trying to access auth pages or root, redirect to home
  const authRoutes = ["/login", "/signup", "/reset-password", "/"]
  const isAuthRoute = authRoutes.some((route) => req.nextUrl.pathname === route)

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/home", req.url))
  }

  return res
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sheets/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
    "/reset-password",
    "/admin/:path*",
    "/trackers/:path*",
    "/reserve-tracker/:path*",
    "/settlement-tracker/:path*",
    "/home/:path*",
    "/",
    "/((?!auth/callback).)*",
  ],
}
