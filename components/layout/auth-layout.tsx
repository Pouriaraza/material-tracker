import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"

interface AuthLayoutProps {
  children: React.ReactNode
}

export async function AuthLayout({ children }: AuthLayoutProps) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session.user} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
