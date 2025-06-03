"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { MainNavigation } from "@/components/layout/main-navigation"
import { SuperVisibleMenu } from "@/components/super-visible-menu"
import { ThemeProvider } from "@/components/theme-provider"
import { ClientProviders } from "@/components/client-providers"
import { usePathname } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = usePathname()

  if (!session) {
    redirect("/login")
  }

  // For now, we'll consider any user with email pouria.raz@mtnirancell.ir as an admin
  const isAdmin = session.user?.email === "pouria.raz@mtnirancell.ir"

  // If this is a valid dashboard route, don't redirect
  if (
    pathname === "/dashboard" ||
    pathname === "/home" ||
    pathname.startsWith("/sheets") ||
    pathname.startsWith("/trackers") ||
    pathname.startsWith("/reserve-tracker") ||
    pathname.startsWith("/sites") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin") ||
    pathname === "/navigation"
  ) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ClientProviders>
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex flex-1">
              <MainNavigation isAdmin={isAdmin} />
              <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
            </div>
            <SuperVisibleMenu isAdmin={isAdmin} />
          </div>
        </ClientProviders>
      </ThemeProvider>
    )
  }
}
