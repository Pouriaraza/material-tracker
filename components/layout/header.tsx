import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Menu, Home } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function Header() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="text-lg sm:text-xl font-bold truncate">
            Tracker App
          </Link>
          {user && (
            <Link
              href="/navigation"
              className="hidden sm:flex items-center gap-2 rounded-md bg-primary px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-primary-foreground"
            >
              <Menu className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">Navigation</span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link href="/home">
                  <Home className="mr-2 h-4 w-4" />
                  <span className="hidden lg:inline">Home</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="sm:hidden">
                <Link href="/navigation">
                  <Menu className="h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/navigation" className="cursor-pointer">
                      <Menu className="mr-2 h-4 w-4" />
                      Navigation
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action="/api/auth/signout" method="post">
                      <button type="submit" className="flex w-full items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
