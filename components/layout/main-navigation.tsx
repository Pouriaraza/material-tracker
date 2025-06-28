"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  LayoutDashboard,
  FileSpreadsheet,
  Target,
  ClipboardList,
  Settings,
  Menu,
  X,
  Building,
  UserCircle,
  Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavigationProps {
  isAdmin: boolean
}

export function MainNavigation({ isAdmin }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Home", icon: <Home className="h-5 w-5" /> },
    { href: "/home", label: "Home Dashboard", icon: <Home className="h-5 w-5" /> },
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/sheets", label: "Sheets", icon: <FileSpreadsheet className="h-5 w-5" /> },
    { href: "/trackers", label: "Trackers", icon: <Target className="h-5 w-5" /> },
    { href: "/reserve-tracker", label: "Reserve Tracker", icon: <ClipboardList className="h-5 w-5" /> },
    { href: "/sites", label: "Sites", icon: <Building className="h-5 w-5" /> },
    { href: "/material", label: "Material", icon: <Package className="h-5 w-5" /> },
    { href: "/profile", label: "Profile", icon: <UserCircle className="h-5 w-5" /> },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: <Settings className="h-5 w-5" /> }] : []),
  ]

  return (
    <>
      {/* Mobile menu button - very prominent */}
      <div className="fixed bottom-4 right-4 z-50 lg:hidden">
        <Button onClick={() => setIsOpen(!isOpen)} size="lg" className="h-14 w-14 rounded-full bg-primary shadow-lg">
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile navigation - full screen overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-background lg:hidden">
          <div className="flex h-full flex-col p-4 sm:p-6">
            <div className="mb-6 sm:mb-8 flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl font-bold">Navigation</h1>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="flex flex-col space-y-2 sm:space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center rounded-md p-3 sm:p-4 text-base sm:text-lg font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="mr-3 sm:mr-4">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop navigation - sidebar */}
      <div className="hidden lg:block lg:w-64 xl:w-72 border-r bg-background">
        <div className="flex h-16 items-center border-b px-4 xl:px-6">
          <h1 className="text-lg xl:text-xl font-bold">Tracker App</h1>
        </div>
        <nav className="p-3 xl:p-4">
          <ul className="space-y-1 xl:space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 xl:py-3 text-sm xl:text-base font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}
